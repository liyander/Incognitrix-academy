import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  answerLabQuizQuestion,
  fetchLabCodeChallenge,
  fetchLabProject,
  fetchLabQuizAttempt,
  startLabQuiz,
  submitLabCode,
} from '../services/labResearch'

const TABS = {
  research: 'research',
  quiz: 'quiz',
  code: 'code',
}

function ContentBlock({ text }) {
  const paragraphs = useMemo(
    () => String(text || '').split(/\n{2,}/).map((item) => item.trim()).filter(Boolean),
    [text],
  )
  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => (
        <p className="text-sm leading-7 text-on-surface whitespace-pre-line" key={index}>
          {paragraph}
        </p>
      ))}
    </div>
  )
}

function LabResearchProjectPage() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(TABS.research)

  // Quiz state
  const [attempt, setAttempt] = useState(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizError, setQuizError] = useState('')
  const [answers, setAnswers] = useState({})
  const [submittingQuestionId, setSubmittingQuestionId] = useState(null)

  // Code lab state
  const [challenge, setChallenge] = useState(null)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [code, setCode] = useState('')
  const [submittingCode, setSubmittingCode] = useState(false)
  const [submission, setSubmission] = useState(null)
  const codeInitializedRef = useRef(false)

  const loadProject = async () => {
    try {
      const data = await fetchLabProject(projectId)
      setProject(data)
      setError('')
      if (data.codeChallenge) {
        setChallenge(data.codeChallenge)
        if (!codeInitializedRef.current) {
          setCode(data.codeChallenge.starterCode || '')
          codeInitializedRef.current = true
        }
      }
      if (data.activeQuizAttemptId && !attempt) {
        try {
          const existing = await fetchLabQuizAttempt(data.activeQuizAttemptId)
          setAttempt(existing)
        } catch {
          // Attempt may have been cleaned up; the player can start a new one.
        }
      }
      return data
    } catch (err) {
      setError(err.message || 'Failed to load research project')
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const handleStartQuiz = async ({ restart = false } = {}) => {
    try {
      setQuizLoading(true)
      setQuizError('')
      const data = await startLabQuiz(projectId, { restart })
      setAttempt(data)
      setAnswers({})
      setActiveTab(TABS.quiz)
    } catch (err) {
      setQuizError(err.message || 'Failed to start the knowledge check')
    } finally {
      setQuizLoading(false)
    }
  }

  const handleAnswerSubmit = async (question) => {
    const answer = (answers[question.id] || '').trim()
    if (answer.length < 5) {
      setQuizError('Write a more complete answer before submitting.')
      return
    }
    try {
      setSubmittingQuestionId(question.id)
      setQuizError('')
      const updated = await answerLabQuizQuestion(attempt.id, question.id, answer)
      setAttempt(updated)
      if (updated.status === 'completed') {
        void loadProject()
      }
    } catch (err) {
      setQuizError(err.message || 'Failed to submit the answer')
    } finally {
      setSubmittingQuestionId(null)
    }
  }

  const handleLoadChallenge = async ({ regenerate = false } = {}) => {
    try {
      setCodeLoading(true)
      setCodeError('')
      setSubmission(null)
      const data = await fetchLabCodeChallenge(projectId, { regenerate })
      setChallenge(data)
      if (regenerate || !codeInitializedRef.current) {
        setCode(data.starterCode || '')
        codeInitializedRef.current = true
      }
    } catch (err) {
      setCodeError(err.message || 'Failed to load the code challenge')
    } finally {
      setCodeLoading(false)
    }
  }

  const handleCodeSubmit = async () => {
    if (code.trim().length < 10) {
      setCodeError('Write your solution before submitting.')
      return
    }
    try {
      setSubmittingCode(true)
      setCodeError('')
      const result = await submitLabCode(challenge.id, code)
      setSubmission(result)
      if (result.accepted) {
        setChallenge((current) => (current ? { ...current, status: 'accepted' } : current))
        void loadProject()
      }
    } catch (err) {
      setCodeError(err.message || 'Failed to submit the code')
    } finally {
      setSubmittingCode(false)
    }
  }

  const handleEditorKeyDown = (event) => {
    if (event.key === 'Tab') {
      event.preventDefault()
      const target = event.target
      const start = target.selectionStart
      const end = target.selectionEnd
      const next = `${code.slice(0, start)}  ${code.slice(end)}`
      setCode(next)
      requestAnimationFrame(() => {
        target.selectionStart = start + 2
        target.selectionEnd = start + 2
      })
    }
  }

  if (loading) {
    return (
      <div className="flex-1 px-6 md:px-10 py-10">
        <div className="bg-surface-container-lowest p-8 text-center">
          <p className="text-on-surface-variant">Loading research project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex-1 px-6 md:px-10 py-10">
        <div className="bg-error/10 border-l-4 border-error p-6">
          <p className="text-error font-headline text-xs font-bold uppercase tracking-widest">
            {error || 'Research project not found'}
          </p>
          <Link
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-surface-container-high text-on-surface font-headline text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors"
            to="/lab-research"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Lab Research
          </Link>
        </div>
      </div>
    )
  }

  const tabButtonClass = (tab) =>
    `px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest transition-colors border-b-4 ${
      activeTab === tab
        ? 'border-primary text-primary bg-surface-container-lowest'
        : 'border-transparent text-on-surface-variant hover:text-on-surface'
    }`

  return (
    <div className="flex-1 px-6 md:px-10 py-10 pb-24 md:pb-10">
      <Link
        className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-surface-container-high text-on-surface font-headline text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors"
        to="/lab-research"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Back to Lab Research
      </Link>

      <header className="bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10 mb-6">
        <p className="font-headline text-[10px] tracking-[0.25em] uppercase text-primary font-bold">
          {project.projectType === 'web' ? 'Web-Based Project' : project.projectType === 'program' ? 'Program-Based Project' : 'Research Project'}
        </p>
        <h1 className="font-headline text-3xl md:text-4xl font-black tracking-tight mt-3 uppercase">
          {project.title}
        </h1>
        {project.summary ? (
          <p className="text-sm text-on-surface-variant mt-4 max-w-3xl">{project.summary}</p>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {project.stack ? (
            <div className="bg-surface-container-high p-4">
              <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Stack Used</p>
              <p className="text-sm mt-1">{project.stack}</p>
            </div>
          ) : null}
          {project.contributors ? (
            <div className="bg-surface-container-high p-4">
              <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Persons Contributed</p>
              <p className="text-sm mt-1">{project.contributors}</p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 mt-6">
          <span className={`px-3 py-1.5 text-[10px] font-headline font-bold uppercase tracking-widest ${project.progress.quizCompleted ? 'bg-secondary/15 text-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}>
            Knowledge Check: {project.progress.quizCompleted ? 'Completed 100/100' : `${project.progress.quizScore}/100`}
          </span>
          {project.codingEnabled ? (
            <span className={`px-3 py-1.5 text-[10px] font-headline font-bold uppercase tracking-widest ${project.progress.codeAccepted ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'}`}>
              Code Lab: {project.progress.codeAccepted ? 'Accepted' : 'Pending'}
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex border-b border-outline-variant mb-6 overflow-x-auto">
        <button className={tabButtonClass(TABS.research)} onClick={() => setActiveTab(TABS.research)} type="button">
          Research
        </button>
        <button className={tabButtonClass(TABS.quiz)} onClick={() => setActiveTab(TABS.quiz)} type="button">
          AI Knowledge Check
        </button>
        {project.codingEnabled ? (
          <button className={tabButtonClass(TABS.code)} onClick={() => setActiveTab(TABS.code)} type="button">
            AI Code Lab
          </button>
        ) : null}
      </div>

      {activeTab === TABS.research ? (
        <div className="space-y-6">
          <section className="bg-surface-container-lowest border-l-4 border-secondary p-8">
            <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-4 text-secondary flex items-center gap-2">
              <span className="material-symbols-outlined">construction</span>
              How We Implemented It
            </h2>
            <ContentBlock text={project.explanation} />
          </section>
          {project.topics ? (
            <section className="bg-surface-container-lowest border-l-4 border-primary p-8">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-4 text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">school</span>
                Topics to Learn to Build This
              </h2>
              <ul className="space-y-2">
                {project.topics.split('\n').map((item) => item.trim()).filter(Boolean).map((topic, index) => (
                  <li className="flex items-start gap-3 text-sm leading-6" key={index}>
                    <span className="material-symbols-outlined text-primary text-base mt-0.5">check_circle</span>
                    {topic}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="bg-surface-container-lowest border-l-4 border-primary p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm text-on-surface-variant">
              Ready? Take the AI knowledge check — answer every question correctly to reach 100/100.
            </p>
            <button
              className="bg-primary text-on-primary px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest hover:bg-primary-container transition-colors disabled:opacity-60"
              disabled={quizLoading}
              onClick={() => handleStartQuiz()}
              type="button"
            >
              {quizLoading ? 'Preparing Questions...' : project.progress.quizCompleted ? 'Review Knowledge Check' : 'Start Knowledge Check'}
            </button>
          </div>
        </div>
      ) : null}

      {activeTab === TABS.quiz ? (
        <div className="space-y-6">
          {quizError ? (
            <div className="bg-error/10 border-l-4 border-error p-4">
              <p className="text-error font-headline text-xs font-bold uppercase tracking-widest">{quizError}</p>
            </div>
          ) : null}

          {project.progress.quizCompleted && !attempt ? (
            <div className="bg-secondary/10 border-l-4 border-secondary p-6">
              <p className="font-headline text-sm font-bold uppercase tracking-widest text-secondary">
                Knowledge check completed — 100/100
              </p>
              <p className="text-sm text-on-surface-variant mt-2">
                You have already proven your understanding of this project.
              </p>
            </div>
          ) : null}

          {!attempt ? (
            <div className="bg-surface-container-lowest border-l-4 border-primary p-8 text-center">
              <p className="font-headline text-lg font-bold uppercase">AI Knowledge Check</p>
              <p className="text-sm text-on-surface-variant mt-2 max-w-xl mx-auto">
                The AI will generate questions from this project&apos;s research write-up. Answer every question correctly to score 100
                and mark this project as completed. You can retry incorrect answers.
              </p>
              <button
                className="mt-6 bg-primary text-on-primary px-8 py-3 font-headline text-xs font-bold uppercase tracking-widest hover:bg-primary-container transition-colors disabled:opacity-60"
                disabled={quizLoading}
                onClick={() => handleStartQuiz()}
                type="button"
              >
                {quizLoading ? 'Preparing Questions...' : 'Start Knowledge Check'}
              </button>
            </div>
          ) : (
            <>
              <div className="bg-surface-container-lowest border-l-4 border-primary p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="font-headline text-sm font-bold uppercase tracking-widest">
                    Score: {attempt.score}/100 · {attempt.correctCount}/{attempt.totalQuestions} correct
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {attempt.status === 'completed'
                      ? 'Completed — every answer was correct.'
                      : 'Answer every question correctly to reach 100. Incorrect answers can be retried.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {attempt.status === 'completed' ? (
                    <span className="px-4 py-2 bg-secondary/15 text-secondary font-headline text-xs font-bold uppercase tracking-widest">
                      Completed
                    </span>
                  ) : null}
                  <button
                    className="px-4 py-2 bg-surface-container-high text-on-surface font-headline text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors disabled:opacity-60"
                    disabled={quizLoading}
                    onClick={() => handleStartQuiz({ restart: true })}
                    type="button"
                  >
                    {quizLoading ? 'Generating...' : 'New Question Set'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {attempt.questions.map((question) => (
                  <div
                    className={`bg-surface-container-lowest border-l-4 p-6 ${question.isCorrect ? 'border-secondary' : question.answered ? 'border-error' : 'border-outline-variant'}`}
                    key={question.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                        Question {question.position}
                      </p>
                      {question.answered ? (
                        <span className={`px-2 py-1 text-[10px] font-headline font-bold uppercase tracking-widest ${question.isCorrect ? 'bg-secondary/15 text-secondary' : 'bg-error/15 text-error'}`}>
                          {question.isCorrect ? 'Correct' : 'Incorrect — retry'}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm leading-7 mt-3">{question.prompt}</p>

                    {question.isCorrect ? (
                      <div className="mt-4 bg-surface-container-high p-4">
                        <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">Your Answer</p>
                        <p className="text-sm whitespace-pre-line">{question.answer}</p>
                        {question.feedback ? (
                          <p className="text-xs text-on-surface-variant mt-3">{question.feedback}</p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {question.answered && question.feedback ? (
                          <div className="bg-error/10 p-4">
                            <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-error mb-1">AI Feedback</p>
                            <p className="text-sm">{question.feedback}</p>
                          </div>
                        ) : null}
                        <textarea
                          className="w-full bg-surface-container-highest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 focus:ring-0 font-body text-sm py-3 px-4 outline-none min-h-[110px]"
                          onChange={(event) =>
                            setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                          }
                          placeholder="Write your answer based on the research write-up..."
                          value={answers[question.id] ?? question.answer ?? ''}
                        />
                        <button
                          className="bg-primary text-on-primary px-6 py-2.5 font-headline text-xs font-bold uppercase tracking-widest hover:bg-primary-container transition-colors disabled:opacity-60"
                          disabled={submittingQuestionId === question.id || attempt.status === 'completed'}
                          onClick={() => handleAnswerSubmit(question)}
                          type="button"
                        >
                          {submittingQuestionId === question.id ? 'AI Evaluating...' : question.answered ? 'Retry Answer' : 'Submit Answer'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      {activeTab === TABS.code && project.codingEnabled ? (
        <div className="space-y-6">
          {codeError ? (
            <div className="bg-error/10 border-l-4 border-error p-4">
              <p className="text-error font-headline text-xs font-bold uppercase tracking-widest">{codeError}</p>
            </div>
          ) : null}

          {!challenge ? (
            <div className="bg-surface-container-lowest border-l-4 border-primary p-8 text-center">
              <p className="font-headline text-lg font-bold uppercase">AI Code Lab</p>
              <p className="text-sm text-on-surface-variant mt-2 max-w-xl mx-auto">
                The AI will generate a coding scenario based on this project. Implement the solution and pass every test case to get it accepted.
              </p>
              <button
                className="mt-6 bg-primary text-on-primary px-8 py-3 font-headline text-xs font-bold uppercase tracking-widest hover:bg-primary-container transition-colors disabled:opacity-60"
                disabled={codeLoading}
                onClick={() => handleLoadChallenge()}
                type="button"
              >
                {codeLoading ? 'Generating Scenario...' : 'Generate Coding Scenario'}
              </button>
            </div>
          ) : (
            <>
              <section className="bg-surface-container-lowest border-l-4 border-secondary p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="font-headline text-xl font-bold uppercase tracking-tight text-secondary flex items-center gap-2">
                    <span className="material-symbols-outlined">terminal</span>
                    Scenario
                  </h2>
                  <div className="flex gap-2 shrink-0">
                    <span className="px-2 py-1 text-[10px] font-headline font-bold uppercase tracking-widest bg-surface-container-high text-on-surface-variant">
                      {challenge.language}
                    </span>
                    {challenge.status === 'accepted' ? (
                      <span className="px-2 py-1 text-[10px] font-headline font-bold uppercase tracking-widest bg-secondary/15 text-secondary">
                        Accepted
                      </span>
                    ) : (
                      <button
                        className="px-3 py-1 bg-surface-container-high text-on-surface font-headline text-[10px] font-bold uppercase tracking-widest hover:text-primary transition-colors disabled:opacity-60"
                        disabled={codeLoading}
                        onClick={() => handleLoadChallenge({ regenerate: true })}
                        type="button"
                      >
                        {codeLoading ? 'Generating...' : 'New Scenario'}
                      </button>
                    )}
                  </div>
                </div>
                <ContentBlock text={challenge.scenario} />
                {challenge.testCases.length ? (
                  <div className="mt-6 overflow-x-auto">
                    <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                      Test Cases ({challenge.testCases.length}) — all must pass
                    </p>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant">
                          <th className="py-2 pr-4">#</th>
                          <th className="py-2 pr-4">Input</th>
                          <th className="py-2 pr-4">Expected Output</th>
                          <th className="py-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {challenge.testCases.map((testCase) => (
                          <tr className="border-b border-outline-variant/40 align-top" key={testCase.index}>
                            <td className="py-2 pr-4">{testCase.index}</td>
                            <td className="py-2 pr-4 font-mono whitespace-pre-wrap break-all">{testCase.input}</td>
                            <td className="py-2 pr-4 font-mono whitespace-pre-wrap break-all">{testCase.expectedOutput}</td>
                            <td className="py-2 text-on-surface-variant">{testCase.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>

              <section className="bg-surface-container-lowest border-l-4 border-primary p-8">
                <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-4 text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">code</span>
                  Code Editor
                </h2>
                <textarea
                  className="w-full bg-[#0d1117] text-[#e6edf3] font-mono text-sm leading-6 p-4 min-h-[320px] outline-none border border-outline-variant focus:border-primary resize-y"
                  disabled={challenge.status === 'accepted'}
                  onChange={(event) => setCode(event.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  spellCheck={false}
                  value={code}
                />
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4">
                  <p className="text-xs text-on-surface-variant">
                    Implement solve(input) exactly as the scenario describes. The AI judge runs your code against every test case.
                  </p>
                  <button
                    className="bg-primary text-on-primary px-8 py-3 font-headline text-xs font-bold uppercase tracking-widest hover:bg-primary-container transition-colors disabled:opacity-60"
                    disabled={submittingCode || challenge.status === 'accepted'}
                    onClick={handleCodeSubmit}
                    type="button"
                  >
                    {submittingCode ? 'AI Judging...' : challenge.status === 'accepted' ? 'Accepted' : 'Submit Solution'}
                  </button>
                </div>
              </section>

              {submission ? (
                <section className={`bg-surface-container-lowest border-l-4 p-8 ${submission.accepted ? 'border-secondary' : 'border-error'}`}>
                  <h2 className={`font-headline text-xl font-bold uppercase tracking-tight mb-4 flex items-center gap-2 ${submission.accepted ? 'text-secondary' : 'text-error'}`}>
                    <span className="material-symbols-outlined">{submission.accepted ? 'verified' : 'report'}</span>
                    {submission.accepted ? 'Accepted — All Test Cases Passed' : 'Not Accepted'}
                  </h2>
                  {submission.feedback ? (
                    <p className="text-sm mb-4">{submission.feedback}</p>
                  ) : null}
                  <div className="space-y-2">
                    {(submission.results || []).map((result) => (
                      <div
                        className={`p-4 flex flex-col gap-1 ${result.passed ? 'bg-secondary/10' : 'bg-error/10'}`}
                        key={result.index}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-base ${result.passed ? 'text-secondary' : 'text-error'}`}>
                            {result.passed ? 'check_circle' : 'cancel'}
                          </span>
                          <p className="font-headline text-xs font-bold uppercase tracking-widest">
                            Test {result.index}: {result.passed ? 'Passed' : 'Failed'}
                          </p>
                        </div>
                        {result.description ? (
                          <p className="text-xs text-on-surface-variant">{result.description}</p>
                        ) : null}
                        {!result.passed && result.detail ? (
                          <p className="text-xs">{result.detail}</p>
                        ) : null}
                        {!result.passed && result.actualOutput ? (
                          <p className="text-xs font-mono">Got: {result.actualOutput}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default LabResearchProjectPage
