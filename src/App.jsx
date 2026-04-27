import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { getAuthSession, logoutUser } from './auth'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import CyberChatbot from './components/CyberChatbot'
import { loadPlatformConfig, savePlatformConfig } from './platformConfig'
import { apiFetch } from './services/api'
import { syncFrontendStateFromBackend } from './services/backendSync'
import AdminPanelPage from './pages/AdminPanelPage'
import AdminRoomsManagementPage from './pages/admin/AdminRoomsManagementPage'
import AdminRoomEditorPage from './pages/admin/AdminRoomEditorPage'
import AdminCareerPathsManagementPage from './pages/admin/AdminCareerPathsManagementPage'
import AdminCareerPathEditorPage from './pages/admin/AdminCareerPathEditorPage'
import AdminNotificationsManagementPage from './pages/admin/AdminNotificationsManagementPage'
import AdminRegistrationsManagementPage from './pages/admin/AdminRegistrationsManagementPage'
import AdminRegistrationDetailPage from './pages/admin/AdminRegistrationDetailPage'
import AdminUpcomingCtfManagementPage from './pages/admin/AdminUpcomingCtfManagementPage'
import AdminCvesManagementPage from './pages/admin/AdminCvesManagementPage'
import AdminCveEditorPage from './pages/admin/AdminCveEditorPage'
import AdminAiControlPage from './pages/admin/AdminAiControlPage'
import DashboardPage from './pages/DashboardPage'
import CvesPage from './pages/CvesPage'
import CveDetailPage from './pages/CveDetailPage'
import LabRoomPage from './pages/LabRoomPage'
import LearningPathsPage from './pages/LearningPathsPage'
import LoginPage from './pages/LoginPage'
import ModulesPage from './pages/ModulesPage'
import ModuleDetailPage from './pages/ModuleDetailPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import RegistrationPage from './pages/RegistrationPage'
import RedTeamOperatorPage from './pages/RedTeamOperatorPage'
import UpcomingCtfPage from './pages/UpcomingCtfPage'
import { getSavedTheme, toggleTheme as toggleThemeSetting } from './services/theme'

function firstEnabledRoute(config) {
  if (config.routes.dashboard) return '/'
  if (config.routes.learningPaths) return '/learn/paths'
  if (config.routes.practiceLabs) return '/learn'
  if (config.routes.upcomingCtf) return '/upcoming-ctf'
  if (config.routes.profile) return '/profile'
  return '/'
}

