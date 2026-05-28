import { useEffect, useMemo, useState } from 'react'
import { getAuthSession } from '../auth'
import { getCareerPathsData, hydrateCareerPathsData } from '../data/careerPathsData'
import { getRoomsData } from '../data/roomsData'
import { apiFetch } from '../services/api'
import { getLabProgressEvents, getLabProgressMap } from '../services/labProgress'

function parseXpValue(value) {
  const match = String(value || '').replace(/,/g, '').match(/\d+/)
  return match ? Number(match[0]) : 0
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0))
}

function ProfilePage() {
  const authSession = getAuthSession()
  const analysisCacheKey = `incognitrix_profile_analysis_${authSession?.username || 'operator'}`
  const [careerPaths, setCareerPaths] = useState([])
  const [isLoadingPaths, setIsLoadingPaths] = useState(true)
  const [labProgressTick, setLabProgressTick] = useState(0)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true)
  const [profileStats, setProfileStats] = useState({
    xp: 0,
    completedRooms: 0,
  })

  useEffect(() => {
    let cancelled = false

    const loadPaths = async () => {
      try {
        const response = await apiFetch('/career-paths')
        if (!cancelled) {
          const paths = Array.isArray(response) ? response : []
          hydrateCareerPathsData(paths)
          setCareerPaths(paths)
        }
      } catch (error) {
        console.error('Failed to load paths for profile:', error)
        if (!cancelled) {
          setCareerPaths(getCareerPathsData())
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPaths(false)
        }
      }
    }

    void loadPaths()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const { updatedEvent, updatedStorageKey } = getLabProgressEvents()

    const syncProgress = () => {
      setLabProgressTick((value) => value + 1)
    }

    const onStorage = (event) => {
      if (event.key === updatedStorageKey) {
        syncProgress()
      }
    }

    window.addEventListener(updatedEvent, syncProgress)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(updatedEvent, syncProgress)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const completedRoomSignature = useMemo(() => {
    void labProgressTick
    const progressMap = getLabProgressMap()
    const completedEntries = Object.entries(progressMap)
      .filter(([, progress]) => Boolean(progress?.completedAt))
      .map(([roomId, progress]) => `${roomId}:${progress.completedAt}`)
      .sort()

    return completedEntries.length ? completedEntries.join('|') : 'no-completed-rooms'
  }, [labProgressTick])

  useEffect(() => {
    let cancelled = false

    const loadProfileStats = async () => {
      const progressMap = getLabProgressMap()
      const roomsById = new Map(getRoomsData().map((room) => [room.id, room]))
      const localCompletedRoomIds = Object.entries(progressMap)
        .filter(([, progress]) => Boolean(progress?.completedAt))
        .map(([roomId]) => roomId)
      const localXp = localCompletedRoomIds.reduce(
        (sum, roomId) => sum + parseXpValue(roomsById.get(roomId)?.xp),
        0,
      )

      try {
        const scoreboard = await apiFetch('/rooms/scoreboard/summary')
        if (cancelled) {
          return
        }

        const currentUser = Array.isArray(scoreboard)
          ? scoreboard.find(
              (row) => String(row.username || '').toLowerCase() === String(authSession?.username || '').toLowerCase(),
            )
          : null

        setProfileStats({
          xp: Number(currentUser?.xp ?? localXp),
          completedRooms: Number(currentUser?.completedRooms ?? localCompletedRoomIds.length),
        })
      } catch (error) {
        console.error('Failed to load profile XP:', error)
        if (!cancelled) {
          setProfileStats({
            xp: localXp,
            completedRooms: localCompletedRoomIds.length,
          })
        }
      }
    }

    void loadProfileStats()

    return () => {
      cancelled = true
    }
  }, [authSession?.username, completedRoomSignature])

  useEffect(() => {
    let cancelled = false

    const loadAnalysis = async () => {
      try {
        const cached = JSON.parse(localStorage.getItem(analysisCacheKey) || 'null')
        if (cached?.signature === completedRoomSignature && cached?.analysis) {
          setAiAnalysis(cached.analysis)
          setIsLoadingAnalysis(false)
          return
        }
      } catch {
        // Ignore unreadable cache and fetch a fresh analysis.
      }

      setIsLoadingAnalysis(true)
      try {
        const response = await apiFetch('/rooms/profile/analysis')
        if (!cancelled) {
          setAiAnalysis(response)
          localStorage.setItem(
            analysisCacheKey,
            JSON.stringify({
              signature: completedRoomSignature,
              analysis: response,
              analyzedAt: new Date().toISOString(),
            }),
          )
        }
      } catch (error) {
        console.error('Failed to load profile AI analysis:', error)
        if (!cancelled) {
          setAiAnalysis(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAnalysis(false)
        }
      }
    }

    void loadAnalysis()

    return () => {
      cancelled = true
    }
  }, [analysisCacheKey, completedRoomSignature])

  const moduleProgressItems = useMemo(() => {
    void labProgressTick
    const roomsById = new Map(getRoomsData().map((room) => [room.id, room]))
    const progressMap = getLabProgressMap()

    const modules = careerPaths.flatMap((path) =>
      (path.modules || []).map((module) => {
        const roomIds = module.rooms || []
        const totalRooms = roomIds.length
        const completedRooms = roomIds.filter((roomId) => Boolean(progressMap[roomId]?.completedAt)).length
        const percentage = totalRooms > 0 ? Math.round((completedRooms / totalRooms) * 100) : 0

        return {
          id: `${path.id}-${module.id}`,
          title: module.title || 'Untitled Module',
          subtitle: `${module.phase || 'Module'} / ${path.title || 'Path'}`,
          percentage,
          completedRooms,
          totalRooms,
          tone: path.color === 'secondary' ? 'secondary' : 'primary',
          roomPreview: roomIds
            .map((roomId) => roomsById.get(roomId)?.title)
            .filter(Boolean)
            .slice(0, 2)
            .join(', '),
        }
      }),
    )

    return modules
      .sort(
        (a, b) =>
          b.percentage - a.percentage ||
          b.completedRooms - a.completedRooms ||
          b.totalRooms - a.totalRooms ||
          a.title.localeCompare(b.title),
      )
      .slice(0, 4)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }))
  }, [careerPaths, labProgressTick])

  const firstColumnItems = moduleProgressItems.filter((_, index) => index % 2 === 0)
  const secondColumnItems = moduleProgressItems.filter((_, index) => index % 2 !== 0)

  return (
    <>
      <main className="pt-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-12 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="md:col-span-2 flex flex-col justify-end">
              <h1 className="font-headline font-bold text-6xl tracking-tighter mb-2">OPERATOR_01</h1>
              <div className="flex gap-4 items-center">
                <span className="bg-primary-container text-on-primary-container px-3 py-1 font-label text-[10px] tracking-widest uppercase">Senior Analyst</span>
                <span className="text-on-surface-variant font-label text-[10px] tracking-widest uppercase">ID: 0x8842_UNIT_09</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-8 flex flex-col justify-between border-l-4 border-primary">
              <span className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant">Total Experience Points</span>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-5xl tracking-tighter text-primary">
                  {formatNumber(profileStats.xp)}
                </span>
                <span className="font-label text-[10px] tracking-widest uppercase text-primary/60 mt-1">
                  {profileStats.completedRooms} rooms completed
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 bg-surface-container-lowest p-8 border-l-4 border-secondary">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="max-w-3xl">
                  <span className="font-label text-[10px] tracking-[0.25em] uppercase text-secondary font-bold">
                    AI Career Analysis
                  </span>
                  <h2 className="font-headline font-bold text-2xl uppercase tracking-tight mt-2">
                    {isLoadingAnalysis
                      ? 'Analyzing completed rooms...'
                      : aiAnalysis?.suitableRole || 'Complete rooms to unlock role analysis'}
                  </h2>
                  <p className="text-sm text-on-surface-variant leading-relaxed mt-3">
                    {aiAnalysis?.summary ||
                      'The recommendation is generated from completed rooms, theoretical scores, answered questions, and evaluator feedback.'}
                  </p>
                </div>
                <div className="bg-surface-container-high px-5 py-4 min-w-44">
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    Confidence
                  </p>
                  <p className="font-headline text-2xl font-black text-secondary mt-1">
                    {aiAnalysis?.confidence || 'Pending'}
                  </p>
                  <p className="text-[10px] text-on-surface-variant mt-2">
                    {Number(aiAnalysis?.completedRooms || 0)} rooms completed
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <div className="bg-surface p-5">
                  <h3 className="font-headline text-xs font-bold uppercase tracking-widest text-primary mb-4">
                    Strengths
                  </h3>
                  <div className="space-y-3">
                    {(aiAnalysis?.strengths || ['Complete more rooms to identify your strongest skills.']).map((item) => (
                      <p className="text-sm text-on-surface-variant leading-relaxed" key={item}>
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="bg-surface p-5">
                  <h3 className="font-headline text-xs font-bold uppercase tracking-widest text-primary mb-4">
                    Improve Next
                  </h3>
                  <div className="space-y-3">
                    {(aiAnalysis?.improvementAreas || ['Submit detailed theoretical answers to improve analysis quality.']).map((item) => (
                      <p className="text-sm text-on-surface-variant leading-relaxed" key={item}>
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest p-8 border-l-4 border-primary/70">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-headline font-bold text-xl uppercase tracking-tight">Skill Matrix Output</h2>
                  <p className="text-[10px] font-label tracking-widest uppercase text-on-surface-variant mt-1">
                    Top 4 modules by completion output
                  </p>
                </div>
                <span className="material-symbols-outlined text-neutral-300">analytics</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[firstColumnItems, secondColumnItems].map((columnItems, columnIndex) => (
                  <div className="space-y-4" key={`skill-col-${columnIndex + 1}`}>
                    {columnItems.map((item) => (
                      <div className="bg-surface border border-surface-container p-4 space-y-3" key={item.id}>
                        <div className="flex justify-between gap-4">
                          <div className="min-w-0">
                            <span className="inline-flex items-center px-2 py-1 bg-surface-container-high text-[9px] font-bold font-label tracking-widest uppercase mb-2">
                              Rank #{item.rank}
                            </span>
                            <h3 className="font-headline font-bold text-sm uppercase tracking-wide truncate">{item.title}</h3>
                            <p className="text-[10px] text-on-surface-variant mt-1 uppercase tracking-widest truncate">
                              {item.subtitle}
                            </p>
                          </div>
                          <span
                            className={`${item.tone === 'secondary' ? 'text-secondary' : 'text-primary'} font-headline font-bold text-xl shrink-0`}
                          >
                            {item.percentage}%
                          </span>
                        </div>

                        <div className="h-2 bg-surface-container rounded-sm overflow-hidden">
                          <div
                            className={`h-full ${item.tone === 'secondary' ? 'bg-secondary' : 'bg-primary'}`}
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>

                        <div className="flex justify-between text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                          <span>
                            {item.completedRooms}/{item.totalRooms} labs complete
                          </span>
                          <span>{item.percentage === 100 ? 'Mastered' : 'In Progress'}</span>
                        </div>

                        {item.roomPreview ? (
                          <p className="text-[10px] text-on-surface-variant truncate">Focus: {item.roomPreview}</p>
                        ) : null}
                      </div>
                    ))}

                    {isLoadingPaths && !columnItems.length ? (
                      <p className="text-xs text-on-surface-variant">Loading module progress...</p>
                    ) : null}

                    {!isLoadingPaths && !columnItems.length ? (
                      <p className="text-xs text-on-surface-variant">No module progress available yet.</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 bg-inverse-surface p-8 text-surface relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-surface-tint blur-[80px] opacity-20"></div>
              <div className="flex justify-between items-center mb-8 relative z-10">
                <h2 className="font-headline font-bold text-sm uppercase tracking-widest">Event_Log</h2>
                <span className="text-[10px] font-label text-primary-fixed-dim">LIVE_FEED</span>
              </div>
              <div className="space-y-6 font-headline text-xs relative z-10">
                <div className="flex gap-4 items-start border-l border-white/10 pl-4"><span className="text-primary-fixed-dim shrink-0">14:02:44</span><span className="text-surface/80">User neutralized simulated DDoS attack on Lab_Node_09</span></div>
                <div className="flex gap-4 items-start border-l border-white/10 pl-4"><span className="text-primary-fixed-dim shrink-0">12:15:20</span><span className="text-surface/80">Completed \"Advanced Buffer Overflow\" module with 100% accuracy</span></div>
                <div className="flex gap-4 items-start border-l border-white/10 pl-4"><span className="text-primary-fixed-dim shrink-0">11:04:12</span><span className="text-surface/80">New achievement unlocked: \"Deep Packet Explorer\"</span></div>
                <div className="flex gap-4 items-start border-l border-white/10 pl-4"><span className="text-primary-fixed-dim shrink-0">09:30:55</span><span className="text-surface/80">Operator credentials authenticated via biometric proxy</span></div>
                <div className="flex gap-4 items-start border-l border-white/10 pl-4"><span className="text-primary-fixed-dim shrink-0">08:00:01</span><span className="text-surface/80">Daily training sequence initiated...</span></div>
              </div>
            </div>

            <div className="col-span-12 bg-surface-container-low p-8">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="font-headline font-bold text-xl uppercase tracking-tight">Achievement Vault</h2>
                  <p className="text-on-surface-variant text-[10px] font-label uppercase tracking-widest mt-1">Authorized Merit Badges</p>
                </div>
                <button className="font-label text-[10px] tracking-widest uppercase text-primary border-b-2 border-primary pb-1" type="button">View All Medals</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                <div className="aspect-square bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center gap-3"><span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>security</span><span className="font-label text-[10px] font-bold tracking-widest uppercase">Firewall Breaker</span></div>
                <div className="aspect-square bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center gap-3"><span className="material-symbols-outlined text-4xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>data_thresholding</span><span className="font-label text-[10px] font-bold tracking-widest uppercase">Pattern Seeker</span></div>
                <div className="aspect-square bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center gap-3"><span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span><span className="font-label text-[10px] font-bold tracking-widest uppercase">Script Killa</span></div>
                <div className="aspect-square bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center gap-3"><span className="material-symbols-outlined text-4xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span><span className="font-label text-[10px] font-bold tracking-widest uppercase">Node Guardian</span></div>
                <div className="aspect-square bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center gap-3 opacity-30 grayscale"><span className="material-symbols-outlined text-4xl">vpn_key</span><span className="font-label text-[10px] font-bold tracking-widest uppercase">LOCKED_FILE</span></div>
                <div className="aspect-square bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center gap-3 opacity-30 grayscale"><span className="material-symbols-outlined text-4xl">radar</span><span className="font-label text-[10px] font-bold tracking-widest uppercase">LOCKED_FILE</span></div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-6 bg-surface-container-lowest h-64 overflow-hidden relative">
              <img alt="Servers" className="w-full h-full object-cover grayscale opacity-20 mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8Up8U0Qns_mn9r9DwX9zZyvGMbGwohDNQ9BG4mbWDhnv0l4-3gpm4UDv9c46eqHBIzyJtLpzvO4j-raquDQB9Kf9U9wtASYKd-r5Bkk5wASptx560cccS9lcqSOEFEwIjNtqc0B-ux92is0Zz8a6bYJA5HGoLwEAuDmn7lzG1kN1lmmcbJpQyRc0YrcR_25GSA13Z_9ISSXGx-PsmWEev9swLpEGoskBLUatjuQsdfCXYL4-LRN2nvKAHbSu2RFneVMhwYubmE4g" />
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <h3 className="font-headline font-bold text-lg uppercase">Network Status</h3>
                  <span className="bg-green-500/20 text-green-700 px-2 py-1 text-[8px] font-bold tracking-[2px]">SECURE_NODE</span>
                </div>
                <div className="space-y-2">
                  <p className="font-body text-sm text-on-surface-variant max-w-xs">Your current performance is in the top 4% of regional intelligence units.</p>
                  <span className="font-label text-[10px] text-primary tracking-widest uppercase font-bold">Maintain_Current_Trajectory</span>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-6 bg-primary-container p-8 flex flex-col justify-between text-on-primary-container">
              <div className="flex justify-between items-start">
                <span className="material-symbols-outlined text-4xl">military_tech</span>
                <div className="text-right">
                  <span className="font-label text-[10px] tracking-widest uppercase opacity-70">Next Rank Progression</span>
                  <p className="font-headline font-bold text-xl uppercase">Elite Commander</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-label text-[10px] tracking-widest uppercase mb-2">
                  <span>Rank Progress</span>
                  <span>1,550 XP to Next Rank</span>
                </div>
                <div className="h-3 bg-black/10">
                  <div className="h-full bg-white w-[88%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 mt-auto bg-neutral-50 border-t border-neutral-200/50 flex flex-col md:flex-row justify-between items-center px-12">
        <div className="font-headline text-[10px] tracking-widest uppercase text-neutral-400">© 2024 INCOGNITRIX ACADEMY // SURGICAL INTEL UNIT</div>
        <div className="flex gap-8 mt-4 md:mt-0">
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-all duration-150" href="#">Privacy Protocol</a>
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-all duration-150" href="#">Terms of Engagement</a>
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-all duration-150" href="#">Liability Waiver</a>
        </div>
      </footer>
    </>
  )
}

export default ProfilePage
