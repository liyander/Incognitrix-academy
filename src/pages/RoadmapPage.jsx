import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCareerPathsData, hydrateCareerPathsData } from '../data/careerPathsData'
import { getRoomsData, hydrateRoomsData } from '../data/roomsData'
import {
  getLabProgressEvents,
  getLabProgressMap,
  syncLabProgressFromBackend,
} from '../services/labProgress'
import { apiFetch } from '../services/api'

function parseXp(value) {
  const numeric = String(value || '').replace(/[^0-9]/g, '')
  return Number(numeric || 0)
}

function getDifficultyRank(room) {
  const level = String(room?.difficulty || room?.level || '').toLowerCase()
  if (/hard|critical|advanced/.test(level)) return 3
  if (/medium|intermediate/.test(level)) return 2
  return 1
}

function getRoomStatus(progress) {
  if (progress?.completedAt) return 'completed'
  if (progress?.startedAt) return 'in-progress'
  return 'queued'
}

function getIconForTrack(value) {
  const text = String(value || '').toLowerCase()
  if (/soc|defen|blue|analyst|incident/.test(text)) return 'security'
  if (/pen|red|web|exploit|offen/.test(text)) return 'bug_report'
  if (/engineer|devsec|cloud|aws|azure/.test(text)) return 'hub'
  if (/ai|machine|model/.test(text)) return 'psychology'
  if (/crypto/.test(text)) return 'key'
  if (/forensic/.test(text)) return 'travel_explore'
  return 'terminal'
}

function getTrackTone(index, title) {
  const text = String(title || '').toLowerCase()
  if (/ai/.test(text)) {
    return {
      glow: 'shadow-[0_0_70px_rgba(139,92,246,0.28)]',
      border: 'border-violet-400/70',
      accent: 'bg-violet-500',
      line: 'bg-violet-400/60',
      panel: 'from-violet-500/35 to-surface-container-high',
      text: 'text-violet-200',
    }
  }

  const tones = [
    {
      glow: '',
      border: 'border-blue-400/35',
      accent: 'bg-blue-500',
      line: 'bg-blue-300/35',
      panel: 'from-blue-500/30 to-surface-container-high',
      text: 'text-blue-200',
    },
    {
      glow: '',
      border: 'border-primary/45',
      accent: 'bg-primary',
      line: 'bg-primary/35',
      panel: 'from-primary/35 to-surface-container-high',
      text: 'text-primary',
    },
    {
      glow: '',
      border: 'border-cyan-300/40',
      accent: 'bg-secondary',
      line: 'bg-cyan-300/35',
      panel: 'from-cyan-400/30 to-surface-container-high',
      text: 'text-secondary',
    },
    {
      glow: '',
      border: 'border-amber-300/40',
      accent: 'bg-amber-400',
      line: 'bg-amber-300/35',
      panel: 'from-amber-400/25 to-surface-container-high',
      text: 'text-amber-200',
    },
  ]

  return tones[index % tones.length]
}

function buildFallbackModules(rooms) {
  const grouped = rooms.reduce((acc, room) => {
    const key = room.category || room.categoryTag || 'General Operations'
    acc[key] = acc[key] || []
    acc[key].push(room.id)
    return acc
  }, {})

  return Object.entries(grouped).map(([category, roomIds], index) => ({
    id: `category-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-') || index}`,
    phase: `Track ${String(index + 1).padStart(2, '0')}`,
    title: category,
    description: `Build capability across ${category.toLowerCase()} rooms.`,
    rooms: roomIds,
  }))
}

