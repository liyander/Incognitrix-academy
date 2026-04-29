import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getAuthSession } from '../auth'
import { apiFetch } from '../services/api'

function Sidebar({ config, isSidebarOpen, onClose }) {
  const authSession = getAuthSession()
  const [username, setUsername] = useState(authSession?.username || 'operator')

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

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-4 px-8 py-4 font-headline text-xs font-bold tracking-widest uppercase transition-all duration-150 ease-in-out border-l-4 ${
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
        className={`h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex flex-col py-8 z-40 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <button
          className="md:hidden absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
          onClick={onClose}
          type="button"
          aria-label="Close sidebar"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="px-8 mb-12">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-primary flex items-center justify-center text-white font-headline font-bold text-xl">
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
        <nav className="flex-1 flex flex-col gap-1">
          {config.routes.dashboard ? (
            <NavLink className={navLinkClass} onClick={onClose} to="/" end>
              <span className="material-symbols-outlined">grid_view</span>
              Dashboard
            </NavLink>
          ) : null}
          {config.routes.practiceLabs ? (
            <NavLink className={navLinkClass} onClick={onClose} to="/learn">
              <span className="material-symbols-outlined">school</span>
              Learn
            </NavLink>
          ) : null}
          {config.routes.upcomingCtf ? (
            <NavLink className={navLinkClass} onClick={onClose} to="/upcoming-ctf">
              <span className="material-symbols-outlined">event_upcoming</span>
              Upcoming CTF
            </NavLink>
          ) : null}
          <NavLink className={navLinkClass} onClick={onClose} to="/cves">
            <span className="material-symbols-outlined">bug_report</span>
            CVEs
          </NavLink>
          {config.routes.profile ? (
            <NavLink className={navLinkClass} onClick={onClose} to="/profile">
              <span className="material-symbols-outlined">account_circle</span>
              Profile
            </NavLink>
          ) : null}
          <NavLink className={navLinkClass} onClick={onClose} to="/verify-certificate">
            <span className="material-symbols-outlined">verified</span>
            Verify Certificate
          </NavLink>
          <a
            className="flex items-center gap-4 px-8 py-4 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-headline text-xs font-bold tracking-widest uppercase transition-all duration-150 ease-in-out"
            href="#"
          >
            <span className="material-symbols-outlined">science</span>
            Labs
          </a>
        </nav>
        {config.features.newMissionButton ? (
          <div className="px-6 mb-8">
            <button
              className="w-full py-4 bg-primary text-on-primary font-headline text-[10px] tracking-[0.25em] font-bold uppercase active:scale-95 transition-transform"
              type="button"
            >
              NEW_MISSION
            </button>
          </div>
        ) : null}
        <footer className="mt-auto flex flex-col gap-1 border-t border-outline-variant pt-4">
          <a
            className="flex items-center gap-4 px-8 py-3 text-on-surface-variant hover:text-on-surface font-headline text-xs font-bold tracking-widest uppercase"
            href="#"
          >
            <span className="material-symbols-outlined">help</span>
            Support
          </a>
          <a
            className="flex items-center gap-4 px-8 py-3 text-on-surface-variant hover:text-on-surface font-headline text-xs font-bold tracking-widest uppercase"
            href="#"
          >
            <span className="material-symbols-outlined">terminal</span>
            Terminal
          </a>
        </footer>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-nav border-t border-outline-variant/60 flex justify-around items-center py-4 z-50">
        {config.routes.dashboard ? (
          <NavLink
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
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
              `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
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
              `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
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
              `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
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
            `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
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
              `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
            }
            onClick={onClose}
            to="/cves"
          >
            <span className="material-symbols-outlined">bug_report</span>
            <span className="font-headline text-[8px] font-bold uppercase tracking-widest">
              CVEs
            </span>
          </NavLink>
        <a className="flex flex-col items-center gap-1 text-on-surface-variant" href="#">
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
