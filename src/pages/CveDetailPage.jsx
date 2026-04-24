import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCveById } from '../data/cvesData'

function CveDetailPage() {
  const { id } = useParams()
  const [cve, setCve] = useState(null)

  useEffect(() => {
    const foundCve = getCveById(id)
    if (foundCve) {
      setCve(foundCve)
    }
  }, [id])

  if (!cve) {
    return (
      <main className="min-h-screen bg-surface px-6 md:px-10 py-10 mt-16 md:mt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-on-surface-variant font-headline tracking-widest uppercase mb-4">CVE Not Found.</p>
          <Link
            to="/cves"
            className="bg-primary text-on-primary px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2 hover:bg-primary-darker transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to CVE Database
          </Link>
        </div>
      </main>
    )
  }

  const renderTextContent = (text) => {
    if (!text) return 'No details available.'
    return text.split('\n').map((paragraph, index) => (
      <p key={index} className="mb-4 last:mb-0">
        {paragraph}
      </p>
    ))
  }

  return (
    <main className="min-h-screen bg-surface px-6 md:px-10 py-10 mt-16 md:mt-20">
      <div className="max-w-4xl mx-auto space-y-12">
        <nav className="flex items-center gap-4 border-b border-outline-variant pb-6 mb-10">
          <Link
            to="/cves"
            className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="font-label text-[10px] font-bold uppercase tracking-widest">
              CVE Database
            </span>
          </Link>
          <div className="h-4 w-px bg-outline-variant"></div>
          <span className="font-headline text-[10px] text-on-surface tracking-widest uppercase">
            {cve.cve_id}
          </span>
        </nav>

        <header className="space-y-6 mb-12 border-l-4 border-l-primary pl-6">
          <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tight uppercase text-on-background">
            {cve.cve_id}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-label uppercase tracking-widest text-on-surface-variant">
            <span className="bg-surface-container-highest px-3 py-1 font-bold text-on-surface">
              Found: {cve.found_year || 'Unknown'}
            </span>
            <span className="font-bold text-primary">
              Credit: <span className="text-on-surface-variant font-normal">{cve.credit || 'Unknown'}</span>
            </span>
          </div>
          <p className="text-on-surface-variant font-body text-base mt-6">
            {cve.short_description}
          </p>
        </header>

        <section className="bg-surface-container-lowest p-8 border-l border-outline-variant/30">
          <h2 className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">bug_report</span>
            Vulnerability Report
          </h2>
          <div className="font-body text-sm md:text-base text-on-surface-variant leading-relaxed">
            {renderTextContent(cve.vulnerability_report)}
          </div>
        </section>

        <section className="bg-surface-container-lowest p-8 border-l border-outline-variant/30">
          <h2 className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">search_insights</span>
            Discovery Method
          </h2>
          <div className="font-body text-sm md:text-base text-on-surface-variant leading-relaxed">
            {renderTextContent(cve.method_followed)}
          </div>
        </section>

        <section className="bg-surface-container-lowest p-8 border-l border-outline-variant/30">
          <h2 className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">menu_book</span>
            References
          </h2>
          <div className="font-body text-sm text-on-surface-variant leading-relaxed break-words space-y-2">
            {cve.references_text ? (
              <ul className="list-disc list-inside ml-4 space-y-2">
                {cve.references_text.split('\n').map((ref, index) => {
                  if (!ref.trim()) return null
                  const isUrl = ref.trim().startsWith('http://') || ref.trim().startsWith('https://')
                  return (
                    <li key={index}>
                      {isUrl ? (
                        <a
                          href={ref.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline hover:text-primary-darker transition-colors"
                        >
                          {ref.trim()}
                        </a>
                      ) : (
                        <span>{ref.trim()}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              'No references available.'
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default CveDetailPage