function RoadmapPage() {
  const [paths, setPaths] = useState(() => getCareerPathsData())
  const [rooms, setRooms] = useState(() => getRoomsData())
  const [progressMap, setProgressMap] = useState(() => getLabProgressMap())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadRoadmap() {
      setIsLoading(true)
      try {
        const [pathsResponse, roomsResponse] = await Promise.all([
          apiFetch('/career-paths'),
          apiFetch('/rooms'),
        ])
        const nextPaths = Array.isArray(pathsResponse) ? pathsResponse : []
        const nextRooms = Array.isArray(roomsResponse) ? roomsResponse : []

        hydrateCareerPathsData(nextPaths)
        hydrateRoomsData(nextRooms)

        if (!cancelled) {
          setPaths(nextPaths)
          setRooms(nextRooms)
        }
      } catch {
        if (!cancelled) {
          setPaths(getCareerPathsData())
          setRooms(getRoomsData())
        }
      } finally {
        if (!cancelled) {
          const syncedProgress = await syncLabProgressFromBackend()
          if (!cancelled) {
            setProgressMap(syncedProgress || getLabProgressMap())
            setIsLoading(false)
          }
        }
      }
    }

    void loadRoadmap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const events = getLabProgressEvents()
    const syncProgress = () => setProgressMap(getLabProgressMap())
    const handleStorage = (event) => {
      if (event.key === events.updatedStorageKey) syncProgress()
    }

    window.addEventListener(events.updatedEvent, syncProgress)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(events.updatedEvent, syncProgress)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const roadmap = useMemo(() => {
    const roomsById = new Map(rooms.map((room) => [room.id, room]))
    const sourcePaths = paths.length
      ? paths
      : [{
          id: 'all-rooms',
          title: 'MISSION CATALOG',
          description: 'A generated roadmap from all available academy rooms.',
          modules: buildFallbackModules(rooms),
        }]

    return sourcePaths
      .map((path) => {
        const modules = (path.modules?.length ? path.modules : buildFallbackModules(rooms))
          .map((module) => {
            const moduleRooms = (module.rooms || [])
              .map((roomId) => roomsById.get(roomId))
              .filter(Boolean)
              .sort((a, b) => getDifficultyRank(a) - getDifficultyRank(b) || parseXp(a.xp) - parseXp(b.xp))

            const completed = moduleRooms.filter((room) => progressMap[room.id]?.completedAt).length
            const inProgress = moduleRooms.filter((room) => progressMap[room.id]?.startedAt && !progressMap[room.id]?.completedAt).length
            const completion = moduleRooms.length ? Math.round((completed / moduleRooms.length) * 100) : 0

            return {
              ...module,
              rooms: moduleRooms,
              completed,
              inProgress,
              completion,
            }
          })
          .filter((module) => module.rooms.length)

        const totalRooms = modules.reduce((sum, module) => sum + module.rooms.length, 0)
        const completedRooms = modules.reduce((sum, module) => sum + module.completed, 0)
        const pathCompletion = totalRooms ? Math.round((completedRooms / totalRooms) * 100) : 0

        return {
          ...path,
          modules,
          totalRooms,
          completedRooms,
          pathCompletion,
        }
      })
      .filter((path) => path.modules.length)
  }, [paths, progressMap, rooms])

  const allRooms = roadmap.flatMap((path) => path.modules.flatMap((module) => module.rooms))
  const completedRooms = allRooms.filter((room) => progressMap[room.id]?.completedAt).length
  const inProgressRooms = allRooms.filter((room) => progressMap[room.id]?.startedAt && !progressMap[room.id]?.completedAt).length
  const nextRoom = allRooms.find((room) => getRoomStatus(progressMap[room.id]) !== 'completed')
  const completionPercent = allRooms.length ? Math.round((completedRooms / allRooms.length) * 100) : 0
  const columns = roadmap.slice(0, 4).map((path, index) => {
    const roomsForPath = path.modules
      .flatMap((module) => module.rooms.map((room) => ({ ...room, moduleTitle: module.title })))
      .slice(0, 6)

    return {
      ...path,
      tone: getTrackTone(index, path.title),
      rooms: roomsForPath,
    }
  })

  return (
    <main className="min-h-screen bg-[#121924] pt-20 text-white">
      <section className="relative overflow-hidden px-4 py-10 sm:px-8 lg:px-12">
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        ></div>
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-500/10 to-transparent"></div>

        <div className="relative mx-auto max-w-[104rem]">
          <header className="mx-auto max-w-5xl text-center">
            <p className="font-headline text-xs font-bold uppercase tracking-[0.35em] text-primary">
              Personalized Progression
            </p>
            <h1 className="mt-4 font-headline text-4xl font-black text-white sm:text-5xl lg:text-6xl">
              Cyber Security Learning Roadmap
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base font-semibold leading-relaxed text-slate-200 sm:text-lg">
              From fundamentals to specialized tracks, this roadmap uses your rooms, paths, and progress to show the next clear step.
            </p>
          </header>

          <div className="mx-auto mt-14 flex max-w-[34rem] flex-col items-center">
            <div className="w-full rounded-md border border-slate-500/45 bg-slate-700/70 p-6 text-center shadow-xl">
              <h2 className="font-headline text-xl font-black">Computer Science Basics</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-200">
                Acquire core computing, networking, Linux, and problem-solving skills required to get started.
              </p>
            </div>
            <div className="h-14 w-1 bg-slate-500/70"></div>
            <div className="flex w-full overflow-hidden rounded-md border border-slate-500/45 bg-slate-700/70 shadow-xl">
              <div className="grid w-28 shrink-0 place-items-center bg-gradient-to-br from-lime-400/60 to-emerald-900/80">
                <span className="material-symbols-outlined text-5xl text-white">route</span>
              </div>
              <div className="flex flex-1 flex-col justify-center p-5">
                <h3 className="font-headline text-lg font-black">Pre Security</h3>
                <div className="mt-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-sm text-lime-400">signal_cellular_alt</span>
                  <span className="rounded-full bg-blue-500/30 px-4 py-1 text-xs font-bold text-blue-100">Path</span>
                </div>
              </div>
            </div>
            <div className="h-14 w-1 bg-slate-500/70"></div>
            <div className="w-full rounded-md border border-slate-500/45 bg-slate-700/70 p-6 text-center shadow-xl">
              <h2 className="font-headline text-xl font-black">Cyber Security Foundations</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-200">
                Develop the baseline security skills needed to enter any career track in the academy.
              </p>
            </div>
          </div>

          <div className="mx-auto flex max-w-[34rem] flex-col items-center">
            <div className="h-20 w-1 bg-slate-500/70"></div>
            <div className="w-full rounded-md border border-slate-500/45 bg-slate-700/70 p-6 text-center shadow-xl">
              <h2 className="font-headline text-xl font-black">Cyber Security Career Skills</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-200">
                Master the specific skills for your chosen career direction. Current completion: <span className="text-secondary">{completionPercent}%</span>.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="mx-auto mt-16 max-w-lg rounded-md border border-slate-500/45 bg-slate-700/70 p-6 text-center font-headline text-xs uppercase tracking-widest text-slate-200">
              Building roadmap...
            </div>
          ) : (
            <div className="relative mx-auto mt-20 max-w-[96rem]">
              <div className="absolute left-1/2 top-0 hidden h-24 w-1 -translate-x-1/2 bg-slate-500/70 lg:block"></div>
              <div className="absolute left-[12%] right-[12%] top-24 hidden h-1 bg-slate-500/70 lg:block"></div>

              <div className="grid gap-10 lg:grid-cols-4">
                {columns.map((column) => (
                  <section className="relative pt-16" key={column.id || column.title}>
                    <div className={`absolute left-1/2 top-0 hidden h-full w-1 -translate-x-1/2 ${column.tone.line} lg:block`}></div>
                    <div className="relative z-10 mb-7 text-center">
                      <h3 className="font-headline text-xl font-black text-white">
                        {column.title}
                      </h3>
                      <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-relaxed text-slate-300">
                        {column.description || `${column.completedRooms}/${column.totalRooms} rooms completed in this specialization.`}
                      </p>
                    </div>

                    <div className={`relative z-10 space-y-5 ${column.tone.glow}`}>
                      {column.rooms.length ? column.rooms.map((room, roomIndex) => {
                        const status = getRoomStatus(progressMap[room.id])
                        const isActive = nextRoom?.id === room.id
                        const progress = status === 'completed'
                          ? 100
                          : status === 'in-progress'
                            ? Math.max(5, Math.min(95, Math.round((column.pathCompletion || 0) / 2)))
                            : 0

                        return (
                          <Link
                            className={`group relative flex min-h-24 overflow-hidden rounded-md border bg-slate-700/85 shadow-lg transition-transform hover:-translate-y-1 ${
                              isActive
                                ? 'border-lime-400 shadow-[0_0_34px_rgba(163,230,53,0.18)]'
                                : status === 'completed'
                                  ? 'border-emerald-400/60'
                                  : column.tone.border
                            }`}
                            key={room.id}
                            to={`/learn/lab/${room.slug || room.id}`}
                          >
                            {isActive ? (
                              <span className="absolute left-1/2 top-0 z-20 -translate-x-1/2 bg-lime-400 px-5 py-1 text-[10px] font-bold text-black">
                                Next recommended
                              </span>
                            ) : null}
                            <div className={`grid w-28 shrink-0 place-items-center bg-gradient-to-br ${column.tone.panel}`}>
                              <span className="material-symbols-outlined text-5xl text-white">
                                {getIconForTrack(room.category || column.title)}
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
                              <h4 className="line-clamp-2 font-headline text-base font-black text-white">
                                {room.title}
                              </h4>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className={`material-symbols-outlined text-base ${status === 'completed' ? 'text-emerald-400' : column.tone.text}`}>
                                  {status === 'completed' ? 'check_circle' : 'signal_cellular_alt'}
                                </span>
                                <span className="rounded-full bg-blue-500/30 px-4 py-1 text-xs font-bold text-blue-100">
                                  {room.roomType === 'practical' ? 'Lab' : 'Path'}
                                </span>
                                {roomIndex > 2 ? (
                                  <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-200">
                                    Add-on
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            {progress > 0 && status !== 'completed' ? (
                              <div className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border-2 border-slate-300 text-xs font-black text-slate-100">
                                {progress}%
                              </div>
                            ) : null}
                            {status === 'completed' ? (
                              <div className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-green-500 text-black">
                                <span className="material-symbols-outlined text-xl">check</span>
                              </div>
                            ) : null}
                          </Link>
                        )
                      }) : (
                        <div className="rounded-md border border-slate-600 bg-slate-700/70 p-5 text-center text-sm text-slate-300">
                          Rooms will appear here when this path is configured.
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </div>
              {columns.length === 0 ? (
                <div className="rounded-md border border-slate-600 bg-slate-700/70 p-8 text-center text-slate-300">
                  No rooms are available for a roadmap yet.
                </div>
              ) : null}
              <div className="mx-auto mt-12 h-20 max-w-[70rem] border-x-4 border-b-4 border-slate-500/70"></div>
              <div className="mx-auto h-24 w-1 bg-slate-500/70"></div>
              <div className="mx-auto max-w-lg rounded-md border border-slate-500/45 bg-slate-700/70 p-6 text-center shadow-xl">
                <h2 className="font-headline text-xl font-black">Current Mission Focus</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-200">
                  {nextRoom
                    ? `Next up: ${nextRoom.title}.`
                    : 'Every mapped room is complete. Watch for new missions from the academy.'}
                </p>
                {nextRoom ? (
                  <Link
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded bg-primary px-5 py-3 font-headline text-xs font-black uppercase text-on-primary"
                    to={`/learn/lab/${nextRoom.slug || nextRoom.id}`}
                  >
                    Continue
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </Link>
                ) : null}
              </div>
            </div>
          )}

          <div className="fixed bottom-6 right-6 z-20 hidden h-14 w-14 place-items-center rounded-full bg-slate-700/90 text-lime-400 shadow-xl sm:grid">
            <span className="material-symbols-outlined">route</span>
          </div>

          <div className="relative mx-auto mt-14 grid max-w-4xl gap-4 rounded-md border border-slate-500/30 bg-slate-800/70 p-5 sm:grid-cols-3">
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-slate-400">Cleared</p>
              <p className="mt-1 font-space text-3xl font-black text-secondary">{completedRooms}</p>
            </div>
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-slate-400">In Progress</p>
              <p className="mt-1 font-space text-3xl font-black text-primary">{inProgressRooms}</p>
            </div>
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Nodes</p>
              <p className="mt-1 font-space text-3xl font-black text-white">{allRooms.length}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default RoadmapPage
