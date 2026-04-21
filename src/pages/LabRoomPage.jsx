import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getRoomsData } from '../data/roomsData'
import { apiFetch } from '../services/api'
import {
  getLabStatus,
  markLabCompleted,
  markLabIncomplete,
  markLabStarted,
} from '../services/labProgress'
import { parseMarkdownToHtml } from '../utils/markdown'

function renderRichContent(content, htmlOverride = '') {
  if (htmlOverride && String(htmlOverride).trim()) {
    return String(htmlOverride)
  }
  return parseMarkdownToHtml(content)
}

function toYouTubeEmbedUrl(input) {
  const raw = String(input || '').trim()
  if (!raw) return ''

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    const url = new URL(withProtocol)
    const host = url.hostname.toLowerCase()

    if (host.includes('youtu.be')) {
      const videoId = url.pathname.replace('/', '')
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : ''
    }

    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      const videoId = url.searchParams.get('v')
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
      }

      const pathParts = url.pathname.split('/').filter(Boolean)
      const embedIndex = pathParts.findIndex((part) => part === 'embed')
      if (embedIndex !== -1 && pathParts[embedIndex + 1]) {
        return `https://www.youtube-nocookie.com/embed/${pathParts[embedIndex + 1]}?rel=0`
      }

      const shortsIndex = pathParts.findIndex((part) => part === 'shorts')
      if (shortsIndex !== -1 && pathParts[shortsIndex + 1]) {
        return `https://www.youtube-nocookie.com/embed/${pathParts[shortsIndex + 1]}?rel=0`
      }
    }
  } catch {
    // Ignore invalid URLs.
  }

  // Fallback for raw IDs or unstructured strings containing a YouTube ID.
  const idMatch = raw.match(/([a-zA-Z0-9_-]{11})/)
  if (idMatch?.[1]) {
    return `https://www.youtube-nocookie.com/embed/${idMatch[1]}?rel=0`
  }

  return ''
}

