import { Link } from 'react-router-dom'
import { getRoomsData } from '../data/roomsData'

// Export function for backward compatibility with LabRoomPage
export function rooms() {
  return getRoomsData()
}

function ModulesPage({ allowLabRooms = true, selectedLabId = null }) {
  const allRooms = getRoomsData()
  const activeRoom = allRooms.find((room) => room.slug === selectedLabId) ?? null

  return (
    <div className="bg-surface p-8 lg:p-12 overflow-x-hidden mt-16 md:mt-20 relative">
      <div className="mb-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-2">
            <span className="font-label text-xs tracking-[0.3em] text-primary font-bold uppercase">
              Virtual Environment
            </span>
            <h1 className="text-5xl font-black tracking-tight text-on-background font-headline">
              EXPERIMENTAL ROOMS
            </h1>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="bg-surface-container-low p-1 flex">
              <button className="px-4 py-2 bg-surface-container-lowest text-xs font-bold font-label uppercase tracking-wider text-primary" type="button">All Rooms</button>
              <button className="px-4 py-2 text-xs font-bold font-label uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors" type="button">In Progress</button>
              <button className="px-4 py-2 text-xs font-bold font-label uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors" type="button">Completed</button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold ml-1">Complexity Tier</label>
            <select className="bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 focus:ring-0 font-body text-sm py-3 px-4 outline-none">
              <option>Any Difficulty</option>
              <option>Level: Easy</option>
              <option>Level: Medium</option>
              <option>Level: Hard</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold ml-1">Specialization</label>
            <select className="bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 focus:ring-0 font-body text-sm py-3 px-4 outline-none">
              <option>All Categories</option>
              <option>Web Exploitation</option>
              <option>Cryptography</option>
              <option>Binary Exploitation</option>
              <option>Digital Forensics</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold ml-1">Search Identifier</label>
            <div className="relative">
              <input className="w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 focus:ring-0 font-body text-sm py-3 px-4 outline-none" placeholder="ENTER ROOM NAME..." type="text" />
            </div>
          </div>
          <div className="flex items-end">
            <button className="w-full bg-inverse-surface text-inverse-on-surface font-label uppercase text-xs tracking-widest py-3.5 px-6 hover:bg-on-background transition-colors font-bold" type="button">
              EXECUTE FILTER
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-12">
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {allRooms.map((room) => (
              <div
                className={`bg-surface-container-lowest group relative transition-all duration-300 ${room.slug === selectedLabId ? 'ring-1 ring-primary' : ''}`}
                key={room.slug || room.title}
              >
                <div className="h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-secondary/10 px-3 py-1">
                      <span className="font-label text-[10px] font-bold text-secondary tracking-widest uppercase">{room.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${room.dotTone}`}></div>
                      <span className={`font-label text-[10px] font-bold tracking-widest uppercase ${room.levelTone}`}>{room.level}</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-on-background mb-3 font-headline">{room.title}</h3>
                  <p className="text-sm text-on-surface-variant font-body leading-relaxed mb-8">{room.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-label text-[10px] uppercase tracking-tighter text-on-surface-variant font-bold">Reward Pool</span>
                      <span className="text-lg font-space font-bold text-primary">{room.xp}</span>
                    </div>
                    {allowLabRooms ? (
                      <Link
                        className="inline-block bg-primary text-on-primary font-label uppercase text-xs tracking-widest py-3 px-8 group-hover:bg-primary-container transition-colors font-bold"
                        to={`/learn/lab/${room.slug}`}
                      >
                        {room.slug === selectedLabId ? 'IN ROOM' : 'ENTER ROOM'}
                      </Link>
                    ) : (
                      <button
                        className="inline-block bg-surface-container-highest text-on-surface-variant font-label uppercase text-xs tracking-widest py-3 px-8 font-bold cursor-not-allowed"
                        type="button"
                      >
                        DISABLED
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="w-full xl:w-96 shrink-0">
          <div className="sticky top-28 space-y-8">
            <div className="bg-surface-container-low border-l-4 border-l-primary p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-label text-sm font-bold tracking-widest uppercase text-on-background">Active Sessions</h2>
                <span className="bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-black tracking-widest">1 RUNNING</span>
              </div>

              <div className="bg-white p-6 space-y-6">
                <div>
                  <div className="font-label text-[10px] font-bold text-primary tracking-widest uppercase mb-1">Current Target</div>
                  <h4 className="text-lg font-bold font-space text-on-background">
                    {activeRoom?.title ?? 'XSS: The Social Engineering Path'}
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-container-low p-4">
                    <div className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">Time Elapsed</div>
                    <div className="font-space font-bold text-lg text-on-background">00:42:18</div>
                  </div>
                  <div className="bg-surface-container-low p-4">
                    <div className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">Instance IP</div>
                    <div className="font-space font-bold text-lg text-secondary">10.10.12.84</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <button className="w-full bg-secondary text-on-secondary font-label uppercase text-xs tracking-widest py-4 px-6 hover:opacity-90 active:scale-[0.98] transition-all font-bold flex items-center justify-center gap-3" type="button">
                    <span className="material-symbols-outlined text-sm">terminal</span>
                    ACCESS TERMINAL
                  </button>
                  <button className="w-full bg-surface-container-highest text-on-surface-variant font-label uppercase text-xs tracking-widest py-4 px-6 hover:bg-error/10 hover:text-error transition-all font-bold" type="button">
                    TERMINATE SESSION
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-outline-variant/30">
              <h2 className="font-label text-sm font-bold tracking-widest uppercase text-on-background mb-6">Your Proficiency</h2>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between font-label text-[10px] font-bold uppercase mb-2">
                    <span className="text-on-surface-variant">Web Hacking</span>
                    <span className="text-primary">82%</span>
                  </div>
                  <div className="h-1 bg-surface-container-highest w-full overflow-hidden">
                    <div className="h-full bg-primary w-[82%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-label text-[10px] font-bold uppercase mb-2">
                    <span className="text-on-surface-variant">Cryptography</span>
                    <span className="text-primary">45%</span>
                  </div>
                  <div className="h-1 bg-surface-container-highest w-full overflow-hidden">
                    <div className="h-full bg-primary w-[45%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-label text-[10px] font-bold uppercase mb-2">
                    <span className="text-on-surface-variant">Reversing</span>
                    <span className="text-primary">12%</span>
                  </div>
                  <div className="h-1 bg-surface-container-highest w-full overflow-hidden">
                    <div className="h-full bg-primary w-[12%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <section className="mt-20">
        <div className="bg-inverse-surface p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-surface-tint opacity-10 blur-[100px] pointer-events-none group-hover:opacity-20 transition-opacity"></div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="font-label text-[10px] tracking-widest uppercase text-on-primary-container/60 font-bold">System Broadcast</span>
          </div>
          <div className="font-space text-sm text-surface-container-low leading-relaxed max-w-2xl">
            [INCOGNITRIX_CORE] &gt;&gt; Initializing secure bridge... <br />
            [AUTH] &gt;&gt; Lead Operator: Profile validated. <br />
            [MODULE] &gt;&gt; Experimental Rooms active. 4 new vulnerable
            environments deployed. <br />
            [WARNING] &gt;&gt; Practice surgical precision. Unauthorized lateral
            movement is logged.
          </div>
        </div>
      </section>

      <div className="fixed top-0 right-0 w-[40vw] h-screen bg-gradient-to-l from-surface-container-low to-transparent -z-10 pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 p-8 z-0 opacity-5 pointer-events-none">
        <h1 className="text-[12rem] font-black tracking-tighter leading-none select-none font-headline">SURGICAL</h1>
      </div>
    </div>
  )
}

export default ModulesPage
