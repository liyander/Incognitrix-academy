import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCareerPathsData,
  hydrateCareerPathsData,
  subscribeCareerPathsData,
} from '../../data/careerPathsData'
import { apiFetch } from '../../services/api'

function AdminCareerPathsManagementPage() {
  const navigate = useNavigate()
  const [paths, setPaths] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadPaths = async () => {
      try {
        console.log('🌐 Admin: Fetching career paths...')
        const response = await apiFetch('/career-paths')
        if (!cancelled) {
          const pathsData = Array.isArray(response) ? response : []
          hydrateCareerPathsData(pathsData)
          setPaths(pathsData)
          console.log('✅ Admin paths loaded:', pathsData.length)
        }
      } catch (error) {
        console.error('Failed to load admin career paths:', error)
        if (!cancelled) {
          setPaths(getCareerPathsData())
        }
      }
    }

    void loadPaths()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredPaths = paths.filter((path) =>
    (path.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Basic':
      case 'Beginner':
        return 'bg-emerald-500/20 text-emerald-600'
      case 'Intermediate':
        return 'bg-amber-500/20 text-amber-600'
      case 'Expert':
        return 'bg-red-500/20 text-red-600'
      case 'Critical':
        return 'bg-red-700/20 text-red-700'
      case 'Advanced':
        return 'bg-red-500/20 text-red-600'
      default:
        return 'bg-primary/20 text-primary'
    }
  }

  return (
    <main className="min-h-screen bg-surface px-6 md:px-10 py-10">
      <section className="max-w-6xl mx-auto">
        <header className="bg-surface-container-lowest border-l-4 border-secondary p-8 md:p-10 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              className="text-secondary hover:text-on-surface transition-colors"
              onClick={() => navigate('/admin')}
              type="button"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <span className="font-headline text-[10px] tracking-[0.25em] uppercase text-secondary font-bold">
              Content Management
            </span>
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight uppercase">
            Manage Career Paths
          </h1>
          <p className="text-sm text-on-surface-variant mt-4 max-w-2xl">
            Configure learning paths and career specializations. Click on any path to edit modules, resources, and metadata.
          </p>
          <div className="mt-6">
            <button
              className="bg-secondary text-on-secondary px-5 py-2.5 font-headline text-xs font-bold uppercase tracking-widest"
              onClick={() => navigate('/admin/career-paths/new')}
              type="button"
            >
              Add Career Path
            </button>
          </div>
        </header>

        <div className="mb-6">
          <input
            className="w-full bg-surface-container-lowest border-l-2 border-l-secondary border-t-0 border-r-0 border-b-0 focus:ring-0 font-body text-sm py-3 px-4 outline-none"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search career paths..."
            type="text"
            value={searchTerm}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredPaths.map((path) => (
            <button
              className="bg-surface-container-lowest p-6 hover:bg-surface-container-high transition-colors text-left border-l-4 border-secondary/30 hover:border-secondary flex items-start justify-between"
              key={path.id}
              onClick={() => navigate(`/admin/career-paths/${path.id}`)}
              type="button"
            >
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span
                    className={`px-2 py-1 font-label text-[10px] font-bold uppercase tracking-wider rounded ${getDifficultyColor(path.difficulty)}`}
                  >
                    {path.learningPathLevel || path.difficulty || 'N/A'}
                  </span>
                  <span className="bg-secondary-container text-on-secondary-container px-2 py-1 font-label text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">{path.icon}</span>
                    {path.modules.length} Module{path.modules.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <h3 className="font-headline text-lg font-bold uppercase mb-2">{path.title}</h3>
                <p className="text-sm text-on-surface-variant max-w-2xl line-clamp-2">
                  {path.description}
                </p>
                <div className="flex gap-6 mt-4 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {path.estimatedHours}h
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">group</span>
                    {path.enrolledCount?.toLocaleString()} enrolled
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">bookmark</span>
                    {path.resources.length} resources
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant ml-4 mt-1">
                chevron_right
              </span>
            </button>
          ))}

          {filteredPaths.length === 0 && (
            <div className="bg-surface-container-lowest p-12 text-center">
              <p className="text-on-surface-variant">No career paths found matching your search.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default AdminCareerPathsManagementPage
