const modules = [
  {
    domain: 'Offensive',
    level: 'LVL_07',
    title: 'Kernel_Exploitation_V2',
    duration: '8H 30M',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC8_5ZDha9SC5TJAmbyLb97BklndzpfX0yVSbC_46T_FNqiMpp5mLjNTTW0qWWdwA-fRTXD75KEdddSYK-UnNPQnq5RIIgpy0iSlg6Cmx4IE3-QltzybTckCz-JmzD_31oaKSmBzWYRJbX1gVQDcrylar9_3kfaLpUX6t5O5DJEewA6dv3qqTvk1edeyntTdgEh5lBZcijfT4XmOX-Jq5Z4ZGRMiyd4s9UJw_CbJQD3O5SvfawPfcyoRoWWdMkyS6flwYEtuDtjrTo',
    description:
      'Deep-dive into memory corruption and privilege escalation at the system core.',
    tone: 'red',
  },
  {
    domain: 'Defense',
    level: 'LVL_05',
    title: 'Neural_Sentry_AI',
    duration: '12H 15M',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA6UYDKeuImx6h6eKfpaaP_iVANMy8ldLCfbXm44nQGm57gL25e1HJvnu1oY3yEMp0A_BYTrNoHr3IbMbImB-M5lZxzVsmRdSunGGkCGjrJrNZ1fTXxHX81RKMrH8XkI-zkV6hZoDM7cCdFoY9GlalZ3xW0kUNuGDely0-NWQ7CJI6XVts7hvhld84dTbIRmXsIZteM83dn3JlqI69uJ9QeEKKfUX6pVli4x4UFtkVop9MDestfCV4hKCuMWXL6bdLdUm4BEo-eo3E',
    description:
      'Implementing machine learning models for real-time traffic anomaly detection.',
    tone: 'cyan',
  },
  {
    domain: 'Offensive',
    level: 'LVL_09',
    title: 'Cloud_Infiltration',
    duration: '6H 45M',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCgc2zlachruOBZnS84zzdkrzBHiatDopKr6h2NSGEDHtz1mZqV_MPmgxeaErHc-eOY271IMY1D7vd_KD9gnLG7Md1B19f6ezsMBEPWIVnR1g1gMBVNGA2vWyK_tZ4GcT9jkrwY6AJ1Rc812NRo8HVg-HFDoFH6-G4EdhWzmJvxTmONyWQ9zD2FQcr5yMFtIU8ikNlS5BBQQUAD3khRtLNFN0rTuT0yuPFfqmstoiEaY7rmx7zUNkDExJoSHULiQZyjaBpc9BORXt8',
    description:
      'Breaking serverless architectures and misconfigured S3 buckets at scale.',
    tone: 'red',
  },
  {
    domain: 'Analysis',
    level: 'LVL_04',
    title: 'Forensics_Payloads',
    duration: '15H 00M',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAQQrFd0lZop9nKG004jLe2NBl8AukOC7ze14289Gp-xAZ9LHAOf0tEvREIqsptnwBx3fkNAN1q2TuqPVYSJcSAbeIsl6_4B099XamZ14oC9kHrba6joCGzOOSK5IGEK61HUNw18Ha-Tmk7czOLrcX1AdQJEQnBpalDKYEir_wo27XAhZYx1ejeOaBw95jqV109bJ1MkCxzt9_pRKUQzBmoFAbvSedyxMdRgZQ8A2d00mwBAbluBFG-9nqPFv-3-mcNXo10u3nbPHk',
    description:
      'Reconstructing attack timelines from volatile memory and fragmented logs.',
    tone: 'cyan',
  },
]

