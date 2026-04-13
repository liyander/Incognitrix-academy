import { useParams, Navigate } from 'react-router-dom'
import { getCareerPathById } from '../data/careerPathsData'
import { getRoomsData } from '../data/roomsData'

function RedTeamOperatorPage({ pathId: propPathId }) {
  const { pathId: paramPathId } = useParams()
  const pathId = propPathId || paramPathId || 'red-team-operator'
  const path = getCareerPathById(pathId)
  const allRooms = getRoomsData()

  if (!path) {
    return <Navigate to="/learn/paths" replace />
  }

  const getModuleCount = () => path.modules?.length || 0
  const getTotalRooms = () => path.modules?.reduce((sum, m) => sum + (m.rooms?.length || 0), 0) || 0

  return (
    <>
      <main className="pt-20 px-8 pb-12">
        <section className="mb-12">
          <div className="bg-surface-container-lowest p-0 relative border-l-8 border-primary overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
              <img
                alt="Background"
                className="w-full h-full object-cover grayscale"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1Jb-T93YLY8qp0Uhfa6X_1kRwy5hqD4olGgwyku1Bkd4rNgkSIMCrPSW3tvoUJJGdfBJQmCVhD_3lonZ7UR-LePeoEHmCv9aYBOQrD4N9-3cs4ox_U_9NIc00fMYWZGT4eIdwkQjSLw2hy7RMKalPSi8qHhyhEm_uaIV0ZeiO-Pq5GSlnejETZpWa77ORdZmVtOFbvcFb6ZM7ZxsOK8GrZ16WMIvWfkPysok61POdiwJm347kswkw1gkLSKSp99LnNNM_mY4Vd-g"
              />
            </div>
            <div className="relative z-10 p-10 flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-container text-on-primary-container font-headline text-[10px] tracking-[2px] uppercase mb-4">
                  <span className="material-symbols-outlined text-sm">priority_high</span>
                  Critical Learning Path
                </div>
                <h1 className="text-5xl font-black font-headline tracking-tighter text-on-surface mb-4 uppercase">
                  {path.title}
                </h1>
                <p className="text-on-surface-variant leading-relaxed mb-8 max-w-xl">
                  {path.description}
                </p>
                <div className="flex flex-wrap gap-8">
                  <div className="space-y-1">
                    <span className="text-[10px] font-headline uppercase tracking-widest text-outline">
                      Difficulty
                    </span>
                    <div className="flex items-center gap-2 text-primary">
                      <span className="material-symbols-outlined text-sm">bolt</span>
                      <span className="font-headline font-bold uppercase text-sm">{path.difficulty}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-headline uppercase tracking-widest text-outline">
                      Est. Commitment
                    </span>
                    <div className="flex items-center gap-2 text-on-surface">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span className="font-headline font-bold uppercase text-sm">{path.estimatedHours} Hours</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-headline uppercase tracking-widest text-outline">
                      Enrolled Ops
                    </span>
                    <div className="flex items-center gap-2 text-on-surface">
                      <span className="material-symbols-outlined text-sm">group</span>
                      <span className="font-headline font-bold uppercase text-sm">{path.enrolledCount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-80 bg-surface-container-low p-6 border-t-2 border-primary">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface">
                    Path Progress
                  </span>
                  <span className="text-2xl font-headline font-black text-primary">{path.mastery}%</span>
                </div>
                <div className="h-1 bg-surface-variant w-full mb-6">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${path.mastery}%` }}></div>
                </div>
                <button className="w-full bg-primary text-on-primary py-4 font-headline font-bold tracking-widest uppercase hover:bg-primary-container transition-all active:scale-95" type="button">
                  RESUME OPERATION
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-12">
            <header className="flex items-center justify-between">
              <h2 className="text-2xl font-black font-headline tracking-tight uppercase">
                Path Syllabus
              </h2>
              <div className="h-px flex-1 mx-8 bg-surface-container-highest"></div>
              <span className="text-[10px] font-headline text-outline tracking-widest uppercase">
                {getModuleCount()} Modules - {getTotalRooms()} Rooms
              </span>
            </header>

            {path.modules && path.modules.length > 0 ? (
              <div className="space-y-8 relative before:absolute before:left-6 before:top-0 before:bottom-0 before:w-px before:bg-surface-container-highest">
                {path.modules.map((module, index) => (
                  <div key={module.id} className="relative pl-16">
                    <div className="absolute left-3.5 top-0 w-5 h-5 bg-primary ring-4 ring-surface"></div>
                    <div className="space-y-6">
                      <div>
                        <span className="text-[10px] font-headline font-bold text-primary tracking-[2px] uppercase">
                          {module.phase}
                        </span>
                        <h3 className="text-xl font-bold font-headline uppercase mt-1">
                          {module.title}
                        </h3>
                        {module.description && (
                          <p className="text-sm text-on-surface-variant mt-2">{module.description}</p>
                        )}
                      </div>

                      {module.rooms && module.rooms.length > 0 ? (
                        <div className="grid gap-4">
                          {module.rooms.map((roomId, roomIndex) => {
                            const room = allRooms.find((r) => r.id === roomId)
                            if (!room) return null
                            return (
                              <div key={roomId} className="bg-surface-container-lowest p-6 flex items-center justify-between group hover:bg-white transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 flex items-center justify-center bg-primary-container text-on-primary-container">
                                    <span className="material-symbols-outlined text-sm">flag</span>
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm font-headline uppercase">
                                      {room.title}
                                    </h4>
                                    <p className="text-xs text-on-surface-variant">
                                      {room.description}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-headline text-outline uppercase tracking-widest mb-1">
                                      Reward
                                    </span>
                                    <span className="text-[10px] font-headline font-bold text-primary uppercase">
                                      {room.xp}
                                    </span>
                                  </div>
                                  <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity" type="button">
                                    <span className="material-symbols-outlined text-outline">arrow_forward</span>
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="bg-surface-container-low border border-dashed border-outline-variant/30 p-6 flex items-center justify-center">
                          <span className="text-[10px] font-headline text-outline uppercase tracking-widest">
                            No rooms assigned to this module
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-low border border-dashed border-outline-variant/30 p-12 flex items-center justify-center text-center">
                <span className="text-[10px] font-headline text-outline uppercase tracking-widest">
                  No modules configured for this path
                </span>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4 space-y-8">
            <div className="bg-surface-container-low p-8 border-t-2 border-on-surface">
              <h3 className="text-sm font-black font-headline tracking-[2px] uppercase mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">inventory_2</span>
                Path Resources ({path.resources?.length || 0})
              </h3>
              {path.resources && path.resources.length > 0 ? (
                <div className="space-y-6">
                  {path.resources.map((resource) => (
                    <div key={resource.id} className="group cursor-pointer">
                      <div className="flex gap-4 items-start">
                        <div className="w-16 h-20 bg-surface-container-highest flex-shrink-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-3xl text-outline group-hover:text-primary transition-colors">
                            description
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] font-headline font-bold bg-primary/10 text-primary px-1.5 py-0.5 uppercase tracking-widest">
                            {resource.type}
                          </span>
                          <h4 className="text-xs font-bold font-headline uppercase group-hover:text-primary transition-colors leading-tight">
                            {resource.title}
                          </h4>
                          {resource.url && (
                            <a className="text-[10px] text-primary hover:underline" href={resource.url} rel="noopener noreferrer" target="_blank">
                              View Resource
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-[10px] text-on-surface-variant">No resources available</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      <button className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-on-primary flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50" type="button">
        <span className="material-symbols-outlined text-3xl">bolt</span>
      </button>
    </>
  )
}

export default RedTeamOperatorPage
