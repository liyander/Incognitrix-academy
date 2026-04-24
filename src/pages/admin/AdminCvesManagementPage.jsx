import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCvesData } from '../../data/cvesData'

function AdminCvesManagementPage() {
  const navigate = useNavigate()
  const [cves] = useState(getCvesData())
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCves = cves.filter(
    (cve) =>
      (cve.cve_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cve.short_description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-surface px-6 md:px-10 py-10">
      <section className="max-w-6xl mx-auto">
        <header className="bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              className="text-primary hover:text-on-surface transition-colors"
              onClick={() => navigate('/admin')}
              type="button"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <span className="font-headline text-[10px] tracking-[0.25em] uppercase text-primary font-bold">
              Content Management
            </span>
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight uppercase">
            Manage CVE Database
          </h1>
          <p className="text-sm text-on-surface-variant mt-4 max-w-2xl">
            Configure available Common Vulnerabilities and Exposures (CVEs). 
            Click on any CVE to edit title, description, content, and metadata.
          </p>
          <div className="mt-6">
            <button
              className="bg-primary text-on-primary px-5 py-2.5 font-headline text-xs font-bold uppercase tracking-widest"
              onClick={() => navigate('/admin/cves/new')}
              type="button"
            >
              Add New CVE
            </button>
          </div>
        </header>

        <div className="mb-6">
          <input
            className="w-full bg-surface-container-lowest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 focus:ring-0 font-body text-sm py-3 px-4 outline-none"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search CVEs by ID or description..."
            type="text"
            value={searchTerm}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredCves.map((cve) => (
            <button
              className="bg-surface-container-lowest p-6 hover:bg-surface-container-low transition-colors text-left flex flex-col md:flex-row md:items-center justify-between gap-4 border border-outline-variant/30"
              key={cve.id}
              onClick={() => navigate(`/admin/cves/${cve.id}`)}
              type="button"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-headline text-xl font-bold tracking-tight text-on-surface uppercase">
                    {cve.cve_id}
                  </h3>
                  <span className="text-[10px] font-label font-bold tracking-widest uppercase bg-surface-container-high px-2 py-0.5 text-on-surface-variant">
                    {cve.found_year}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant font-body line-clamp-2">
                  {cve.short_description}
                </p>
              </div>
              <span className="material-symbols-outlined text-outline">chevron_right</span>
            </button>
          ))}
          {filteredCves.length === 0 && (
            <div className="text-center py-12 bg-surface-container-lowest border-2 border-dashed border-outline-variant/30">
              <p className="text-on-surface-variant font-headline tracking-widest uppercase">
                No CVEs found.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default AdminCvesManagementPage
