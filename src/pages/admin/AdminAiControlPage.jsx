import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAdminAiInsights, sendAdminAiMessage } from '../../services/adminAi'

const STARTER_PROMPTS = [
  'Give me platform insights and top risks right now.',
  'Add a new room for phishing incident response at Medium level.',
  'Create a career path for Cloud Security Operations.',
  'Add a module to red-team-operator about web payload validation.',
]

function AdminAiControlPage() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [insights, setInsights] = useState(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(true)
  const listRef = useRef(null)

  const canSend = input.trim().length > 0 && !isSending

  const history = useMemo(
    () =>
      messages
        .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
        .map((entry) => ({ role: entry.role, message: entry.content })),
    [messages],
  )

  useEffect(() => {
    const loadInsights = async () => {
      setIsLoadingInsights(true)
      try {
        const data = await fetchAdminAiInsights()
        setInsights(data)
      } catch (error) {
        setErrorMessage(error?.message || 'Failed to load admin AI insights.')
      } finally {
        setIsLoadingInsights(false)
      }
    }

    void loadInsights()
  }, [])

  useEffect(() => {
    const node = listRef.current
    if (!node) {
      return
    }

    node.scrollTop = node.scrollHeight
  }, [messages])

  const sendMessage = async (text) => {
    const message = String(text || '').trim()
    if (!message || isSending) {
      return
    }

    setErrorMessage('')
    setIsSending(true)

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
    }

    setMessages((current) => [...current, userMessage])
    setInput('')

    try {
      const response = await sendAdminAiMessage(message, history)
      if (response?.insights) {
        setInsights(response.insights)
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: String(response?.content || 'Admin AI completed the request.'),
          action: response?.action || null,
        },
      ])
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to send message to Admin AI.')
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await sendMessage(input)
  }

  return (
    <main className="min-h-screen bg-surface px-6 md:px-10 py-10">
      <section className="max-w-7xl mx-auto">
        <header className="bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              className="text-primary hover:text-on-surface transition-colors"
              onClick={() => navigate('/admin')}
              type="button"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <span className="font-headline text-[10px] tracking-[0.25em] uppercase text-primary font-bold">
              AI Governance
            </span>
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight uppercase">
            Admin AI Control Center
          </h1>
          <p className="text-sm text-on-surface-variant mt-4 max-w-3xl">
            Monitor platform insights, chat with AI, and execute administrative content operations such as creating rooms, career paths, and modules.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[20rem,1fr] gap-6">
          <aside className="bg-surface-container-lowest border-l-4 border-secondary p-6 h-fit">
            <h2 className="font-headline text-lg font-bold uppercase tracking-tight mb-4 text-secondary">
              Platform Insights
            </h2>
            {isLoadingInsights ? (
              <p className="text-sm text-on-surface-variant">Loading insights...</p>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-surface-container-high p-3">
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Rooms</p>
                    <p className="font-headline text-xl font-bold">{insights?.metrics?.rooms ?? 0}</p>
                  </div>
                  <div className="bg-surface-container-high p-3">
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Paths</p>
                    <p className="font-headline text-xl font-bold">{insights?.metrics?.careerPaths ?? 0}</p>
                  </div>
                  <div className="bg-surface-container-high p-3">
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Modules</p>
                    <p className="font-headline text-xl font-bold">{insights?.metrics?.modules ?? 0}</p>
                  </div>
                  <div className="bg-surface-container-high p-3">
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">CVEs</p>
                    <p className="font-headline text-xl font-bold">{insights?.metrics?.cves ?? 0}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">Starter Prompts</p>
                  <div className="flex flex-wrap gap-2">
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        className="text-left border border-outline-variant bg-surface px-2.5 py-1.5 text-xs hover:border-primary"
                        onClick={() => {
                          void sendMessage(prompt)
                        }}
                        type="button"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>

          <section className="bg-surface-container-lowest border-l-4 border-primary flex flex-col min-h-[38rem]">
            <div ref={listRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface">
              {messages.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  Ask Admin AI for insights, or request content operations like creating rooms, paths, and modules.
                </p>
              ) : null}

              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`max-w-[90%] px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'ml-auto bg-primary text-on-primary'
                      : 'mr-auto bg-surface-container-high text-on-surface'
                  }`}
                >
                  <p>{message.content}</p>
                  {message.role === 'assistant' && message.action?.type && message.action.type !== 'none' ? (
                    <p className="mt-2 text-xs text-on-surface-variant">
                      Action: {message.action.type} ({message.action.status})
                    </p>
                  ) : null}
                </article>
              ))}

              {isSending ? (
                <article className="mr-auto max-w-[90%] px-4 py-3 bg-surface-container-high text-sm text-on-surface-variant">
                  Admin AI is working...
                </article>
              ) : null}
            </div>

            <form className="border-t border-outline-variant p-4 bg-surface-container" onSubmit={handleSubmit}>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask Admin AI to monitor or control platform content..."
                  maxLength={2200}
                />
                <button
                  className="h-10 w-10 inline-flex items-center justify-center bg-primary text-on-primary disabled:opacity-60"
                  disabled={!canSend}
                  type="submit"
                  aria-label="Send admin AI message"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                </button>
              </div>
              {errorMessage ? <p className="mt-2 text-xs text-error">{errorMessage}</p> : null}
            </form>
          </section>
        </div>
      </section>
    </main>
  )
}

export default AdminAiControlPage
