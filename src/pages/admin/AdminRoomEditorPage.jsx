import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { addRoom, getRoomById, updateRoom } from '../../data/roomsData'

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function splitCommaList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function createEmptyQuestion(index) {
  return {
    id: `q-${index + 1}`,
    prompt: '',
    answer: '',
    hint: '',
  }
}

function AdminRoomEditorPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { roomId } = useParams()
  const isNewRoom = roomId === 'new' || location.pathname === '/admin/rooms/new'

  const room = isNewRoom ? null : getRoomById(roomId)
  const [formData, setFormData] = useState(
    room || {
      title: '',
      slug: '',
      category: '',
      level: '',
      difficulty: '',
      estimateTime: '',
      environment: '',
      description: '',
      xp: '',
      tags: [],
      requiredKeywords: [],
      content: {
        markdown: '',
        html: '',
        missionOverview: '',
        remediationProtocols: '',
        vulnerabilityBriefing: {
          definition: '',
          impact: '',
        },
        technicalDeepDive: '',
        youtubeVideoUrl: '',
        questionsEnabled: false,
        questions: [],
      },
    }
  )
  const [activeTab, setActiveTab] = useState('basic')
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [tagsInput, setTagsInput] = useState((room?.tags || []).join(', '))
  const [requiredKeywordsInput, setRequiredKeywordsInput] = useState(
    (room?.requiredKeywords || []).join(', ')
  )

  if (!isNewRoom && !room) {
    return (
      <main className="min-h-screen bg-surface px-6 md:px-10 py-10 flex items-center justify-center">
        <div className="text-center">
          <p className="text-on-surface-variant mb-4">Room not found.</p>
          <button
            className="bg-primary text-on-primary px-4 py-2 font-headline font-bold"
            onClick={() => navigate('/admin/rooms')}
            type="button"
          >
            Back to Rooms
          </button>
        </div>
      </main>
    )
  }

  const handleSave = () => {
    if (!formData.title?.trim()) {
      setErrorMessage('Room title is required.')
      return
    }

    const normalized = {
      ...formData,
      slug: formData.slug || slugify(formData.title || ''),
      tags: splitCommaList(tagsInput),
      requiredKeywords: splitCommaList(requiredKeywordsInput),
      difficulty: formData.difficulty || formData.level,
    }

    if (!normalized.slug) {
      setErrorMessage('Unable to generate a valid slug. Please provide a title or slug.')
      return
    }

    setErrorMessage('')

    if (isNewRoom) {
      addRoom(normalized)
    } else {
      updateRoom(roomId, normalized)
    }

    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      if (isNewRoom) {
        navigate('/admin/rooms')
      }
    }, 1200)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleContentChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      content: { ...prev.content, [field]: value },
    }))
  }

  const handleVulnerabilityBriefingChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        vulnerabilityBriefing: {
          ...(prev.content?.vulnerabilityBriefing || {}),
          [field]: value,
        },
      },
    }))
  }

  const updateQuestionAt = (index, field, value) => {
    setFormData((prev) => {
      const currentQuestions = Array.isArray(prev.content?.questions) ? [...prev.content.questions] : []
      currentQuestions[index] = {
        ...(currentQuestions[index] || createEmptyQuestion(index)),
        [field]: value,
      }

      return {
        ...prev,
        content: {
          ...prev.content,
          questions: currentQuestions,
        },
      }
    })
  }

  const handleAddQuestion = () => {
    setFormData((prev) => {
      const currentQuestions = Array.isArray(prev.content?.questions) ? [...prev.content.questions] : []
      currentQuestions.push(createEmptyQuestion(currentQuestions.length))

      return {
        ...prev,
        content: {
          ...prev.content,
          questions: currentQuestions,
        },
      }
    })
  }

  const handleRemoveQuestion = (index) => {
    setFormData((prev) => {
      const currentQuestions = Array.isArray(prev.content?.questions)
        ? prev.content.questions.filter((_, i) => i !== index)
        : []

      return {
        ...prev,
        content: {
          ...prev.content,
          questions: currentQuestions,
        },
      }
    })
  }

  return (
    <main className="min-h-screen bg-surface px-6 md:px-10 py-10">
      <section className="max-w-7xl mx-auto">
        <header className="bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              className="text-primary hover:text-on-surface transition-colors"
              onClick={() => navigate('/admin/rooms')}
              type="button"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <span className="font-headline text-[10px] tracking-[0.25em] uppercase text-primary font-bold">
              Room Configuration
            </span>
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight uppercase">
            {isNewRoom ? 'Create Experimental Room' : `Edit: ${formData.title || 'Untitled Room'}`}
          </h1>
          <div className="mt-6 flex gap-3">
            <button
              className={`px-5 py-2.5 font-headline text-xs font-bold uppercase tracking-widest transition-all ${
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-primary text-on-primary hover:bg-primary-darker'
              }`}
              onClick={handleSave}
              type="button"
            >
              {saved ? (
                <>
                  <span className="material-symbols-outlined inline mr-1">check</span>
                  Saved
                </>
              ) : (
                isNewRoom ? 'Create Room' : 'Save Changes'
              )}
            </button>
            <button
              className="bg-surface-container-high text-on-surface px-5 py-2.5 font-headline text-xs font-bold uppercase tracking-widest"
              onClick={() => navigate('/admin/rooms')}
              type="button"
            >
              Cancel
            </button>
          </div>
          {errorMessage ? (
            <p className="mt-4 text-sm text-red-600 font-headline tracking-wide uppercase">
              {errorMessage}
            </p>
          ) : null}
        </header>

        {/* Tab Navigation */}
        <div className="flex gap-0 mb-8 border-b border-outline-variant/30">
          {['basic', 'content', 'questions'].map((tab) => (
            <button
              className={`px-6 py-3 font-headline text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab === 'basic' ? 'Basic Info' : tab === 'content' ? 'Content' : 'Question Config'}
            </button>
          ))}
        </div>

        {/* Basic Information Tab */}
        {activeTab === 'basic' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-surface-container-lowest p-8">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6">
                Room Details
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest font-bold mb-2">
                    Room Title
                  </label>
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                    name="title"
                    onChange={handleInputChange}
                    type="text"
                    value={formData.title || ''}
                  />
                </div>

                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest font-bold mb-2">
                    Slug
                  </label>
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                    name="slug"
                    onChange={handleInputChange}
                    placeholder="auto-generated-from-title"
                    type="text"
                    value={formData.slug || ''}
                  />
                </div>

                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest font-bold mb-2">
                    Category
                  </label>
                  <select
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                    name="category"
                    onChange={handleInputChange}
                    value={formData.category || ''}
                  >
                    <option value="">Select Category</option>
                    <option value="Web Exploitation">Web Exploitation</option>
                    <option value="Cryptography">Cryptography</option>
                    <option value="Binary Exploitation">Binary Exploitation</option>
                    <option value="Digital Forensics">Digital Forensics</option>
                    <option value="Network Security">Network Security</option>
                  </select>
                </div>

                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest font-bold mb-2">
                    Difficulty Level
                  </label>
                  <select
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                    name="level"
                    onChange={handleInputChange}
                    value={formData.level || ''}
                  >
                    <option value="">Select Level</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest font-bold mb-2">
                    Difficulty Label
                  </label>
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                    name="difficulty"
                    onChange={handleInputChange}
                    placeholder="Beginner / Intermediate / Advanced"
                    type="text"
                    value={formData.difficulty || ''}
                  />
                </div>

                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest font-bold mb-2">
                    Estimated Time
                  </label>
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                    name="estimateTime"
                    onChange={handleInputChange}
                    placeholder="e.g. 45 minutes"
                    type="text"
                    value={formData.estimateTime || ''}
                  />
                </div>

                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest font-bold mb-2">
                    Environment
                  </label>
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                    name="environment"
                    onChange={handleInputChange}
                    placeholder="e.g. Kali Linux, Browser Sandbox"
                    type="text"
                    value={formData.environment || ''}
                  />
                </div>

                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest font-bold mb-2">
                    Experience Points
                  </label>
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                    name="xp"
                    onChange={handleInputChange}
                    type="text"
                    value={formData.xp || ''}
                  />
                </div>

                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest font-bold mb-2">
                    Description
                  </label>
                  <textarea
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                    name="description"
                    onChange={handleInputChange}
                    rows="5"
                    value={formData.description || ''}
                  ></textarea>
                </div>

                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest font-bold mb-2">
                    Tags
                  </label>
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="comma separated, e.g. sql, web, injection"
                    type="text"
                    value={tagsInput}
                  />
                </div>

                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest font-bold mb-2">
                    Required Keywords
                  </label>
                  <input
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-3 px-4 outline-none"
                    onChange={(e) => setRequiredKeywordsInput(e.target.value)}
                    placeholder="comma separated, e.g. UNION, WHERE, payload"
                    type="text"
                    value={requiredKeywordsInput}
                  />
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest p-8">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6">
                Preview
              </h2>
              <div className="bg-surface-container-highest p-6 rounded">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-primary-container text-on-primary-container px-2 py-1 font-label text-[10px] font-bold uppercase">
                    {formData.level}
                  </span>
                  <span className="bg-secondary-container text-on-secondary-container px-2 py-1 font-label text-[10px] font-bold uppercase">
                    {formData.category}
                  </span>
                </div>
                <h3 className="font-headline font-bold text-lg mb-2">{formData.title}</h3>
                <p className="text-sm text-on-surface-variant mb-4">{formData.description}</p>
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm">star</span>
                  <span>{formData.xp}</span>
                </div>
                <div className="mt-4 text-xs text-on-surface-variant space-y-1">
                  <p>Difficulty: {formData.difficulty || formData.level || 'N/A'}</p>
                  <p>Estimated Time: {formData.estimateTime || 'N/A'}</p>
                  <p>Environment: {formData.environment || 'N/A'}</p>
                  <p>Tags: {splitCommaList(tagsInput).join(', ') || 'N/A'}</p>
                  <p>Required Keywords: {splitCommaList(requiredKeywordsInput).join(', ') || 'N/A'}</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Content Editor Tab */}
        {activeTab === 'content' && (
          <div className="space-y-8">
            <section className="bg-surface-container-lowest p-8">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6">
                Mission Overview
              </h2>
              <textarea
                className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-4 px-4 outline-none"
                onChange={(e) => handleContentChange('missionOverview', e.target.value)}
                rows="6"
                value={formData.content?.missionOverview || ''}
              ></textarea>
            </section>

            <section className="bg-surface-container-lowest p-8">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6">
                Remediation Protocols
              </h2>
              <textarea
                className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-4 px-4 outline-none"
                onChange={(e) => handleContentChange('remediationProtocols', e.target.value)}
                rows="6"
                value={formData.content?.remediationProtocols || ''}
              ></textarea>
            </section>

            <section className="bg-surface-container-lowest p-8">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6">
                Vulnerability Briefing
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest font-bold mb-2">
                    Definition
                  </label>
                  <textarea
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-4 px-4 outline-none"
                    onChange={(e) =>
                      handleVulnerabilityBriefingChange('definition', e.target.value)
                    }
                    rows="4"
                    value={formData.content?.vulnerabilityBriefing?.definition || ''}
                  ></textarea>
                </div>
                <div>
                  <label className="block font-headline text-xs uppercase tracking-widest font-bold mb-2">
                    Impact
                  </label>
                  <textarea
                    className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-4 px-4 outline-none"
                    onChange={(e) =>
                      handleVulnerabilityBriefingChange('impact', e.target.value)
                    }
                    rows="4"
                    value={formData.content?.vulnerabilityBriefing?.impact || ''}
                  ></textarea>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest p-8">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6">
                Technical Deep Dive
              </h2>
              <textarea
                className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-4 px-4 outline-none"
                onChange={(e) => handleContentChange('technicalDeepDive', e.target.value)}
                rows="8"
                value={formData.content?.technicalDeepDive || ''}
              ></textarea>
            </section>

            <section className="bg-surface-container-lowest p-8">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6">
                Video Player Configuration
              </h2>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-4">
                Add a YouTube URL to display in the player area using an iframe.
              </p>
              <input
                className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-4 px-4 outline-none"
                onChange={(e) => handleContentChange('youtubeVideoUrl', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                type="url"
                value={formData.content?.youtubeVideoUrl || ''}
              />
            </section>

            <section className="bg-surface-container-lowest p-8">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6">
                Markdown Content
              </h2>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-4">
                This is the primary content. Use markdown for structured text formatting.
              </p>
              <textarea
                className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-mono text-xs py-4 px-4 outline-none"
                onChange={(e) => handleContentChange('markdown', e.target.value)}
                rows="15"
                value={formData.content?.markdown || ''}
              ></textarea>
            </section>

            <section className="bg-surface-container-lowest p-8">
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6">
                HTML Content
              </h2>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-4">
                Optional custom HTML for advanced styling. This will override markdown rendering.
              </p>
              <textarea
                className="w-full bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-mono text-xs py-4 px-4 outline-none"
                onChange={(e) => handleContentChange('html', e.target.value)}
                rows="15"
                value={formData.content?.html || ''}
              ></textarea>
            </section>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-8">
            <section className="bg-surface-container-lowest p-8">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h2 className="font-headline text-xl font-bold uppercase tracking-tight">
                  Question Configuration
                </h2>
                <button
                  className="px-4 py-2 bg-secondary text-on-secondary font-headline text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                  onClick={handleAddQuestion}
                  type="button"
                >
                  Add Question
                </button>
              </div>

              <label className="inline-flex items-center gap-3 mb-6 cursor-pointer">
                <input
                  checked={Boolean(formData.content?.questionsEnabled)}
                  className="h-4 w-4"
                  onChange={(e) => handleContentChange('questionsEnabled', e.target.checked)}
                  type="checkbox"
                />
                <span className="font-headline text-xs font-bold uppercase tracking-widest text-on-surface">
                  Enable Question Requirement For Room Completion
                </span>
              </label>

              <p className="text-xs text-on-surface-variant mb-6">
                When enabled, this room can be marked complete only after all configured questions are answered correctly by the player.
              </p>

              {Array.isArray(formData.content?.questions) && formData.content.questions.length > 0 ? (
                <div className="space-y-4">
                  {formData.content.questions.map((question, index) => (
                    <div key={`${question.id || 'q'}-${index}`} className="bg-surface-container-high p-5 border-l-2 border-l-secondary">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <p className="font-headline text-xs font-bold uppercase tracking-widest text-secondary">
                          Question {index + 1}
                        </p>
                        <button
                          className="text-on-surface-variant hover:text-error transition-colors"
                          onClick={() => handleRemoveQuestion(index)}
                          type="button"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        <input
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 font-body text-sm py-2.5 px-3 outline-none"
                          onChange={(e) => updateQuestionAt(index, 'id', e.target.value)}
                          placeholder="Question ID (e.g. q1)"
                          type="text"
                          value={question.id || ''}
                        />
                        <textarea
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 font-body text-sm py-2.5 px-3 outline-none"
                          onChange={(e) => updateQuestionAt(index, 'prompt', e.target.value)}
                          placeholder="Question prompt"
                          rows="3"
                          value={question.prompt || ''}
                        ></textarea>
                        <input
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 font-body text-sm py-2.5 px-3 outline-none"
                          onChange={(e) => updateQuestionAt(index, 'answer', e.target.value)}
                          placeholder="Expected answer"
                          type="text"
                          value={question.answer || ''}
                        />
                        <input
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 font-body text-sm py-2.5 px-3 outline-none"
                          onChange={(e) => updateQuestionAt(index, 'hint', e.target.value)}
                          placeholder="Optional hint"
                          type="text"
                          value={question.hint || ''}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface-container-high p-6 text-center">
                  <p className="text-sm text-on-surface-variant">No questions configured yet.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  )
}

export default AdminRoomEditorPage