function LabRoomPage() {
  const { labId } = useParams()
  const [room, setRoom] = useState(() => getRoomsData().find((item) => item.slug === labId) || null)
  const [isLoadingRoom, setIsLoadingRoom] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadRoom = async () => {
      try {
        const response = await apiFetch(`/rooms/${encodeURIComponent(labId)}`)
        if (!cancelled && response) {
          setRoom(response)
        }
      } catch {
        if (!cancelled) {
          const fallback = getRoomsData().find((item) => item.slug === labId) || null
          setRoom(fallback)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRoom(false)
        }
      }
    }

    void loadRoom()

    return () => {
      cancelled = true
    }
  }, [labId])

  if (isLoadingRoom) {
    return (
      <main className="pt-16 md:pt-20 min-h-screen flex items-center justify-center">
        <p className="text-on-surface-variant font-headline text-xs uppercase tracking-widest">
          Loading room content...
        </p>
      </main>
    )
  }

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
  const missionOverviewMarkup = renderRichContent(missionOverview, room.content?.html)
  const remediationProtocolsMarkup = renderRichContent(remediationProtocols)
  const technicalDeepDiveMarkup = renderRichContent(technicalDeepDive)
  const vulnerabilityDefinitionMarkup = renderRichContent(vulnerabilityDefinition)
  const vulnerabilityImpactMarkup = renderRichContent(vulnerabilityImpact)
  const youtubeEmbedUrl = toYouTubeEmbedUrl(room.content?.youtubeVideoUrl)
  const questionsEnabled = Boolean(room.content?.questionsEnabled)
  const [labStatus, setLabStatus] = useState(() => getLabStatus(room.id))
  const [questionStatus, setQuestionStatus] = useState({
    enabled: false,
    total: 0,
    correct: 0,
    allCorrect: true,
    questions: [],
  })
  const [questionAnswers, setQuestionAnswers] = useState({})
  const [isSubmittingQuestions, setIsSubmittingQuestions] = useState(false)
  const [questionFeedback, setQuestionFeedback] = useState('')
  const [completionError, setCompletionError] = useState('')

  useEffect(() => {
    markLabStarted(room.id)
    setLabStatus(getLabStatus(room.id))
  }, [room.id])

  useEffect(() => {
    let cancelled = false

    const loadQuestionStatus = async () => {
      if (!questionsEnabled) {
        if (!cancelled) {
          setQuestionStatus({
            enabled: false,
            total: 0,
            correct: 0,
            allCorrect: true,
            questions: [],
          })
        }
        return
      }

      try {
        const response = await apiFetch(`/rooms/${encodeURIComponent(room.id)}/questions/status`)
        if (!cancelled) {
          setQuestionStatus({
            enabled: Boolean(response?.enabled),
            total: Number(response?.total || 0),
            correct: Number(response?.correct || 0),
            allCorrect: Boolean(response?.allCorrect),
            questions: Array.isArray(response?.questions) ? response.questions : [],
          })
        }
      } catch (error) {
        if (!cancelled) {
          setQuestionFeedback(error?.message || 'Failed to load question status.')
        }
      }
    }

    void loadQuestionStatus()

    return () => {
      cancelled = true
    }
  }, [room.id, questionsEnabled])

  const handleMarkComplete = async () => {
    setCompletionError('')

    if (questionStatus.enabled && !questionStatus.allCorrect) {
      setCompletionError('Answer all room questions correctly before marking complete.')
      return
    }

    const success = await markLabCompleted(room.id)
    if (!success) {
      setCompletionError('Unable to mark complete yet. Verify question requirements and try again.')
      return
    }

    setLabStatus('completed')
  }

  const handleMarkIncomplete = () => {
    markLabIncomplete(room.id)
    setLabStatus('in-progress')
    setCompletionError('')
  }

  const handleQuestionAnswerChange = (questionId, value) => {
    setQuestionAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleSubmitQuestions = async () => {
    setQuestionFeedback('')
    setIsSubmittingQuestions(true)

    try {
      const result = await apiFetch(`/rooms/${encodeURIComponent(room.id)}/questions/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: questionAnswers }),
      })

      setQuestionStatus((prev) => ({
        ...prev,
        correct: Number(result?.correct || 0),
        total: Number(result?.total || prev.total || 0),
        allCorrect: Boolean(result?.allCorrect),
      }))

      if (result?.allCorrect) {
        setQuestionFeedback('All answers are correct. You can now complete this room.')
      } else {
        setQuestionFeedback('Some answers are incorrect. Review and try again.')
      }
    } catch (error) {
      setQuestionFeedback(error?.message || 'Unable to submit answers right now.')
    } finally {
      setIsSubmittingQuestions(false)
    }
  }

  return (
    <main className="pt-16 md:pt-20 min-h-screen">
      <div className="max-w-[96rem] mx-auto p-8 lg:p-12">
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
              <div
                className="space-y-4 text-on-surface font-body leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1 [&_pre]:bg-surface-container-high [&_pre]:p-4 [&_pre]:overflow-x-auto [&_code]:font-mono [&_a]:text-primary [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: missionOverviewMarkup }}
              >
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
                  <div
                    className="text-sm leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_code]:font-mono"
                    dangerouslySetInnerHTML={{ __html: vulnerabilityDefinitionMarkup }}
                  ></div>
                </div>
                <div className="bg-surface-container-low p-6">
                  <h3 className="font-headline text-xs font-bold tracking-widest uppercase text-primary mb-3">
                    Impact
                  </h3>
                  <div
                    className="text-sm leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_code]:font-mono"
                    dangerouslySetInnerHTML={{ __html: vulnerabilityImpactMarkup }}
                  ></div>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest p-8">
              <h2 className="font-headline text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="text-primary">03</span> TECHNICAL_DEEP_DIVE
              </h2>
              <div className="space-y-6">
                <div
                  className="font-body leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1 [&_pre]:bg-surface-container-high [&_pre]:p-4 [&_pre]:overflow-x-auto [&_code]:font-mono [&_a]:text-primary [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: technicalDeepDiveMarkup }}
                ></div>
                <div className="bg-surface-container-high aspect-video w-full flex items-center justify-center relative overflow-hidden">
                  {youtubeEmbedUrl ? (
                    <iframe
                      allow="fullscreen"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full"
                      referrerPolicy="strict-origin-when-cross-origin"
                      src={youtubeEmbedUrl}
                      title="Room walkthrough video"
                    ></iframe>
                  ) : (
                    <>
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
                    </>
                  )}
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
              <div
                className="font-body text-sm leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_pre]:bg-black/20 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:font-mono"
                dangerouslySetInnerHTML={{ __html: remediationProtocolsMarkup }}
              ></div>
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

              {questionStatus.enabled ? (
                <div className="bg-surface-container-low p-4 border-l-2 border-l-secondary space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Question Challenge
                    </span>
                    <span className="text-[10px] font-headline font-bold uppercase tracking-widest px-2 py-1 bg-secondary/15 text-secondary">
                      {questionStatus.correct}/{questionStatus.total} Correct
                    </span>
                  </div>

                  <div className="space-y-3">
                    {questionStatus.questions.map((question, index) => (
                      <div key={question.id || `question-${index}`} className="bg-surface-container-high p-3">
                        <p className="text-[11px] font-headline font-bold text-on-surface uppercase tracking-wide mb-2">
                          Q{index + 1}. {question.prompt}
                        </p>
                        {question.hint ? (
                          <p className="text-[10px] text-on-surface-variant mb-2">Hint: {question.hint}</p>
                        ) : null}
                        <input
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm py-2 px-3 outline-none"
                          onChange={(e) => handleQuestionAnswerChange(question.id, e.target.value)}
                          placeholder="Enter your answer"
                          type="text"
                          value={questionAnswers[question.id] || ''}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    className="w-full py-3 bg-secondary text-on-secondary font-headline text-[10px] font-bold tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-60"
                    disabled={isSubmittingQuestions}
                    onClick={handleSubmitQuestions}
                    type="button"
                  >
                    {isSubmittingQuestions ? 'Checking Answers...' : 'Submit Answers'}
                  </button>

                  {questionFeedback ? (
                    <p className="text-xs text-on-surface-variant">{questionFeedback}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="bg-surface-container-low p-4 border-l-2 border-l-primary">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Lab Status
                  </span>
                  <span className={`text-[10px] font-headline font-bold uppercase tracking-widest px-2 py-1 ${labStatus === 'completed' ? 'bg-secondary/15 text-secondary' : 'bg-primary/10 text-primary'}`}>
                    {labStatus === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  {labStatus !== 'completed' ? (
                    <button
                      className="w-full py-3 bg-secondary text-on-secondary font-headline text-[10px] font-bold tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-60"
                      disabled={questionStatus.enabled && !questionStatus.allCorrect}
                      onClick={handleMarkComplete}
                      type="button"
                    >
                      Mark Complete
                    </button>
                  ) : (
                    <button
                      className="w-full py-3 bg-surface-container-high text-on-surface font-headline text-[10px] font-bold tracking-widest uppercase"
                      onClick={handleMarkIncomplete}
                      type="button"
                    >
                      Mark Incomplete
                    </button>
                  )}
                </div>
                {completionError ? (
                  <p className="mt-2 text-xs text-error">{completionError}</p>
                ) : null}
              </div>
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
