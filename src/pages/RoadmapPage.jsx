import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCareerPathsData, hydrateCareerPathsData } from '../data/careerPathsData'
import { getRoomsData, hydrateRoomsData } from '../data/roomsData'
import {
  getLabProgressEvents,
  getLabProgressMap,
  syncLabProgressFromBackend,
} from '../services/labProgress'
import { apiFetch } from '../services/api'

function getRoomStatus(progress) {
  if (progress?.completedAt) return 'completed'
  if (progress?.startedAt) return 'in-progress'
  return 'queued'
}

const INTRO_TO_CYBERSECURITY_PATTERN = /(?:introduction|intro)[-_\s]+to[-_\s]+cyber[-_\s]*security|cyber[-_\s]*security[-_\s]+(?:introduction|intro)|cyber[-_\s]*security[-_\s]+101/

function isCybersecurityIntroRoom(room) {
  const text = `${room?.title || ''} ${room?.slug || ''} ${room?.id || ''}`.toLowerCase()
  return INTRO_TO_CYBERSECURITY_PATTERN.test(text)
}

function isCybersecurityIntroPath(path) {
  const text = `${path?.title || ''} ${path?.slug || ''} ${path?.id || ''}`.toLowerCase()
  return INTRO_TO_CYBERSECURITY_PATTERN.test(text)
}

function isCybersecurityIntroModule(module) {
  const text = `${module?.title || ''} ${module?.phase || ''} ${module?.id || ''}`.toLowerCase()
  const moduleTitleMatches = INTRO_TO_CYBERSECURITY_PATTERN.test(text)
  const moduleOnlyContainsIntro = (module?.rooms || []).length > 0 && (module.rooms || []).every(isCybersecurityIntroRoom)
  return moduleTitleMatches || moduleOnlyContainsIntro
}