function App() {
  const [authSession, setAuthSession] = useState(getAuthSession)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [platformConfig, setPlatformConfig] = useState(loadPlatformConfig)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [syncTick, setSyncTick] = useState(0)
  const [theme, setTheme] = useState(getSavedTheme)

  const toggleTheme = () => {
    setTheme((current) => toggleThemeSetting(current))
  }

  const themeToggleButton = (
    <button
      className="fixed bottom-5 right-5 z-[80] inline-flex items-center gap-2 px-4 py-3 bg-surface-container-lowest border border-outline-variant text-on-surface font-headline text-[10px] font-bold uppercase tracking-widest shadow-lg hover:border-primary transition-colors"
      onClick={toggleTheme}
      type="button"
      aria-label="Toggle theme"
      title="Toggle light/dark mode"
    >
      <span className="material-symbols-outlined text-base">
        {theme === 'dark' ? 'light_mode' : 'dark_mode'}
      </span>
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )

  const handleSessionExpired = () => {
    logoutUser()
    setAuthSession(null)
  }

  const isAuthError = (error) =>
    /invalid or expired token|unauthorized/i.test(error?.message || '')

  useEffect(() => {
    const onAuthExpired = () => {
      handleSessionExpired()
    }

    window.addEventListener('incognitrix:auth-expired', onAuthExpired)
    return () => {
      window.removeEventListener('incognitrix:auth-expired', onAuthExpired)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!authSession?.token) {
        if (!cancelled) {
          setIsBootstrapping(false)
        }
        return
      }

      try {
        await syncFrontendStateFromBackend()
        if (!cancelled) {
          setPlatformConfig(loadPlatformConfig())
          setSyncTick((value) => value + 1)
        }
      } catch (error) {
        if (isAuthError(error)) {
          handleSessionExpired()
          return
        }
        console.error('Failed to sync backend state:', error)
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false)
        }
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [authSession])

  useEffect(() => {
    if (!authSession?.token) {
      return undefined
    }

    let cancelled = false
    const syncNow = async () => {
      try {
        await syncFrontendStateFromBackend()
        if (!cancelled) {
          setPlatformConfig(loadPlatformConfig())
          setSyncTick((value) => value + 1)
        }
      } catch (error) {
        if (isAuthError(error)) {
          handleSessionExpired()
          return
        }
        console.error('Background sync failed:', error)
      }
    }

    const intervalId = window.setInterval(syncNow, 8000)
    void syncNow()
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [authSession?.token])

  const updatePlatformConfig = (nextConfig) => {
    const merged = savePlatformConfig(nextConfig)
    setPlatformConfig(merged)
    void apiFetch('/platform-config', {
      method: 'PUT',
      body: JSON.stringify(merged),
    }).catch((error) => {
      if (isAuthError(error)) {
        handleSessionExpired()
        return
      }
      console.error('Failed to sync platform config:', error)
    })
  }

  if (authSession && !authSession.token) {
    logoutUser()
    return <Navigate to="/login" replace />
  }

  if (isBootstrapping) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <p className="font-headline text-xs uppercase tracking-[0.3em] text-primary font-bold">
            Syncing platform state
          </p>
        </div>
      </main>
    )
  }

  void syncTick

  if (!authSession) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<LoginPage onLoginSuccess={setAuthSession} />}
        />
        <Route
          path="/register"
          element={<RegistrationPage onRegisterSuccess={setAuthSession} />}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (authSession.role === 'admin') {
    return (
      <>
        {themeToggleButton}
        <CyberChatbot />
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminPanelPage
                config={platformConfig}
                onConfigChange={updatePlatformConfig}
                onLogout={() => {
                  logoutUser()
                  setAuthSession(null)
                }}
                username={authSession.username}
              />
            }
          />
          <Route path="/admin/rooms" element={<AdminRoomsManagementPage />} />
          <Route path="/admin/rooms/new" element={<AdminRoomEditorPage />} />
          <Route path="/admin/rooms/:roomId" element={<AdminRoomEditorPage />} />
          <Route path="/admin/cves" element={<AdminCvesManagementPage />} />
          <Route path="/admin/cves/new" element={<AdminCveEditorPage />} />
          <Route path="/admin/cves/:id" element={<AdminCveEditorPage />} />
          <Route path="/admin/career-paths" element={<AdminCareerPathsManagementPage />} />
          <Route path="/admin/career-paths/new" element={<AdminCareerPathEditorPage />} />
          <Route path="/admin/career-paths/:pathId" element={<AdminCareerPathEditorPage />} />
          <Route path="/admin/notifications" element={<AdminNotificationsManagementPage />} />
          <Route path="/admin/registrations" element={<AdminRegistrationsManagementPage />} />
          <Route path="/admin/registrations/:userId" element={<AdminRegistrationDetailPage />} />
          <Route path="/admin/upcoming-ctf" element={<AdminUpcomingCtfManagementPage />} />
          <Route path="/admin/ai-control" element={<AdminAiControlPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </>
    )
  }

  return (
    <>
      {themeToggleButton}
      <CyberChatbot />
      <Sidebar
        config={platformConfig}
        isSidebarOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main
        className={`${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'} min-h-screen flex flex-col bg-surface selection:bg-primary-container selection:text-on-primary-container transition-all duration-300`}
      >
        <Navbar
          config={platformConfig}
          isSidebarOpen={isSidebarOpen}
          onLogout={() => {
            logoutUser()
            setAuthSession(null)
          }}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route
            path="/"
            element={
              platformConfig.routes.dashboard ? (
                <DashboardPage />
              ) : (
                <Navigate to={firstEnabledRoute(platformConfig)} replace />
              )
            }
          />
          <Route
            path="/learn/paths"
            element={
              platformConfig.routes.learningPaths ? (
                <LearningPathsPage
                  allowRedTeamPath={platformConfig.features.redTeamPath}
                />
              ) : (
                <Navigate to={firstEnabledRoute(platformConfig)} replace />
              )
            }
          />
          <Route
            path="/learn/path"
            element={
              platformConfig.routes.learningPaths ? (
                <LearningPathsPage
                  allowRedTeamPath={platformConfig.features.redTeamPath}
                />
              ) : (
                <Navigate to={firstEnabledRoute(platformConfig)} replace />
              )
            }
          />
          <Route
            path="/learn/path/red-team-operator"
            element={
              platformConfig.routes.learningPaths &&
              platformConfig.features.redTeamPath ? (
                <RedTeamOperatorPage pathId="red-team-operator" />
              ) : (
                <Navigate to={firstEnabledRoute(platformConfig)} replace />
              )
            }
          />
          <Route
            path="/learn/path/:pathId/module/:moduleId"
            element={
              platformConfig.routes.learningPaths ? (
                <ModuleDetailPage />
              ) : (
                <Navigate to={firstEnabledRoute(platformConfig)} replace />
              )
            }
          />
          <Route
            path="/learn/path/:pathId"
            element={
              platformConfig.routes.learningPaths ? (
                <RedTeamOperatorPage />
              ) : (
                <Navigate to={firstEnabledRoute(platformConfig)} replace />
              )
            }
          />
          <Route
            path="/learn"
            element={
              platformConfig.routes.practiceLabs ? (
                <ModulesPage allowLabRooms={platformConfig.features.labRooms} />
              ) : (
                <Navigate to={firstEnabledRoute(platformConfig)} replace />
              )
            }
          />
          <Route
            path="/learn/lab/:labId"
            element={
              platformConfig.routes.practiceLabs &&
              platformConfig.features.labRooms ? (
                <LabRoomPage />
              ) : (
                <Navigate to={firstEnabledRoute(platformConfig)} replace />
              )
            }
          />
          <Route
            path="/upcoming-ctf"
            element={
              platformConfig.routes.upcomingCtf ? (
                <UpcomingCtfPage />
              ) : (
                <Navigate to={firstEnabledRoute(platformConfig)} replace />
              )
            }
          />
          <Route
            path="/cves"
            element={<CvesPage />}
          />
          <Route
            path="/cves/:id"
            element={<CveDetailPage />}
          />
          <Route
            path="/profile"
            element={
              platformConfig.routes.profile ? (
                <ProfilePage />
              ) : (
                <Navigate to={firstEnabledRoute(platformConfig)} replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              platformConfig.routes.profile ? (
                <SettingsPage />
              ) : (
                <Navigate to={firstEnabledRoute(platformConfig)} replace />
              )
            }
          />
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route
            path="*"
            element={<Navigate to={firstEnabledRoute(platformConfig)} replace />}
          />
        </Routes>
      </main>
    </>
  )
}

export default App
