import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getCareerPathsData,
  hydrateCareerPathsData,
  subscribeCareerPathsData,
} from '../data/careerPathsData'
import { apiFetch } from '../services/api'

function LearningPathsPage({ allowRedTeamPath = true }) {
  const [careerPaths, setCareerPaths] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadPaths = async () => {
      setIsLoading(true)
      try {
        // Always fetch fresh from backend
        console.log('🌐 Fetching career paths from backend...')
        const response = await apiFetch('/career-paths')
        console.log('✅ Backend response:', response)
        
        if (!cancelled) {
          const paths = Array.isArray(response) ? response : []
          console.log('📊 Setting career paths. Count:', paths.length)
          
          // Hydrate localStorage with backend data
          hydrateCareerPathsData(paths)
          
          // Directly set state with fresh data
          setCareerPaths(paths)
          console.log('✅ Career paths loaded successfully')
        }
      } catch (error) {
        console.error('❌ Failed to load career paths:', error)
        if (!cancelled) {
          // Fallback to localStorage or defaults
          const fallback = getCareerPathsData()
          console.log('⚠️ Using fallback data. Count:', fallback.length)
          setCareerPaths(fallback)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPaths()

    return () => {
      cancelled = true
    }
  }, [])

  const redTeamPath = careerPaths.find((p) => p.id === 'red-team-operator')
  const otherPaths = careerPaths.filter((p) => p.id !== 'red-team-operator')
  return (
    <>
      <main className="pt-20">
        <section className="relative h-[400px] flex items-center px-12 overflow-hidden bg-surface-container-low">
          <div
            className="absolute right-0 top-0 w-1/2 h-full opacity-10 mix-blend-multiply pointer-events-none"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCWmjUpfkTNtilFXa2k7cgdBo7c6sx_SAmiMPOckpdSkz37z4-FnDARalx2_czUQ43AvBCpuZegegmXlqnxCQckWBCn7ofcIqyQc_ap0HwBJocDAS8ze8SMOfmxL9iauJpjlmKptw0dk1NAZ72bo0qjV9MJx3WsZVRCKEEgZoy6z9TUVFhNoSr7fyCWtxyS30LFLCNLZVL86wGrH99vOFjgwY_b1bvSUtyCmzqWL3Y-MWY-E_fLQRP51_bgCrq9oyiN5csF88Dd4jo')",
            }}
          ></div>
          <div className="relative z-10 max-w-2xl">
            <span className="font-headline text-primary font-bold tracking-[0.4em] uppercase text-xs mb-4 block">
              Institutional Protocol
            </span>
            <h1 className="font-headline text-6xl font-bold tracking-tighter text-on-surface mb-6 leading-[0.9]">
              ASCEND THE <br />HIERARCHY
            </h1>
            <p className="text-on-surface-variant max-w-md text-lg leading-relaxed mb-8">
              Surgical training modules for elite cyber-intelligence operatives.
              Standardize your skillset across the offensive and defensive
              spectrum.
            </p>
            <div className="flex gap-4">
              <button className="surgical-gradient text-white px-8 py-3 font-headline text-xs tracking-widest uppercase" type="button" style={{ backgroundImage: 'linear-gradient(90deg, #ff416c, #ff4b2b)' }}>
                Initiate Evaluation
              </button>
              <button className="bg-surface-container-highest px-8 py-3 font-headline text-xs tracking-widest uppercase border-l-2 border-primary" type="button">
                Review Syllabus
              </button>
            </div>
          </div>
        </section>

        <div className="sticky top-[72px] z-30 bg-surface-container-low/80 backdrop-blur-md px-12 py-3 flex gap-8 font-headline text-[11px] font-bold tracking-widest uppercase">
          <a className="text-primary border-b-2 border-primary pb-1" href="#roadmap">
            Roadmap
          </a>
          <a className="text-neutral-500 hover:text-on-surface transition-colors" href="#paths">
            Paths
          </a>
          <a className="text-neutral-500 hover:text-on-surface transition-colors" href="#modules">
            Modules
          </a>
        </div>

        <section className="px-12 py-20" id="paths">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-headline text-3xl font-bold tracking-tight mb-2">
                OPERATIONAL_PATHS
              </h2>
              <p className="text-on-surface-variant font-label text-xs uppercase tracking-widest">
                Select your specialization vector
              </p>
            </div>
            <div className="h-[2px] flex-1 mx-12 bg-outline-variant opacity-20"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {redTeamPath && (allowRedTeamPath ? (
              <Link
                className="bg-surface-container-lowest p-8 flex flex-col h-[400px] relative group hover:bg-white transition-all duration-300"
                to={`/learn/path/${redTeamPath.slug}`}
              >
                <div className="absolute top-0 right-0 p-4 font-headline text-primary-container font-black text-4xl opacity-10">
                  01
                </div>
                <span
                  className="material-symbols-outlined text-primary mb-6"
                  style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}
                >
                  {redTeamPath.icon || 'security'}
                </span>
                <h3 className="font-headline text-xl font-bold mb-4">{redTeamPath.title}</h3>
                <p className="text-sm text-on-surface-variant flex-1 leading-relaxed">
                  {redTeamPath.description}
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  <div className="flex justify-between text-[10px] font-headline font-bold uppercase text-neutral-400">
                    <span>Mastery</span>
                    <span>{redTeamPath.mastery}%</span>
                  </div>
                  <div className="w-full h-1 bg-surface-container">
                    <div className="h-full bg-primary" style={{ width: `${redTeamPath.mastery}%` }}></div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="bg-surface-container-lowest p-8 flex flex-col h-[400px] relative opacity-50 grayscale cursor-not-allowed">
                <div className="absolute top-0 right-0 p-4 font-headline text-primary-container font-black text-4xl opacity-10">
                  01
                </div>
                <span
                  className="material-symbols-outlined text-primary mb-6"
                  style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}
                >
                  {redTeamPath.icon || 'security'}
                </span>
                <h3 className="font-headline text-xl font-bold mb-4">{redTeamPath.title}</h3>
                <p className="text-sm text-on-surface-variant flex-1 leading-relaxed">
                  {redTeamPath.description}
                </p>
                <div className="mt-8 text-[10px] font-headline font-bold uppercase tracking-widest text-outline">
                  Access Disabled By Admin
                </div>
              </div>
            ))}

            {otherPaths.map((path, index) => (
              <Link
                key={path.id}
                className="bg-surface-container-lowest p-8 flex flex-col h-[400px] relative group hover:bg-white transition-all duration-300"
                to={`/learn/path/${path.slug || path.id}`}
              >
                <div className="absolute top-0 right-0 p-4 font-headline text-secondary-container font-black text-4xl opacity-10">
                  {String(index + 2).padStart(2, '0')}
                </div>
                <span
                  className="material-symbols-outlined text-secondary mb-6"
                  style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}
                >
                  {path.icon || 'shield'}
                </span>
                <h3 className="font-headline text-xl font-bold mb-4">{path.title}</h3>
                <p className="text-sm text-on-surface-variant flex-1 leading-relaxed">
                  {path.description}
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  <div className="flex justify-between text-[10px] font-headline font-bold uppercase text-neutral-400">
                    <span>Mastery</span>
                    <span>{path.mastery}%</span>
                  </div>
                  <div className="w-full h-1 bg-surface-container">
                    <div className="h-full bg-secondary" style={{ width: `${path.mastery}%` }}></div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="px-12 py-20 bg-surface-container-low" id="modules">
          <div className="mb-12">
            <h2 className="font-headline text-3xl font-bold tracking-tight mb-2">
              CURRICULUM_MODULES
            </h2>
            <p className="text-on-surface-variant font-label text-xs uppercase tracking-widest">
              Surgical skill blocks for deep technical immersion
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 bg-surface-container-lowest p-6 flex flex-col border-l-4 border-primary">
              <div className="flex justify-between items-start mb-8">
                <span className="font-headline text-[10px] font-bold tracking-widest uppercase bg-primary-container text-on-primary-container px-3 py-1">
                  Advanced Exploit
                </span>
                <span className="material-symbols-outlined text-neutral-300">star</span>
              </div>
              <h4 className="font-headline text-lg font-bold mb-2">KERNEL_LEVEL_DEBUGGING</h4>
              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                Deep dive into memory corruption and privilege escalation in
                enterprise OS environments.
              </p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="text-[10px] font-headline uppercase text-neutral-400">
                    <p>Duration</p>
                    <p className="text-on-surface">12H</p>
                  </div>
                  <div className="text-[10px] font-headline uppercase text-neutral-400">
                    <p>Difficulty</p>
                    <p className="text-red-600">CRITICAL</p>
                  </div>
                </div>
                <button className="bg-neutral-900 text-white p-2 group hover:bg-primary transition-colors" type="button">
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-6 flex flex-col border-l-4 border-secondary">
              <span className="font-headline text-[10px] font-bold tracking-widest uppercase bg-secondary-container text-on-secondary-container px-3 py-1 self-start mb-8">
                Forensics
              </span>
              <h4 className="font-headline text-lg font-bold mb-2">DISK_ARTEFACTS</h4>
              <p className="text-xs text-on-surface-variant mb-6">
                Uncovering hidden persistence mechanisms in modern file systems.
              </p>
              <div className="mt-auto flex justify-between items-center">
                <span className="text-[10px] font-headline font-bold text-neutral-400">XP: 2,500</span>
                <button className="text-secondary hover:text-on-background" type="button">
                  <span className="material-symbols-outlined">lock_open</span>
                </button>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-6 flex flex-col border-l-4 border-tertiary">
              <span className="font-headline text-[10px] font-bold tracking-widest uppercase bg-tertiary-container text-on-tertiary-container px-3 py-1 self-start mb-8">
                OSINT
              </span>
              <h4 className="font-headline text-lg font-bold mb-2">SOCMINT_FLOW</h4>
              <p className="text-xs text-on-surface-variant mb-6">
                Advanced social media intelligence and metadata extraction.
              </p>
              <div className="mt-auto flex justify-between items-center">
                <span className="text-[10px] font-headline font-bold text-neutral-400">XP: 1,200</span>
                <button className="text-tertiary hover:text-on-background" type="button">
                  <span className="material-symbols-outlined">play_circle</span>
                </button>
              </div>
            </div>

            <div className="bg-inverse-surface p-6 flex flex-col md:col-span-1">
              <span className="font-headline text-[10px] font-bold tracking-widest uppercase text-surface-tint mb-4">
                SYSTEM_MESSAGE
              </span>
              <h4 className="font-headline text-sm font-bold text-white mb-4">LATEST_BREACH_UPDATE</h4>
              <div className="bg-black/30 p-3 mb-6">
                <code className="text-[10px] text-primary-fixed-dim font-headline">
                  $ tail -n 5 /logs/intel<br />
                  &gt; New vector detected: APT_33<br />
                  &gt; Origin: Undisclosed<br />
                  &gt; Status: Critical
                </code>
              </div>
              <button className="mt-auto w-full py-2 bg-primary text-white font-headline text-[10px] font-bold tracking-widest uppercase" type="button">
                Analyze Now
              </button>
            </div>

            <div className="md:col-span-3 bg-surface-container-lowest p-6 flex items-center gap-8 relative overflow-hidden">
              <div
                className="absolute right-0 top-0 h-full w-1/3 opacity-20"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB68Q5QOpK_iAAAscH9dPvFw1v0v2t6WI7GqMOMKQ2KMzmZOHMciOJao5SG2B_AwDK5zxpZREiwnBvq1DEIinXMn_TKocdWXX1ksvmeoaUnPqciZPV3ABRtaYOZyeFRRQ79acH4RRcZcvXAWUujS0RG7d9HT1IU12kWvDvqDWfBWSEx1QANH_4Zcfz34fwKw4z15xujVfrRao9r47JmH2OI6wiCA9ipG5hpaFyTktFOgE0m0VyvS1yxDoBEO43q6nSe8IahgRZC4Mg')",
                }}
              ></div>
              <div className="relative z-10 flex-1">
                <span className="font-headline text-[10px] font-bold tracking-widest uppercase text-neutral-400 mb-2 block">
                  Special Operations
                </span>
                <h4 className="font-headline text-2xl font-bold mb-4">INDUSTRIAL_CONTROL_SYSTEMS (ICS)</h4>
                <p className="text-sm text-on-surface-variant max-w-lg mb-6 leading-relaxed">
                  Understanding the vulnerabilities in physical infrastructure,
                  power grids, and SCADA systems through simulated environments.
                </p>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-600 text-sm">warning</span>
                    <span className="font-headline text-[10px] font-bold uppercase">Clearance Required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-neutral-400 text-sm">schedule</span>
                    <span className="font-headline text-[10px] font-bold uppercase">40 Hours</span>
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <button className="w-16 h-16 border-2 border-neutral-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors" type="button">
                  <span className="material-symbols-outlined text-3xl">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-6 mt-auto bg-neutral-50 border-t border-neutral-200/50 flex flex-col md:flex-row justify-between items-center px-12">
        <div className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 mb-4 md:mb-0">
          © 2024 INCOGNITRIX ACADEMY // SURGICAL INTEL UNIT
        </div>
        <div className="flex gap-8">
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-all" href="#">Privacy Protocol</a>
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-all" href="#">Terms of Engagement</a>
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-all" href="#">Liability Waiver</a>
        </div>
      </footer>
    </>
  )
}

export default LearningPathsPage
