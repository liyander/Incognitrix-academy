import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getCvesData } from '../data/cvesData'

function CvesPage() {
  const [cves] = useState(getCvesData())
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCves = useMemo(() => {
    if (!searchQuery) return cves
    const q = searchQuery.toLowerCase()
    return cves.filter(cve => 
      cve.cve_id?.toLowerCase().includes(q) || 
      cve.short_description?.toLowerCase().includes(q)
    )
  }, [cves, searchQuery])

  return (
    <main className="min-h-screen bg-surface px-6 xl:px-10 py-10 mt-16 md:mt-20">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="h-0.5 w-8 bg-primary"></span>
            <span className="font-label text-xs uppercase tracking-widest text-primary font-bold">
              Vulnerability Intel
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tight uppercase text-on-background">
            CVE Database
          </h1>
          <p className="text-on-surface-variant font-body text-sm md:text-base max-w-2xl">
            Browse through critical Common Vulnerabilities and Exposures (CVEs), 
            including detailed vulnerability reports, discovery methodologies, and original references.
          </p>
        </header>

        <section>
          <div className="mb-6 max-w-xl">
            <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
              Search Vulnerabilities
            </label>
            <input
              type="text"
              placeholder="e.g. CVE-2021-44228 or Log4Shell"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border-b-2 border-primary border-t-0 border-l-0 border-r-0 focus:ring-0 focus:border-b-primary font-body text-sm py-3 px-4 outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCves.map((cve) => (
              <Link
                key={cve.id}
                to={`/cves/${cve.id}`}
                className="group p-6 bg-surface-container-lowest border-l-4 border-l-surface-container-lowest hover:border-l-primary transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-headline text-lg font-bold tracking-widest uppercase text-on-surface group-hover:text-primary transition-colors">
                      {cve.cve_id}
                    </span>
                    <span className="bg-surface-container-highest px-2 py-1 text-[10px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
                      {cve.found_year}
                    </span>
                  </div>
                  <h3 className="font-body text-sm text-on-surface-variant mb-4 line-clamp-3">
                    {cve.short_description}
                  </h3>
                </div>
                <div className="border-t border-outline-variant pt-4 mt-auto">
                  <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest truncate">
                    <strong>Credit:</strong> {cve.credit || 'Unknown'}
                  </p>
                </div>
              </Link>
            ))}
            
            {filteredCves.length === 0 && (
              <div className="col-span-full py-12 text-center bg-surface-container-lowest">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4">search_off</span>
                <p className="font-headline text-on-surface-variant tracking-wider uppercase">No CVEs match your query.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default CvesPage
