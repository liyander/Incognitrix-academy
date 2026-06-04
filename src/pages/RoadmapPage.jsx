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
    <main className="min-h-screen bg-surface pt-32 md:pt-36 text-on-surface">
      <section className="relative overflow-hidden px-4 py-10 sm:px-8 lg:px-12">
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(102,217,239,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(102,217,239,0.16) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        ></div>
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 to-transparent"></div>

        <div className="relative mx-auto max-w-[104rem]">
          <header className="mx-auto max-w-5xl text-center">
            <p className="font-headline text-xs font-bold uppercase tracking-[0.35em] text-primary">
              Operator Progression Matrix
            </p>
            <h1 className="mt-4 font-headline text-4xl font-black uppercase tracking-tight text-on-background sm:text-5xl lg:text-6xl">
              Incognitrix Roadmap
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base font-medium leading-relaxed text-on-surface-variant sm:text-lg">
              A live mission route built from academy rooms, career paths, Docker/practical labs, and your completion state.
            </p>
          </header>

          <div className="relative mx-auto mt-12 max-w-3xl">
            <div className="absolute left-1/2 top-0 hidden h-full w-[3px] -translate-x-1/2 bg-secondary/40 sm:block"></div>
            {[
              {
                label: 'Phase 00',
                title: 'Platform Orientation',
                body: 'Understand the academy workflow: read room content, use notes, answer assessments, and spawn isolated lab machines.',
                icon: 'explore',
              },
              {
                label: 'Phase 01',
                title: 'Core Operator Skills',
                body: 'Build enough Linux, networking, web, and security vocabulary to move through beginner and intermediate rooms.',
                icon: 'terminal',
              },
              {
                label: 'Phase 02',
                title: 'Specialization Routing',
                body: `Choose a path from the active curriculum. Overall mapped completion is ${completionPercent}%.`,
                icon: 'route',
              },
            ].map((phase, index) => (
              <div className="relative flex justify-center" key={phase.title}>
                {index > 0 ? <div className="h-10 w-[3px] bg-secondary/55"></div> : null}
                <div className="relative z-10 w-full max-w-xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-xl">
                  <div className="flex items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center bg-primary/10 text-primary">
                      <span className="material-symbols-outlined">{phase.icon}</span>
                    </span>
                    <div className="min-w-0">
                      <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                        {phase.label}
                      </p>
                      <h2 className="mt-1 font-headline text-xl font-black uppercase tracking-tight text-on-background">
                        {phase.title}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                        {phase.body}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mx-auto hidden h-16 w-[3px] bg-secondary/65 shadow-[0_0_18px_rgba(102,217,239,0.25)] lg:block"></div>

          {isLoading ? (
            <div className="mx-auto mt-16 max-w-lg border border-outline-variant/50 bg-surface-container-lowest p-6 text-center font-headline text-xs uppercase tracking-widest text-on-surface-variant">
              Building roadmap...
            </div>
          ) : (
            <div className="relative mx-auto mt-0 max-w-[96rem]">
              <div className="relative mx-auto hidden h-20 max-w-[78rem] lg:block">
                <div className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 bg-secondary/70 shadow-[0_0_18px_rgba(102,217,239,0.25)]"></div>
                <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-secondary/55 shadow-[0_0_18px_rgba(102,217,239,0.16)]"></div>
                <div className="absolute bottom-0 left-[12.5%] h-10 w-[3px] translate-y-full bg-secondary/55"></div>
                <div className="absolute bottom-0 left-[37.5%] h-10 w-[3px] translate-y-full bg-secondary/55"></div>
                <div className="absolute bottom-0 left-[62.5%] h-10 w-[3px] translate-y-full bg-secondary/55"></div>
                <div className="absolute bottom-0 left-[87.5%] h-10 w-[3px] translate-y-full bg-secondary/55"></div>
              </div>

              <div className="grid gap-8 lg:mt-10 lg:grid-cols-4 lg:items-start">
                {columns.map((column) => (
                  <section className="relative pt-10" key={column.id || column.title}>
                    <div className={`absolute left-1/2 top-0 hidden h-full w-[3px] -translate-x-1/2 ${column.tone.line} lg:block`}></div>
                    <div className="absolute left-1/2 top-0 hidden h-10 w-[3px] -translate-x-1/2 bg-secondary/70 lg:block"></div>
                    <div className="relative z-10 mx-auto min-h-40 border border-outline-variant/60 bg-surface-container-lowest p-5 text-center shadow-xl">
                      <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                        Specialization
                      </p>
                      <h3 className="mt-2 font-headline text-xl font-black uppercase tracking-tight text-on-background">
                        {column.title}
                      </h3>
                      <p className="mx-auto mt-2 line-clamp-3 max-w-xs text-sm leading-relaxed text-on-surface-variant">
                        {column.description || `${column.completedRooms}/${column.totalRooms} rooms completed in this specialization.`}
                      </p>
                      <div className="mt-4 h-1.5 bg-surface-container-high">
                        <div className="h-full bg-secondary" style={{ width: `${column.pathCompletion}%` }}></div>
                      </div>
                    </div>

                    <div className={`relative z-10 mx-auto hidden h-6 w-[3px] ${column.tone.line} lg:block`}></div>

                    <div className="relative z-10 space-y-0">
                      {column.rooms.length ? column.rooms.map((room, roomIndex) => {
                        const status = getRoomStatus(progressMap[room.id])
                        const isActive = nextRoom?.id === room.id
                        const progress = status === 'completed'
                          ? 100
                          : status === 'in-progress'
                            ? Math.max(5, Math.min(95, Math.round((column.pathCompletion || 0) / 2)))
                            : 0

                        return (
                          <div className="relative" key={room.id}>
                            {roomIndex > 0 ? (
                              <div className={`mx-auto hidden h-4 w-[3px] ${column.tone.line} lg:block`}></div>
                            ) : null}
                            <Link
                              className={`group relative z-10 flex min-h-28 overflow-hidden border bg-surface-container-lowest shadow-lg transition-transform hover:-translate-y-0.5 ${
                                isActive
                                  ? 'border-secondary shadow-[0_0_30px_rgba(102,217,239,0.14)]'
                                  : status === 'completed'
                                    ? 'border-secondary/60'
                                    : column.tone.border
                              }`}
                              to={`/learn/lab/${room.slug || room.id}`}
                            >
                              {isActive ? (
                                <span className="absolute left-0 top-0 z-20 bg-secondary px-3 py-1 font-headline text-[9px] font-bold uppercase tracking-widest text-on-secondary">
                                  Next
                                </span>
                              ) : null}
                              <div className={`grid w-24 shrink-0 place-items-center bg-gradient-to-br ${column.tone.panel}`}>
                                <span className="material-symbols-outlined text-4xl text-on-background">
                                  {getIconForTrack(room.category || column.title)}
                                </span>
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col justify-center p-4 pr-16">
                                <h4 className="line-clamp-2 font-headline text-sm font-black uppercase tracking-wide text-on-background">
                                  {room.title}
                                </h4>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className={`material-symbols-outlined text-base ${status === 'completed' ? 'text-secondary' : column.tone.text}`}>
                                    {status === 'completed' ? 'check_circle' : 'signal_cellular_alt'}
                                  </span>
                                  <span className="bg-surface-container-high px-3 py-1 font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                    {room.roomType === 'practical' ? 'Lab' : 'Path'}
                                  </span>
                                  {roomIndex > 2 || room.moduleTitle ? (
                                    <span className="max-w-full truncate bg-primary/10 px-3 py-1 font-headline text-[10px] font-bold uppercase tracking-widest text-primary">
                                      {room.moduleTitle || 'Extension'}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              {progress > 0 && status !== 'completed' ? (
                                <div className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border-2 border-primary bg-surface-container-lowest text-[10px] font-black text-primary">
                                  {progress}%
                                </div>
                              ) : null}
                              {status === 'completed' ? (
                                <div className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-secondary text-on-secondary">
                                  <span className="material-symbols-outlined text-xl">check</span>
                                </div>
                              ) : null}
                            </Link>
                            {roomIndex < column.rooms.length - 1 ? (
                              <div className={`mx-auto hidden h-4 w-[3px] ${column.tone.line} lg:block`}></div>
                            ) : null}
                            </div>
                        )
                      }) : (
                        <div className="border border-outline-variant/50 bg-surface-container-lowest p-5 text-center text-sm text-on-surface-variant">
                          Rooms will appear here when this path is configured.
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </div>
              {columns.length === 0 ? (
                <div className="border border-outline-variant/50 bg-surface-container-lowest p-8 text-center text-on-surface-variant">
                  No rooms are available for a roadmap yet.
                </div>
              ) : null}
              <div className="mx-auto mt-10 hidden h-12 w-[3px] bg-secondary/65 shadow-[0_0_18px_rgba(102,217,239,0.18)] lg:block"></div>
              <div className="mx-auto max-w-xl border border-outline-variant/50 bg-surface-container-lowest p-6 text-center shadow-xl">
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-secondary">
                  Current Mission Focus
                </p>
                <h2 className="mt-2 font-headline text-xl font-black uppercase tracking-tight text-on-background">
                  {nextRoom?.title || 'All Mapped Missions Cleared'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {nextRoom
                    ? nextRoom.description
                    : 'Every mapped room is complete. Watch for new missions from the academy.'}
                </p>
                {nextRoom ? (
                  <Link
                    className="mt-5 inline-flex items-center justify-center gap-2 bg-primary px-5 py-3 font-headline text-xs font-black uppercase tracking-widest text-on-primary"
                    to={`/learn/lab/${nextRoom.slug || nextRoom.id}`}
                  >
                    Enter Mission
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </Link>
                ) : null}
              </div>
            </div>
          )}

          <div className="relative mx-auto mt-14 grid max-w-4xl gap-4 border border-outline-variant/40 bg-surface-container-lowest p-5 sm:grid-cols-3">
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Cleared</p>
              <p className="mt-1 font-space text-3xl font-black text-secondary">{completedRooms}</p>
            </div>
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">In Progress</p>
              <p className="mt-1 font-space text-3xl font-black text-primary">{inProgressRooms}</p>
            </div>
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Mapped Rooms</p>
              <p className="mt-1 font-space text-3xl font-black text-on-background">{allRooms.length}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default RoadmapPage
