import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthSession } from '../auth'
import { getRoomsData } from '../data/roomsData'
import { apiFetch } from '../services/api'
import { getCareerPathsData, hydrateCareerPathsData } from '../data/careerPathsData'
import { getLabProgressEvents, getLabProgressMap, getLabProgressSummary } from '../services/labProgress'
import {
  CTF_EVENTS_UPDATED_EVENT,
  CTF_EVENTS_UPDATED_KEY,
  fetchCtfEvents,
  setCtfRegistration,
  triggerCtfNotifications,
} from '../services/ctfEvents'

const NOTIFICATIONS_UPDATED_EVENT = 'incognitrix:notifications-updated'
const NOTIFICATIONS_UPDATED_KEY = 'incognitrix_notifications_updated_at'

function DashboardPage() {
  const authSession = getAuthSession()
  const dismissedNotificationsKey = `incognitrix_dismissed_notifications_${authSession?.username || 'operator'}`
  const navigate = useNavigate()
  const [careerPaths, setCareerPaths] = useState([])
  const [notifications, setNotifications] = useState([])
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [labProgressTick, setLabProgressTick] = useState(0)
  const [upcomingCtfEvents, setUpcomingCtfEvents] = useState([])
  const [isSavingRegistration, setIsSavingRegistration] = useState(false)
  const [dashboardStats, setDashboardStats] = useState({
    rank: null,
    streak: 0,
  })

  useEffect(() => {
    const { updatedEvent, updatedStorageKey } = getLabProgressEvents()

    const syncLabProgress = () => {
      setLabProgressTick((value) => value + 1)
    }

    const onStorage = (event) => {
      if (event.key === updatedStorageKey) {
        syncLabProgress()
      }
    }

    window.addEventListener(updatedEvent, syncLabProgress)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(updatedEvent, syncLabProgress)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadCtfEvents = async () => {
      try {
        const response = await fetchCtfEvents()
        if (!cancelled) {
          setUpcomingCtfEvents(Array.isArray(response) ? response : [])
        }
      } catch (error) {
        console.error('Failed to load upcoming CTF events:', error)
        if (!cancelled) {
          setUpcomingCtfEvents([])
        }
      }
    }

    const syncEvents = () => {
      void loadCtfEvents()
    }

    const onStorage = (event) => {
      if (event.key === CTF_EVENTS_UPDATED_KEY) {
        syncEvents()
      }
    }

    void loadCtfEvents()
    window.addEventListener(CTF_EVENTS_UPDATED_EVENT, syncEvents)
    window.addEventListener('storage', onStorage)

    return () => {
      cancelled = true
      window.removeEventListener(CTF_EVENTS_UPDATED_EVENT, syncEvents)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadDashboardStats = async () => {
      try {
        const [scoreboard, streak] = await Promise.all([
          apiFetch('/rooms/scoreboard/summary'),
          apiFetch('/rooms/streaks/me'),
        ])

        if (cancelled) {
          return
        }

        const scoreboardRows = Array.isArray(scoreboard) ? scoreboard : []
        const currentUser = scoreboardRows.find(
          (row) => String(row.username || '').toLowerCase() === String(authSession?.username || '').toLowerCase(),
        )

        setDashboardStats({
          rank: currentUser?.rank ? Number(currentUser.rank) : null,
          streak: Number(streak?.currentStreak || 0),
        })
      } catch (error) {
        console.error('Failed to load dashboard stats:', error)
        if (!cancelled) {
          setDashboardStats({
            rank: null,
            streak: 0,
          })
        }
      }
    }

    void loadDashboardStats()

    return () => {
      cancelled = true
    }
  }, [authSession?.username, labProgressTick])

  useEffect(() => {
    const runAutoNotifications = async () => {
      try {
        const result = await triggerCtfNotifications()
        if ((result?.created || 0) > 0) {
          window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT))
          localStorage.setItem(NOTIFICATIONS_UPDATED_KEY, String(Date.now()))
        }
      } catch {
        // Keep dashboard usable even if trigger check fails.
      }
    }

    void runAutoNotifications()
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(dismissedNotificationsKey)
      if (!stored) {
        setDismissedNotificationIds([])
        return
      }

      const parsed = JSON.parse(stored)
      setDismissedNotificationIds(Array.isArray(parsed) ? parsed : [])
    } catch {
      setDismissedNotificationIds([])
    }
  }, [dismissedNotificationsKey])

  const handleDismissNotification = (notificationId) => {
    setDismissedNotificationIds((current) => {
      if (current.includes(notificationId)) {
        return current
      }

      const next = [...current, notificationId]
      localStorage.setItem(dismissedNotificationsKey, JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    let cancelled = false

    const loadPaths = async () => {
      try {
        const response = await apiFetch('/career-paths')
        if (!cancelled) {
          const paths = Array.isArray(response) ? response : []
          hydrateCareerPathsData(paths)
          setCareerPaths(paths)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Failed to load paths:', error)
        if (!cancelled) {
          setCareerPaths(getCareerPathsData())
          setIsLoading(false)
        }
      }
    }

    void loadPaths()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadNotifications = async () => {
      try {
        const response = await apiFetch('/notifications')
        if (!cancelled) {
          setNotifications(Array.isArray(response) ? response : [])
        }
      } catch (error) {
        console.error('Failed to load notifications:', error)
        if (!cancelled) {
          setNotifications([])
        }
      }
    }

    const syncNotifications = () => {
      void loadNotifications()
    }

    const handleNotificationsUpdated = () => {
      syncNotifications()
    }

    const handleStorage = (event) => {
      if (event.key === NOTIFICATIONS_UPDATED_KEY) {
        syncNotifications()
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncNotifications()
      }
    }

    syncNotifications()
    const intervalId = window.setInterval(syncNotifications, 5000)
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated)
    window.addEventListener('storage', handleStorage)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated)
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Get all modules from all paths
  const visibleNotifications = notifications.filter(
    (notification) => !dismissedNotificationIds.includes(notification.id),
  )

  const allModules = careerPaths.flatMap((path) =>
    (path.modules || []).map((module) => ({
      ...module,
      pathId: path.id,
      pathTitle: path.title,
      domain: path.icon || 'security',
      level: `LVL_${String(careerPaths.findIndex((p) => p.id === path.id) + 1).padStart(2, '0')}`,
      duration: `${Math.floor(Math.random() * 10) + 6}H ${Math.floor(Math.random() * 60)}M`,
      image: module.imageData || `https://lh3.googleusercontent.com/aida-public/AB6AXuC8_5ZDha9SC5TJAmbyLb97BklndzpfX0yVSbC_46T_FNqiMpp5mLjNTTW0qWWdwA-fRTXD75KEdddSYK-UnNPQnq5RIIgpy0iSlg6Cmx4IE3-QltzybTckCz-JmzD_31oaKSmBzWYRJbX1gVQDcrylar9_3kfaLpUX6t5O5DJEewA6dv3qqTvk1edeyntTdgEh5lBZcijfT4XmOX-Jq5Z4ZGRMiyd4s9UJw_CbJQD3O5SvfawPfcyoRoWWdMkyS6flwYEtuDtjrTo`,
      tone: path.color === 'primary' ? 'red' : 'cyan',
    }))
  )

  // Get latest module
  const latestModule = allModules[allModules.length - 1] || null

  const labProgressSummary = getLabProgressSummary(getRoomsData())
  void labProgressTick
  const labProgressMap = getLabProgressMap()

  const pathProgressData = careerPaths.map((path) => {
    const modules = path.modules || []

    const moduleProgress = modules.map((module) => {
      const roomIds = module.rooms || []
      const completedRooms = roomIds.filter((roomId) => Boolean(labProgressMap[roomId]?.completedAt)).length
      const totalRooms = roomIds.length
      const isComplete = totalRooms > 0 ? completedRooms === totalRooms : true

      return {
        module,
        totalRooms,
        completedRooms,
        isComplete,
      }
    })

    const totalRooms = moduleProgress.reduce((sum, item) => sum + item.totalRooms, 0)
    const completedRooms = moduleProgress.reduce((sum, item) => sum + item.completedRooms, 0)
    const completionPercentage = totalRooms > 0 ? Math.round((completedRooms / totalRooms) * 100) : 0
    const firstIncompleteModule = moduleProgress.find((item) => !item.isComplete)?.module || modules[0] || null

    return {
      path,
      totalRooms,
      completedRooms,
      completionPercentage,
      firstIncompleteModule,
      isComplete: completionPercentage >= 100,
    }
  })

  const activePathProgress =
    pathProgressData.find((item) => !item.isComplete) || pathProgressData[0] || null

  const nextResumeModule = activePathProgress?.firstIncompleteModule || null

  const nextEvent = [...upcomingCtfEvents]
    .sort((a, b) => new Date(a.live_time).getTime() - new Date(b.live_time).getTime())[0] || null

  const msUntilNextEvent = nextEvent ? new Date(nextEvent.live_time).getTime() - Date.now() : 0
  const startsInLabel =
    msUntilNextEvent > 0
      ? `${Math.floor(msUntilNextEvent / 86400000)}D ${Math.floor((msUntilNextEvent % 86400000) / 3600000)}H ${Math.floor((msUntilNextEvent % 3600000) / 60000)}M`
      : 'LIVE'

  const handleResumeProtocol = () => {
    if (!activePathProgress?.path || !nextResumeModule?.id) {
      navigate('/learn/paths')
      return
    }

    navigate(`/learn/path/${activePathProgress.path.id}/module/${nextResumeModule.id}`)
  }

  const handleToggleCtfRegistration = async () => {
    if (!nextEvent) {
      return
    }

    const nextState = !nextEvent.is_registered

    try {
      setIsSavingRegistration(true)
      await setCtfRegistration(nextEvent.id, nextState)
      setUpcomingCtfEvents((current) =>
        current.map((event) =>
          event.id === nextEvent.id
            ? { ...event, is_registered: nextState }
            : event,
        ),
      )
    } catch (error) {
      console.error('Failed to update CTF registration:', error)
    } finally {
      setIsSavingRegistration(false)
    }
  }

  const userStats = {
    rank: dashboardStats.rank,
    streak: dashboardStats.streak,
    defenseLevel: localStorage.getItem('userDefenseLevel') || 'V_LEVEL_4',
    progress:
      Number.isFinite(labProgressSummary.completionPercentage) &&
      labProgressSummary.total > 0
        ? labProgressSummary.completionPercentage
        : parseInt(localStorage.getItem('userProgress') || '65'),
  }

  // Show loading while fetching paths
  if (isLoading) {
    return (
      <main className="mt-20 p-8 lg:p-12 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h1 className="font-headline text-3xl font-bold mb-2">Loading Mission Control</h1>
          <p className="text-on-surface-variant">Synchronizing tactical intelligence...</p>
        </div>
      </main>
    )
  }

  return (
    <>
      <div className="mt-20 p-8 lg:p-12 space-y-12">
        {visibleNotifications.length > 0 ? (
          <section className="bg-surface-container-lowest border-l-4 border-l-primary p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary">notifications_active</span>
              <h3 className="font-headline text-lg font-bold uppercase tracking-tight text-on-background">
                System Notifications
              </h3>
            </div>
            <div className="space-y-3">
              {visibleNotifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className="bg-surface-container-low p-4 border-l-2 border-l-primary/40">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-headline text-xs font-bold uppercase tracking-widest text-on-background">
                        {notification.title}
                      </span>
                      <span className="text-[9px] font-headline font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {notification.type}
                      </span>
                    </div>
                    <button
                      className="px-3 py-1 bg-surface-container-high text-on-surface-variant font-headline text-[10px] font-bold uppercase tracking-widest hover:text-error transition-colors"
                      onClick={() => handleDismissNotification(notification.id)}
                      type="button"
                    >
                      Terminate
                    </button>
                  </div>
                  <p className="text-sm text-on-surface-variant">{notification.message}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-[2px] w-8 bg-primary"></div>
              <span className="font-headline text-[10px] tracking-[0.3em] font-bold text-primary uppercase">
                System Status: Optimal
              </span>
            </div>
            <h2 className="font-headline text-5xl font-bold tracking-tighter text-on-background">
              MISSION_CONTROL
            </h2>
            <p className="text-neutral-500 mt-2 font-body max-w-lg">
              Welcome back, Operator. Intelligence gathering is currently
              synchronized across all sub-sectors. Ready for tactical
              deployment.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="bg-surface-container-lowest border border-outline-variant/30 px-5 py-4 min-w-36">
              <span className="font-headline text-[10px] tracking-[0.2em] font-bold text-neutral-400 uppercase block mb-2">
                Global Rank
              </span>
              <span className="font-headline text-3xl font-bold text-secondary leading-none">
                {userStats.rank ? `#${userStats.rank.toLocaleString()}` : '--'}
              </span>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/30 px-5 py-4 min-w-36">
              <span className="font-headline text-[10px] tracking-[0.2em] font-bold text-neutral-400 uppercase block mb-2">
                Daily Streak
              </span>
              <div className="flex items-baseline gap-2 leading-none">
                <span
                  className="material-symbols-outlined text-primary text-xl translate-y-0.5"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  local_fire_department
                </span>
                <span className="font-headline text-3xl font-bold text-on-background">
                  {userStats.streak}
                </span>
                <span className="font-headline text-sm font-bold tracking-widest text-on-surface-variant uppercase">
                  Days
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-surface-container-lowest p-8 flex flex-col justify-between min-h-[400px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-surface-container-low -skew-x-12 translate-x-1/4 transition-transform group-hover:translate-x-1/3 duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <span className="px-3 py-1 bg-primary text-on-primary font-headline text-[10px] font-bold tracking-widest uppercase">Active_Path</span>
                <span className="text-neutral-400 font-headline text-[10px] tracking-widest">EST_TIME: {activePathProgress?.path?.estimatedHours || 0}H</span>
              </div>
              <h3 className="font-headline text-4xl font-bold tracking-tight mb-4 max-w-md uppercase">{activePathProgress?.path?.title || 'Loading...'}</h3>
              <p className="text-neutral-500 font-body max-w-sm mb-12">{activePathProgress?.path?.description || 'Synchronizing path details...'}</p>
            </div>
            <div className="relative z-10 flex flex-col gap-6">
              <div className="w-full h-1 bg-surface-container-highest">
                <div className="h-full bg-primary" style={{ width: `${activePathProgress?.completionPercentage || userStats.progress}%` }}></div>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="font-headline text-[10px] font-bold text-neutral-400 uppercase">Progress</span>
                  <span className="font-headline text-xl font-bold text-on-background">{activePathProgress?.completionPercentage || userStats.progress}%_COMPLETE</span>
                  <span className="font-headline text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                    {activePathProgress
                      ? `${activePathProgress.completedRooms}/${activePathProgress.totalRooms} Labs Completed`
                      : `${labProgressSummary.completed}/${labProgressSummary.total} Labs Completed`}
                  </span>
                </div>
                <button className="px-10 py-4 bg-primary text-on-primary font-headline text-xs font-bold tracking-widest uppercase hover:bg-primary-container transition-colors" onClick={handleResumeProtocol} type="button">
                  RESUME_PROTOCOL
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-container-lowest p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">security</span>
                <span className="font-headline text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Defense_Level</span>
              </div>
              <span className="font-headline text-4xl font-bold text-on-background">{userStats.defenseLevel}</span>
              <p className="text-[11px] text-neutral-500 leading-relaxed font-body">Your defensive perimeter has successfully mitigated {Math.floor(Math.random() * 20) + 5} simulated attacks in the last 24h.</p>
            </div>

            <div className="bg-secondary p-6 text-on-secondary flex flex-col justify-between h-[216px]">
              {nextEvent ? (
                <>
                  <div>
                    <span className="font-headline text-[10px] font-bold tracking-widest uppercase opacity-70">Next Event</span>
                    <h4 className="font-headline text-xl font-bold uppercase mt-2">{nextEvent.name}</h4>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center text-[10px] font-headline font-bold uppercase tracking-widest border-b border-white/20 pb-2">
                      <span>Starts In</span>
                      <span>{startsInLabel}</span>
                    </div>
                    <button className="w-full py-3 bg-white text-secondary font-headline text-[10px] font-bold tracking-widest uppercase hover:bg-secondary-fixed transition-colors" disabled={isSavingRegistration} onClick={handleToggleCtfRegistration} type="button">
                      {isSavingRegistration
                        ? 'SAVING...'
                        : nextEvent.is_registered
                          ? 'REGISTERED'
                          : 'REGISTER_INTEL'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col justify-center">
                  <span className="font-headline text-[10px] font-bold tracking-widest uppercase opacity-70">Next Event</span>
                  <h4 className="font-headline text-xl font-bold uppercase mt-2">No Upcoming CTF</h4>
                  <p className="text-xs opacity-80 mt-3">No events with open registration are currently available.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {latestModule && (
          <section className="space-y-8">
            <div className="border-b border-neutral-200/50 pb-4">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-secondary text-2xl">new_releases</span>
                <h3 className="font-headline text-2xl font-bold tracking-tight text-on-background uppercase">LATEST_RELEASE</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-video relative overflow-hidden rounded-lg">
                <img
                  className="w-full h-full object-cover"
                  src={latestModule.image}
                  alt={latestModule.description}
                />
                <div className={`absolute inset-0 ${latestModule.tone === 'red' ? 'bg-primary/20' : 'bg-secondary/20'}`}></div>
              </div>

              <div className="flex flex-col justify-between py-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-on-primary font-headline text-[10px] font-bold tracking-widest uppercase ${latestModule.tone === 'red' ? 'bg-primary' : 'bg-secondary'}`}>
                        {latestModule.phase}
                      </span>
                      <span className={`font-headline text-[9px] font-bold tracking-widest ${latestModule.tone === 'red' ? 'text-primary' : 'text-secondary'} uppercase`}>
                        {latestModule.pathTitle}
                      </span>
                    </div>
                    <h4 className="font-headline text-3xl font-bold tracking-tight text-on-background uppercase">
                      {latestModule.title}
                    </h4>
                  </div>
                  <p className="text-neutral-500 font-body">{latestModule.description}</p>
                  <div className="flex items-center gap-4 text-sm font-headline font-bold text-neutral-400">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">timer</span>
                      {latestModule.duration}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">school</span>
                      {latestModule.level}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => navigate(`/learn/path/${latestModule.pathId}/module/${latestModule.id}`)}
                  className={`w-full px-10 py-4 font-headline text-xs font-bold tracking-widest uppercase transition-all ${latestModule.tone === 'red' ? 'bg-primary text-on-primary hover:bg-primary-container' : 'bg-secondary text-on-secondary hover:bg-secondary-container'}`} 
                  type="button"
                >
                  LAUNCH_MODULE
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-neutral-200/50 pb-4">
            <div className="flex items-center gap-4">
              <h3 className="font-headline text-2xl font-bold tracking-tight text-on-background uppercase">NEW_DEPLOYMENTS</h3>
              <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container font-headline text-[10px] font-bold uppercase">{allModules.length} New Modules</span>
            </div>
            <a className="font-headline text-xs font-bold text-neutral-400 hover:text-primary transition-colors uppercase tracking-widest flex items-center gap-2" href="#">
              View_All_Intel
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {allModules.length > 0 ? (
              allModules.map((module) => (
                <div
                  className={`bg-surface-container-lowest border-l-2 ${module.tone === 'red' ? 'border-primary' : 'border-secondary'} group cursor-pointer hover:bg-white transition-all`}
                  key={`${module.pathId}-${module.id}`}
                  onClick={() => navigate(`/learn/path/${module.pathId}/module/${module.id}`)}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      src={module.image}
                      alt={module.description}
                    />
                    <div className={`absolute inset-0 ${module.tone === 'red' ? 'bg-primary/10' : 'bg-secondary/10'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`font-headline text-[9px] font-bold tracking-widest ${module.tone === 'red' ? 'text-primary' : 'text-secondary'} uppercase`}>
                        {module.pathTitle.split(' ')[0]}
                      </span>
                      <span className="text-neutral-400 font-headline text-[9px]">{module.level}</span>
                    </div>
                    <h4 className={`font-headline text-lg font-bold leading-tight uppercase ${module.tone === 'red' ? 'group-hover:text-primary' : 'group-hover:text-secondary'} transition-colors`}>
                      {module.title}
                    </h4>
                    <p className="text-xs text-neutral-500 font-body line-clamp-2">{module.description}</p>
                    <div className="flex items-center gap-2 text-[10px] font-headline font-bold text-neutral-400 pt-2">
                      <span className="material-symbols-outlined text-sm">timer</span>
                      {module.duration}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-4 text-center py-12">
                <p className="text-neutral-400">No modules available</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="w-full py-6 mt-auto bg-neutral-50 border-t border-neutral-200/50 flex flex-col md:flex-row justify-between items-center px-12">
        <span className="font-headline text-[10px] tracking-widest uppercase text-neutral-400">© 2024 INCOGNITRIX ACADEMY // SURGICAL INTEL UNIT</span>
        <div className="flex gap-8 mt-4 md:mt-0">
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-colors" href="#">Privacy Protocol</a>
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-colors" href="#">Terms of Engagement</a>
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-colors" href="#">Liability Waiver</a>
        </div>
      </footer>
    </>
  )
}

export default DashboardPage
