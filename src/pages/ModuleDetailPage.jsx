import { useEffect, useState } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import {
  getCareerPathsData,
  hydrateCareerPathsData,
} from '../data/careerPathsData'
import { getRoomsData } from '../data/roomsData'
import { apiFetch } from '../services/api'

function ModuleDetailPage() {
  const navigate = useNavigate()
  const { pathId, moduleId } = useParams()
  const [careerPaths, setCareerPaths] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadPaths = async () => {
      try {
        const response = await apiFetch('/career-paths')
        if (!cancelled) {
          const paths = Array.isArray(response) ? response : []
          hydrateCareerPathsData(paths)
          setCareerPaths(paths)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Failed to load paths:', error)
        if (!cancelled) {
          setCareerPaths(getCareerPathsData())
          setIsLoading(false)
        }
      }
    }

    void loadPaths()

    return () => {
      cancelled = true
    }
  }, [])

  const path = careerPaths.find((item) => item.id === pathId || item.slug === pathId)
  const module = path?.modules?.find((m) => m.id === moduleId)
  const allRooms = getRoomsData()

  // Show loading while fetching paths
  if (isLoading) {
    return (
      <main className="pt-20 px-8 pb-12 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h1 className="font-headline text-3xl font-bold mb-2">Loading Module</h1>
          <p className="text-on-surface-variant">Initializing module content...</p>
        </div>
      </main>
    )
  }

  // Redirect if path or module not found after loading
  if (!path || !module) {
    return <Navigate to="/learn/paths" replace />
  }

  return (
    <main className="pt-32 px-8 pb-12">
      <section className="mb-12">
        {/* Breadcrumb and header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(`/learn/path/${pathId}`)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 border border-primary/20 rounded-lg transition-all duration-200 hover:border-primary/40 hover:-translate-x-1"
            type="button"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to {path.title}
          </button>
        </div>

        {/* Module Image */}
        {module.imageData && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img 
              src={module.imageData} 
              alt={module.title} 
              className="w-full h-96 object-cover"
            />
          </div>
        )}

        <div className="bg-surface-container-lowest p-0 relative border-l-8 border-secondary overflow-hidden">
          <div className="p-10">
            <div>
              <span className="font-headline text-[10px] font-bold text-secondary tracking-[2px] uppercase">
                {module.phase}
              </span>
              <h1 className="text-5xl font-black font-headline tracking-tighter text-on-surface mb-4 uppercase">
                {module.title}
              </h1>
              {module.description && (
                <p className="text-on-surface-variant max-w-2xl text-lg leading-relaxed">
                  {module.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl">
        <header className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black font-headline tracking-tight uppercase">
            Module Rooms
          </h2>
          <div className="h-px flex-1 mx-8 bg-surface-container-highest"></div>
          <span className="text-[10px] font-headline text-outline tracking-widest uppercase">
            {module.rooms?.length || 0} Rooms
          </span>
        </header>

        {module.rooms && module.rooms.length > 0 ? (
          <div className="space-y-4">
            {module.rooms.map((roomId) => {
              const room = allRooms.find((r) => r.id === roomId)
              if (!room) return null
              return (
                <div
                  key={roomId}
                  className="bg-surface-container-lowest p-6 flex items-center justify-between group hover:bg-white transition-colors cursor-pointer"
                  onClick={() => navigate(`/learn/lab/${room.slug}`)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 flex items-center justify-center bg-secondary-container text-on-secondary-container">
                      <span className="material-symbols-outlined">flag</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg font-headline uppercase">
                        {room.title}
                      </h3>
                      <p className="text-sm text-on-surface-variant mt-1">
                        {room.description}
                      </p>
                      <div className="flex gap-4 mt-2 flex-wrap">
                        {room.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-headline font-bold text-secondary uppercase tracking-widest bg-secondary/10 px-2 py-1"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-headline text-outline uppercase tracking-widest mb-1">
                        Reward
                      </span>
                      <span className="text-[10px] font-headline font-bold text-secondary uppercase">
                        {room.xp}
                      </span>
                    </div>
                    <button
                      className="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-outline">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-surface-container-low border border-dashed border-outline-variant/30 p-12 flex items-center justify-center">
            <span className="text-[10px] font-headline text-outline uppercase tracking-widest">
              No rooms assigned to this module
            </span>
          </div>
        )}
      </section>
    </main>
  )
}

export default ModuleDetailPage
