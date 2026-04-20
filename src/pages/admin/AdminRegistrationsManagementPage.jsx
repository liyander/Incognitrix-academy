import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../services/api'

function AdminRegistrationsManagementPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const data = await apiFetch('/users/admin/registrations')
        setUsers(Array.isArray(data) ? data : [])
        setError('')
      } catch (fetchError) {
        setError(fetchError?.message || 'Failed to load registrations')
      } finally {
        setLoading(false)
      }
    }

    void fetchUsers()
  }, [])

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = users.filter((user) => {
      if (!query) return true
      const registration = String(user.registration_number || '').toLowerCase()
      const username = String(user.username || '').toLowerCase()
      return registration.includes(query) || username.includes(query)
    })

    return [...filtered].sort((a, b) => {
      const aReg = String(a.registration_number || '')
      const bReg = String(b.registration_number || '')
      return aReg.localeCompare(bReg, undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [search, users])

  const totalUsers = visibleUsers.length
  const activeUsers = visibleUsers.filter((user) => Boolean(user.is_active)).length
  const disabledUsers = totalUsers - activeUsers

  return (
    <main className="min-h-screen bg-surface px-6 md:px-12 py-12">
      <section className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            className="px-5 py-3 bg-surface-container-high text-on-surface font-headline text-xs font-bold uppercase tracking-widest"
            onClick={() => navigate('/admin')}
            type="button"
          >
            Back
          </button>
        </div>

        <header className="bg-surface-container-lowest border-l-4 border-primary p-8 md:p-12 mb-10">
          <p className="font-headline text-[10px] tracking-[0.25em] uppercase text-primary font-bold">
            Account Governance
          </p>
          <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight mt-3 uppercase leading-none">
            Registration Numbers
          </h1>
          <p className="text-base text-on-surface-variant mt-5 max-w-3xl">
            Click a registration number to open the full player profile.
          </p>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-surface-container-high p-4 border-l-2 border-l-primary">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Total</p>
              <p className="text-2xl font-headline font-black mt-1">{totalUsers}</p>
            </div>
            <div className="bg-surface-container-high p-4 border-l-2 border-l-secondary">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Active</p>
              <p className="text-2xl font-headline font-black mt-1">{activeUsers}</p>
            </div>
            <div className="bg-surface-container-high p-4 border-l-2 border-l-error">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Disabled</p>
              <p className="text-2xl font-headline font-black mt-1">{disabledUsers}</p>
            </div>
          </div>

          <div className="mt-8 max-w-2xl">
            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Search registration number</span>
              <input
                className="mt-2 w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 py-4 px-5 text-base outline-none"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type registration number or username"
                type="text"
                value={search}
              />
            </label>
          </div>
        </header>

        {error ? (
          <div className="mb-6 bg-error/10 border-l-4 border-error p-4">
            <p className="text-error font-headline text-sm font-bold">{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="text-center py-16 text-on-surface-variant text-base">Loading registration numbers...</div>
        ) : (
          <div className="space-y-4">
            {visibleUsers.map((user) => (
              <article key={user.id} className="bg-surface-container-lowest border-l-4 border-l-primary p-6 md:p-7">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-3">
                    <button
                      className="text-left text-primary hover:underline font-headline text-xl md:text-2xl font-black tracking-wide"
                      onClick={() => navigate(`/admin/registrations/${user.id}`)}
                      type="button"
                    >
                      {user.registration_number || user.username || 'N/A'}
                    </button>
                    <p className="text-sm text-on-surface-variant">
                      Username: {user.username || 'N/A'}
                    </p>
                    <p className="text-sm text-on-surface-variant break-all">
                      Email: {user.email || 'N/A'}
                    </p>
                  </div>

                  <div className="flex flex-col md:items-end gap-3">
                    <span className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold ${user.is_active ? 'bg-secondary/15 text-secondary' : 'bg-error/15 text-error'}`}>
                      {user.is_active ? 'Active' : 'Disabled'}
                    </span>
                    <button
                      className="px-4 py-2 bg-primary text-on-primary font-headline text-xs font-bold uppercase tracking-widest"
                      onClick={() => navigate(`/admin/registrations/${user.id}`)}
                      type="button"
                    >
                      Open Profile
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {!visibleUsers.length ? (
              <div className="bg-surface-container-lowest p-8 text-base text-on-surface-variant">
                No registration numbers match your search.
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  )
}

export default AdminRegistrationsManagementPage
