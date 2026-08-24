import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthSession } from '../auth'
import { getCoursesData } from '../data/coursesData'
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

// Rotated across cards so a long catalogue stays visually varied.
const ACCENTS = ['mint', 'lavender', 'sky', 'butter', 'blush']

function DashboardPage() {
  const authSession = getAuthSession()
  const dismissedNotificationsKey = `incognitrix_dismissed_notifications_${authSession?.username || 'student'}`
  const navigate = useNavigate()
  const [careerPaths, setCareerPaths] = useState([])
  const [notifications, setNotifications] = useState([])
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [labProgressTick, setLabProgressTick] = useState(0)
  const [upcomingEvents, setUpcomingEvents] = useState([])
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

    const loadEvents = async () => {
      try {
        const response = await fetchCtfEvents()
        if (!cancelled) {
          setUpcomingEvents(Array.isArray(response) ? response : [])
        }
      } catch (error) {
        console.error('Failed to load upcoming events:', error)
        if (!cancelled) {
          setUpcomingEvents([])
        }
      }
    }

    const syncEvents = () => {
      void loadEvents()
    }

    const onStorage = (event) => {
      if (event.key === CTF_EVENTS_UPDATED_KEY) {
        syncEvents()
      }
    }

    void loadEvents()
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
        const [leaderboard, streak] = await Promise.all([
          apiFetch('/rooms/scoreboard/summary'),
          apiFetch('/rooms/streaks/me'),
        ])

        if (cancelled) {
          return
        }

        const leaderboardRows = Array.isArray(leaderboard) ? leaderboard : []
        const currentUser = leaderboardRows.find(
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

  const visibleNotifications = notifications.filter(
    (notification) => !dismissedNotificationIds.includes(notification.id),
  )

  const allModules = careerPaths.flatMap((path, pathIndex) =>
    (path.modules || []).map((module, moduleIndex) => ({
      ...module,
      pathId: path.id,
      pathTitle: path.title,
      icon: path.icon || 'school',
      level: `Level ${pathIndex + 1}`,
      duration: module.estimatedMinutes
        ? `${module.estimatedMinutes} min`
        : `${path.estimatedHours || 6} hours`,
      image: module.imageData || '',
      accent: ACCENTS[(pathIndex + moduleIndex) % ACCENTS.length],
    })),
  )

  const latestModule = allModules[allModules.length - 1] || null

  const courseProgressSummary = getLabProgressSummary(getCoursesData())
  void labProgressTick
  const courseProgressMap = getLabProgressMap()

  const pathProgressData = careerPaths.map((path) => {
    const modules = path.modules || []

    const moduleProgress = modules.map((module) => {
      const courseIds = module.rooms || []
      const completedCourses = courseIds.filter(
        (courseId) => Boolean(courseProgressMap[courseId]?.completedAt),
      ).length
      const totalCourses = courseIds.length
      const isComplete = totalCourses > 0 ? completedCourses === totalCourses : true

      return { module, totalCourses, completedCourses, isComplete }
    })

    const totalCourses = moduleProgress.reduce((sum, item) => sum + item.totalCourses, 0)
    const completedCourses = moduleProgress.reduce((sum, item) => sum + item.completedCourses, 0)
    const completionPercentage =
      totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0
    const firstIncompleteModule =
      moduleProgress.find((item) => !item.isComplete)?.module || modules[0] || null

    return {
      path,
      totalCourses,
      completedCourses,
      completionPercentage,
      firstIncompleteModule,
      isComplete: completionPercentage >= 100,
    }
  })

  const activePathProgress =
    pathProgressData.find((item) => !item.isComplete) || pathProgressData[0] || null

  const nextResumeModule = activePathProgress?.firstIncompleteModule || null

  const nextEvent = [...upcomingEvents]
    .sort((a, b) => new Date(a.live_time).getTime() - new Date(b.live_time).getTime())[0] || null

  const msUntilNextEvent = nextEvent ? new Date(nextEvent.live_time).getTime() - Date.now() : 0
  const startsInLabel =
    msUntilNextEvent > 0
      ? `${Math.floor(msUntilNextEvent / 86400000)}d ${Math.floor((msUntilNextEvent % 86400000) / 3600000)}h ${Math.floor((msUntilNextEvent % 3600000) / 60000)}m`
      : 'Live now'

  const handleResumeLearning = () => {
    if (!activePathProgress?.path || !nextResumeModule?.id) {
      navigate('/learn/paths')
      return
    }

    navigate(`/learn/path/${activePathProgress.path.id}/module/${nextResumeModule.id}`)
  }

  const handleToggleEventRegistration = async () => {
    if (!nextEvent) {
      return
    }

    const nextState = !nextEvent.is_registered

    try {
      setIsSavingRegistration(true)
      await setCtfRegistration(nextEvent.id, nextState)
      setUpcomingEvents((current) =>
        current.map((event) =>
          event.id === nextEvent.id ? { ...event, is_registered: nextState } : event,
        ),
      )
    } catch (error) {
      console.error('Failed to update event registration:', error)
    } finally {
      setIsSavingRegistration(false)
    }
  }

  const userStats = {
    rank: dashboardStats.rank,
    streak: dashboardStats.streak,
    progress:
      Number.isFinite(courseProgressSummary.completionPercentage) && courseProgressSummary.total > 0
        ? courseProgressSummary.completionPercentage
        : 0,
  }

  const firstName = String(authSession?.username || 'there').split(/[\s._-]+/)[0]

  if (isLoading) {
    return (
      <main className="mt-20 p-8 lg:p-12 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <h1 className="font-headline text-2xl font-extrabold mt-6 mb-1">
            Setting up your dashboard
          </h1>
          <p className="text-on-surface-variant font-body">Loading your courses and progress…</p>
        </div>
      </main>
    )
  }

  return (
    <>
      <div className="mt-20 p-5 sm:p-8 lg:p-10 space-y-8">
        {visibleNotifications.length > 0 ? (
          <section className="rounded-3xl bg-surface-container-lowest p-5 sm:p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">notifications_active</span>
              <h3 className="font-headline text-base font-extrabold text-on-background">
                Announcements
              </h3>
            </div>
            <div className="space-y-3">
              {visibleNotifications.slice(0, 3).map((notification) => (
                <div className="rounded-2xl bg-surface-container p-4" key={notification.id}>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-headline text-sm font-bold text-on-background">
                        {notification.title}
                      </span>
                      <span className="text-[10px] font-headline font-bold px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                        {notification.type}
                      </span>
                    </div>
                    <button
                      className="rounded-full px-3 py-1 bg-surface-container-high text-on-surface-variant font-headline text-[11px] font-bold hover:text-error transition-colors"
                      onClick={() => handleDismissNotification(notification.id)}
                      type="button"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="text-sm text-on-surface-variant font-body">{notification.message}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-on-background">
              Hi {firstName}, ready to learn?
            </h2>
            <p className="text-on-surface-variant mt-2 font-body max-w-lg">
              Pick up where you left off, or explore something new from the catalogue.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="rounded-2xl bg-sky px-5 py-4 min-w-36">
              <span className="font-headline text-4xl font-extrabold text-on-sky leading-none block">
                {userStats.rank ? `#${userStats.rank.toLocaleString()}` : '--'}
              </span>
              <span className="font-body text-xs text-on-sky/80 mt-2 block">Your rank</span>
            </div>
            <div className="rounded-2xl bg-butter px-5 py-4 min-w-36">
              <span className="font-headline text-4xl font-extrabold text-on-butter leading-none block">
                {userStats.streak}
              </span>
              <span className="font-body text-xs text-on-butter/80 mt-2 block">Day streak</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="rounded-3xl lg:col-span-8 bg-surface-container-lowest p-6 sm:p-8 flex flex-col justify-between min-h-[340px] shadow-soft">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="rounded-full px-3 py-1 bg-primary-container text-on-primary-container font-headline text-xs font-bold">
                  Continue learning
                </span>
                <span className="text-on-surface-variant font-body text-xs">
                  About {activePathProgress?.path?.estimatedHours || 0} hours total
                </span>
              </div>
              <h3 className="font-headline text-2xl sm:text-3xl font-extrabold mb-3 max-w-md">
                {activePathProgress?.path?.title || 'Choose a learning path'}
              </h3>
              <p className="text-on-surface-variant font-body max-w-md mb-8">
                {activePathProgress?.path?.description ||
                  'Browse the catalogue and enrol in a path to get a guided, step-by-step curriculum.'}
              </p>
            </div>
            <div className="flex flex-col gap-5">
              <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full rounded-full bg-secondary transition-all"
                  style={{
                    width: `${activePathProgress?.completionPercentage || userStats.progress}%`,
                  }}
                ></div>
              </div>
              <div className="flex flex-wrap justify-between items-end gap-4">
                <div className="flex flex-col">
                  <span className="font-headline text-xl font-extrabold text-on-background">
                    {activePathProgress?.completionPercentage || userStats.progress}% complete
                  </span>
                  <span className="font-body text-xs text-on-surface-variant mt-1">
                    {activePathProgress
                      ? `${activePathProgress.completedCourses} of ${activePathProgress.totalCourses} courses finished`
                      : `${courseProgressSummary.completed} of ${courseProgressSummary.total} courses finished`}
                  </span>
                </div>
                <button
                  className="rounded-full px-8 py-3.5 bg-primary text-on-primary font-headline text-sm font-bold hover:opacity-90 transition-opacity"
                  onClick={handleResumeLearning}
                  type="button"
                >
                  Resume
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-3xl bg-mint p-6 flex flex-col gap-3">
              <span className="material-symbols-outlined text-on-mint">workspace_premium</span>
              <span className="font-headline text-3xl font-extrabold text-on-mint">
                {courseProgressSummary.completed}
              </span>
              <p className="font-body text-sm text-on-mint/80 leading-relaxed">
                Courses completed so far. Keep going to earn your next certificate.
              </p>
            </div>

            <div className="rounded-3xl bg-lavender p-6 text-on-lavender flex flex-col justify-between min-h-[216px]">
              {nextEvent ? (
                <>
                  <div>
                    <span className="font-headline text-xs font-bold opacity-70">Next event</span>
                    <h4 className="font-headline text-xl font-extrabold mt-2">{nextEvent.name}</h4>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center font-headline text-xs font-bold border-b border-current/20 pb-2">
                      <span>Starts in</span>
                      <span>{startsInLabel}</span>
                    </div>
                    <button
                      className="rounded-full w-full py-3 bg-surface-container-lowest text-on-lavender font-headline text-sm font-bold hover:opacity-90 transition-opacity"
                      disabled={isSavingRegistration}
                      onClick={handleToggleEventRegistration}
                      type="button"
                    >
                      {isSavingRegistration
                        ? 'Saving…'
                        : nextEvent.is_registered
                          ? 'You are registered'
                          : 'Register'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col justify-center">
                  <span className="font-headline text-xs font-bold opacity-70">Next event</span>
                  <h4 className="font-headline text-xl font-extrabold mt-2">Nothing scheduled</h4>
                  <p className="font-body text-sm opacity-80 mt-3">
                    There are no events open for registration right now.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {latestModule && (
          <section className="rounded-3xl bg-surface-container-lowest p-6 sm:p-8 shadow-soft space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">new_releases</span>
              <h3 className="font-headline text-xl font-extrabold text-on-background">Newly added</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div
                className={`aspect-video relative overflow-hidden rounded-2xl bg-${latestModule.accent} flex items-center justify-center`}
              >
                {latestModule.image ? (
                  <img
                    alt={latestModule.title}
                    className="w-full h-full object-cover"
                    src={latestModule.image}
                  />
                ) : (
                  <span
                    className={`material-symbols-outlined text-6xl text-on-${latestModule.accent}`}
                  >
                    {latestModule.icon}
                  </span>
                )}
              </div>

              <div className="flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full px-3 py-1 bg-secondary-container text-on-secondary-container font-headline text-xs font-bold">
                      {latestModule.pathTitle}
                    </span>
                    <span className="font-body text-xs text-on-surface-variant">
                      {latestModule.level}
                    </span>
                  </div>
                  <h4 className="font-headline text-2xl font-extrabold text-on-background">
                    {latestModule.title}
                  </h4>
                  <p className="text-on-surface-variant font-body">{latestModule.description}</p>
                  <div className="flex items-center gap-2 text-sm font-body text-on-surface-variant">
                    <span className="material-symbols-outlined text-base">timer</span>
                    {latestModule.duration}
                  </div>
                </div>

                <button
                  className="rounded-full w-full px-8 py-3.5 bg-primary text-on-primary font-headline text-sm font-bold hover:opacity-90 transition-opacity"
                  onClick={() =>
                    navigate(`/learn/path/${latestModule.pathId}/module/${latestModule.id}`)
                  }
                  type="button"
                >
                  Start module
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-headline text-xl font-extrabold text-on-background">
                Recommended for you
              </h3>
              <span className="rounded-full px-3 py-1 bg-surface-container-high text-on-surface-variant font-headline text-xs font-bold">
                {allModules.length} modules
              </span>
            </div>
            <button
              className="font-headline text-sm font-bold text-primary hover:opacity-80 transition-opacity flex items-center gap-1"
              onClick={() => navigate('/learn/paths')}
              type="button"
            >
              View all
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {allModules.length > 0 ? (
              allModules.map((module) => (
                <button
                  className="rounded-3xl bg-surface-container-lowest overflow-hidden text-left shadow-soft hover:shadow-card transition-shadow group"
                  key={`${module.pathId}-${module.id}`}
                  onClick={() => navigate(`/learn/path/${module.pathId}/module/${module.id}`)}
                  type="button"
                >
                  <div
                    className={`aspect-video relative overflow-hidden bg-${module.accent} flex items-center justify-center`}
                  >
                    {module.image ? (
                      <img
                        alt={module.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        src={module.image}
                      />
                    ) : (
                      <span className={`material-symbols-outlined text-4xl text-on-${module.accent}`}>
                        {module.icon}
                      </span>
                    )}
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-headline text-xs font-bold text-secondary truncate">
                        {module.pathTitle}
                      </span>
                      <span className="font-body text-xs text-on-surface-variant shrink-0">
                        {module.level}
                      </span>
                    </div>
                    <h4 className="font-headline text-base font-extrabold leading-snug group-hover:text-primary transition-colors">
                      {module.title}
                    </h4>
                    <p className="text-sm text-on-surface-variant font-body line-clamp-2">
                      {module.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-body text-on-surface-variant pt-1">
                      <span className="material-symbols-outlined text-sm">timer</span>
                      {module.duration}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full rounded-3xl bg-surface-container-lowest py-12 text-center">
                <p className="text-on-surface-variant font-body">No modules available yet</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="w-full py-6 mt-auto bg-surface-container-low flex flex-col md:flex-row justify-between items-center gap-4 px-6 sm:px-12">
        <span className="font-body text-xs text-on-surface-variant">
          © {new Date().getFullYear()} Minerva Academy
        </span>
        <div className="flex flex-wrap justify-center gap-6">
          <a
            className="font-body text-xs text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Privacy
          </a>
          <a
            className="font-body text-xs text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Terms
          </a>
          <a
            className="font-body text-xs text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Accessibility
          </a>
        </div>
      </footer>
    </>
  )
}

export default DashboardPage
