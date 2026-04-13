import { NavLink } from 'react-router-dom'

function Navbar({ config, isSidebarOpen, onLogout, onToggleSidebar }) {
  const navItemClass = ({ isActive }) =>
    `transition-colors duration-200 ${
      isActive
        ? 'text-red-600 border-b-2 border-red-600 pb-1'
        : 'text-neutral-500 hover:text-neutral-900'
    }`

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
            href="#"
          >
            CTF Arena
          </a>
          <a
            className="text-neutral-500 hover:text-neutral-900 transition-colors duration-200"
            href="#"
          >
            Career Track
          </a>
        </nav>
      </div>
      <div className="flex items-center gap-6">
        {config.features.navbarSearch ? (
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-surface-container-low rounded-full">
            <span className="material-symbols-outlined text-primary text-base">search</span>
            <span className="font-headline text-[10px] font-bold tracking-widest text-on-background uppercase">
              Query
            </span>
          </div>
        ) : null}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-surface-container-low rounded-full">
          <span className="material-symbols-outlined text-primary text-base">local_fire_department</span>
          <span className="font-headline text-[10px] font-bold tracking-widest text-on-background uppercase">
            14 Day Streak
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-neutral-500">
          {config.features.navbarNotifications ? (
            <span className="material-symbols-outlined hover:text-neutral-900 cursor-pointer">notifications</span>
          ) : null}
          {config.features.navbarSettings ? (
            <span className="material-symbols-outlined hover:text-neutral-900 cursor-pointer">settings</span>
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
