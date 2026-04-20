import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getCareerPathsData } from '../data/careerPathsData'
import { getRoomsData } from '../data/roomsData'
import { apiFetch } from '../services/api'

const NOTIFICATIONS_UPDATED_EVENT = 'incognitrix:notifications-updated'
const NOTIFICATIONS_UPDATED_KEY = 'incognitrix_notifications_updated_at'

function Navbar({ config, isSidebarOpen, onLogout, onToggleSidebar }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationsRef = useRef(null)

  const navItemClass = ({ isActive }) =>
    `transition-colors duration-200 ${
      isActive
        ? 'text-red-600 border-b-2 border-red-600 pb-1'
        : 'text-neutral-500 hover:text-neutral-900'
    }`

  // Fetch notifications on mount and set up polling
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await apiFetch('/notifications')
        setNotifications(Array.isArray(data) ? data : [])
      } catch (error) {
        if (/invalid or expired token|unauthorized/i.test(error?.message || '')) {
          return
        }
        console.error('Failed to fetch notifications:', error)
      }
    }

    const syncNotifications = () => {
      void fetchNotifications()
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

    // Keep fallback polling for cross-device updates.
    const interval = window.setInterval(syncNotifications, 5000)
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated)
    window.addEventListener('storage', handleStorage)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated)
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (value) => {
    setSearchQuery(value)
    
    if (!value.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    const query = value.toLowerCase()
    const careerPaths = getCareerPathsData()
    const rooms = getRoomsData()

    const results = []

    // Search in career paths
    careerPaths.forEach((path) => {
      if (path.title.toLowerCase().includes(query) || path.description.toLowerCase().includes(query)) {
        results.push({
          type: 'path',
          id: path.id,
          title: path.title,
          description: path.description,
          icon: 'school',
        })
      }

      // Search in modules
      if (path.modules) {
        path.modules.forEach((module) => {
          if (module.title.toLowerCase().includes(query) || module.description.toLowerCase().includes(query)) {
            results.push({
              type: 'module',
              id: module.id,
              pathId: path.id,
              title: module.title,
              description: module.description,
              icon: 'layers',
              pathTitle: path.title,
            })
          }
        })
      }
    })

    // Search in rooms
    rooms.forEach((room) => {
      if (room.title.toLowerCase().includes(query) || room.description.toLowerCase().includes(query)) {
        results.push({
          type: 'room',
          id: room.id,
          slug: room.slug,
          title: room.title,
          description: room.description,
          icon: 'flag',
        })
      }
    })

    setSearchResults(results.slice(0, 8))
    setShowResults(true)
  }

  const handleSelectResult = (result) => {
    if (result.type === 'path') {
      navigate(`/learn/path/${result.id}`)
    } else if (result.type === 'module') {
      navigate(`/learn/path/${result.pathId}/module/${result.id}`)
    } else if (result.type === 'room') {
      navigate(`/learn/lab/${result.slug}`)
    }
    setSearchQuery('')
    setShowResults(false)
  }

  return (
    <header
      className={`fixed top-0 right-0 left-0 ${isSidebarOpen ? 'md:left-64' : 'md:left-0'} z-50 glass-nav flex justify-between items-center px-6 md:px-8 py-4 transition-all duration-300`}
    >
      <div className="flex items-center gap-8">
        <button
          className="inline-flex items-center justify-center h-10 w-10 border border-neutral-200 bg-white/70 text-neutral-700 hover:text-neutral-900"
          onClick={onToggleSidebar}
          type="button"
          aria-label="Toggle sidebar"
        >
          <span className="material-symbols-outlined">
            {isSidebarOpen ? 'menu_open' : 'menu'}
          </span>
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl font-headline font-bold tracking-tighter text-neutral-900 leading-none">
            INCOGNITRIX
          </h1>
          <span className="font-headline text-[10px] tracking-[0.2em] text-neutral-400 uppercase mt-1">
            Cybersecurity Academy
          </span>
        </div>
        <nav className="hidden lg:flex items-center gap-6 font-headline tracking-tight text-sm uppercase">
          {config.routes.learningPaths ? (
            <NavLink className={navItemClass} to="/learn/paths">
              Learning Paths
            </NavLink>
          ) : null}
          {config.routes.practiceLabs ? (
            <NavLink className={navItemClass} to="/learn">
              Practice Labs
            </NavLink>
          ) : null}
          <a
            className="text-neutral-500 hover:text-neutral-900 transition-colors duration-200"
            href="http://110.172.151.108:8000"
          >
            CTF Arena
          </a>
        </nav>
      </div>
      <div className="flex items-center gap-6">
        {config.features.navbarSearch ? (
          <div ref={searchRef} className="relative hidden md:block">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-br from-surface-container-low to-surface-container-highest border border-primary/20 rounded-lg shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200 focus-within:border-primary focus-within:shadow-lg focus-within:ring-1 focus-within:ring-primary/20">
              <span className="material-symbols-outlined text-primary text-lg">search</span>
              <input
                type="text"
                placeholder="Search paths, modules..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery && setShowResults(true)}
                className="bg-transparent outline-none font-body text-sm text-on-background placeholder-neutral-500 w-40 font-medium"
              />
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full mt-3 w-96 bg-surface-container-lowest border border-primary/20 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-sm">
                <div className="px-3 py-2 border-b border-primary/10 bg-primary/5">
                  <p className="text-[10px] font-headline font-bold text-primary uppercase tracking-widest">
                    Search Results ({searchResults.length})
                  </p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelectResult(result)}
                      className="w-full text-left px-4 py-3.5 hover:bg-primary/8 transition-colors border-b border-primary/5 last:border-b-0 flex items-start gap-4 group"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                        {result.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-headline text-sm font-bold uppercase text-on-background group-hover:text-primary transition-colors truncate">
                          {result.title}
                        </div>
                        <div className="text-xs text-on-surface-variant truncate mt-1">
                          {result.type === 'module' ? (
                            <span className="flex items-center gap-1">
                              <span className="w-1 h-1 bg-primary/50 rounded-full"></span>
                              {result.pathTitle}
                            </span>
                          ) : (
                            <span>{result.description}</span>
                          )}
                        </div>
                        <div className="text-[9px] font-headline text-primary uppercase tracking-widest mt-2 inline-block px-2 py-1 bg-primary/10 rounded">
                          {result.type === 'path' && 'Path'}
                          {result.type === 'module' && 'Module'}
                          {result.type === 'room' && 'Lab'}
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-sm text-primary/40 group-hover:text-primary flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                        arrow_forward
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showResults && searchQuery && searchResults.length === 0 && (
              <div className="absolute top-full mt-3 w-96 bg-surface-container-lowest border border-primary/20 rounded-xl shadow-2xl z-50 p-6 text-center backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-4xl text-neutral-300">search_off</span>
                  <div>
                    <p className="text-sm font-headline font-bold text-on-background">No results found</p>
                    <p className="text-xs text-on-surface-variant mt-1">Try searching for a different path or module</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-surface-container-low rounded-full">
          <span className="material-symbols-outlined text-primary text-base">local_fire_department</span>
          <span className="font-headline text-[10px] font-bold tracking-widest text-on-background uppercase">
            14 Day Streak
          </span>
        </div>
        <div className="flex items-center gap-4 text-neutral-500">
          {config.features.navbarNotifications ? (
            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative hover:text-neutral-900 transition-colors"
              >
                <span className="material-symbols-outlined">notifications</span>
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute top-full mt-3 right-0 w-96 bg-surface-container-lowest border border-primary/20 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-sm">
                  <div className="px-4 py-3 border-b border-primary/10 bg-primary/5">
                    <p className="text-[10px] font-headline font-bold text-primary uppercase tracking-widest">
                      System Notifications ({notifications.length})
                    </p>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <span className="material-symbols-outlined text-4xl text-neutral-300 block mb-3">
                        notifications_none
                      </span>
                      <p className="text-sm text-on-surface-variant">No notifications</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto divide-y divide-primary/10">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="px-4 py-3.5 hover:bg-primary/8 transition-colors">
                          <div className="flex items-start gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-headline text-sm font-bold uppercase text-on-background">
                                  {notification.title}
                                </h4>
                                <span
                                  className={`text-[8px] font-headline font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                                    notification.type === 'info'
                                      ? 'bg-primary/10 text-primary'
                                      : notification.type === 'success'
                                        ? 'bg-secondary/10 text-secondary'
                                        : notification.type === 'warning'
                                          ? 'bg-yellow-500/10 text-yellow-600'
                                          : 'bg-error/10 text-error'
                                  }`}
                                >
                                  {notification.type}
                                </span>
                              </div>
                              <p className="text-xs text-on-surface-variant leading-relaxed">
                                {notification.message}
                              </p>
                              <p className="text-[10px] text-on-surface-variant/60 mt-2">
                                {new Date(notification.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
          {config.features.navbarSettings ? (
            <button
              className="inline-flex items-center justify-center hover:text-neutral-900 transition-colors"
              onClick={() => navigate('/settings')}
              title="Open settings"
              type="button"
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
          ) : null}
        </div>
        <button
          className="px-4 py-2 border border-neutral-300 text-neutral-700 font-headline text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-100 transition-colors"
          onClick={onLogout}
          type="button"
        >
          Logout
        </button>
      </div>
    </header>
  )
}

export default Navbar
