import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getAuthSession } from '../auth'
import { apiFetch } from '../services/api'

function Sidebar({ config, isSidebarOpen, onClose }) {
  const authSession = getAuthSession()
  const [username, setUsername] = useState(authSession?.username || 'operator')
  const [activeMachines, setActiveMachines] = useState([])

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      try {
        const response = await apiFetch('/users/me')
        if (!cancelled) {
          setUsername(response?.username || authSession?.username || 'operator')
        }
      } catch {
        if (!cancelled) {
          setUsername(authSession?.username || 'operator')
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [authSession?.username])

  useEffect(() => {
    let cancelled = false

    const loadMachines = async () => {
      try {
        const response = await apiFetch('/rooms/docker-machines/me')
        if (!cancelled) {
          setActiveMachines(Array.isArray(response?.machines) ? response.machines : [])
        }
      } catch {
        if (!cancelled) {
          setActiveMachines([])
        }
      }
    }

    void loadMachines()
    const intervalId = window.setInterval(loadMachines, 15000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-5 sm:px-6 py-3 font-headline text-[11px] font-bold tracking-widest uppercase transition-all duration-150 ease-in-out border-l-4 min-w-0 [&_.material-symbols-outlined]:shrink-0 [&_.nav-label]:truncate ${
      isActive
        ? 'bg-surface-container text-primary border-primary'
        : 'text-on-surface-variant border-transparent hover:bg-surface-container-high hover:text-on-surface'
    }`

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-30 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}
        onClick={onClose}
      ></div>

      <aside
        className={`h-dvh max-h-dvh w-[min(20rem,calc(100vw-1rem))] md:w-64 fixed left-0 top-0 bg-surface-container-low flex flex-col py-4 sm:py-6 z-40 transform transition-transform duration-300 overflow-hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <button
          className="md:hidden absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
          onClick={onClose}
          type="button"
          aria-label="Close sidebar"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="px-5 sm:px-6 mb-5 sm:mb-7 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-primary flex items-center justify-center text-white font-headline font-bold text-xl shrink-0">
              I
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline text-[10px] font-bold tracking-[0.2em] text-on-surface-variant uppercase">
                OPERATOR_ID
              </span>
              <span
                className="font-headline text-[11px] font-bold tracking-wide text-on-surface uppercase max-w-[145px] truncate"
                title={username}
              >
                {username}
              </span>
            </div>
          </div>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-1 pr-1 pb-3">
          {config.routes.dashboard ? (
            <NavLink className={navLinkClass} onClick={onClose} to="/" end>
              <span className="material-symbols-outlined">grid_view</span>
              <span className="nav-label">Dashboard</span>
            </NavLink>
          ) : null}
          {config.routes.practiceLabs ? (
            <NavLink className={navLinkClass} onClick={onClose} to="/learn">
              <span className="material-symbols-outlined">school</span>
              <span className="nav-label">Learn</span>
            </NavLink>
          ) : null}
          {config.routes.upcomingCtf ? (
            <NavLink className={navLinkClass} onClick={onClose} to="/upcoming-ctf">
              <span className="material-symbols-outlined">event_upcoming</span>
              <span className="nav-label">Upcoming CTF</span>
            </NavLink>
          ) : null}
          <NavLink className={navLinkClass} onClick={onClose} to="/cves">
            <span className="material-symbols-outlined">bug_report</span>
            <span className="nav-label">CVEs</span>
          </NavLink>
          <NavLink className={navLinkClass} onClick={onClose} to="/notes">
            <span className="material-symbols-outlined">edit_note</span>
            <span className="nav-label">Notes</span>
          </NavLink>
          <NavLink className={navLinkClass} onClick={onClose} to="/jobs">
            <span className="material-symbols-outlined">work</span>
            <span className="nav-label">Job Updates</span>
          </NavLink>
          <NavLink className={navLinkClass} onClick={onClose} to="/roadmap">
            <span className="material-symbols-outlined">route</span>
            <span className="nav-label">Roadmap</span>
          </NavLink>
          <NavLink className={navLinkClass} onClick={onClose} to="/scoreboard">
            <span className="material-symbols-outlined">leaderboard</span>
            <span className="nav-label">Scoreboard</span>
          </NavLink>
          {config.routes.profile ? (
            <NavLink className={navLinkClass} onClick={onClose} to="/profile">
              <span className="material-symbols-outlined">account_circle</span>
              <span className="nav-label">Profile</span>
            </NavLink>
          ) : null}
          <NavLink className={navLinkClass} onClick={onClose} to="/verify-certificate">
            <span className="material-symbols-outlined">verified</span>
            <span className="nav-label">Verify Certificate</span>
          </NavLink>
          <a
            className="flex items-center gap-3 px-5 sm:px-6 py-3 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-headline text-[11px] font-bold tracking-widest uppercase transition-all duration-150 ease-in-out min-w-0"
            href="#"
          >
            <span className="material-symbols-outlined shrink-0">science</span>
            <span className="truncate">Labs</span>
          </a>
          {activeMachines.length ? (
            <div className="mx-5 sm:mx-6 my-3 bg-surface-container-high border-l-4 border-secondary p-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-base">dns</span>
                <p className="font-headline text-[10px] font-bold tracking-[0.2em] uppercase text-secondary">
                  Active Machines
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {activeMachines.slice(0, 3).map((machine) => (
                  <div className="bg-surface-container-lowest p-2" key={machine.containerName || machine.roomId}>
                    <NavLink
                      className="block font-headline text-[10px] font-bold uppercase tracking-wider text-on-surface hover:text-primary truncate"
                      onClick={onClose}
                      title={machine.title}
                      to={`/learn/lab/${machine.slug || machine.roomId}`}
                    >
                      {machine.title || machine.roomId}
                    </NavLink>
                    {machine.access?.url ? (
                      <a
                        className="mt-1 flex items-center gap-1 text-[10px] text-secondary hover:text-on-surface min-w-0"
                        href={machine.access.url}
                        rel="noreferrer"
                        target="_blank"
                        title={machine.access.url}
                      >
                        <span className="material-symbols-outlined text-xs">open_in_new</span>
                        <span className="truncate">Open proxied service</span>
                      </a>
                    ) : null}
                  </div>
                ))}
                {activeMachines.length > 3 ? (
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    +{activeMachines.length - 3} more active
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </nav>
        {config.features.newMissionButton ? (
          <div className="px-5 sm:px-6 py-3 shrink-0">
            <button
              className="w-full py-3 bg-primary text-on-primary font-headline text-[10px] tracking-[0.25em] font-bold uppercase active:scale-95 transition-transform"
              type="button"
            >
              NEW_MISSION
            </button>
          </div>
        ) : null}
        <footer className="shrink-0 flex flex-col gap-1 border-t border-outline-variant pt-3">
          <a
            className="flex items-center gap-3 px-5 sm:px-6 py-2.5 text-on-surface-variant hover:text-on-surface font-headline text-[11px] font-bold tracking-widest uppercase min-w-0"
            href="/support"
          >
            <span className="material-symbols-outlined shrink-0">help</span>
            <span className="truncate">Support</span>
          </a>
          
        </footer>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-nav border-t border-outline-variant/60 flex items-center gap-2 overflow-x-auto px-3 py-3 z-50">
        {config.routes.dashboard ? (
          <NavLink
            className={({ isActive }) =>
              `min-w-16 flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
            }
            onClick={onClose}
            to="/"
            end
          >
            <span className="material-symbols-outlined">grid_view</span>
            <span className="font-headline text-[8px] font-bold uppercase tracking-widest">
              Dashboard
            </span>
          </NavLink>
        ) : null}
        {config.routes.practiceLabs ? (
          <NavLink
            className={({ isActive }) =>
              `min-w-16 flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
            }
            onClick={onClose}
            to="/learn"
          >
            <span className="material-symbols-outlined">school</span>
            <span className="font-headline text-[8px] font-bold uppercase tracking-widest">
              Learn
            </span>
          </NavLink>
        ) : null}
        {config.routes.upcomingCtf ? (
          <NavLink
            className={({ isActive }) =>
              `min-w-16 flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
            }
            onClick={onClose}
            to="/upcoming-ctf"
          >
            <span className="material-symbols-outlined">event_upcoming</span>
            <span className="font-headline text-[8px] font-bold uppercase tracking-widest">
              CTF
            </span>
          </NavLink>
        ) : null}
        {config.routes.profile ? (
          <NavLink
            className={({ isActive }) =>
              `min-w-16 flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
            }
            onClick={onClose}
            to="/profile"
          >
            <span className="material-symbols-outlined">account_circle</span>
            <span className="font-headline text-[8px] font-bold uppercase tracking-widest">
              Profile
            </span>
          </NavLink>
        ) : null}
        <NavLink
          className={({ isActive }) =>
            `min-w-16 flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
          }
          onClick={onClose}
          to="/verify-certificate"
        >
          <span className="material-symbols-outlined">verified</span>
          <span className="font-headline text-[8px] font-bold uppercase tracking-widest">
            Verify
          </span>
        </NavLink>
        <NavLink
            className={({ isActive }) =>
              `min-w-16 flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
            }
            onClick={onClose}
            to="/cves"
          >
            <span className="material-symbols-outlined">bug_report</span>
            <span className="font-headline text-[8px] font-bold uppercase tracking-widest">
              CVEs
            </span>
          </NavLink>
        <NavLink
          className={({ isActive }) =>
            `min-w-16 flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
          }
          onClick={onClose}
          to="/notes"
        >
          <span className="material-symbols-outlined">edit_note</span>
          <span className="font-headline text-[8px] font-bold uppercase tracking-widest">
            Notes
          </span>
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `min-w-16 flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
          }
          onClick={onClose}
          to="/jobs"
        >
          <span className="material-symbols-outlined">work</span>
          <span className="font-headline text-[8px] font-bold uppercase tracking-widest">
            Jobs
          </span>
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `min-w-16 flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
          }
          onClick={onClose}
          to="/roadmap"
        >
          <span className="material-symbols-outlined">route</span>
          <span className="font-headline text-[8px] font-bold uppercase tracking-widest">
            Map
          </span>
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `min-w-16 flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
          }
          onClick={onClose}
          to="/scoreboard"
        >
          <span className="material-symbols-outlined">leaderboard</span>
          <span className="font-headline text-[8px] font-bold uppercase tracking-widest">
            Rank
          </span>
        </NavLink>
        <a className="min-w-16 flex flex-col items-center gap-1 text-on-surface-variant" href="#">
          <span className="material-symbols-outlined">science</span>
          <span className="font-headline text-[8px] font-bold uppercase tracking-widest">
            Labs
          </span>
        </a>
      </nav>
    </>
  )
}

export default Sidebar
