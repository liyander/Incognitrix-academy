import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getAuthSession, logoutUser } from '../../auth'
import { apiFetch } from '../../services/api'

const resources = ['all', 'users', 'rooms', 'progress', 'docker', 'career-paths']

function formatDateTime(value) {
  if (!value) return 'N/A'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function StatCard({ label, value, tone = 'primary' }) {
  const toneClass = tone === 'secondary' ? 'border-l-secondary text-secondary' : 'border-l-primary text-primary'
  return (
    <article className={`bg-surface-container-lowest border-l-4 ${toneClass} p-5`}>
      <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <p className="mt-2 font-headline text-3xl font-black text-on-background">{value}</p>
    </article>
  )
}

function DeveloperDashboardPage() {
  const navigate = useNavigate()
  const session = getAuthSession()
  const [overview, setOverview] = useState(null)
  const [activeUsers, setActiveUsers] = useState([])
  const [docker, setDocker] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [docs, setDocs] = useState('')
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState(null)
  const [consoleResource, setConsoleResource] = useState('all')
  const [consoleResult, setConsoleResult] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canAccess = session?.role === 'developer' || session?.role === 'admin'

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const [overviewData, usersData, dockerData, keysData, docsData] = await Promise.all([
        apiFetch('/developer/overview'),
        apiFetch('/developer/active-users'),
        apiFetch('/developer/docker'),
        apiFetch('/developer/api-keys'),
        apiFetch('/developer/docs'),
      ])
      setOverview(overviewData)
      setActiveUsers(Array.isArray(usersData?.items) ? usersData.items : [])
      setDocker(Array.isArray(dockerData?.items) ? dockerData.items : [])
      setApiKeys(Array.isArray(keysData?.items) ? keysData.items : [])
      setDocs(docsData?.markdown || '')
      setError('')
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load developer dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canAccess) {
      void loadDashboard()
    }
  }, [canAccess, loadDashboard])

  const runningDocker = useMemo(
    () => docker.filter((item) => String(item.status || '').toLowerCase() === 'running'),
    [docker],
  )

  const createApiKey = async (event) => {
    event.preventDefault()
    setWorking(true)
    setError('')
    setSuccess('')
    try {
      const created = await apiFetch('/developer/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName || 'Developer Key' }),
      })
      setGeneratedKey(created)
      setNewKeyName('')
      setSuccess('Developer API key created. Store it now because it is shown only once.')
      await loadDashboard()
    } catch (createError) {
      setError(createError?.message || 'Failed to create API key')
    } finally {
      setWorking(false)
    }
  }

  const revokeApiKey = async (keyId) => {
    setWorking(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch(`/developer/api-keys/${keyId}`, { method: 'DELETE' })
      setSuccess('API key revoked.')
      await loadDashboard()
    } catch (revokeError) {
      setError(revokeError?.message || 'Failed to revoke API key')
    } finally {
      setWorking(false)
    }
  }

  const saveDocs = async () => {
    setWorking(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch('/developer/docs', {
        method: 'PUT',
        body: JSON.stringify({ markdown: docs }),
      })
      setSuccess('Developer documentation saved.')
    } catch (docsError) {
      setError(docsError?.message || 'Failed to save documentation')
    } finally {
      setWorking(false)
    }
  }

  const runConsole = async (event) => {
    event.preventDefault()
    setWorking(true)
    setError('')
    try {
      const result = await apiFetch('/developer/console', {
        method: 'POST',
        body: JSON.stringify({ resource: consoleResource }),
      })
      setConsoleResult(JSON.stringify(result?.response ?? result, null, 2))
    } catch (consoleError) {
      setConsoleResult('')
      setError(consoleError?.message || 'Console request failed')
    } finally {
      setWorking(false)
    }
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!canAccess) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="min-h-screen bg-surface px-6 md:px-10 py-10">
      <section className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <header className="bg-surface-container-lowest border-l-4 border-primary p-7 md:p-9 flex-1">
            <p className="font-headline text-[10px] tracking-[0.25em] uppercase text-primary font-bold">
              Developer Operations
            </p>
            <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight mt-3 uppercase">
              Developer Console
            </h1>
            <p className="mt-4 max-w-3xl text-sm text-on-surface-variant">
              Monitor live users, running lab machines, API access, and integration payloads from one developer-only panel.
            </p>
          </header>
          <div className="flex gap-3">
            {session.role === 'admin' ? (
              <button
                className="bg-surface-container-high px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest"
                onClick={() => navigate('/admin')}
                type="button"
              >
                Admin
              </button>
            ) : null}
            <button
              className="bg-primary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary"
              onClick={() => {
                logoutUser()
                navigate('/login')
              }}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>

        {error ? (
          <div className="bg-error/10 border-l-4 border-error p-4">
            <p className="font-headline text-sm font-bold text-error">{error}</p>
          </div>
        ) : null}
        {success ? (
          <div className="bg-secondary/10 border-l-4 border-secondary p-4">
            <p className="font-headline text-sm font-bold text-secondary">{success}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="py-16 text-center text-on-surface-variant">Loading developer telemetry...</div>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
              <StatCard label="Active Users" value={overview?.users?.active ?? 0} />
              <StatCard label="Operators" value={overview?.users?.operators ?? 0} tone="secondary" />
              <StatCard label="Developers" value={overview?.users?.developers ?? 0} />
              <StatCard label="Rooms In Progress" value={overview?.rooms?.inProgress ?? 0} tone="secondary" />
              <StatCard label="Running Docker" value={overview?.docker?.runningInstances ?? 0} />
              <StatCard label="Total Rooms" value={overview?.rooms?.total ?? 0} tone="secondary" />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
              <div className="bg-surface-container-lowest p-6 border-l-4 border-primary">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">Live Monitor</p>
                    <h2 className="font-headline text-2xl font-black uppercase">Current Active Users</h2>
                  </div>
                  <button
                    className="bg-surface-container-high px-4 py-2 font-headline text-[10px] font-bold uppercase tracking-widest"
                    onClick={() => void loadDashboard()}
                    type="button"
                  >
                    Refresh
                  </button>
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/30">
                        <th className="py-3 pr-4 font-label text-[10px] uppercase tracking-widest">User</th>
                        <th className="py-3 pr-4 font-label text-[10px] uppercase tracking-widest">Room</th>
                        <th className="py-3 pr-4 font-label text-[10px] uppercase tracking-widest">Docker</th>
                        <th className="py-3 pr-4 font-label text-[10px] uppercase tracking-widest">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeUsers.map((user) => (
                        <tr className="border-b border-outline-variant/10" key={user.id}>
                          <td className="py-4 pr-4">
                            <p className="font-headline font-bold uppercase">{user.username}</p>
                            <p className="text-xs text-on-surface-variant">{user.role}</p>
                          </td>
                          <td className="py-4 pr-4 text-on-surface-variant">
                            {user.currentRoom?.title || 'Not solving a room'}
                          </td>
                          <td className="py-4 pr-4">
                            <span className={`px-2 py-1 font-headline text-[10px] font-bold uppercase tracking-widest ${user.docker ? 'bg-secondary/15 text-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                              {user.docker?.status || 'none'}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-on-surface-variant">{formatDateTime(user.lastSeenAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!activeUsers.length ? (
                    <p className="mt-4 bg-surface-container-high p-4 text-sm text-on-surface-variant">
                      No recent user activity has been recorded.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 border-l-4 border-secondary">
                <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold">Container Watch</p>
                <h2 className="font-headline text-2xl font-black uppercase">Docker Instances</h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {runningDocker.length} running out of {docker.length} tracked instance(s).
                </p>
                <div className="mt-5 space-y-3 max-h-[430px] overflow-y-auto pr-2">
                  {docker.map((machine) => (
                    <article className="bg-surface-container-high p-4" key={machine.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-headline text-sm font-bold uppercase">{machine.roomTitle || machine.roomId}</p>
                          <p className="mt-1 text-xs text-on-surface-variant">{machine.username || 'Unknown user'}</p>
                        </div>
                        <span className="text-xs font-bold uppercase text-primary">{machine.status}</span>
                      </div>
                      <p className="mt-3 break-all text-xs text-on-surface-variant">{machine.containerName}</p>
                    </article>
                  ))}
                  {!docker.length ? <p className="text-sm text-on-surface-variant">No Docker instances tracked.</p> : null}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-surface-container-lowest p-6 border-l-4 border-primary">
                <p className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">API Access</p>
                <h2 className="font-headline text-2xl font-black uppercase">Developer API Keys</h2>
                <form className="mt-5 flex flex-col sm:flex-row gap-3" onSubmit={createApiKey}>
                  <input
                    className="flex-1 bg-surface-container-highest border-l-2 border-l-primary px-4 py-3 outline-none"
                    onChange={(event) => setNewKeyName(event.target.value)}
                    placeholder="Key name, e.g. SOC reporting script"
                    type="text"
                    value={newKeyName}
                  />
                  <button
                    className="bg-primary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
                    disabled={working}
                    type="submit"
                  >
                    Create Key
                  </button>
                </form>
                {generatedKey ? (
                  <div className="mt-5 bg-secondary/10 border-l-4 border-secondary p-4">
                    <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold">
                      Copy this key now
                    </p>
                    <p className="mt-2 break-all font-mono text-sm text-on-background">{generatedKey.key}</p>
                  </div>
                ) : null}
                <div className="mt-5 space-y-3">
                  {apiKeys.map((key) => (
                    <article className="bg-surface-container-high p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" key={key.id}>
                      <div>
                        <p className="font-headline text-sm font-bold uppercase">{key.name}</p>
                        <p className="mt-1 font-mono text-xs text-on-surface-variant">{key.key}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">Last used: {formatDateTime(key.lastUsedAt)}</p>
                      </div>
                      <button
                        className="bg-error px-4 py-2 font-headline text-[10px] font-bold uppercase tracking-widest text-on-error disabled:opacity-50"
                        disabled={working || Boolean(key.revokedAt)}
                        onClick={() => void revokeApiKey(key.id)}
                        type="button"
                      >
                        {key.revokedAt ? 'Revoked' : 'Revoke'}
                      </button>
                    </article>
                  ))}
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 border-l-4 border-secondary">
                <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold">Endpoint Console</p>
                <h2 className="font-headline text-2xl font-black uppercase">Inspect Data Returns</h2>
                <form className="mt-5 flex flex-col sm:flex-row gap-3" onSubmit={runConsole}>
                  <select
                    className="flex-1 bg-surface-container-highest border-l-2 border-l-secondary px-4 py-3 outline-none"
                    onChange={(event) => setConsoleResource(event.target.value)}
                    value={consoleResource}
                  >
                    {resources.map((resource) => (
                      <option key={resource} value={resource}>
                        /api/developer/data/{resource}
                      </option>
                    ))}
                  </select>
                  <button
                    className="bg-secondary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-secondary disabled:opacity-50"
                    disabled={working}
                    type="submit"
                  >
                    Invoke
                  </button>
                </form>
                <pre className="mt-5 max-h-[460px] overflow-auto bg-black text-cyan-100 p-4 text-xs leading-relaxed">
                  {consoleResult || 'Run a request to inspect the response payload.'}
                </pre>
              </div>
            </section>

            <section className="bg-surface-container-lowest p-6 border-l-4 border-primary">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">Documentation</p>
                  <h2 className="font-headline text-2xl font-black uppercase">Developer Notes</h2>
                </div>
                <button
                  className="bg-primary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
                  disabled={working}
                  onClick={() => void saveDocs()}
                  type="button"
                >
                  Save Docs
                </button>
              </div>
              <textarea
                className="mt-5 min-h-[280px] w-full bg-surface-container-highest border-l-2 border-l-primary p-4 font-mono text-sm outline-none"
                onChange={(event) => setDocs(event.target.value)}
                value={docs}
              />
            </section>
          </>
        )}
      </section>
    </main>
  )
}

export default DeveloperDashboardPage
