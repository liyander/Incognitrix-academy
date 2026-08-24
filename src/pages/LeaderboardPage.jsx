import { useEffect, useState } from 'react'
import { apiFetch } from '../services/api'

function LeaderboardPage() {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadScoreboard = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await apiFetch('/rooms/scoreboard/summary')
        if (!cancelled) {
          setRows(Array.isArray(response) ? response : [])
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Failed to load scoreboard')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadScoreboard()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="rounded-2xl bg-surface min-h-screen p-8 lg:p-12 mt-16 md:mt-20">
      <div className="mb-10">
        <span className="font-label text-xs tracking-normal text-primary font-bold">
          Operator Rankings
        </span>
        <h1 className="text-5xl font-black tracking-tight text-on-background font-headline mt-2">
          SCOREBOARD
        </h1>
      </div>

      <section className="bg-surface-container-lowest border border-outline-variant/40 overflow-hidden">
        <div className="rounded-2xl grid grid-cols-[5rem_minmax(12rem,1fr)_8rem_8rem_8rem_8rem] gap-4 px-6 py-4 bg-surface-container-low font-label text-[10px] tracking-normal text-on-surface-variant font-bold">
          <span>Rank</span>
          <span>Student</span>
          <span>XP</span>
          <span>Courses</span>
          <span>Technical</span>
          <span>Grammar</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-on-surface-variant font-body">Loading leaderboard...</div>
        ) : error ? (
          <div className="p-8 text-error font-body">{error}</div>
        ) : rows.length ? (
          rows.map((row) => (
            <div
              className="rounded-2xl grid grid-cols-[5rem_minmax(12rem,1fr)_8rem_8rem_8rem_8rem] gap-4 px-6 py-5 border-t border-outline-variant/30 items-center"
              key={row.userId}
            >
              <span className="font-headline text-2xl font-bold text-primary">#{row.rank}</span>
              <div>
                <p className="font-headline text-sm font-bold text-on-background">
                  {row.username}
                </p>
                <p className="text-xs text-on-surface-variant">
                  Last clear: {row.lastCompletedAt ? new Date(row.lastCompletedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <span className="font-headline font-bold text-on-background">{row.xp}</span>
              <span className="font-headline font-bold text-on-background">{row.completedRooms}</span>
              <span className="font-headline font-bold text-primary">{row.averageTechnicalScore}</span>
              <span className="font-headline font-bold text-secondary">{row.averageGrammarScore}</span>
            </div>
          ))
        ) : (
          <div className="p-8 text-on-surface-variant font-body">No completed courses yet.</div>
        )}
      </section>
    </main>
  )
}

export default LeaderboardPage
