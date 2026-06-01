import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../services/api'

function primaryContainerName(container) {
  return String(container?.names || '').split(',')[0].trim()
}

function AdminRunningMachinesPage() {
  const navigate = useNavigate()
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const loadContainers = async () => {
    setLoading(true)
    setMessage('')
    try {
      const response = await apiFetch('/rooms/docker-config/containers')
      setContainers(Array.isArray(response?.containers) ? response.containers : [])
    } catch (error) {
      setContainers([])
      setMessage(error?.message || 'Unable to load running machines.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadContainers()
    const intervalId = window.setInterval(loadContainers, 10000)
    return () => window.clearInterval(intervalId)
  }, [])

  const stopContainer = async (container) => {
    const name = primaryContainerName(container)
    if (!name) return
    setMessage('')
    try {
      await apiFetch(`/rooms/docker-config/containers/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      })
      await loadContainers()
    } catch (error) {
      setMessage(error?.message || 'Unable to stop machine.')
    }
  }

  return (
    <main className="min-h-screen bg-surface px-6 md:px-10 py-10">
      <section className="max-w-7xl mx-auto space-y-8">
        <button
          className="px-4 py-2 bg-surface-container-high text-on-surface font-headline text-xs font-bold uppercase tracking-widest"
          onClick={() => navigate('/admin')}
          type="button"
        >
          Back
        </button>

        <header className="bg-surface-container-lowest border-l-4 border-secondary p-8 md:p-10">
          <p className="font-headline text-[10px] tracking-[0.25em] uppercase text-secondary font-bold">
            Live Lab Runtime
          </p>
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight mt-3 uppercase">
            Running Machines
          </h1>
          <p className="text-sm text-on-surface-variant mt-4 max-w-3xl">
            Monitor active Incognitrix Docker machines spawned by practical labs and stop stale sessions.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest p-5 border-l-4 border-l-secondary">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Active Machines
            </p>
            <p className="mt-2 font-headline text-4xl font-black text-secondary">{containers.length}</p>
          </div>
          <div className="bg-surface-container-lowest p-5 md:col-span-2 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <p className="font-headline text-lg font-black uppercase">Runtime Feed</p>
              <p className="text-sm text-on-surface-variant">
                Auto-refreshes every 10 seconds while this page is open.
              </p>
            </div>
            <button
              className="bg-secondary text-on-secondary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest disabled:opacity-60"
              disabled={loading}
              onClick={() => {
                void loadContainers()
              }}
              type="button"
            >
              {loading ? 'Refreshing...' : 'Refresh Now'}
            </button>
          </div>
        </section>

        {message ? (
          <p className="bg-error/10 border-l-4 border-error px-4 py-3 text-sm text-error">
            {message}
          </p>
        ) : null}

        <section className="bg-surface-container-lowest p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="py-3 pr-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Machine</th>
                  <th className="py-3 pr-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Image</th>
                  <th className="py-3 pr-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Ports</th>
                  <th className="py-3 pr-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Status</th>
                  <th className="py-3 pr-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Created</th>
                  <th className="py-3 text-right font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Action</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((container) => (
                  <tr className="border-b border-outline-variant/30" key={container.id || container.names}>
                    <td className="py-4 pr-4">
                      <p className="font-headline text-sm font-bold text-on-background break-all">{container.names}</p>
                      <p className="mt-1 text-[11px] text-on-surface-variant break-all">{container.id}</p>
                    </td>
                    <td className="py-4 pr-4 text-sm text-on-surface-variant break-all">{container.image}</td>
                    <td className="py-4 pr-4 text-sm text-on-surface-variant break-all">{container.ports || 'No published ports'}</td>
                    <td className="py-4 pr-4 text-sm text-on-surface-variant">{container.status || 'Running'}</td>
                    <td className="py-4 pr-4 text-sm text-on-surface-variant">
                      {container.createdAt ? new Date(container.createdAt).toLocaleString() : 'Unknown'}
                    </td>
                    <td className="py-4 text-right">
                      <button
                        className="bg-error text-on-error px-4 py-2 font-headline text-[10px] font-bold uppercase tracking-widest"
                        onClick={() => {
                          void stopContainer(container)
                        }}
                        type="button"
                      >
                        Stop
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!containers.length && !loading ? (
            <div className="mt-6 bg-surface-container-high p-6 text-sm text-on-surface-variant">
              No active Incognitrix machines are running.
            </div>
          ) : null}
        </section>
      </section>
    </main>
  )
}

export default AdminRunningMachinesPage
