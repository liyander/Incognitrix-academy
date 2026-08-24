import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../services/api'

const emptyConfig = {
  hostname: '',
  displayHost: '',
  tlsEnabled: false,
  caCert: '',
  clientCert: '',
  clientKey: '',
}

function AdminDockerConfigPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState({ connected: false, images: [], message: '' })
  const [containers, setContainers] = useState([])
  const [config, setConfig] = useState(emptyConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadDockerStatus = async () => {
    setLoading(true)
    try {
      const response = await apiFetch('/rooms/docker-config/status')
      setStatus({
        connected: Boolean(response?.connected),
        serverVersion: response?.serverVersion || '',
        operatingSystem: response?.operatingSystem || '',
        architecture: response?.architecture || '',
        containers: Number(response?.containers || 0),
        images: Array.isArray(response?.images) ? response.images : [],
        message: response?.message || '',
      })
      setConfig((current) => ({
        ...current,
        hostname: response?.config?.hostname || '',
        displayHost: response?.config?.displayHost || '',
        tlsEnabled: Boolean(response?.config?.tlsEnabled),
      }))
    } catch (error) {
      setStatus({ connected: false, images: [], message: error?.message || 'Unable to connect to Docker.' })
    } finally {
      setLoading(false)
    }
  }

  const loadContainers = async () => {
    try {
      const response = await apiFetch('/rooms/docker-config/containers')
      setContainers(Array.isArray(response?.containers) ? response.containers : [])
    } catch {
      setContainers([])
    }
  }

  useEffect(() => {
    void loadDockerStatus()
    void loadContainers()
  }, [])

  const updateConfig = (field, value) => {
    setConfig((current) => ({ ...current, [field]: value }))
  }

  const readCertFile = (field, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateConfig(field, String(reader.result || ''))
    reader.readAsText(file)
  }

  const saveConfig = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await apiFetch('/rooms/docker-config', {
        method: 'PUT',
        body: JSON.stringify(config),
      })
      setConfig((current) => ({
        ...current,
        caCert: '',
        clientCert: '',
        clientKey: '',
      }))
      setMessage('Docker connection saved.')
      await loadDockerStatus()
      await loadContainers()
    } catch (error) {
      setMessage(error?.message || 'Unable to save Docker connection.')
    } finally {
      setSaving(false)
    }
  }

  const stopContainer = async (name) => {
    await apiFetch(`/rooms/docker-config/containers/${encodeURIComponent(name)}`, { method: 'DELETE' })
    await loadContainers()
    await loadDockerStatus()
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

        <header className="bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10">
          <p className="font-headline text-[10px] tracking-[0.25em] uppercase text-primary font-bold">
            Container Runtime
          </p>
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight mt-3 uppercase">
            Docker Configuration
          </h1>
          <p className="text-sm text-on-surface-variant mt-4 max-w-3xl">
            Configure the Docker daemon connection, choose the display host shown to players, and monitor active lab containers.
          </p>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
          <form className="bg-surface-container-lowest p-6 border-l-4 border-l-primary space-y-5" onSubmit={saveConfig}>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">
                Connection
              </p>
              <h2 className="mt-1 font-headline text-2xl font-black uppercase">Docker Host</h2>
            </div>

            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                Hostname
              </span>
              <input
                className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary py-3 px-4 outline-none"
                onChange={(event) => updateConfig('hostname', event.target.value)}
                placeholder="tcp://110.172.151.108:2375 or unix:///var/run/docker.sock"
                type="text"
                value={config.hostname}
              />
              <p className="mt-1 text-xs text-on-surface-variant">
                Leave empty to use the backend host default Docker context.
              </p>
            </label>

            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                Display Host
              </span>
              <input
                className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary py-3 px-4 outline-none"
                onChange={(event) => updateConfig('displayHost', event.target.value)}
                placeholder="IP or DNS shown to players, e.g. 110.172.151.108"
                type="text"
                value={config.displayHost}
              />
            </label>

            <label className="flex items-center gap-3">
              <input
                checked={config.tlsEnabled}
                className="h-4 w-4 accent-[#b6171e]"
                onChange={(event) => updateConfig('tlsEnabled', event.target.checked)}
                type="checkbox"
              />
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                TLS Enabled
              </span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block bg-surface-container-high p-4">
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  CA Cert
                </span>
                <input className="mt-3 text-xs" onChange={(event) => readCertFile('caCert', event.target.files?.[0])} type="file" />
              </label>
              <label className="block bg-surface-container-high p-4">
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Client Cert
                </span>
                <input className="mt-3 text-xs" onChange={(event) => readCertFile('clientCert', event.target.files?.[0])} type="file" />
              </label>
              <label className="block bg-surface-container-high p-4">
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Client Key
                </span>
                <input className="mt-3 text-xs" onChange={(event) => readCertFile('clientKey', event.target.files?.[0])} type="file" />
              </label>
            </div>

            <button
              className="w-full bg-primary text-on-primary px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Saving...' : 'Save Docker Connection'}
            </button>
            {message ? <p className="text-sm text-on-surface-variant">{message}</p> : null}
          </form>

          <div className="bg-surface-container-lowest p-6 border-l-4 border-l-secondary">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Connection Status
            </p>
            <div className="mt-5 flex items-center gap-4">
              <span className={`inline-flex h-14 w-14 items-center justify-center ${status.connected ? 'bg-secondary/15 text-secondary' : 'bg-error/15 text-error'}`}>
                <span className="material-symbols-outlined text-3xl">{status.connected ? 'check_circle' : 'error'}</span>
              </span>
              <div>
                <h2 className="font-headline text-2xl font-black uppercase">
                  {loading ? 'Checking...' : status.connected ? 'Connected' : 'Not Connected'}
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {status.connected ? 'Docker is reachable.' : status.message || 'Docker is not reachable.'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-surface-container-high p-4">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Images</p>
                <p className="mt-1 font-headline text-3xl font-black">{status.images.length}</p>
              </div>
              <div className="bg-surface-container-high p-4">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Containers</p>
                <p className="mt-1 font-headline text-3xl font-black">{status.containers || 0}</p>
              </div>
              <div className="bg-surface-container-high p-4">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Active Labs</p>
                <p className="mt-1 font-headline text-3xl font-black">{containers.length}</p>
              </div>
            </div>

            <button
              className="mt-6 w-full bg-secondary text-on-secondary px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest disabled:opacity-60"
              disabled={loading}
              onClick={() => {
                void loadDockerStatus()
                void loadContainers()
              }}
              type="button"
            >
              Refresh
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-surface-container-lowest p-6">
            <h2 className="font-headline text-2xl font-black uppercase tracking-tight">Available Images</h2>
            <div className="mt-5 space-y-3">
              {status.images.map((image) => (
                <article className="bg-surface-container-high p-4 border-l-2 border-l-primary" key={`${image.id}-${image.name}`}>
                  <p className="font-headline text-sm font-bold break-all">{image.name}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{image.size || 'Unknown size'} {image.createdSince ? `- ${image.createdSince}` : ''}</p>
                </article>
              ))}
              {!status.images.length ? <p className="bg-surface-container-high p-4 text-sm text-on-surface-variant">No Docker images found.</p> : null}
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6">
            <h2 className="font-headline text-2xl font-black uppercase tracking-tight">Active Containers</h2>
            <div className="mt-5 space-y-3">
              {containers.map((container) => (
                <article className="bg-surface-container-high p-4 border-l-2 border-l-secondary" key={container.id || container.names}>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <p className="font-headline text-sm font-bold break-all">{container.names}</p>
                      <p className="mt-1 text-xs text-on-surface-variant break-all">{container.image}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{container.status}</p>
                      <p className="mt-1 text-xs text-on-surface-variant break-all">{container.ports}</p>
                    </div>
                    <button
                      className="shrink-0 bg-error text-on-error px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-widest"
                      onClick={() => {
                        void stopContainer(container.names)
                      }}
                      type="button"
                    >
                      Stop
                    </button>
                  </div>
                </article>
              ))}
              {!containers.length ? <p className="bg-surface-container-high p-4 text-sm text-on-surface-variant">No active Incognitrix containers.</p> : null}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

export default AdminDockerConfigPage
