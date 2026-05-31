import { Link, useLocation } from 'react-router-dom'

function NotFoundPage({ variant = 'operator', config = null }) {
  const location = useLocation()
  const isAdmin = variant === 'admin'
  const isPublic = variant === 'public'

  const operatorLinks = [
    { label: 'Dashboard', to: '/', icon: 'grid_view', enabled: config?.routes?.dashboard !== false },
    { label: 'Learning Paths', to: '/learn/paths', icon: 'school', enabled: config?.routes?.learningPaths !== false },
    { label: 'Labs', to: '/learn', icon: 'science', enabled: config?.routes?.practiceLabs !== false },
    { label: 'Scoreboard', to: '/scoreboard', icon: 'leaderboard', enabled: true },
  ].filter((item) => item.enabled)

  const adminLinks = [
    { label: 'Control Panel', to: '/admin', icon: 'admin_panel_settings' },
    { label: 'Rooms', to: '/admin/rooms', icon: 'meeting_room' },
    { label: 'Users', to: '/admin/registrations', icon: 'badge' },
    { label: 'Admin AI', to: '/admin/ai-control', icon: 'psychology' },
  ]

  const publicLinks = [
    { label: 'Login', to: '/login', icon: 'login' },
    { label: 'Register', to: '/register', icon: 'person_add' },
    { label: 'Verify Certificate', to: '/verify-certificate', icon: 'verified' },
  ]

  const links = isAdmin ? adminLinks : isPublic ? publicLinks : operatorLinks

  return (
    <main className="min-h-screen bg-surface text-on-background selection:bg-primary-container selection:text-on-primary-container">
      <section className="relative min-h-screen overflow-hidden px-6 py-10 md:px-12 lg:px-16 flex items-center">
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(90deg,currentColor_1px,transparent_1px),linear-gradient(0deg,currentColor_1px,transparent_1px)] bg-[size:48px_48px]"></div>
        </div>
        <div className="absolute left-0 top-0 h-full w-1 bg-primary"></div>
        <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.35em] text-primary">
              Signal Lost
            </p>
            <h1 className="mt-5 font-headline text-7xl font-black uppercase leading-none tracking-tight md:text-8xl lg:text-9xl">
              404
            </h1>
            <div className="mt-6 max-w-3xl border-l-4 border-primary bg-surface-container-lowest p-6 md:p-8">
              <h2 className="font-headline text-2xl font-black uppercase tracking-tight md:text-4xl">
                Mission route not found
              </h2>
              <p className="mt-4 text-base leading-relaxed text-on-surface-variant md:text-lg">
                The requested path does not match an active Incognitrix Academy route. The endpoint may have moved,
                been disabled, or never existed in this operation map.
              </p>
              <p className="mt-4 break-all font-mono text-xs text-on-surface-variant">
                Requested: {location.pathname}
              </p>
            </div>
          </div>

          <aside className="bg-surface-container-lowest p-6 shadow-2xl md:p-8">
            <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-5">
              <span className="material-symbols-outlined text-primary">
                {isAdmin ? 'admin_panel_settings' : isPublic ? 'public' : 'terminal'}
              </span>
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                  Recovery Options
                </p>
                <h3 className="mt-1 font-headline text-xl font-black uppercase tracking-tight">
                  Reconnect
                </h3>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {links.map((link) => (
                <Link
                  className="group flex items-center justify-between gap-4 bg-surface-container-high px-4 py-4 text-on-surface transition-colors hover:bg-primary hover:text-on-primary"
                  key={link.to}
                  to={link.to}
                >
                  <span className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg">{link.icon}</span>
                    <span className="font-headline text-xs font-bold uppercase tracking-widest">
                      {link.label}
                    </span>
                  </span>
                  <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-8 bg-surface-container-high p-4">
              <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Diagnostic
              </p>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                Use the navigation above to return to a valid mission area. If this link came from the admin panel,
                verify the route is enabled and the content still exists.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}

export default NotFoundPage
