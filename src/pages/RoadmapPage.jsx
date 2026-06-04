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

  return (
    <main className="pt-20 min-h-screen bg-surface">
      <section className="px-6 lg:px-12 py-12">
        <div className="border-l-4 border-primary bg-surface-container-lowest p-8 lg:p-10">
          <p className="font-headline text-xs font-bold uppercase tracking-[0.35em] text-primary">
            Personalized Progression
          </p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
            <div>
              <h1 className="font-headline text-5xl lg:text-7xl font-black uppercase tracking-tighter text-on-background">
                Mission Roadmap
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-on-surface-variant">
                Your route is assembled from active academy paths, available rooms, and your completion history.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-container-high p-4">
                <p className="font-headline text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Complete
                </p>
                <p className="mt-2 font-space text-3xl font-black text-secondary">{completionPercent}%</p>
              </div>
              <div className="bg-surface-container-high p-4">
                <p className="font-headline text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Cleared
                </p>
                <p className="mt-2 font-space text-3xl font-black text-on-background">{completedRooms}</p>
              </div>
              <div className="bg-surface-container-high p-4">
                <p className="font-headline text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Active
                </p>
                <p className="mt-2 font-space text-3xl font-black text-primary">{inProgressRooms}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 lg:px-12 pb-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-8">
            {isLoading ? (
              <div className="bg-surface-container-low p-8 font-headline text-xs uppercase tracking-widest text-on-surface-variant">
                Building roadmap...
              </div>
            ) : roadmap.length ? (
              roadmap.map((path, pathIndex) => (
                <article key={path.id || path.title} className="bg-surface-container-lowest p-6 lg:p-8">
                  <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-outline-variant/40 pb-6">
                    <div>
                      <p className="font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
                        Path {String(pathIndex + 1).padStart(2, '0')}
                      </p>
                      <h2 className="mt-2 font-headline text-3xl font-black uppercase tracking-tight">
                        {path.title}
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                        {path.description}
                      </p>
                    </div>
                    <div className="min-w-44">
                      <div className="flex justify-between font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        <span>{path.completedRooms}/{path.totalRooms}</span>
                        <span>{path.pathCompletion}%</span>
                      </div>
                      <div className="mt-2 h-2 bg-surface-container-high">
                        <div className="h-full bg-secondary" style={{ width: `${path.pathCompletion}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {path.modules.map((module, moduleIndex) => (
                      <div key={module.id || module.title} className="grid gap-5 md:grid-cols-[10rem_minmax(0,1fr)]">
                        <div className="border-l-2 border-primary pl-4">
                          <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-primary">
                            {module.phase || `Module ${moduleIndex + 1}`}
                          </p>
                          <h3 className="mt-2 font-headline text-lg font-black uppercase tracking-tight">
                            {module.title}
                          </h3>
                          <p className="mt-2 text-xs text-on-surface-variant">
                            {module.completed}/{module.rooms.length} rooms complete
                          </p>
                        </div>
                        <div className="grid gap-3">
                          {module.rooms.map((room) => {
                            const status = getRoomStatus(progressMap[room.id])
                            return (
                              <Link
                                className={`group flex items-center gap-4 border p-4 transition-colors ${
                                  status === 'completed'
                                    ? 'border-secondary/40 bg-secondary/10'
                                    : status === 'in-progress'
                                      ? 'border-primary/40 bg-primary/10'
                                      : 'border-outline-variant/30 bg-surface-container-low hover:border-primary/50'
                                }`}
                                key={room.id}
                                to={`/learn/lab/${room.slug || room.id}`}
                              >
                                <span className={`material-symbols-outlined shrink-0 ${
                                  status === 'completed' ? 'text-secondary' : status === 'in-progress' ? 'text-primary' : 'text-on-surface-variant'
                                }`}>
                                  {status === 'completed' ? 'task_alt' : status === 'in-progress' ? 'radio_button_checked' : 'radio_button_unchecked'}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-headline text-sm font-black uppercase tracking-wide text-on-background">
                                    {room.title}
                                  </span>
                                  <span className="mt-1 block truncate text-xs text-on-surface-variant">
                                    {(room.category || room.categoryTag || 'General')} / {(room.difficulty || room.level || 'N/A')} / {room.roomType || 'theoretical'}
                                  </span>
                                </span>
                                <span className="hidden sm:block font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                  {status === 'completed' ? 'Cleared' : status === 'in-progress' ? 'Resume' : 'Start'}
                                </span>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="bg-surface-container-low p-8 text-on-surface-variant">
                No rooms are available for a roadmap yet.
              </div>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="bg-primary text-on-primary p-6">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.3em] opacity-80">
                Next Assignment
              </p>
              <h2 className="mt-4 font-headline text-2xl font-black uppercase tracking-tight">
                {nextRoom?.title || 'All Clear'}
              </h2>
              <p className="mt-3 text-sm leading-relaxed opacity-85">
                {nextRoom
                  ? nextRoom.description
                  : 'Every mapped room is completed. New rooms will appear here when the curriculum expands.'}
              </p>
              {nextRoom ? (
                <Link
                  className="mt-6 inline-flex w-full items-center justify-between bg-on-primary px-4 py-3 font-headline text-[10px] font-bold uppercase tracking-widest text-primary"
                  to={`/learn/lab/${nextRoom.slug || nextRoom.id}`}
                >
                  Continue Route
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
              ) : null}
            </div>

            <div className="bg-surface-container-low p-6">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-secondary">
                Division Criteria
              </p>
              <div className="mt-5 space-y-4 text-sm text-on-surface-variant">
                <p><span className="font-bold text-on-surface">Foundation:</span> complete easy rooms across at least two categories.</p>
                <p><span className="font-bold text-on-surface">Operator:</span> finish medium rooms and keep one practical lab active.</p>
                <p><span className="font-bold text-on-surface">Specialist:</span> clear advanced rooms with consistent theoretical scores.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}

export default RoadmapPage
