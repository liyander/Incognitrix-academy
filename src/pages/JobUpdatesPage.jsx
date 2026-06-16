import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../services/api'

const PROFILE_FIELDS = [
  {
    key: 'hardSkills',
    label: 'Hard Skills',
    placeholder: 'Linux, networking, incident response, Docker, Terraform...',
  },
  {
    key: 'softSkills',
    label: 'Soft Skills',
    placeholder: 'Communication, documentation, teamwork, analytical thinking...',
  },
  {
    key: 'tools',
    label: 'Tools',
    placeholder: 'Splunk, Burp Suite, Wireshark, Nessus, GitHub Actions...',
  },
  {
    key: 'techStack',
    label: 'Stack',
    placeholder: 'AWS, Azure, Python, Bash, Kubernetes, SIEM...',
  },
  {
    key: 'internships',
    label: 'Internships',
    placeholder: 'Company, role, duration, and what you handled...',
  },
  {
    key: 'projects',
    label: 'Projects',
    placeholder: 'Security labs, DevOps pipelines, cloud projects, tools built...',
  },
  {
    key: 'achievements',
    label: 'Achievements',
    placeholder: 'CTF wins, bug bounty findings, leadership, publications...',
  },
  {
    key: 'certifications',
    label: 'Certifications',
    placeholder: 'Security+, AZ-900, AWS Cloud Practitioner, ISC2 CC...',
  },
]

const EMPTY_PROFILE = PROFILE_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: '' }), {})

function probabilityClass(label) {
  if (label === 'High') return 'text-secondary border-secondary bg-secondary/10'
  if (label === 'Medium') return 'text-primary border-primary bg-primary/10'
  return 'text-on-surface-variant border-outline-variant bg-surface-container-high'
}

