import { Navigate, useParams } from 'react-router-dom'
import { getRoomsData } from '../data/roomsData'

function LabRoomPage() {
  const { labId } = useParams()
  const rooms = getRoomsData()

  const room = rooms.find((item) => item.slug === labId)
  if (!room) {
    return <Navigate to="/learn" replace />
  }

  const missionOverview = room.content?.missionOverview || room.content?.markdown || room.description
  const remediationProtocols =
    room.content?.remediationProtocols ||
    'Apply secure coding practices, validate all user input, and enforce least privilege access.'
  const vulnerabilityDefinition =
    room.content?.vulnerabilityBriefing?.definition ||
    'No vulnerability definition has been configured for this room yet.'
  const vulnerabilityImpact =
    room.content?.vulnerabilityBriefing?.impact ||
    'No impact summary has been configured for this room yet.'
  const technicalDeepDive =
    room.content?.technicalDeepDive ||
    'No technical deep dive has been configured for this room yet.'

  const roomTags = room.tags?.length ? room.tags : [room.categoryTag || room.category].filter(Boolean)
  const keywordTags = room.requiredKeywords?.length ? room.requiredKeywords : []

  return (
    <main className="pt-16 md:pt-20 min-h-screen">
      <div className="max-w-7xl mx-auto p-8 lg:p-12">
        <header className="mb-12 border-l-4 border-primary pl-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {roomTags.map((tag) => (
              <span
                key={tag}
                className="bg-primary-container text-on-primary-container px-3 py-1 font-label text-[10px] font-bold tracking-widest uppercase"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-5xl lg:text-6xl font-black tracking-tighter mb-4 text-on-background uppercase font-headline">
            {room.title}
          </h1>
          <p className="text-on-surface-variant max-w-2xl text-lg font-body leading-relaxed">
            {room.description}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-12">
            <section className="bg-surface-container-lowest p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 -rotate-45 translate-x-16 -translate-y-16"></div>
              <h2 className="font-headline text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="text-primary">01</span> MISSION_OVERVIEW
              </h2>
              <div className="space-y-4 text-on-surface font-body leading-relaxed">
                <p>{missionOverview}</p>
              </div>
            </section>

            <section className="p-2 border-l border-outline-variant/30">
              <h2 className="font-headline text-2xl font-bold mb-6 flex items-center gap-3 pl-6">
                <span className="text-primary">02</span>
                VULNERABILITY_BRIEFING
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pl-6">
                <div className="bg-surface-container-low p-6">
                  <h3 className="font-headline text-xs font-bold tracking-widest uppercase text-primary mb-3">
                    Definition
                  </h3>
                  <p className="text-sm leading-relaxed">{vulnerabilityDefinition}</p>
                </div>
                <div className="bg-surface-container-low p-6">
                  <h3 className="font-headline text-xs font-bold tracking-widest uppercase text-primary mb-3">
                    Impact
                  </h3>
                  <p className="text-sm leading-relaxed">{vulnerabilityImpact}</p>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest p-8">
              <h2 className="font-headline text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="text-primary">03</span> TECHNICAL_DEEP_DIVE
              </h2>
              <div className="space-y-6">
                <p className="font-body leading-relaxed whitespace-pre-wrap">{technicalDeepDive}</p>
                <div className="bg-surface-container-high aspect-video w-full flex items-center justify-center relative">
                  <img
                    alt="Technical Logic Diagram"
                    className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvAt-0JW07N76LyAzfo2fdJ5rClw4KqFDM3mwsBWdDTmv-2_e8-lwHPSpO1fMUKIPqvqaiE5UU8MJ5g57pCHOwIXd2a3Jqj1ZQ7y7SD3fAOMpWfNsBZCnJUuhu2bTK2qOEveqZmBe2HclDQj5B1X16u5FjdKT9f15K5LaeyHgREIXf-UBum34rsfFp_T_tYzqry6b0EpxoPZh_GE-51Dm_XL_NpcSZ_8Z_s_-OZlc0b4HgAPUmCoLPJM7hR4GaFqzV5q5Af_aY27o"
                  />
                  <div className="z-10 text-center p-8 bg-surface/90 backdrop-blur-md border border-primary/20">
                    <span className="material-symbols-outlined text-4xl text-primary mb-2">
                      schema
                    </span>
                    <p className="font-headline font-bold text-xs tracking-widest uppercase">
                      Logic Alteration Visualization
                    </p>
                    <p className="text-[10px] text-on-surface-variant mt-1">
                      Payload: Admin'--
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-5 space-y-8">
            <div className="bg-secondary text-on-secondary p-8">
              <h2 className="font-headline text-xl font-bold mb-6 flex items-center gap-3 uppercase tracking-tight">
                <span className="material-symbols-outlined">shield_with_heart</span>{' '}
                Remediation_Protocols
              </h2>
              <p className="font-body text-sm leading-relaxed whitespace-pre-wrap">{remediationProtocols}</p>
            </div>

            <div className="bg-surface-container-low p-8 border-t-2 border-primary">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                    Difficulty
                  </p>
                  <p className="font-headline font-bold text-lg">
                    {(room.difficulty || room.level || 'N/A').toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                    Estimated Time
                  </p>
                  <p className="font-headline font-bold text-lg">{(room.estimateTime || 'N/A').toUpperCase()}</p>
                </div>
                <div>
                  <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                    Environment
                  </p>
                  <p className="font-headline font-bold text-lg">{(room.environment || 'N/A').toUpperCase()}</p>
                </div>
                <div>
                  <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                    XP Reward
                  </p>
                  <p className="font-headline font-bold text-lg">{(room.xp || 'N/A').toUpperCase()}</p>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-headline text-xs font-black tracking-[0.2em] uppercase text-primary border-b border-primary/20 pb-2">
                  Required Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {keywordTags.length > 0 ? (
                    keywordTags.map((keyword) => (
                      <span
                        key={keyword}
                        className="text-[10px] font-headline border border-outline-variant px-2 py-1"
                      >
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] font-headline text-on-surface-variant">
                      No keywords configured
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button className="w-full group relative bg-primary hover:bg-primary-container text-on-primary p-6 transition-all" type="button">
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xl font-bold uppercase tracking-tighter italic">
                    Access Terminal
                  </span>
                  <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">
                    arrow_forward
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full"></div>
              </button>
              <p className="text-[10px] font-headline text-on-surface-variant text-center tracking-[0.15em] uppercase">
                Ready for deployment? Ensure secure connection protocols are
                active.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-1 opacity-20">
              <div className="aspect-square bg-on-surface"></div>
              <div className="aspect-square border border-on-surface"></div>
              <div className="aspect-square bg-on-surface"></div>
              <div className="aspect-square border border-on-surface"></div>
              <div className="aspect-square border border-on-surface"></div>
              <div className="aspect-square bg-primary"></div>
              <div className="aspect-square border border-on-surface"></div>
              <div className="aspect-square bg-on-surface"></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default LabRoomPage
