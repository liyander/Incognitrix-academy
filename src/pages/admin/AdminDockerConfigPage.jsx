import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../services/api'

function AdminDockerConfigPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState({
    connected: false,
    images: [],
    message: '',
  })
  const [loading, setLoading] = useState(true)

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
    } catch (error) {
      setStatus({
        connected: false,
        images: [],
        message: error?.message || 'Unable to connect to Docker.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDockerStatus()
  }, [])

  return (
    <main className="min-h-screen bg-surface px-6 md:px-10 py-10">
      <section className="max-w-6xl mx-auto space-y-8">
        <div>
          <button
            className="px-4 py-2 bg-surface-container-high text-on-surface font-headline text-xs font-bold uppercase tracking-widest"
            onClick={() => navigate('/admin')}
            type="button"
          >
            Back
          </button>
        </div>

        <header className="bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10">
          <p className="font-headline text-[10px] tracking-[0.25em] uppercase text-primary font-bold">
            Container Runtime
          </p>
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight mt-3 uppercase">
            Docker Configuration
          </h1>
          <p className="text-sm text-on-surface-variant mt-4 max-w-2xl">
            Verify the backend Docker connection and review images that can be attached to practical labs.
          </p>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-6">
          <div className="bg-surface-container-lowest p-6 border-l-4 border-l-secondary">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Connection Status
            </p>
            <div className="mt-5 flex items-center gap-4">
              <span
                className={`inline-flex h-14 w-14 items-center justify-center ${
                  status.connected ? 'bg-secondary/15 text-secondary' : 'bg-error/15 text-error'
                }`}
              >
                <span className="material-symbols-outlined text-3xl">
                  {status.connected ? 'check_circle' : 'error'}
                </span>
              </span>
              <div>
                <h2 className="font-headline text-2xl font-black uppercase">
                  {loading ? 'Checking...' : status.connected ? 'Connected' : 'Not Connected'}
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {status.connected
                    ? 'Docker is reachable from the backend host.'
                    : status.message || 'Docker is not reachable from the backend host.'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-surface-container-high p-4">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Images
                </p>
                <p className="mt-1 font-headline text-3xl font-black">{status.images.length}</p>
              </div>
              <div className="bg-surface-container-high p-4">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Containers
                </p>
                <p className="mt-1 font-headline text-3xl font-black">{status.containers || 0}</p>
              </div>
            </div>

            {status.connected ? (
              <div className="mt-5 text-xs leading-relaxed text-on-surface-variant">
                <p>Version: {status.serverVersion || 'N/A'}</p>
                <p>OS: {status.operatingSystem || 'N/A'}</p>
                <p>Arch: {status.architecture || 'N/A'}</p>
              </div>
            ) : null}

            <button
              className="mt-6 w-full bg-primary text-on-primary px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest disabled:opacity-60"
              disabled={loading}
              onClick={() => {
                void loadDockerStatus()
              }}
              type="button"
            >
              Refresh Connection
            </button>
          </div>

          <div className="bg-surface-container-lowest p-6">
            <div className="flex items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">
                  Available Images
                </p>
                <h2 className="mt-1 font-headline text-2xl font-black uppercase tracking-tight">
                  Lab Image Library
                </h2>
              </div>
              <button
                className="px-4 py-2 bg-secondary text-on-secondary font-headline text-[10px] font-bold uppercase tracking-widest"
                onClick={() => navigate('/admin/rooms/new')}
                type="button"
              >
                New Lab
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {status.images.map((image) => (
                <article
                  className="bg-surface-container-high p-4 border-l-2 border-l-primary"
                  key={`${image.id}-${image.name}`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <p className="font-headline text-sm font-bold text-on-surface break-all">
                        {image.name}
                      </p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {image.id || 'No image id'}
                      </p>
                    </div>
                    <div className="text-xs text-on-surface-variant md:text-right">
                      <p>{image.size || 'Unknown size'}</p>
                      <p>{image.createdSince || ''}</p>
                    </div>
                  </div>
                </article>
              ))}

              {!loading && !status.images.length ? (
                <p className="bg-surface-container-high p-5 text-sm text-on-surface-variant">
                  No Docker images were found. Pull or build an image on the backend host, then refresh this page.
                </p>
              ) : null}

              {loading ? (
                <p className="bg-surface-container-high p-5 text-sm text-on-surface-variant">
                  Checking Docker image library...
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

export default AdminDockerConfigPage
