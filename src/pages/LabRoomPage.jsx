import { useEffect, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { getRoomsData } from '../data/roomsData'
import { API_BASE_URL, apiFetch, getAuthToken } from '../services/api'
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

function hasContent(value) {
  return Boolean(String(value || '').trim())
}

function normalizeRoomType(value) {
  return String(value || 'theoretical').toLowerCase() === 'practical'
    ? 'practical'
    : 'theoretical'
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  }
  return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
}

function blockClipboardInput(event) {
  event.preventDefault()
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
  const [labStatus, setLabStatus] = useState('in-progress')
  const [questionStatus, setQuestionStatus] = useState({
    enabled: false,
    total: 0,
    correct: 0,
    allCorrect: true,
    mode: 'practical',
    technicalScore: 0,
    grammarScore: 0,
    bonusScore: 0,
    feedback: '',
    questions: [],
  })
  const [questionAnswers, setQuestionAnswers] = useState({})
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [isSubmittingQuestions, setIsSubmittingQuestions] = useState(false)
  const [questionFeedback, setQuestionFeedback] = useState('')
  const [resultModal, setResultModal] = useState(null)
  const [completionError, setCompletionError] = useState('')
  const [dockerStatus, setDockerStatus] = useState({
    enabled: false,
    running: false,
    access: null,
    instructions: '',
    expired: false,
  })
  const [dockerNow, setDockerNow] = useState(Date.now())
  const [isDockerWorking, setIsDockerWorking] = useState(false)
  const [dockerError, setDockerError] = useState('')
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)
  const contentRootRef = useRef(null)
  const xtermHostRef = useRef(null)
  const xtermRef = useRef(null)
  const terminalSocketRef = useRef(null)
  const roomId = room?.id || ''
  const roomDocker = room?.content?.docker || {}
  const roomType = normalizeRoomType(room?.roomType)
  const questionsEnabled =
    roomType !== 'practical' ||
    Boolean(room?.content?.questionsEnabled || room?.content?.aiQuestionsEnabled)

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

  useEffect(() => {
    if (!roomId) {
      return
    }

    markLabStarted(roomId)
    setLabStatus(getLabStatus(roomId))
  }, [roomId])

  useEffect(() => {
    let cancelled = false

    const loadQuestionStatus = async () => {
      if (!roomId) {
        if (!cancelled) {
          setIsLoadingQuestions(false)
          setQuestionStatus({
            enabled: false,
            mode: 'practical',
            total: 0,
            correct: 0,
            allCorrect: true,
            technicalScore: 0,
            grammarScore: 0,
            bonusScore: 0,
            feedback: '',
            questions: [],
          })
        }
        return
      }

      if (!questionsEnabled) {
        if (!cancelled) {
          setIsLoadingQuestions(false)
          setQuestionStatus({
            enabled: false,
            mode: 'practical',
            total: 0,
            correct: 0,
            allCorrect: true,
            technicalScore: 0,
            grammarScore: 0,
            bonusScore: 0,
            feedback: '',
            questions: [],
          })
        }
        return
      }

      try {
        setIsLoadingQuestions(true)
        const response = await apiFetch(`/rooms/${encodeURIComponent(roomId)}/questions/status`)
        if (!cancelled) {
          setQuestionStatus({
            enabled: Boolean(response?.enabled),
            mode: response?.mode || 'practical',
            total: Number(response?.total || 0),
            correct: Number(response?.correct || 0),
            allCorrect: Boolean(response?.allCorrect),
            technicalScore: Number(response?.technicalScore || 0),
            grammarScore: Number(response?.grammarScore || 0),
            bonusScore: Number(response?.bonusScore || 0),
            feedback: response?.feedback || '',
            questions: Array.isArray(response?.questions) ? response.questions : [],
          })
          if (response?.answers && typeof response.answers === 'object') {
            setQuestionAnswers(response.answers)
          }
        }
      } catch (error) {
        if (!cancelled) {
          setQuestionFeedback(error?.message || 'Failed to load question status.')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingQuestions(false)
        }
      }
    }

    void loadQuestionStatus()

    return () => {
      cancelled = true
    }
  }, [roomId, questionsEnabled])

  useEffect(() => {
    let cancelled = false

    const loadDockerStatus = async () => {
      if (!roomId || !roomDocker.enabled) {
        if (!cancelled) {
          setDockerStatus({
            enabled: false,
            running: false,
            access: null,
            instructions: '',
            expired: false,
          })
          setDockerError('')
        }
        return
      }

      try {
        const response = await apiFetch(`/rooms/${encodeURIComponent(roomId)}/docker/status`)
        if (!cancelled) {
          setDockerStatus({
            enabled: Boolean(response?.enabled),
            running: Boolean(response?.running),
            access: response?.access || null,
            containerPort: response?.containerPort || roomDocker.containerPort || '',
            hostPort: response?.hostPort || response?.access?.port || '',
            instructions: response?.instructions || roomDocker.instructions || '',
            timeoutMinutes: response?.timeoutMinutes || roomDocker.timeoutMinutes || 120,
            createdAt: response?.createdAt || null,
            expiresAt: response?.expiresAt || null,
            expired: Boolean(response?.expired),
          })
          setDockerError('')
        }
      } catch (error) {
        if (!cancelled) {
          setDockerError(error?.message || 'Unable to load Docker service status.')
        }
      }
    }

    void loadDockerStatus()

    return () => {
      cancelled = true
    }
  }, [
    roomId,
    roomDocker.containerPort,
    roomDocker.enabled,
    roomDocker.instructions,
    roomDocker.timeoutMinutes,
  ])

  useEffect(() => {
    if (!dockerStatus.running || !dockerStatus.expiresAt) {
      return undefined
    }

    const expiresAt = new Date(dockerStatus.expiresAt).getTime()
    const refreshDockerTime = () => {
      const now = Date.now()
      setDockerNow(now)
      if (expiresAt && now >= expiresAt) {
        setDockerStatus((current) => {
          if (!current.running || current.expiresAt !== dockerStatus.expiresAt) {
            return current
          }
          return {
            ...current,
            running: false,
            access: null,
            hostPort: '',
            expired: true,
          }
        })
        setDockerError('')
      }
    }

    refreshDockerTime()
    const intervalId = window.setInterval(() => {
      refreshDockerTime()
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [dockerStatus.expiresAt, dockerStatus.running])

  useEffect(() => {
    const root = contentRootRef.current
    if (!root) {
      return undefined
    }

    const cleanupHandlers = []
    const codeBlocks = root.querySelectorAll('pre')

    codeBlocks.forEach((block) => {
      if (block.querySelector('[data-copy-code]')) {
        return
      }

      block.classList.add('relative', 'group')
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset.copyCode = 'true'
      button.className =
        'absolute right-3 top-3 bg-surface-container-lowest border border-outline-variant/40 px-3 py-1.5 font-headline text-[9px] font-bold uppercase tracking-widest text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary'
      button.textContent = 'Copy'

      const handleClick = async () => {
        const code = block.querySelector('code')?.textContent || block.textContent || ''
        try {
          await navigator.clipboard.writeText(code)
          button.textContent = 'Copied'
          window.setTimeout(() => {
            button.textContent = 'Copy'
          }, 1200)
        } catch {
          button.textContent = 'Failed'
          window.setTimeout(() => {
            button.textContent = 'Copy'
          }, 1200)
        }
      }

      button.addEventListener('click', handleClick)
      block.appendChild(button)
      cleanupHandlers.push(() => {
        button.removeEventListener('click', handleClick)
        button.remove()
      })
    })

    return () => {
      cleanupHandlers.forEach((cleanup) => cleanup())
    }
  }, [roomId, room?.content])

  useEffect(() => {
    const dockerExpiresAtForTerminal = dockerStatus.expiresAt ? new Date(dockerStatus.expiresAt).getTime() : 0
    const dockerRemainingMsForTerminal = dockerStatus.running && dockerExpiresAtForTerminal
      ? Math.max(0, dockerExpiresAtForTerminal - Date.now())
      : 0
    const terminalServiceActive = dockerStatus.running && (!dockerExpiresAtForTerminal || dockerRemainingMsForTerminal > 0)

    if (!isTerminalOpen || !terminalServiceActive || !xtermHostRef.current || xtermRef.current) {
      return undefined
    }

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 14,
      rows: 28,
      theme: {
        background: '#020405',
        foreground: '#d7f7ff',
        cursor: '#66d9ef',
        selectionBackground: '#2b3f4a',
        black: '#020405',
        red: '#ff6670',
        green: '#78d97b',
        yellow: '#f7d66b',
        blue: '#66d9ef',
        magenta: '#ff7aa8',
        cyan: '#66d9ef',
        white: '#d7f7ff',
      },
    })
    terminal.open(xtermHostRef.current)
    const refocusTerminal = () => window.setTimeout(() => terminal.focus(), 0)
    terminal.writeln('Welcome to Incognitrix Academy')
    terminal.writeln('Opening interactive sandbox shell...')
    refocusTerminal()
    xtermRef.current = terminal

    const token = encodeURIComponent(getAuthToken())
    const wsBaseUrl = API_BASE_URL.replace(/^http/i, 'ws').replace(/\/api$/, '')
    const socket = new WebSocket(`${wsBaseUrl}/api/rooms/${encodeURIComponent(roomId)}/docker/terminal/ws?token=${token}`)
    terminalSocketRef.current = socket

    const inputDisposable = terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input', data: btoa(data) }))
      }
    })

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(String(event.data || '{}'))
        if (payload.type === 'output') {
          terminal.write(atob(payload.data || ''))
          refocusTerminal()
        } else if (payload.type === 'ready') {
          terminal.writeln('')
          terminal.writeln(`Connected. Workdir: ${payload.cwd || '/'}`)
          refocusTerminal()
        } else if (payload.type === 'error') {
          terminal.writeln('')
          terminal.writeln(`\x1b[31m${payload.message || 'Terminal error.'}\x1b[0m`)
          refocusTerminal()
        } else if (payload.type === 'exit') {
          terminal.writeln('')
          terminal.writeln(`\x1b[33mTerminal session closed (${payload.code ?? 0}).\x1b[0m`)
          refocusTerminal()
        }
      } catch {
        terminal.write(String(event.data || ''))
        refocusTerminal()
      }
    })

    socket.addEventListener('close', () => {
      terminal.writeln('')
      terminal.writeln('\x1b[33mDisconnected from sandbox terminal.\x1b[0m')
      refocusTerminal()
    })

    socket.addEventListener('error', () => {
      terminal.writeln('')
      terminal.writeln('\x1b[31mUnable to connect to sandbox terminal.\x1b[0m')
      refocusTerminal()
    })

    return () => {
      inputDisposable.dispose()
      socket.close()
      terminal.dispose()
      xtermRef.current = null
      terminalSocketRef.current = null
    }
  }, [dockerStatus.expiresAt, dockerStatus.running, isTerminalOpen, roomId])

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

  const primaryMarkdown = room.content?.markdown || ''
  const missionOverview = hasContent(primaryMarkdown)
    ? primaryMarkdown
    : room.content?.missionOverview || room.description
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
  const missionOverviewMarkup = hasContent(primaryMarkdown)
    ? parseMarkdownToHtml(missionOverview)
    : renderRichContent(missionOverview, room.content?.html)
  const remediationProtocolsMarkup = renderRichContent(remediationProtocols)
  const technicalDeepDiveMarkup = renderRichContent(technicalDeepDive)
  const vulnerabilityDefinitionMarkup = renderRichContent(vulnerabilityDefinition)
  const vulnerabilityImpactMarkup = renderRichContent(vulnerabilityImpact)
  const youtubeEmbedUrl = toYouTubeEmbedUrl(room.content?.youtubeVideoUrl)
  const roomAttachment = room.content?.attachment
  const isAiQuestionMode = questionStatus.mode === 'theoretical' || questionStatus.mode === 'hybrid'
  const isPreparingTheoreticalQuestions =
    isLoadingQuestions && questionsEnabled && (roomType === 'theoretical' || Boolean(room.content?.aiQuestionsEnabled))
  const requiredAssessmentQuestions = questionStatus.questions.filter((question) => !question.bonus && !question.optional)
  const bonusAssessmentQuestions = questionStatus.questions.filter((question) => question.bonus || question.optional)
  const isAiEvaluatingAnswers = isSubmittingQuestions && isAiQuestionMode
  const dockerExpiresAt = dockerStatus.expiresAt ? new Date(dockerStatus.expiresAt).getTime() : 0
  const dockerRemainingMs = dockerStatus.running && dockerExpiresAt ? Math.max(0, dockerExpiresAt - dockerNow) : 0
  const isDockerServiceActive = dockerStatus.running && (!dockerExpiresAt || dockerRemainingMs > 0)
  const dockerRemainingPercent =
    isDockerServiceActive && dockerStatus.expiresAt
      ? Math.max(
          0,
          Math.min(
            100,
            (dockerRemainingMs / ((dockerStatus.timeoutMinutes || 120) * 60 * 1000)) * 100,
          ),
        )
      : 0

  const handleMarkComplete = async () => {
    setCompletionError('')

    if (isPreparingTheoreticalQuestions) {
      setCompletionError('AI is preparing your theoretical questions. Complete the assessment before marking this room complete.')
      return
    }

    if (questionStatus.enabled && !questionStatus.allCorrect) {
      setCompletionError(
        isAiQuestionMode
          ? 'Score 100 in the technical evaluation before marking complete.'
          : 'Answer all room questions correctly before marking complete.',
      )
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

  const handleSpawnDocker = async () => {
    setDockerError('')
    setIsDockerWorking(true)
    try {
      const response = await apiFetch(`/rooms/${encodeURIComponent(room.id)}/docker/spawn`, {
        method: 'POST',
      })
      setDockerStatus({
        enabled: Boolean(response?.enabled),
        running: Boolean(response?.running),
        access: response?.access || null,
        containerPort: response?.containerPort || room.content?.docker?.containerPort || '',
        hostPort: response?.hostPort || response?.access?.port || '',
        instructions: response?.instructions || room.content?.docker?.instructions || '',
        timeoutMinutes: response?.timeoutMinutes || room.content?.docker?.timeoutMinutes || 120,
        createdAt: response?.createdAt || null,
        expiresAt: response?.expiresAt || null,
        expired: false,
      })
    } catch (error) {
      setDockerError(error?.message || 'Unable to spawn Docker service.')
    } finally {
      setIsDockerWorking(false)
    }
  }

  const handleRevertDocker = async () => {
    setDockerError('')
    setIsDockerWorking(true)
    try {
      const response = await apiFetch(`/rooms/${encodeURIComponent(room.id)}/docker/spawn`, {
        method: 'POST',
        body: JSON.stringify({ revert: true }),
      })
      setDockerStatus({
        enabled: Boolean(response?.enabled),
        running: Boolean(response?.running),
        access: response?.access || null,
        containerPort: response?.containerPort || room.content?.docker?.containerPort || '',
        hostPort: response?.hostPort || response?.access?.port || '',
        instructions: response?.instructions || room.content?.docker?.instructions || '',
        timeoutMinutes: response?.timeoutMinutes || room.content?.docker?.timeoutMinutes || 120,
        createdAt: response?.createdAt || null,
        expiresAt: response?.expiresAt || null,
        expired: false,
      })
    } catch (error) {
      setDockerError(error?.message || 'Unable to revert Docker service.')
    } finally {
      setIsDockerWorking(false)
    }
  }

  const handleStopDocker = async () => {
    setDockerError('')
    setIsDockerWorking(true)
    try {
      await apiFetch(`/rooms/${encodeURIComponent(room.id)}/docker/stop`, {
        method: 'POST',
      })
      setDockerStatus((current) => ({
        ...current,
        running: false,
        access: null,
        hostPort: '',
        expiresAt: null,
        expired: false,
      }))
    } catch (error) {
      setDockerError(error?.message || 'Unable to stop Docker service.')
    } finally {
      setIsDockerWorking(false)
    }
  }

  const handleSubmitQuestions = async () => {
    setQuestionFeedback('')
    setIsSubmittingQuestions(true)

    try {
      const result = await apiFetch(`/rooms/${encodeURIComponent(room.id)}/questions/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: questionAnswers }),
      })
      const resultMode = result?.mode || questionStatus.mode || 'practical'
      const passed = Boolean(result?.allCorrect)
      const technicalScore = Number(result?.technicalScore || 0)
      const grammarScore = Number(result?.grammarScore || 0)
      const bonusScore = Number(result?.bonusScore || 0)
      const correct = Number(result?.correct || 0)
      const total = Number(result?.total || questionStatus.total || 0)

      setQuestionStatus((prev) => ({
        ...prev,
        correct,
        total,
        allCorrect: passed,
        technicalScore: technicalScore || prev.technicalScore || 0,
        grammarScore: grammarScore || prev.grammarScore || 0,
        bonusScore,
        feedback: result?.feedback || prev.feedback || '',
        questions: Array.isArray(result?.questions) && result.questions.length
          ? result.questions
          : prev.questions,
      }))

      if (result?.answers && typeof result.answers === 'object') {
        setQuestionAnswers(result.answers)
      } else if (!passed && Array.isArray(result?.questions) && result.questions.length) {
        setQuestionAnswers({})
      }

      setResultModal({
        mode: resultMode,
        passed,
        technicalScore,
        grammarScore,
        bonusScore,
        correct,
        total,
        feedback: result?.feedback || '',
      })

      if (passed) {
        if (resultMode === 'theoretical') {
          await markLabCompleted(room.id)
          setLabStatus('completed')
        }
        setQuestionFeedback(
          resultMode === 'theoretical'
            ? 'Technical score is 100. This room has been completed.'
            : resultMode === 'hybrid'
              ? 'Manual and AI checks passed. You can now complete this room.'
            : 'All answers are correct. You can now complete this room.',
        )
      } else {
        setQuestionFeedback(
          resultMode === 'theoretical' || resultMode === 'hybrid'
            ? `Technical: ${technicalScore} / Grammar: ${grammarScore}. ${result?.feedback || 'Review and try again.'}`
            : 'Some answers are incorrect. Review and try again.',
        )
      }
    } catch (error) {
      setQuestionFeedback(error?.message || 'Unable to submit answers right now.')
    } finally {
      setIsSubmittingQuestions(false)
    }
  }

  return (
    <main className="pt-16 md:pt-20 min-h-screen">
      {isAiEvaluatingAnswers ? (
        <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/40 shadow-2xl">
            <div className="h-1 bg-primary"></div>
            <div className="p-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-4xl animate-pulse">
                  psychology
                </span>
              </div>
              <p className="font-label text-[10px] uppercase tracking-[0.25em] text-primary font-bold">
                AI Evaluation
              </p>
              <h2 className="mt-3 font-headline text-2xl font-black uppercase tracking-tight text-on-background">
                Reviewing Your Answers
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
                AI is checking your required answers, optional interview bonus, grammar, and improvement areas.
              </p>
              <div className="mt-6 h-1.5 overflow-hidden bg-surface-container-high">
                <div className="h-full w-2/3 bg-primary animate-pulse"></div>
              </div>
              <p className="mt-4 font-headline text-[10px] uppercase tracking-widest text-on-surface-variant">
                Please keep this room open
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {resultModal ? (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-6">
          <div className="my-6 w-full max-w-lg max-h-[calc(100vh-3rem)] bg-surface-container-lowest border border-outline-variant/40 shadow-2xl flex flex-col">
            <div className={`h-1 ${resultModal.passed ? 'bg-secondary' : 'bg-primary'}`}></div>
            <div className="p-8 overflow-y-auto">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="font-label text-[10px] uppercase tracking-[0.25em] text-primary font-bold">
                    Evaluation Result
                  </span>
                  <h2 className="font-headline text-3xl font-black uppercase tracking-tight mt-2 text-on-background">
                    {resultModal.passed ? 'Passed' : 'Not Passed'}
                  </h2>
                </div>
                <button
                  className="inline-flex items-center justify-center h-10 w-10 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  onClick={() => setResultModal(null)}
                  type="button"
                  aria-label="Close result"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {resultModal.mode === 'theoretical' || resultModal.mode === 'hybrid' ? (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-surface-container-low p-5">
                    <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">
                      Technical
                    </p>
                    <p className="font-space text-4xl font-black text-primary">
                      {resultModal.technicalScore}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-2">Required: 100</p>
                  </div>
                  <div className="bg-surface-container-low p-5">
                    <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">
                      Grammar
                    </p>
                    <p className="font-space text-4xl font-black text-secondary">
                      {resultModal.grammarScore}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-2">Writing quality</p>
                  </div>
                  <div className="col-span-2 bg-surface-container-low p-4">
                    <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                      Interview Bonus
                    </p>
                    <p className="font-space text-2xl font-black text-secondary">
                      +{resultModal.bonusScore || 0}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">Optional margin, up to 10</p>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-container-low p-5 mb-6">
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">
                    Correct Answers
                  </p>
                  <p className="font-space text-4xl font-black text-primary">
                    {resultModal.correct}/{resultModal.total}
                  </p>
                </div>
              )}

              <p className="text-sm text-on-surface-variant leading-relaxed mb-6 whitespace-pre-wrap break-words">
                {resultModal.feedback ||
                  (resultModal.passed
                    ? 'You met the completion requirement for this room.'
                    : resultModal.mode === 'theoretical' || resultModal.mode === 'hybrid'
                      ? 'Improve the technical accuracy of your answers and submit again.'
                      : 'Review the incorrect answers and submit again.')}
              </p>

              <button
                className="w-full py-3 bg-primary text-on-primary font-headline text-[10px] font-bold tracking-widest uppercase hover:bg-primary-container transition-colors"
                onClick={() => setResultModal(null)}
                type="button"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div ref={contentRootRef} className="max-w-[96rem] mx-auto p-8 lg:p-12">
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
          <div className="lg:col-span-8 space-y-12">
            <section className="bg-surface-container-lowest p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 -rotate-45 translate-x-16 -translate-y-16"></div>
              <h2 className="font-headline text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="text-primary">01</span> MISSION_OVERVIEW
              </h2>
              <div
                className="space-y-4 text-on-surface font-body leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mt-7 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1.5 [&_pre]:bg-surface-container-high [&_pre]:border [&_pre]:border-outline-variant/30 [&_pre]:p-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:my-5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:bg-surface-container-highest [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_a]:text-primary [&_a]:underline [&_hr]:my-6 [&_hr]:border-outline-variant/40 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:bg-surface-container-low [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:my-5 [&_th]:text-left [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-widest [&_th]:font-headline [&_th]:bg-surface-container-high [&_th]:p-3 [&_th]:border [&_th]:border-outline-variant/30 [&_td]:p-3 [&_td]:border [&_td]:border-outline-variant/30"
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
                  className="font-body leading-relaxed text-on-surface [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:pb-2 [&_h1]:border-b [&_h1]:border-outline-variant/30 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-outline-variant/30 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1.5 [&_pre]:bg-on-surface/5 [&_pre]:p-4 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_pre]:my-4 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:bg-on-surface/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary-container transition-colors [&_blockquote]:border-l-4 [&_blockquote]:border-on-surface-variant/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4"
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

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-secondary text-on-secondary p-8">
              <h2 className="font-headline text-xl font-bold mb-6 flex items-center gap-3 uppercase tracking-tight">
                <span className="material-symbols-outlined">shield_with_heart</span>{' '}
                Remediation_Protocols
              </h2>
              <div
                className="font-body text-sm leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1.5 [&_pre]:bg-black/20 [&_pre]:border [&_pre]:border-white/10 [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:my-4 [&_code]:font-mono [&_code]:bg-black/20 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_blockquote]:border-l-4 [&_blockquote]:border-white/25 [&_blockquote]:pl-3 [&_blockquote]:my-3"
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
                <div>
                  <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                    Room Type
                  </p>
                  <p className="font-headline font-bold text-lg">{roomType.toUpperCase()}</p>
                </div>
              </div>
              {roomAttachment?.dataUrl ? (
                <a
                  className="mb-8 flex items-center justify-between gap-4 bg-surface-container-high p-4 border-l-2 border-l-secondary hover:bg-surface-container-highest transition-colors"
                  download={roomAttachment.name || 'lab-file'}
                  href={roomAttachment.dataUrl}
                >
                  <span>
                    <span className="block font-headline text-[10px] font-bold uppercase tracking-widest text-secondary">
                      Lab File
                    </span>
                    <span className="mt-1 block text-sm text-on-surface">
                      {roomAttachment.name || 'Download attachment'}
                    </span>
                    <span className="mt-1 block text-[10px] text-on-surface-variant">
                      {Math.ceil(Number(roomAttachment.size || 0) / 1024)} KB
                    </span>
                  </span>
                  <span className="material-symbols-outlined text-secondary">download</span>
                </a>
              ) : null}
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
              <button
                className="w-full group relative bg-primary hover:bg-primary-container text-on-primary p-6 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!room.content?.docker?.enabled}
                onClick={() => setIsTerminalOpen((current) => !current)}
                type="button"
              >
                <div className="flex justify-between items-center">
                  <span className="font-headline text-xl font-bold uppercase tracking-tighter italic">
                    Access Terminal
                  </span>
                  <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">
                    {isTerminalOpen ? 'keyboard_arrow_up' : 'arrow_forward'}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full"></div>
              </button>
              <p className="text-[10px] font-headline text-on-surface-variant text-center tracking-[0.15em] uppercase">
                Ready for deployment? Ensure secure connection protocols are
                active.
              </p>

              {isTerminalOpen ? (
                <div className="fixed inset-0 z-[120] bg-[#050607] text-[#d7f7ff]">
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-[#24313a] bg-[#10161a] px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full bg-primary"></span>
                        <span className="h-3 w-3 rounded-full bg-secondary"></span>
                        <span className="h-3 w-3 rounded-full bg-outline-variant"></span>
                        <div className="ml-3">
                          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.35em] text-primary">
                            Browser Terminal
                          </p>
                          <h3 className="font-headline text-xl font-black uppercase tracking-tight text-on-background">
                            Sandbox Shell
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-headline text-[10px] font-bold uppercase tracking-widest ${isDockerServiceActive ? 'text-secondary' : 'text-primary'}`}>
                          {isDockerServiceActive ? 'Ready' : 'Spawn Required'}
                        </span>
                        <button
                          className="grid h-10 w-10 place-items-center border border-outline-variant text-on-background hover:border-primary hover:text-primary"
                          onClick={() => setIsTerminalOpen(false)}
                          type="button"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border border-[#233039] bg-[#0b0f12] px-4 py-3">
                        <p className="font-space text-xs text-[#9ed8e8]">
                          Commands run inside your personal challenge sandbox. Uploaded files appear in /challenge only when enabled by admin.
                        </p>
                        {dockerStatus.access?.url && isDockerServiceActive ? (
                          <p className="font-space text-xs text-secondary">
                            target: {dockerStatus.access.url}
                          </p>
                        ) : null}
                        <p className="font-space text-xs text-[#9ed8e8]">
                          mode: interactive shell
                        </p>
                      </div>

                      <div className="min-h-0 flex-1 overflow-hidden border border-[#26343d] bg-[#020405] p-3 shadow-[inset_0_0_40px_rgba(0,0,0,0.7)]">
                        {isDockerServiceActive ? (
                          <div
                            className="h-full w-full [&_.xterm]:h-full [&_.xterm-viewport]:!bg-[#020405]"
                            onClick={() => xtermRef.current?.focus()}
                            ref={xtermHostRef}
                          ></div>
                        ) : (
                          <div className="space-y-3 p-5 font-space text-sm text-[#9ed8e8]">
                            <pre className="whitespace-pre-wrap text-secondary">
{`Welcome to Incognitrix Academy
Interactive sandbox terminal waiting for Docker spawn.`}
                            </pre>
                            <p>Spawn the Docker service, then open terminal access for a real interactive shell.</p>
                            <p>Admin-prepared tools and /challenge file access are applied before the shell opens.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {room.content?.docker?.enabled ? (
                <div className="bg-surface-container-low p-5 border-l-2 border-l-secondary">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-secondary">
                        Docker Service
                      </p>
                      <h3 className="mt-2 font-headline text-lg font-black uppercase tracking-tight">
                        {isDockerServiceActive ? 'Service Running' : 'Spawn Target'}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                        Personal lab machine with isolated runtime access.
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                        Auto cleanup: {dockerStatus.timeoutMinutes || room.content.docker.timeoutMinutes || 120} minutes
                      </p>
                      {isDockerServiceActive && dockerStatus.hostPort ? (
                        <p className="mt-1 text-xs leading-relaxed text-secondary">
                          Assigned player port: {dockerStatus.hostPort}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                          Player port: assigned randomly on spawn
                        </p>
                      )}
                      {isDockerServiceActive && dockerStatus.expiresAt ? (
                        <div className="mt-3 max-w-xs">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-headline text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                              Time Remaining
                            </p>
                            <p className="font-space text-sm font-bold text-secondary">
                              {formatDuration(dockerRemainingMs)}
                            </p>
                          </div>
                          <div className="mt-2 h-1.5 bg-surface-container-high overflow-hidden">
                            <div
                              className="h-full bg-secondary transition-all duration-500"
                              style={{ width: `${dockerRemainingPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <span className={`px-2 py-1 font-headline text-[9px] font-bold uppercase tracking-widest ${isDockerServiceActive ? 'bg-secondary/15 text-secondary' : 'bg-primary/10 text-primary'}`}>
                      {isDockerServiceActive ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {dockerStatus.instructions ? (
                    <p className="mt-4 text-xs leading-relaxed text-on-surface-variant whitespace-pre-wrap">
                      {dockerStatus.instructions}
                    </p>
                  ) : null}

                  {isDockerServiceActive && dockerStatus.access?.url ? (
                    <a
                      className="mt-4 flex items-center justify-between gap-3 bg-surface-container-high p-3 text-sm font-bold text-on-surface hover:text-primary transition-colors"
                      href={dockerStatus.access.url.startsWith('http') ? dockerStatus.access.url : undefined}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="break-all">{dockerStatus.access.url}</span>
                      <span className="material-symbols-outlined">open_in_new</span>
                    </a>
                  ) : null}

                  {dockerError ? (
                    <p className="mt-3 text-xs text-error">{dockerError}</p>
                  ) : null}

                  <div className="mt-4 flex gap-3">
                    <button
                      className="flex-1 bg-secondary text-on-secondary px-4 py-3 font-headline text-[10px] font-bold uppercase tracking-widest disabled:opacity-60"
                      disabled={isDockerWorking || isDockerServiceActive}
                      onClick={handleSpawnDocker}
                      type="button"
                    >
                      {isDockerWorking && !isDockerServiceActive ? 'Spawning...' : 'Spawn Docker'}
                    </button>
                    <button
                      className="flex-1 bg-surface-container-high text-on-surface px-4 py-3 font-headline text-[10px] font-bold uppercase tracking-widest disabled:opacity-60"
                      disabled={isDockerWorking || !isDockerServiceActive}
                      onClick={handleStopDocker}
                      type="button"
                    >
                      Stop
                    </button>
                    <button
                      className="flex-1 bg-primary text-on-primary px-4 py-3 font-headline text-[10px] font-bold uppercase tracking-widest disabled:opacity-60"
                      disabled={isDockerWorking}
                      onClick={handleRevertDocker}
                      type="button"
                    >
                      Revert
                    </button>
                  </div>
                </div>
              ) : null}

              {isPreparingTheoreticalQuestions ? (
                <div className="bg-surface-container-low p-5 border-l-2 border-l-primary">
                  <div className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-primary animate-pulse">
                      psychology
                    </span>
                    <div>
                      <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-primary">
                        AI Assessment
                      </p>
                      <h3 className="mt-2 font-headline text-lg font-black uppercase tracking-tight">
                        AI is preparing questions for you
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                        Your theoretical assessment is being generated from this room and your learner profile.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 bg-surface-container-high overflow-hidden">
                    <div className="h-full w-1/2 bg-primary animate-pulse"></div>
                  </div>
                </div>
              ) : null}

              {questionStatus.enabled ? (
                <div className="bg-surface-container-low p-4 border-l-2 border-l-secondary space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Question Challenge
                    </span>
                    <span className="text-[10px] font-headline font-bold uppercase tracking-widest px-2 py-1 bg-secondary/15 text-secondary">
                      {isAiQuestionMode
                        ? `Tech ${questionStatus.technicalScore}/100`
                        : `${questionStatus.correct}/${questionStatus.total} Correct`}
                    </span>
                  </div>

                  {isAiQuestionMode ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface-container-high p-3">
                        <p className="font-headline text-[9px] uppercase tracking-widest text-on-surface-variant">
                          Technical
                        </p>
                        <p className="font-space text-2xl font-bold text-primary">
                          {questionStatus.technicalScore}
                        </p>
                      </div>
                      <div className="bg-surface-container-high p-3">
                        <p className="font-headline text-[9px] uppercase tracking-widest text-on-surface-variant">
                          Grammar
                        </p>
                        <p className="font-space text-2xl font-bold text-secondary">
                          {questionStatus.grammarScore}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {requiredAssessmentQuestions.map((question, index) => (
                      <div key={question.id || `question-${index}`} className="bg-surface-container-high p-3">
                        <p className="text-[11px] font-headline font-bold text-on-surface uppercase tracking-wide mb-2">
                          Q{index + 1}. {question.prompt}
                        </p>
                        {question.hint ? (
                          <p className="text-[10px] text-on-surface-variant mb-2">Hint: {question.hint}</p>
                        ) : null}
                        {question.sourceType === 'interview' ? (
                          <div className="mb-3 border-l-2 border-primary/60 bg-primary/10 px-3 py-2">
                            <p className="font-headline text-[9px] font-bold uppercase tracking-widest text-primary">
                              Interview Source
                            </p>
                            {question.company ? (
                              <p className="mt-1 text-[10px] font-bold text-on-surface">
                                Company: {question.company}
                              </p>
                            ) : null}
                            <p className="mt-1 text-[10px] text-on-surface-variant">
                              {[question.company, question.interview].filter(Boolean).join(' • ') ||
                                'Interview-style cybersecurity question'}
                            </p>
                            {question.sourceInfo ? (
                              <p className="mt-1 text-[10px] text-on-surface-variant">{question.sourceInfo}</p>
                            ) : null}
                          </div>
                        ) : null}
                        {questionStatus.mode === 'theoretical' || question.questionType === 'ai' ? (
                          <textarea
                            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm py-2 px-3 outline-none"
                            onChange={(e) => handleQuestionAnswerChange(question.id, e.target.value)}
                            onDrop={blockClipboardInput}
                            onPaste={blockClipboardInput}
                            placeholder="Write a complete answer"
                            rows="5"
                            value={questionAnswers[question.id] || ''}
                          ></textarea>
                        ) : (
                          <input
                            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm py-2 px-3 outline-none"
                            onChange={(e) => handleQuestionAnswerChange(question.id, e.target.value)}
                            onDrop={blockClipboardInput}
                            onPaste={blockClipboardInput}
                            placeholder="Enter your answer"
                            type="text"
                            value={questionAnswers[question.id] || ''}
                          />
                        )}
                      </div>
                    ))}
                    {bonusAssessmentQuestions.map((question) => (
                      <div key={question.id || 'bonus-interview'} className="bg-primary/10 border border-primary/30 p-3">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-headline text-[9px] font-bold uppercase tracking-widest text-primary">
                              Optional Interview Bonus
                            </p>
                            <p className="mt-1 text-[10px] text-on-surface-variant">
                              Answering this can add up to 10 bonus points.
                            </p>
                          </div>
                          <span className="font-headline text-[9px] font-bold uppercase tracking-widest bg-primary text-on-primary px-2 py-1">
                            +10 max
                          </span>
                        </div>
                        <p className="text-[11px] font-headline font-bold text-on-surface uppercase tracking-wide mb-2">
                          {question.prompt}
                        </p>
                        <div className="mb-3 border-l-2 border-primary/60 bg-surface-container-lowest/60 px-3 py-2">
                          <p className="font-headline text-[9px] font-bold uppercase tracking-widest text-primary">
                            Interview Source
                          </p>
                          <p className="mt-1 text-[10px] font-bold text-on-surface">
                            Company: {question.company || 'General cybersecurity interview practice'}
                          </p>
                          <p className="mt-1 text-[10px] text-on-surface-variant">
                            {question.interview || 'Interview-style cybersecurity question'}
                          </p>
                          {question.sourceInfo ? (
                            <p className="mt-1 text-[10px] text-on-surface-variant">{question.sourceInfo}</p>
                          ) : null}
                        </div>
                        <textarea
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm py-2 px-3 outline-none"
                          onChange={(e) => handleQuestionAnswerChange(question.id, e.target.value)}
                          onDrop={blockClipboardInput}
                          onPaste={blockClipboardInput}
                          placeholder="Optional bonus answer"
                          rows="4"
                          value={questionAnswers[question.id] || ''}
                        ></textarea>
                      </div>
                    ))}
                  </div>

                  <button
                    className="w-full py-3 bg-secondary text-on-secondary font-headline text-[10px] font-bold tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-60"
                    disabled={isSubmittingQuestions}
                    onClick={handleSubmitQuestions}
                    type="button"
                  >
                    {isSubmittingQuestions
                      ? isAiQuestionMode
                        ? 'Evaluating...'
                        : 'Checking Answers...'
                      : isAiQuestionMode
                        ? 'Submit For AI Evaluation'
                        : 'Submit Answers'}
                  </button>

                  {questionFeedback || questionStatus.feedback ? (
                    <p className="text-xs text-on-surface-variant">{questionFeedback || questionStatus.feedback}</p>
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
                      disabled={isPreparingTheoreticalQuestions || (questionStatus.enabled && !questionStatus.allCorrect)}
                      onClick={handleMarkComplete}
                      type="button"
                    >
                      {isPreparingTheoreticalQuestions ? 'Preparing Assessment...' : 'Mark Complete'}
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

          </div>
        </div>
      </div>
    </main>
  )
}

export default LabRoomPage