function sortPathsByRoadmapOrder(paths) {
  return [...paths].sort((a, b) =>
    (a.roadmapSortOrder ?? 0) - (b.roadmapSortOrder ?? 0)
    || String(a.title || '').localeCompare(String(b.title || '')),
  )
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
  const [roadmapZoom, setRoadmapZoom] = useState(1)
  const pinchStateRef = useRef({ distance: 0, zoom: 1 })

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
    const hasConfiguredPaths = paths.length > 0
    const sourcePaths = paths.length
      ? paths
      : [{
          id: 'all-rooms',
          title: 'MISSION CATALOG',
          description: 'A generated roadmap from all available academy rooms.',
          modules: buildFallbackModules(rooms),
        }]

    return sortPathsByRoadmapOrder(sourcePaths)
      .map((path) => {
        const modules = (hasConfiguredPaths ? (path.modules || []) : buildFallbackModules(rooms))
          .map((module) => {
            const moduleRooms = (module.rooms || [])
              .map((roomId) => roomsById.get(roomId))
              .filter(Boolean)

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
      .filter((path) => hasConfiguredPaths || path.modules.length)
  }, [paths, progressMap, rooms])

  const allRooms = roadmap.flatMap((path) => path.modules.flatMap((module) => module.rooms))
  const completedRooms = allRooms.filter((room) => progressMap[room.id]?.completedAt).length
  const inProgressRooms = allRooms.filter((room) => progressMap[room.id]?.startedAt && !progressMap[room.id]?.completedAt).length
  const nextRoom = allRooms.find((room) => getRoomStatus(progressMap[room.id]) !== 'completed')
  const foundationPath = roadmap.find(isCybersecurityIntroPath)
  const foundationPathRooms = foundationPath?.modules?.flatMap((module) => module.rooms) || []
  const foundationRoom = foundationPathRooms.find(isCybersecurityIntroRoom) || allRooms.find(isCybersecurityIntroRoom)
  const foundationTargetRoom = foundationRoom
    || allRooms.find((room) => /foundation|basic|intro/i.test(room.title || room.category || ''))
    || allRooms[0]
  const pathsById = new Map(roadmap.map((path) => [path.id, path]))
  const linkedPathIds = new Set(
    roadmap.flatMap((path) => path.modules.map((module) => module.linkedPathId).filter(Boolean)),
  )
  const foundationFlowModules = foundationPath?.modules || []
  const branchPaths = roadmap.filter((path) => (
    path.id !== foundationPath?.id && !linkedPathIds.has(path.id)
  ))
  const foundationEntry = foundationPath || (foundationTargetRoom
    ? {
        id: 'foundation-entry',
        slug: foundationTargetRoom.slug || foundationTargetRoom.id,
        title: 'Introduction to Cybersecurity',
        description: foundationRoom?.description || 'Begin here before branching into academy specializations, practical labs, and role-based paths.',
        pathCompletion: getRoomStatus(progressMap[foundationTargetRoom.id]) === 'completed' ? 100 : 0,
      }
    : null)
  const columns = branchPaths.map((path, index) => {
    const modulesForPath = path.modules.filter((module) => !isCybersecurityIntroModule(module))

    return {
      ...path,
      tone: getTrackTone(index, path.title),
      modules: modulesForPath,
    }
  })
  const linkedPathSideAllowance = linkedPathIds.size ? 24 : 0
  const branchColumnWidth = `${Math.max(12, 18 * roadmapZoom).toFixed(2)}rem`
  const branchGridColumns = `repeat(${Math.max(columns.length, 1)}, minmax(${branchColumnWidth}, 1fr))`
  const branchGridWidth = `${(Math.max(columns.length, 4) * 20 * roadmapZoom) + linkedPathSideAllowance}rem`
  const setClampedRoadmapZoom = (value) => {
    setRoadmapZoom(Math.max(0.7, Math.min(1.3, Number(value.toFixed(2)))))
  }

  const getTouchDistance = (touches) => {
    if (!touches || touches.length < 2) return 0
    const [first, second] = touches
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
  }

  const handlePinchStart = (event) => {
    if (event.touches.length !== 2) return
    pinchStateRef.current = {
      distance: getTouchDistance(event.touches),
      zoom: roadmapZoom,
    }
  }

  const handlePinchMove = (event) => {
    if (event.touches.length !== 2 || !pinchStateRef.current.distance) return
    event.preventDefault()
    const nextDistance = getTouchDistance(event.touches)
    const scale = nextDistance / pinchStateRef.current.distance
    setClampedRoadmapZoom(pinchStateRef.current.zoom * scale)
  }

  const handlePinchEnd = () => {
    pinchStateRef.current = { distance: 0, zoom: roadmapZoom }
  }

  const handleWheelZoom = (event) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    const direction = event.deltaY > 0 ? -0.08 : 0.08
    setClampedRoadmapZoom(roadmapZoom + direction)
  }

  const renderLinkedPathBranch = (linkedPath, tone, keyPrefix) => {
    if (!linkedPath) return null

    const childModules = (linkedPath.modules || []).filter((module) => !isCybersecurityIntroModule(module))
    const lineClass = tone?.line || 'bg-secondary/70'
    const borderClass = tone?.border || 'border-secondary/50'
    const panelClass = tone?.panel || 'from-secondary/30 to-surface-container-high'
    const textClass = tone?.text || 'text-secondary'
    const pathTarget = `/learn/path/${linkedPath.slug || linkedPath.id}`

    return (
      <div
        className="relative mx-auto mt-3 max-w-[92%] lg:absolute lg:left-full lg:top-1/2 lg:z-30 lg:ml-7 lg:mt-0 lg:w-80 lg:max-w-none lg:-translate-y-1/2"
        key={`${keyPrefix}-${linkedPath.id}`}
      >
        <div className={`mx-auto hidden h-5 w-[3px] ${lineClass} lg:hidden`}></div>
        <div className={`absolute -left-7 top-1/2 hidden h-[3px] w-7 -translate-y-1/2 ${lineClass} lg:block`}></div>
        <div className={`absolute -left-2 top-1/2 hidden h-3 w-3 -translate-y-1/2 border-2 ${borderClass} bg-surface-container-lowest lg:block`}></div>
        <Link
          className={`group relative z-10 block border ${borderClass} bg-surface-container-lowest p-4 text-left shadow-[0_0_24px_rgba(102,217,239,0.10)] transition-transform hover:-translate-y-0.5`}
          to={pathTarget}
        >
          <div className="flex items-start gap-4">
            <span className={`grid h-12 w-12 shrink-0 place-items-center bg-gradient-to-br ${panelClass}`}>
              <span className="material-symbols-outlined text-2xl text-on-background">
                account_tree
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-headline text-[9px] font-bold uppercase tracking-[0.24em] text-secondary">
                Linked Sub-Path
              </p>
              <h4 className="mt-1 line-clamp-2 font-headline text-sm font-black uppercase tracking-wide text-on-background">
                {linkedPath.title}
              </h4>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-on-surface-variant">
                {linkedPath.description || `${linkedPath.completedRooms}/${linkedPath.totalRooms} rooms mapped in this sub-path.`}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className={`font-space text-xl font-black ${textClass}`}>
                {linkedPath.pathCompletion || 0}%
              </span>
              <p className="font-headline text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                Complete
              </p>
            </div>
          </div>
        </Link>
        {childModules.length ? (
          <div className={`ml-8 border-l-2 ${borderClass} pl-5`}>
            {childModules.map((childModule, childIndex) => {
              const childFirstRoom = childModule.rooms?.[0]
              const childTarget = childModule.id
                ? `/learn/path/${linkedPath.slug || linkedPath.id}/module/${childModule.id}`
                : childFirstRoom
                  ? `/learn/lab/${childFirstRoom.slug || childFirstRoom.id}`
                  : pathTarget

              return (
                <div className="relative" key={`${keyPrefix}-${linkedPath.id}-${childModule.id}`}>
                  <div className={`absolute -left-5 top-8 h-[2px] w-5 ${lineClass}`}></div>
                  <Link
                    className={`mt-3 flex min-h-20 border ${borderClass} bg-surface-container-lowest shadow-sm transition-transform hover:-translate-y-0.5`}
                    to={childTarget}
                  >
                    <div className={`grid w-16 shrink-0 place-items-center bg-gradient-to-br ${panelClass}`}>
                      <span className="material-symbols-outlined text-2xl text-on-background">
                        {getIconForTrack(childModule.title || linkedPath.title)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 p-3 pr-12">
                      <p className="font-headline text-[8px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {childModule.phase || `Module ${String(childIndex + 1).padStart(2, '0')}`} / {childModule.rooms.length} rooms
                      </p>
                      <h5 className="mt-1 line-clamp-2 font-headline text-xs font-black uppercase tracking-wide text-on-background">
                        {childModule.title}
                      </h5>
                    </div>
                    {childModule.completion > 0 ? (
                      <div className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border-2 bg-surface-container-lowest text-[9px] font-black ${textClass}`}>
                        {childModule.completion}%
                      </div>
                    ) : null}
                  </Link>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    )
  }

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

          {isLoading ? (
            <div className="mx-auto mt-16 max-w-lg border border-outline-variant/50 bg-surface-container-lowest p-6 text-center font-headline text-xs uppercase tracking-widest text-on-surface-variant">
              Building roadmap...
            </div>
          ) : (
            <div className="relative mx-auto mt-12 max-w-[96rem]">
              <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-lowest px-4 py-2 font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface hover:border-secondary disabled:opacity-40"
                  disabled={roadmapZoom <= 0.7}
                  onClick={() => setRoadmapZoom((current) => Math.max(0.7, Number((current - 0.1).toFixed(2))))}
                  type="button"
                >
                  <span className="material-symbols-outlined text-base">zoom_out</span>
                  Shrink
                </button>
                <button
                  className="inline-flex items-center gap-2 border border-secondary bg-secondary/10 px-4 py-2 font-headline text-[10px] font-bold uppercase tracking-widest text-secondary"
                  onClick={() => setRoadmapZoom(1)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-base">center_focus_strong</span>
                  {Math.round(roadmapZoom * 100)}%
                </button>
                <button
                  className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-lowest px-4 py-2 font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface hover:border-secondary disabled:opacity-40"
                  disabled={roadmapZoom >= 1.3}
                  onClick={() => setRoadmapZoom((current) => Math.min(1.3, Number((current + 0.1).toFixed(2))))}
                  type="button"
                >
                  <span className="material-symbols-outlined text-base">zoom_in</span>
                  Expand
                </button>
              </div>

              <div
                className="overflow-x-auto pb-4 [touch-action:pan-x_pan-y]"
                onTouchCancel={handlePinchEnd}
                onTouchEnd={handlePinchEnd}
                onTouchMove={handlePinchMove}
                onTouchStart={handlePinchStart}
                onWheel={handleWheelZoom}
              >
              <div className="mx-auto" style={{ width: branchGridWidth }}>
              <div className="mx-auto hidden h-10 w-[3px] bg-secondary/65 shadow-[0_0_18px_rgba(102,217,239,0.25)] lg:block"></div>
              {foundationEntry ? (
                <Link
                  className="group relative z-10 mx-auto flex max-w-2xl border border-secondary/70 bg-surface-container-lowest p-5 shadow-[0_0_34px_rgba(102,217,239,0.12)] transition-transform hover:-translate-y-0.5"
                  to={foundationPath ? `/learn/path/${foundationPath.slug || foundationPath.id}` : `/learn/lab/${foundationTargetRoom.slug || foundationTargetRoom.id}`}
                >
                  <div className="grid h-20 w-20 shrink-0 place-items-center bg-secondary/20 text-secondary">
                    <span className="material-symbols-outlined text-4xl">
                      shield
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 px-5">
                    <p className="font-headline text-[10px] font-bold uppercase tracking-[0.28em] text-secondary">
                      Foundation Entry
                    </p>
                    <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-on-background">
                      {foundationEntry.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-on-surface-variant">
                      {foundationEntry.description || 'Begin here before branching into academy specializations, practical labs, and role-based paths.'}
                    </p>
                  </div>
                  <div className="hidden min-w-24 flex-col items-end justify-center sm:flex">
                    <span className="font-space text-3xl font-black text-secondary">
                      {foundationEntry.pathCompletion || 0}%
                    </span>
                    <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Complete
                    </span>
                  </div>
                </Link>
              ) : null}
              {foundationFlowModules.length ? (
                <div className="mx-auto max-w-2xl">
                  <div className="mx-auto hidden h-8 w-[5px] bg-secondary shadow-[0_0_18px_rgba(102,217,239,0.28)] lg:block"></div>
                  <div className="space-y-0">
                    {foundationFlowModules.map((module, moduleIndex) => {
                      const firstRoom = module.rooms?.[0]
                      const isActive = module.rooms?.some((room) => nextRoom?.id === room.id)
                      const linkedPath = module.linkedPathId ? pathsById.get(module.linkedPathId) : null
                      const moduleTarget = module.id
                        ? linkedPath
                          ? `/learn/path/${linkedPath.slug || linkedPath.id}`
                          : `/learn/path/${foundationPath.slug || foundationPath.id}/module/${module.id}`
                        : firstRoom
                          ? `/learn/lab/${firstRoom.slug || firstRoom.id}`
                          : `/learn/path/${foundationPath.slug || foundationPath.id}`

                      return (
                        <div className={`relative ${linkedPath ? 'lg:min-h-[27rem]' : ''}`} key={`foundation-${module.id}`}>
                          {moduleIndex > 0 ? (
                            <div className="mx-auto hidden h-4 w-[3px] bg-secondary/70 lg:block"></div>
                          ) : null}
                          <Link
                            className={`group relative z-10 flex min-h-24 overflow-hidden border bg-surface-container-lowest shadow-lg transition-transform hover:-translate-y-0.5 ${
                              isActive
                                ? 'border-secondary shadow-[0_0_30px_rgba(102,217,239,0.14)]'
                                : module.completion === 100
                                  ? 'border-secondary/60'
                                  : 'border-secondary/40'
                            }`}
                            to={moduleTarget}
                          >
                            {isActive ? (
                              <span className="absolute left-0 top-0 z-20 bg-secondary px-3 py-1 font-headline text-[9px] font-bold uppercase tracking-widest text-on-secondary">
                                Next
                              </span>
                            ) : null}
                            <div className="grid w-24 shrink-0 place-items-center bg-secondary/20">
                              <span className="material-symbols-outlined text-4xl text-secondary">
                                {getIconForTrack(module.title)}
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col justify-center p-4 pr-14">
                              <p className="font-headline text-[9px] font-bold uppercase tracking-widest text-primary">
                                {module.phase || `Module ${String(moduleIndex + 1).padStart(2, '0')}`} / {module.rooms.length} rooms
                              </p>
                              <h4 className="mt-1 line-clamp-2 font-headline text-sm font-black uppercase tracking-wide text-on-background">
                                {module.title}
                              </h4>
                              {linkedPath ? (
                                <p className="mt-2 line-clamp-1 font-headline text-[9px] font-bold uppercase tracking-widest text-secondary">
                                  Links to {linkedPath.title}
                                </p>
                              ) : null}
                            </div>
                            {module.completion > 0 && module.completion < 100 ? (
                              <div className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border-2 border-secondary bg-surface-container-lowest text-[10px] font-black text-secondary">
                                {module.completion}%
                              </div>
                            ) : null}
                            {module.completion === 100 ? (
                              <div className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-secondary text-on-secondary">
                                <span className="material-symbols-outlined text-xl">check</span>
                              </div>
                            ) : null}
                          </Link>
                          {linkedPath ? renderLinkedPathBranch(linkedPath, null, `foundation-link-${module.id}`) : null}
                          <div className="mx-auto hidden h-4 w-[3px] bg-secondary/70 lg:block"></div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              <div className="relative mx-auto hidden h-32 w-full lg:block">
                <div className="absolute left-1/2 -top-px h-full w-[5px] -translate-x-1/2 bg-secondary shadow-[0_0_26px_rgba(102,217,239,0.45)]"></div>
                <div className="absolute left-0 right-0 bottom-0 h-[5px] bg-secondary shadow-[0_0_22px_rgba(102,217,239,0.32)]"></div>
                <div className="absolute inset-x-0 bottom-0 grid translate-y-full gap-8" style={{ gridTemplateColumns: branchGridColumns }}>
                  {columns.map((column) => (
                    <div className="h-10" key={`root-link-${column.id || column.title}`}>
                      <div className="mx-auto h-full w-[5px] bg-secondary shadow-[0_0_18px_rgba(102,217,239,0.28)]"></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-8 lg:mt-10 lg:items-start" style={{ gridTemplateColumns: branchGridColumns }}>
                {columns.map((column) => (
                  <section className="relative pt-10" key={column.id || column.title}>
                    <div className={`absolute left-1/2 top-0 hidden h-full w-[3px] -translate-x-1/2 ${column.tone.line} lg:block`}></div>
                    <div className="absolute left-1/2 top-0 hidden h-10 w-[5px] -translate-x-1/2 bg-secondary shadow-[0_0_16px_rgba(102,217,239,0.22)] lg:block"></div>
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
                      {column.modules.length ? column.modules.map((module, moduleIndex) => {
                        const isActive = module.rooms?.some((room) => nextRoom?.id === room.id)
                        const firstRoom = module.rooms?.[0]
                        const progress = module.completion || 0
                        const linkedPath = module.linkedPathId ? pathsById.get(module.linkedPathId) : null
                        const moduleTarget = module.id
                          ? linkedPath
                            ? `/learn/path/${linkedPath.slug || linkedPath.id}`
                            : `/learn/path/${column.slug || column.id}/module/${module.id}`
                          : firstRoom
                            ? `/learn/lab/${firstRoom.slug || firstRoom.id}`
                            : `/learn/path/${column.slug || column.id}`

                        return (
                          <div className={`relative ${linkedPath ? 'lg:min-h-[27rem]' : ''}`} key={module.id}>
                            {moduleIndex > 0 ? (
                              <div className={`mx-auto hidden h-4 w-[3px] ${column.tone.line} lg:block`}></div>
                            ) : null}
                            <Link
                              className={`group relative z-10 flex min-h-28 overflow-hidden border bg-surface-container-lowest shadow-lg transition-transform hover:-translate-y-0.5 ${
                                isActive
                                  ? 'border-secondary shadow-[0_0_30px_rgba(102,217,239,0.14)]'
                                  : progress === 100
                                    ? 'border-secondary/60'
                                    : column.tone.border
                              }`}
                              to={moduleTarget}
                            >
                              {isActive ? (
                                <span className="absolute left-0 top-0 z-20 bg-secondary px-3 py-1 font-headline text-[9px] font-bold uppercase tracking-widest text-on-secondary">
                                  Next
                                </span>
                              ) : null}
                              <div className={`grid w-24 shrink-0 place-items-center bg-gradient-to-br ${column.tone.panel}`}>
                                <span className="material-symbols-outlined text-4xl text-on-background">
                                  {getIconForTrack(module.title || column.title)}
                                </span>
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col justify-center p-4 pr-16">
                                <h4 className="line-clamp-2 font-headline text-sm font-black uppercase tracking-wide text-on-background">
                                  {module.title}
                                </h4>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className={`material-symbols-outlined text-base ${progress === 100 ? 'text-secondary' : column.tone.text}`}>
                                    {progress === 100 ? 'check_circle' : 'signal_cellular_alt'}
                                  </span>
                                  <span className="bg-surface-container-high px-3 py-1 font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                    {module.phase || `Module ${String(moduleIndex + 1).padStart(2, '0')}`}
                                  </span>
                                  <span className="max-w-full truncate bg-primary/10 px-3 py-1 font-headline text-[10px] font-bold uppercase tracking-widest text-primary">
                                    {module.rooms.length} rooms
                                  </span>
                                  {module.description ? (
                                    <span className="max-w-full truncate bg-primary/10 px-3 py-1 font-headline text-[10px] font-bold uppercase tracking-widest text-primary">
                                      {module.description}
                                    </span>
                                  ) : null}
                                  {linkedPath ? (
                                    <span className="max-w-full truncate bg-secondary/10 px-3 py-1 font-headline text-[10px] font-bold uppercase tracking-widest text-secondary">
                                      Links to {linkedPath.title}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              {progress > 0 && progress !== 100 ? (
                                <div className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border-2 border-primary bg-surface-container-lowest text-[10px] font-black text-primary">
                                  {progress}%
                                </div>
                              ) : null}
                              {progress === 100 ? (
                                <div className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-secondary text-on-secondary">
                                  <span className="material-symbols-outlined text-xl">check</span>
                                </div>
                              ) : null}
                            </Link>
                            {linkedPath ? renderLinkedPathBranch(linkedPath, column.tone, `branch-link-${module.id}`) : null}
                            {moduleIndex < column.modules.length - 1 ? (
                              <div className={`mx-auto hidden h-4 w-[3px] ${column.tone.line} lg:block`}></div>
                            ) : null}
                            </div>
                        )
                      }) : (
                        <div className="border border-outline-variant/50 bg-surface-container-lowest p-5 text-center text-sm text-on-surface-variant">
                          Modules will appear here when this path is configured.
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
