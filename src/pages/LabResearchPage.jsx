import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLabProjects } from '../services/labResearch'

function LabResearchPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchLabProjects()
        if (!cancelled) {
          setProjects(Array.isArray(data) ? data : [])
          setError('')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load research projects')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex-1 px-6 md:px-10 pt-24 pb-24 md:pb-10">
      <header className="bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10 mb-8">
        <p className="font-headline text-[10px] tracking-[0.25em] uppercase text-primary font-bold">
          Knowledge Transfer
        </p>
        <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight mt-3 uppercase">
          Lab Research
        </h1>
        <p className="text-sm text-on-surface-variant mt-4 max-w-2xl">
          Study real projects built in the lab: the stack used, who built them, and exactly how they were implemented.
          Prove your understanding with the AI knowledge check — score 100 to complete it — and take on the AI code lab where available.
        </p>
      </header>

      {error ? (
        <div className="mb-6 bg-error/10 border-l-4 border-error p-4">
          <p className="text-error font-headline text-xs font-bold uppercase tracking-widest">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="bg-surface-container-lowest p-8 text-center">
          <p className="text-on-surface-variant">Loading research projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-surface-container-lowest p-10 text-center border-l-4 border-outline-variant/40">
          <p className="font-headline text-lg font-bold uppercase">No research projects published yet</p>
          <p className="text-sm text-on-surface-variant mt-2">Check back soon — the lab is always building.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map((project) => {
            const fullyDone = project.progress.quizCompleted && (!project.codingEnabled || project.progress.codeAccepted)
            return (
              <Link
                className="block bg-surface-container-lowest border-l-4 border-secondary/60 p-6 hover:bg-surface-container-high transition-all"
                key={project.id}
                to={`/lab-research/${project.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-headline text-lg font-bold uppercase truncate">{project.title}</h2>
                    {project.stack ? (
                      <p className="text-xs text-on-surface-variant mt-1 truncate">Stack: {project.stack}</p>
                    ) : null}
                    {project.contributors ? (
                      <p className="text-xs text-on-surface-variant mt-1 truncate">By: {project.contributors}</p>
                    ) : null}
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant shrink-0">chevron_right</span>
                </div>
                {project.summary ? (
                  <p className="text-sm text-on-surface-variant mt-3 line-clamp-2">{project.summary}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-2 py-1 text-[10px] font-headline font-bold uppercase tracking-widest bg-surface-container-high text-on-surface-variant">
                    {project.projectType === 'web' ? 'Web-Based' : project.projectType === 'program' ? 'Program-Based' : 'Research'}
                  </span>
                  <span className={`px-2 py-1 text-[10px] font-headline font-bold uppercase tracking-widest ${project.progress.quizCompleted ? 'bg-secondary/15 text-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    {project.progress.quizCompleted ? 'Knowledge Check 100/100' : `Knowledge Check ${project.progress.quizScore}/100`}
                  </span>
                  {project.codingEnabled ? (
                    <span className={`px-2 py-1 text-[10px] font-headline font-bold uppercase tracking-widest ${project.progress.codeAccepted ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'}`}>
                      {project.progress.codeAccepted ? 'Code Lab Accepted' : 'Code Lab Available'}
                    </span>
                  ) : null}
                  {fullyDone ? (
                    <span className="px-2 py-1 text-[10px] font-headline font-bold uppercase tracking-widest bg-secondary text-on-secondary">
                      Completed
                    </span>
                  ) : null}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LabResearchPage