function formatDate(value) {
  if (!value) return 'Not analyzed yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently analyzed'
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function JobUpdatesPage() {
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [recommendations, setRecommendations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [expandedJobId, setExpandedJobId] = useState(null)

  const highMatches = useMemo(
    () => recommendations.filter((item) => item.probabilityLabel === 'High').length,
    [recommendations],
  )
  const averageScore = useMemo(() => {
    if (!recommendations.length) return 0
    return Math.round(
      recommendations.reduce((sum, item) => sum + Number(item.matchScore || 0), 0) /
        recommendations.length,
    )
  }, [recommendations])

  const loadData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [profileResponse, recommendationResponse] = await Promise.all([
        apiFetch('/jobs/profile'),
        apiFetch('/jobs/recommendations/me'),
      ])
      setProfile({ ...EMPTY_PROFILE, ...(profileResponse || {}) })
      setRecommendations(Array.isArray(recommendationResponse) ? recommendationResponse : [])
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load job recommendations.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const updateProfile = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  const saveProfile = async () => {
    setIsSaving(true)
    setMessage('')
    setError('')
    try {
      await apiFetch('/jobs/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      })
      const refreshed = await apiFetch('/jobs/recommendations/me')
      setRecommendations(Array.isArray(refreshed) ? refreshed : [])
      setMessage('Career profile saved. Job matches refreshed from your latest evidence.')
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save career profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const refreshRecommendations = async () => {
    setIsSaving(true)
    setMessage('')
    setError('')
    try {
      const refreshed = await apiFetch('/jobs/recommendations/refresh', { method: 'POST' })
      setRecommendations(Array.isArray(refreshed) ? refreshed : [])
      setMessage('Recommendations refreshed from completed rooms and saved profile details.')
    } catch (refreshError) {
      setError(refreshError?.message || 'Unable to refresh recommendations.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-surface pt-24 px-6 lg:px-10 pb-12">
      <section className="max-w-7xl mx-auto space-y-8">
        <header className="bg-surface-container-lowest border-l-4 border-secondary p-8 md:p-10">
          <p className="font-headline text-[10px] tracking-[0.28em] uppercase text-secondary font-bold">
            Career Signal Engine
          </p>
          <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight uppercase">
                Job Updates
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-on-surface-variant">
                Add your internships, skills, tools, stack, projects, certifications, and achievements. The platform matches those signals with completed rooms to recommend jobs where you have stronger fit.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-80">
              <div className="bg-surface-container-high p-4">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  High Matches
                </p>
                <p className="mt-1 font-headline text-3xl font-black text-secondary">{highMatches}</p>
              </div>
              <div className="bg-surface-container-high p-4">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Avg Fit
                </p>
                <p className="mt-1 font-headline text-3xl font-black text-primary">{averageScore}%</p>
              </div>
            </div>
          </div>
        </header>

        {message ? (
          <p className="border-l-4 border-secondary bg-secondary/10 px-4 py-3 text-sm text-secondary">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="border-l-4 border-error bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(22rem,0.85fr)_minmax(0,1.15fr)] gap-8">
          <section className="bg-surface-container-lowest border-l-4 border-primary p-6 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
                  Student Player Settings
                </p>
                <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight">
                  Career Evidence
                </h2>
              </div>
              <button
                className="bg-primary px-5 py-3 font-headline text-[10px] font-bold uppercase tracking-widest text-on-primary disabled:opacity-60"
                disabled={isSaving}
                onClick={saveProfile}
                type="button"
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
              {PROFILE_FIELDS.map((field) => (
                <label className="block" key={field.key}>
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    {field.label}
                  </span>
                  <textarea
                    className="mt-2 min-h-24 w-full resize-y bg-surface-container-highest border-l-2 border-l-primary px-4 py-3 text-sm outline-none"
                    onChange={(event) => updateProfile(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    value={profile[field.key] || ''}
                  />
                </label>
              ))}
            </div>

            <button
              className="mt-5 w-full bg-surface-container-high px-5 py-3 font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-highest disabled:opacity-60"
              disabled={isSaving}
              onClick={refreshRecommendations}
              type="button"
            >
              Refresh Matches From Rooms
            </button>
          </section>

          <section className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
                  Recommended Opportunities
                </p>
                <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight">
                  High Probability Job Matches
                </h2>
              </div>
              <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                {recommendations.length} match{recommendations.length === 1 ? '' : 'es'} analyzed
              </p>
            </div>

            <div className="mt-6 space-y-5">
              {isLoading ? (
                <div className="bg-surface-container-lowest p-8 text-sm text-on-surface-variant">
                  Analyzing jobs against your profile...
                </div>
              ) : recommendations.length ? (
                recommendations.map((item) => {
                  const expanded = expandedJobId === item.id
                  return (
                    <article
                      className="bg-surface-container-lowest border border-outline-variant/40 border-l-4 border-l-secondary p-5 md:p-6"
                      key={item.id}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`border px-2 py-1 font-label text-[10px] font-bold uppercase tracking-widest ${probabilityClass(item.probabilityLabel)}`}>
                              {item.probabilityLabel} Fit
                            </span>
                            <span className="bg-surface-container-high px-2 py-1 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                              {item.job?.category}
                            </span>
                            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                              {formatDate(item.updatedAt)}
                            </span>
                          </div>
                          <h3 className="mt-3 font-headline text-2xl font-black uppercase tracking-tight text-on-background">
                            {item.job?.title}
                          </h3>
                          <p className="mt-1 text-sm text-on-surface-variant">
                            {item.job?.company} · {item.job?.location} · {item.job?.salary}
                          </p>
                        </div>
                        <div className="shrink-0 text-left lg:text-right">
                          <p className="font-headline text-4xl font-black text-secondary">{item.matchScore}%</p>
                          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                            Match Probability
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-relaxed text-on-surface">
                        {item.aiAnalysis}
                      </p>

                      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-surface-container-high p-4">
                          <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold">
                            Skills You Match
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(item.matchedSkills || []).length ? (
                              item.matchedSkills.map((skill) => (
                                <span className="bg-secondary/10 px-2 py-1 text-xs text-secondary" key={skill}>
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-on-surface-variant">No direct skill match yet.</span>
                            )}
                          </div>
                        </div>
                        <div className="bg-surface-container-high p-4">
                          <p className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">
                            Skills To Improve
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(item.missingSkills || []).slice(0, 8).map((skill) => (
                              <span className="bg-primary/10 px-2 py-1 text-xs text-primary" key={skill}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {expanded ? (
                        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-outline-variant/40 pt-5">
                          <div>
                            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                              Requirements
                            </p>
                            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-on-surface-variant">
                              {(item.job?.requirements || []).map((requirement) => (
                                <li key={requirement}>{requirement}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                              Responsibilities
                            </p>
                            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-on-surface-variant">
                              {(item.job?.responsibilities || []).map((responsibility) => (
                                <li key={responsibility}>{responsibility}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="lg:col-span-2 bg-surface-container-high p-4">
                            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                              Role Detail
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                              {item.job?.aboutRole}
                            </p>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <button
                          className="bg-surface-container-high px-4 py-2 font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-highest"
                          onClick={() => setExpandedJobId(expanded ? null : item.id)}
                          type="button"
                        >
                          {expanded ? 'Hide Details' : 'View Full Job'}
                        </button>
                        {item.job?.applyUrl ? (
                          <a
                            className="bg-secondary px-4 py-2 font-headline text-[10px] font-bold uppercase tracking-widest text-on-secondary"
                            href={item.job.applyUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open Career Page
                          </a>
                        ) : null}
                      </div>
                    </article>
                  )
                })
              ) : (
                <div className="bg-surface-container-lowest p-8 text-sm text-on-surface-variant">
                  No high-probability jobs yet. Add your skills, projects, internships, and certifications, then refresh matches.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

export default JobUpdatesPage
