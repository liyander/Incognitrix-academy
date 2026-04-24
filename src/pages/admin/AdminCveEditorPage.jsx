import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getCveById, addCve, updateCve, deleteCve } from '../../data/cvesData'

import { ConfirmModal } from '../../components/ConfirmModal'

function AdminCveEditorPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isNewCve = id === 'new' || location.pathname === '/admin/cves/new'

  const [cve, setCve] = useState(null)
  const [formData, setFormData] = useState({
    cve_id: '',
    short_description: '',
    found_year: new Date().getFullYear(),
    credit: '',
    vulnerability_report: '',
    method_followed: '',
    references_text: '',
  })
  
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!isNewCve) {
      const foundCve = getCveById(id)
      if (foundCve && !cve) {
        setCve(foundCve)
        setFormData({
          cve_id: foundCve.cve_id || '',
          short_description: foundCve.short_description || '',
          found_year: foundCve.found_year || '',
          credit: foundCve.credit || '',
          vulnerability_report: foundCve.vulnerability_report || '',
          method_followed: foundCve.method_followed || '',
          references_text: foundCve.references_text || '',
        })
      }
    }
  }, [id, isNewCve])

  const [isModalOpen, setIsModalOpen] = useState(false)

  // Basic validation rules
  const handleSave = () => {
    if (!formData.cve_id?.trim()) {
      setErrorMessage('CVE ID is required.')
      return
    }

    if (!formData.short_description?.trim()) {
      setErrorMessage('A short description is required.')
      return
    }

    setErrorMessage('')

    if (isNewCve) {
      addCve(formData)
    } else {
      updateCve(id, formData)
    }

    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      if (isNewCve) {
        navigate('/admin/cves')
      }
    }, 1200)
  }

  const handleDelete = () => {
    setIsModalOpen(true)
  }

  const handleConfirmDelete = () => {
    deleteCve(id)
    setIsModalOpen(false)
    navigate('/admin/cves')
  }

  const handleCancelDelete = () => {
    setIsModalOpen(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  if (!isNewCve && !cve) {
    return (
      <main className="min-h-screen bg-surface px-6 md:px-10 py-10 flex items-center justify-center">
        <div className="text-center">
          <p className="text-on-surface-variant font-headline tracking-widest uppercase mb-4">
            CVE NOT FOUND.
          </p>
          <button
            className="bg-primary text-on-primary px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest hover:bg-primary-darker transition-colors"
            onClick={() => navigate('/admin/cves')}
            type="button"
          >
            Back to CVE Management
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-surface px-6 md:px-10 py-10 mt-16 md:mt-0">
      <section className="max-w-6xl mx-auto space-y-12">
        <header className="bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10">
          <div className="flex items-center gap-3 mb-6 border-b border-outline-variant/30 pb-4">
            <button
              className="text-primary hover:text-primary-darker transition-colors"
              onClick={() => navigate('/admin/cves')}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <span className="font-label text-[10px] font-bold uppercase tracking-widest text-primary">
              Admin &raquo; CVE Configuration
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black font-headline tracking-tight uppercase text-on-background mb-4">
            {isNewCve ? 'Create CVE Record' : `Edit: ${formData.cve_id || 'Unknown CVE'}`}
          </h1>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              className={`px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${
                saved ? 'bg-emerald-600 text-white' : 'bg-primary text-on-primary hover:bg-primary-darker'
              }`}
              onClick={handleSave}
              type="button"
            >
              {saved ? (
                <>
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  SAVED
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  {isNewCve ? 'CREATE RECORD' : 'SAVE CHANGES'}
                </>
              )}
            </button>

            {!isNewCve && (
              <button
                className="px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest transition-colors bg-error text-white hover:bg-red-700 flex items-center gap-2 ml-auto"
                onClick={handleDelete}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                DELETE RECORD
              </button>
            )}
          </div>

          {errorMessage && (
            <p className="font-label text-xs uppercase tracking-widest font-bold text-error mt-6 bg-error/10 px-4 py-2 border-l-2 border-error">
              {errorMessage}
            </p>
          )}
        </header>

        <section className="bg-surface-container-lowest p-8 border-l border-outline-variant/30 space-y-8">
          <h2 className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface mb-6">
            Basic Metadata
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant font-bold mb-2">
                CVE Identifier
              </label>
              <input
                className="w-full bg-surface-container-highest border-l-2 border-l-primary border-transparent focus:ring-0 font-body text-sm py-3 px-4 outline-none placeholder:text-on-surface-variant/50"
                name="cve_id"
                type="text"
                placeholder="e.g. CVE-2023-XXXX"
                value={formData.cve_id}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant font-bold mb-2">
                Discovery Year
              </label>
              <input
                className="w-full bg-surface-container-highest border-l-2 border-l-primary border-transparent focus:ring-0 font-body text-sm py-3 px-4 outline-none placeholder:text-on-surface-variant/50"
                name="found_year"
                type="number"
                placeholder="2024"
                value={formData.found_year}
                onChange={handleInputChange}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant font-bold mb-2">
                Credit / Assignment
              </label>
              <input
                className="w-full bg-surface-container-highest border-l-2 border-l-primary border-transparent focus:ring-0 font-body text-sm py-3 px-4 outline-none placeholder:text-on-surface-variant/50"
                name="credit"
                type="text"
                placeholder="Name of researcher or organization."
                value={formData.credit}
                onChange={handleInputChange}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant font-bold mb-2">
                Short Description
              </label>
              <textarea
                className="w-full bg-surface-container-highest border-l-2 border-l-primary border-transparent focus:ring-0 font-body text-sm py-3 px-4 outline-none min-h-[80px] resize-y placeholder:text-on-surface-variant/50"
                name="short_description"
                placeholder="A brief summary of the vulnerability impact..."
                value={formData.short_description}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </section>

        <section className="bg-surface-container-lowest p-8 border-l border-outline-variant/30 space-y-8">
          <h2 className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface mb-6">
            Detailed Content
          </h2>

          <div>
            <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant font-bold mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">bug_report</span>
              Vulnerability Report
            </label>
            <textarea
              className="w-full bg-surface-container-highest border-transparent focus:ring-0 font-body text-sm py-3 px-4 outline-none min-h-[160px] resize-y placeholder:text-on-surface-variant/50 border-l border-l-primary/50 focus:border-l-primary transition-colors"
              name="vulnerability_report"
              placeholder="Provide a comprehensive technical description of the vulnerability..."
              value={formData.vulnerability_report}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant font-bold mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">search_insights</span>
              Discovery Method / Exploitation Path
            </label>
            <textarea
              className="w-full bg-surface-container-highest border-transparent focus:ring-0 font-body text-sm py-3 px-4 outline-none min-h-[160px] resize-y placeholder:text-on-surface-variant/50 border-l border-l-primary/50 focus:border-l-primary transition-colors"
              name="method_followed"
              placeholder="Describe how the bug was discovered, steps to reproduce, or methods used..."
              value={formData.method_followed}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant font-bold mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">menu_book</span>
              References / Links
            </label>
            <textarea
              className="w-full bg-surface-container-highest border-transparent focus:ring-0 font-body text-sm py-3 px-4 outline-none min-h-[100px] resize-y placeholder:text-on-surface-variant/50 border-l border-l-primary/50 focus:border-l-primary transition-colors"
              name="references_text"
              placeholder="Line-separated list of URLs or reference IDs (e.g. NIST NVD URL, GitHub Advisory...)"
              value={formData.references_text}
              onChange={handleInputChange}
            />
          </div>
        </section>

      </section>

      <ConfirmModal
        isOpen={isModalOpen}
        title="Delete CVE"
        message="Are you sure you want to delete this Vulnerability Record? This action cannot be reverted."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </main>
  )
}

export default AdminCveEditorPage
