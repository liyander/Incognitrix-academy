function ProfilePage() {
  return (
    <>
      <main className="pt-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-12 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="md:col-span-2 flex flex-col justify-end">
              <h1 className="font-headline font-bold text-6xl tracking-tighter mb-2">OPERATOR_01</h1>
              <div className="flex gap-4 items-center">
                <span className="bg-primary-container text-on-primary-container px-3 py-1 font-label text-[10px] tracking-widest uppercase">Senior Analyst</span>
                <span className="text-on-surface-variant font-label text-[10px] tracking-widest uppercase">ID: 0x8842_UNIT_09</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-8 flex flex-col justify-between border-l-4 border-primary">
              <span className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant">Total Experience Points</span>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-5xl tracking-tighter text-primary">128,450</span>
                <span className="font-label text-[10px] tracking-widest uppercase text-primary/60 mt-1">XP_ACCUMULATED_SEASON_04</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest p-8">
              <div className="flex justify-between items-center mb-12">
                <h2 className="font-headline font-bold text-xl uppercase tracking-tight">Skill Matrix Output</h2>
                <span className="material-symbols-outlined text-neutral-300">analytics</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between font-label text-[10px] tracking-widest uppercase">
                      <span>Penetration Testing</span>
                      <span className="text-primary font-bold">94%</span>
                    </div>
                    <div className="h-1 bg-surface-container"><div className="h-full bg-primary w-[94%]"></div></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between font-label text-[10px] tracking-widest uppercase">
                      <span>Cryptography</span>
                      <span className="text-primary font-bold">82%</span>
                    </div>
                    <div className="h-1 bg-surface-container"><div className="h-full bg-primary w-[82%]"></div></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between font-label text-[10px] tracking-widest uppercase">
                      <span>Network Forensics</span>
                      <span className="text-primary font-bold">98%</span>
                    </div>
                    <div className="h-1 bg-surface-container"><div className="h-full bg-primary w-[98%]"></div></div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between font-label text-[10px] tracking-widest uppercase">
                      <span>Malware Analysis</span>
                      <span className="text-secondary font-bold">76%</span>
                    </div>
                    <div className="h-1 bg-surface-container"><div className="h-full bg-secondary w-[76%]"></div></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between font-label text-[10px] tracking-widest uppercase">
                      <span>Cloud Security</span>
                      <span className="text-secondary font-bold">65%</span>
                    </div>
                    <div className="h-1 bg-surface-container"><div className="h-full bg-secondary w-[65%]"></div></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between font-label text-[10px] tracking-widest uppercase">
                      <span>Social Engineering</span>
                      <span className="text-secondary font-bold">89%</span>
                    </div>
                    <div className="h-1 bg-surface-container"><div className="h-full bg-secondary w-[89%]"></div></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 bg-inverse-surface p-8 text-surface relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-surface-tint blur-[80px] opacity-20"></div>
              <div className="flex justify-between items-center mb-8 relative z-10">
                <h2 className="font-headline font-bold text-sm uppercase tracking-widest">Event_Log</h2>
                <span className="text-[10px] font-label text-primary-fixed-dim">LIVE_FEED</span>
              </div>
              <div className="space-y-6 font-headline text-xs relative z-10">
                <div className="flex gap-4 items-start border-l border-white/10 pl-4"><span className="text-primary-fixed-dim shrink-0">14:02:44</span><span className="text-surface/80">User neutralized simulated DDoS attack on Lab_Node_09</span></div>
                <div className="flex gap-4 items-start border-l border-white/10 pl-4"><span className="text-primary-fixed-dim shrink-0">12:15:20</span><span className="text-surface/80">Completed "Advanced Buffer Overflow" module with 100% accuracy</span></div>
                <div className="flex gap-4 items-start border-l border-white/10 pl-4"><span className="text-primary-fixed-dim shrink-0">11:04:12</span><span className="text-surface/80">New achievement unlocked: "Deep Packet Explorer"</span></div>
                <div className="flex gap-4 items-start border-l border-white/10 pl-4"><span className="text-primary-fixed-dim shrink-0">09:30:55</span><span className="text-surface/80">Operator credentials authenticated via biometric proxy</span></div>
                <div className="flex gap-4 items-start border-l border-white/10 pl-4"><span className="text-primary-fixed-dim shrink-0">08:00:01</span><span className="text-surface/80">Daily training sequence initiated...</span></div>
              </div>
            </div>

            <div className="col-span-12 bg-surface-container-low p-8">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="font-headline font-bold text-xl uppercase tracking-tight">Achievement Vault</h2>
                  <p className="text-on-surface-variant text-[10px] font-label uppercase tracking-widest mt-1">Authorized Merit Badges</p>
                </div>
                <button className="font-label text-[10px] tracking-widest uppercase text-primary border-b-2 border-primary pb-1" type="button">View All Medals</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                <div className="aspect-square bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center gap-3"><span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>security</span><span className="font-label text-[10px] font-bold tracking-widest uppercase">Firewall Breaker</span></div>
                <div className="aspect-square bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center gap-3"><span className="material-symbols-outlined text-4xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>data_thresholding</span><span className="font-label text-[10px] font-bold tracking-widest uppercase">Pattern Seeker</span></div>
                <div className="aspect-square bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center gap-3"><span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span><span className="font-label text-[10px] font-bold tracking-widest uppercase">Script Killa</span></div>
                <div className="aspect-square bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center gap-3"><span className="material-symbols-outlined text-4xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span><span className="font-label text-[10px] font-bold tracking-widest uppercase">Node Guardian</span></div>
                <div className="aspect-square bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center gap-3 opacity-30 grayscale"><span className="material-symbols-outlined text-4xl">vpn_key</span><span className="font-label text-[10px] font-bold tracking-widest uppercase">LOCKED_FILE</span></div>
                <div className="aspect-square bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center gap-3 opacity-30 grayscale"><span className="material-symbols-outlined text-4xl">radar</span><span className="font-label text-[10px] font-bold tracking-widest uppercase">LOCKED_FILE</span></div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-6 bg-surface-container-lowest h-64 overflow-hidden relative">
              <img alt="Servers" className="w-full h-full object-cover grayscale opacity-20 mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8Up8U0Qns_mn9r9DwX9zZyvGMbGwohDNQ9BG4mbWDhnv0l4-3gpm4UDv9c46eqHBIzyJtLpzvO4j-raquDQB9Kf9U9wtASYKd-r5Bkk5wASptx560cccS9lcqSOEFEwIjNtqc0B-ux92is0Zz8a6bYJA5HGoLwEAuDmn7lzG1kN1lmmcbJpQyRc0YrcR_25GSA13Z_9ISSXGx-PsmWEev9swLpEGoskBLUatjuQsdfCXYL4-LRN2nvKAHbSu2RFneVMhwYubmE4g" />
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <h3 className="font-headline font-bold text-lg uppercase">Network Status</h3>
                  <span className="bg-green-500/20 text-green-700 px-2 py-1 text-[8px] font-bold tracking-[2px]">SECURE_NODE</span>
                </div>
                <div className="space-y-2">
                  <p className="font-body text-sm text-on-surface-variant max-w-xs">Your current performance is in the top 4% of regional intelligence units.</p>
                  <span className="font-label text-[10px] text-primary tracking-widest uppercase font-bold">Maintain_Current_Trajectory</span>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-6 bg-primary-container p-8 flex flex-col justify-between text-on-primary-container">
              <div className="flex justify-between items-start">
                <span className="material-symbols-outlined text-4xl">military_tech</span>
                <div className="text-right">
                  <span className="font-label text-[10px] tracking-widest uppercase opacity-70">Next Rank Progression</span>
                  <p className="font-headline font-bold text-xl uppercase">Elite Commander</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-label text-[10px] tracking-widest uppercase mb-2">
                  <span>Rank Progress</span>
                  <span>1,550 XP to Next Rank</span>
                </div>
                <div className="h-3 bg-black/10">
                  <div className="h-full bg-white w-[88%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 mt-auto bg-neutral-50 border-t border-neutral-200/50 flex flex-col md:flex-row justify-between items-center px-12">
        <div className="font-headline text-[10px] tracking-widest uppercase text-neutral-400">© 2024 INCOGNITRIX ACADEMY // SURGICAL INTEL UNIT</div>
        <div className="flex gap-8 mt-4 md:mt-0">
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-all duration-150" href="#">Privacy Protocol</a>
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-all duration-150" href="#">Terms of Engagement</a>
          <a className="font-headline text-[10px] tracking-widest uppercase text-neutral-400 hover:text-red-600 opacity-80 hover:opacity-100 transition-all duration-150" href="#">Liability Waiver</a>
        </div>
      </footer>
    </>
  )
}

export default ProfilePage
