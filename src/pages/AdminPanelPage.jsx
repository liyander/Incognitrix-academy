function ToggleRow({ checked, description, label, onChange }) {
  return (
    <label className="flex items-start justify-between gap-6 py-4 border-b border-outline-variant/20">
      <div>
        <p className="font-headline text-sm font-bold uppercase tracking-wider text-on-background">
          {label}
        </p>
        <p className="text-xs text-on-surface-variant mt-1">{description}</p>
      </div>
      <input
        checked={checked}
        className="mt-1 h-4 w-4 accent-[#b6171e]"
        onChange={(e) => onChange(e.target.checked)}
        type="checkbox"
      />
    </label>
  )
}

function AdminPanelPage({ config, onConfigChange, onLogout, username }) {
  const setRouteValue = (key, value) => {
    onConfigChange({
      ...config,
      routes: { ...config.routes, [key]: value },
    })
  }

  const setFeatureValue = (key, value) => {
    onConfigChange({
      ...config,
      features: { ...config.features, [key]: value },
    })
  }

  return (
    <main className="min-h-screen bg-surface px-6 md:px-10 py-10">
      <section className="max-w-5xl mx-auto">
        <header className="bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10">
          <p className="font-headline text-[10px] tracking-[0.25em] uppercase text-primary font-bold">
            Administrative Control Center
          </p>
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight mt-3 uppercase">
            Incognitrix Admin Panel
          </h1>
          <p className="text-sm text-on-surface-variant mt-4 max-w-2xl">
            Signed in as {username}. Manage all platform content, configuration, access controls, and operator features in real time.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              className="bg-primary text-on-primary px-5 py-2.5 font-headline text-xs font-bold uppercase tracking-widest"
              onClick={onLogout}
              type="button"
            >
              Logout Admin
            </button>
          </div>
        </header>

        {/* Content Management Section */}
        <section className="mt-8">
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6 text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">manage_accounts</span>
            Content Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Experimental Rooms */}
            <div className="bg-surface-container-lowest border-l-4 border-primary p-6 hover:bg-surface-container-high transition-all cursor-pointer">
              <a className="block" href="/admin/rooms">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '32px' }}>
                      flask_2
                    </span>
                    <div>
                      <h3 className="font-headline text-lg font-bold uppercase">
                        Experimental Rooms
                      </h3>
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        Manage Lab Content
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Configure available lab rooms, titles, descriptions, difficulty levels, and detailed markdown/HTML content for each room.
                </p>
              </a>
            </div>

            {/* Career Paths */}
            <div className="bg-surface-container-lowest border-l-4 border-secondary p-6 hover:bg-surface-container-high transition-all cursor-pointer">
              <a className="block" href="/admin/career-paths">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary" style={{ fontSize: '32px' }}>
                      school
                    </span>
                    <div>
                      <h3 className="font-headline text-lg font-bold uppercase">
                        Career Paths
                      </h3>
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        Manage Learning Paths
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Configure learning paths, modules, resources, difficulty levels, commitment hours, and specialization details.
                </p>
              </a>
            </div>

            {/* Notifications */}
            <div className="bg-surface-container-lowest border-l-4 border-secondary p-6 hover:bg-surface-container-high transition-all cursor-pointer">
              <a className="block" href="/admin/notifications">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary" style={{ fontSize: '32px' }}>
                      notifications_active
                    </span>
                    <div>
                      <h3 className="font-headline text-lg font-bold uppercase">
                        Notifications
                      </h3>
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        Manage System Notifications
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Create and manage system-wide notifications that appear in the user panel for all operators.
                </p>
              </a>
            </div>

            {/* Registrations */}
            <div className="bg-surface-container-lowest border-l-4 border-secondary p-6 hover:bg-surface-container-high transition-all cursor-pointer">
              <a className="block" href="/admin/registrations">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary" style={{ fontSize: '32px' }}>
                      badge
                    </span>
                    <div>
                      <h3 className="font-headline text-lg font-bold uppercase">
                        Registrations
                      </h3>
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        Manage User Accounts
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  View and edit registration number, email, status, role, and credentials for player accounts.
                </p>
              </a>
            </div>

            {/* Upcoming CTF */}
            <div className="bg-surface-container-lowest border-l-4 border-primary p-6 hover:bg-surface-container-high transition-all cursor-pointer">
              <a className="block" href="/admin/upcoming-ctf">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '32px' }}>
                      event_upcoming
                    </span>
                    <div>
                      <h3 className="font-headline text-lg font-bold uppercase">
                        Upcoming CTF
                      </h3>
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                        Manage Event Timeline
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Configure event name, registration deadline, live time, and registration link for player-facing CTF announcements.
                </p>
              </a>
            </div>
          </div>
        </section>

        {/* Platform Access Controls */}
        <section className="mt-8">
          <h2 className="font-headline text-2xl font-bold uppercase tracking-tight mb-6 text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">settings</span>
            Platform Access Controls
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-surface-container-lowest p-6 md:p-8">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight">
                Route Access Control
              </h2>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest mt-1 mb-4">
                Enable or disable user pages
              </p>

              <ToggleRow
                checked={config.routes.dashboard}
                description="Controls access to the main mission dashboard route (/)."
                label="Dashboard Route"
                onChange={(v) => setRouteValue('dashboard', v)}
              />
              <ToggleRow
                checked={config.routes.learningPaths}
                description="Controls access to learning path pages (/learn/paths and role-path pages)."
                label="Learning Paths Route"
                onChange={(v) => setRouteValue('learningPaths', v)}
              />
              <ToggleRow
                checked={config.routes.practiceLabs}
                description="Controls access to labs and module routes (/learn and /learn/lab/:labId)."
                label="Practice Labs Route"
                onChange={(v) => setRouteValue('practiceLabs', v)}
              />
              <ToggleRow
                checked={config.routes.upcomingCtf}
                description="Controls access to player upcoming CTF route (/upcoming-ctf)."
                label="Upcoming CTF Route"
                onChange={(v) => setRouteValue('upcomingCtf', v)}
              />
              <ToggleRow
                checked={config.routes.profile}
                description="Controls access to operator profile route (/profile)."
                label="Profile Route"
                onChange={(v) => setRouteValue('profile', v)}
              />
            </div>

            <div className="bg-surface-container-lowest p-6 md:p-8">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight">
                Feature Control
              </h2>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest mt-1 mb-4">
                Toggle core platform actions
              </p>

              <ToggleRow
                checked={config.features.labRooms}
                description="Controls whether users can open specific lab room pages."
                label="Lab Room Access"
                onChange={(v) => setFeatureValue('labRooms', v)}
              />
              <ToggleRow
                checked={config.features.redTeamPath}
                description="Controls access from Learning Paths to Red Team Operator page."
                label="Red Team Path Access"
                onChange={(v) => setFeatureValue('redTeamPath', v)}
              />
              <ToggleRow
                checked={config.features.newMissionButton}
                description="Shows or hides the sidebar NEW_MISSION action."
                label="Sidebar New Mission"
                onChange={(v) => setFeatureValue('newMissionButton', v)}
              />
              <ToggleRow
                checked={config.features.navbarSearch}
                description="Shows or hides the search utility in top navbar."
                label="Navbar Search"
                onChange={(v) => setFeatureValue('navbarSearch', v)}
              />
              <ToggleRow
                checked={config.features.navbarNotifications}
                description="Shows or hides navbar notification icon."
                label="Navbar Notifications"
                onChange={(v) => setFeatureValue('navbarNotifications', v)}
              />
              <ToggleRow
                checked={config.features.navbarSettings}
                description="Shows or hides navbar settings icon."
                label="Navbar Settings"
                onChange={(v) => setFeatureValue('navbarSettings', v)}
              />
              <ToggleRow
                checked={config.features.publicRegistration}
                description="Enable or disable public /register page for new operator accounts."
                label="Public Registration"
                onChange={(v) => setFeatureValue('publicRegistration', v)}
              />
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

export default AdminPanelPage