function DashboardPage() {
  return (
    <>
      <div className="mt-20 p-8 lg:p-12 space-y-12">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-[2px] w-8 bg-primary"></div>
              <span className="font-headline text-[10px] tracking-[0.3em] font-bold text-primary uppercase">
                System Status: Optimal
              </span>
            </div>
            <h2 className="font-headline text-5xl font-bold tracking-tighter text-on-background">
              MISSION_CONTROL
            </h2>
            <p className="text-neutral-500 mt-2 font-body max-w-lg">
              Welcome back, Operator. Intelligence gathering is currently
              synchronized across all sub-sectors. Ready for tactical
              deployment.
            </p>
          </div>
          <div className="flex gap-12">
            <div className="text-right">
              <span className="font-headline text-[10px] tracking-[0.2em] font-bold text-neutral-400 uppercase block">
                Global Rank
              </span>
              <span className="font-headline text-3xl font-bold text-secondary">#1,284</span>
            </div>
            <div className="text-right">
              <span className="font-headline text-[10px] tracking-[0.2em] font-bold text-neutral-400 uppercase block">
                Daily Streak
              </span>
              <div className="flex items-center justify-end gap-1">
                <span
                  className="material-symbols-outlined text-primary text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  local_fire_department
                </span>
                <span className="font-headline text-3xl font-bold text-on-background">14_DAYS</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-surface-container-lowest p-8 flex flex-col justify-between min-h-[400px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-surface-container-low -skew-x-12 translate-x-1/4 transition-transform group-hover:translate-x-1/3 duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <span className="px-3 py-1 bg-primary text-on-primary font-headline text-[10px] font-bold tracking-widest uppercase">Active_Path</span>
                <span className="text-neutral-400 font-headline text-[10px] tracking-widest">EST_TIME: 42H</span>
              </div>
              <h3 className="font-headline text-4xl font-bold tracking-tight mb-4 max-w-md uppercase">Advanced Pen-Testing</h3>
              <p className="text-neutral-500 font-body max-w-sm mb-12">Exploitation vectors, lateral movement techniques, and state-level filtration methodologies.</p>
            </div>
            <div className="relative z-10 flex flex-col gap-6">
              <div className="w-full h-1 bg-surface-container-highest">
                <div className="h-full bg-primary w-[65%]"></div>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="font-headline text-[10px] font-bold text-neutral-400 uppercase">Progress</span>
                  <span className="font-headline text-xl font-bold text-on-background">65%_COMPLETE</span>
                </div>
                <button className="px-10 py-4 bg-primary text-on-primary font-headline text-xs font-bold tracking-widest uppercase hover:bg-primary-container transition-colors" type="button">
                  RESUME_PROTOCOL
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-container-lowest p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">security</span>
                <span className="font-headline text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Defense_Level</span>
              </div>
              <span className="font-headline text-4xl font-bold text-on-background">V_LEVEL_4</span>
              <p className="text-[11px] text-neutral-500 leading-relaxed font-body">Your defensive perimeter has successfully mitigated 12 simulated attacks in the last 24h.</p>
            </div>

            <div className="bg-secondary p-6 text-on-secondary flex flex-col justify-between h-[216px]">
              <div>
                <span className="font-headline text-[10px] font-bold tracking-widest uppercase opacity-70">Next Event</span>
                <h4 className="font-headline text-xl font-bold uppercase mt-2">Global CTF: Red_Alert</h4>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center text-[10px] font-headline font-bold uppercase tracking-widest border-b border-white/20 pb-2">
                  <span>Starts In</span>
                  <span>04:12:33</span>
                </div>
                <button className="w-full py-3 bg-white text-secondary font-headline text-[10px] font-bold tracking-widest uppercase hover:bg-secondary-fixed transition-colors" type="button">
                  REGISTER_INTEL
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-neutral-200/50 pb-4">
            <div className="flex items-center gap-4">
              <h3 className="font-headline text-2xl font-bold tracking-tight text-on-background uppercase">NEW_DEPLOYMENTS</h3>
              <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container font-headline text-[10px] font-bold uppercase">4 New Modules</span>
            </div>
            <a className="font-headline text-xs font-bold text-neutral-400 hover:text-primary transition-colors uppercase tracking-widest flex items-center gap-2" href="#">
              View_All_Intel
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((module) => (
              <div
                className={`bg-surface-container-lowest border-l-2 ${module.tone === 'red' ? 'border-primary' : 'border-secondary'} group cursor-pointer hover:bg-white transition-all`}
                key={module.title}
              >
                <div className="aspect-video relative overflow-hidden">
                  <img
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    src={module.image}
                    alt={module.description}
                  />
                  <div className={`absolute inset-0 ${module.tone === 'red' ? 'bg-primary/10' : 'bg-secondary/10'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className={`font-headline text-[9px] font-bold tracking-widest ${module.tone === 'red' ? 'text-primary' : 'text-secondary'} uppercase`}>
                      {module.domain}
                    </span>
                    <span className="text-neutral-400 font-headline text-[9px]">{module.level}</span>
                  </div>
                  <h4 className={`font-headline text-lg font-bold leading-tight uppercase ${module.tone === 'red' ? 'group-hover:text-primary' : 'group-hover:text-secondary'} transition-colors`}>
                    {module.title}
                  </h4>
                  <p className="text-xs text-neutral-500 font-body line-clamp-2">{module.description}</p>
                  <div className="flex items-center gap-2 text-[10px] font-headline font-bold text-neutral-400 pt-2">
                    <span className="material-symbols-outlined text-sm">timer</span>
                    {module.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="w-full py-6 mt-auto bg-neutral-50 border-t border-neutral-200/50 flex flex-col md:flex-row justify-between items-center px-12">
        <span className="font-headline text-[10px] tracking-widest uppercase text-neutral-400">© 2024 INCOGNITRIX ACADEMY // SURGICAL INTEL UNIT</span>
        <div className="flex gap-8 mt-4 md:mt-0">
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-colors" href="#">Privacy Protocol</a>
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-colors" href="#">Terms of Engagement</a>
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-colors" href="#">Liability Waiver</a>
        </div>
      </footer>
    </>
  )
}

export default DashboardPage
