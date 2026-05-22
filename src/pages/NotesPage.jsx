import { useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '../services/api'
import { parseMarkdownToHtml } from '../utils/markdown'

const EMPTY_NOTE_CONTENT = '# New note\n\nStart writing in Markdown...'

function createLocalNote() {
  return {
    id: null,
    title: 'Untitled note',
    content: EMPTY_NOTE_CONTENT,
    createdAt: null,
    updatedAt: null,
  }
}

function formatDate(value) {
  if (!value) return 'Not saved yet'

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return 'Recently updated'
  }
}

function NotesPage() {
  const [notes, setNotes] = useState([])
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [draft, setDraft] = useState(createLocalNote)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('edit')
  const saveTimerRef = useRef(null)
  const lastSavedDraftRef = useRef('')

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) || null,
    [activeNoteId, notes],
  )

  const previewHtml = useMemo(() => parseMarkdownToHtml(draft.content), [draft.content])

  useEffect(() => {
    let cancelled = false

    const loadNotes = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await apiFetch('/notes')
        if (cancelled) return

        const loadedNotes = Array.isArray(response) ? response : []
        setNotes(loadedNotes)

        const firstNote = loadedNotes[0] || null
        setActiveNoteId(firstNote?.id || null)
        setDraft(firstNote || createLocalNote())
        lastSavedDraftRef.current = firstNote
          ? JSON.stringify({ id: firstNote.id, title: firstNote.title, content: firstNote.content })
          : ''
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Failed to load notes')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadNotes()

    return () => {
      cancelled = true
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!activeNote) return

    setDraft(activeNote)
    lastSavedDraftRef.current = JSON.stringify({
      id: activeNote.id,
      title: activeNote.title,
      content: activeNote.content,
    })
  }, [activeNote])

  useEffect(() => {
    if (isLoading) return

    const snapshot = JSON.stringify({
      id: draft.id,
      title: draft.title,
      content: draft.content,
    })

    if (snapshot === lastSavedDraftRef.current) {
      return
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(async () => {
      setIsSaving(true)
      setError('')

      try {
        const payload = {
          title: draft.title,
          content: draft.content,
        }
        const saved = draft.id
          ? await apiFetch(`/notes/${draft.id}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            })
          : await apiFetch('/notes', {
              method: 'POST',
              body: JSON.stringify(payload),
            })

        setNotes((current) => {
          const exists = current.some((note) => note.id === saved.id)
          const next = exists
            ? current.map((note) => (note.id === saved.id ? saved : note))
            : [saved, ...current]

          return next.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
        })
        setActiveNoteId(saved.id)
        setDraft(saved)
        lastSavedDraftRef.current = JSON.stringify({
          id: saved.id,
          title: saved.title,
          content: saved.content,
        })
      } catch (saveError) {
        setError(saveError?.message || 'Failed to save note')
      } finally {
        setIsSaving(false)
      }
    }, 700)

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [draft, isLoading])

  const handleCreateNote = () => {
    const nextNote = createLocalNote()
    setActiveNoteId(null)
    setDraft(nextNote)
    lastSavedDraftRef.current = ''
    setMode('edit')
  }

  const updateDraft = (updates) => {
    const next = {
      ...draft,
      ...updates,
    }

    setDraft(next)

    if (next.id) {
      setNotes((items) => items.map((note) => (note.id === next.id ? next : note)))
    }
  }

  const handleDeleteNote = async () => {
    if (!draft.id) {
      handleCreateNote()
      return
    }

    const confirmed = window.confirm(`Delete "${draft.title || 'Untitled note'}"?`)
    if (!confirmed) return

    setIsSaving(true)
    setError('')

    try {
      await apiFetch(`/notes/${draft.id}`, { method: 'DELETE' })
      const remaining = notes.filter((note) => note.id !== draft.id)
      const nextNote = remaining[0] || createLocalNote()
      setNotes(remaining)
      setActiveNoteId(nextNote.id || null)
      setDraft(nextNote)
      lastSavedDraftRef.current = nextNote.id
        ? JSON.stringify({ id: nextNote.id, title: nextNote.title, content: nextNote.content })
        : ''
    } catch (deleteError) {
      setError(deleteError?.message || 'Failed to delete note')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-surface min-h-screen p-6 lg:p-10 mt-16 md:mt-20">
      <div className="flex flex-col gap-6 h-[calc(100vh-8rem)] min-h-[680px]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="font-label text-xs tracking-[0.3em] text-primary font-bold uppercase">
              Operator Notebook
            </span>
            <h1 className="text-4xl font-black tracking-tight text-on-background font-headline mt-2">
              NOTES
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              {isSaving ? 'Saving...' : 'Synced to database'}
            </span>
            <button
              className="inline-flex items-center gap-2 px-4 py-3 bg-primary text-on-primary font-label uppercase text-xs tracking-widest font-bold hover:bg-primary-container transition-colors"
              onClick={handleCreateNote}
              type="button"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New Note
            </button>
          </div>
        </div>

        {error ? (
          <div className="border-l-4 border-l-error bg-error/10 px-4 py-3 text-error font-body text-sm">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-[18rem_minmax(0,1fr)] gap-6 flex-1 min-h-0">
          <aside className="bg-surface-container-low border border-outline-variant/40 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-outline-variant/40 flex items-center justify-between">
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                Notes
              </span>
              <span className="font-space text-xs text-primary font-bold">{notes.length}</span>
            </div>
            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="p-4 text-sm text-on-surface-variant font-body">Loading notes...</div>
              ) : notes.length ? (
                notes.map((note) => (
                  <button
                    className={`w-full text-left px-4 py-4 border-b border-outline-variant/30 transition-colors ${
                      note.id === activeNoteId
                        ? 'bg-surface-container-highest text-on-background'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                    key={note.id}
                    onClick={() => setActiveNoteId(note.id)}
                    type="button"
                  >
                    <span className="block font-headline text-sm font-bold uppercase truncate">
                      {note.title || 'Untitled note'}
                    </span>
                    <span className="block font-body text-xs mt-1 truncate">
                      {String(note.content || '').replace(/\s+/g, ' ').slice(0, 90) || 'Empty note'}
                    </span>
                    <span className="block font-label text-[9px] uppercase tracking-widest mt-2 text-primary">
                      {formatDate(note.updatedAt)}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-sm text-on-surface-variant font-body">
                  No notes yet.
                </div>
              )}
            </div>
          </aside>

          <section className="bg-surface-container-lowest border border-outline-variant/40 flex flex-col min-h-0">
            <div className="px-5 py-4 border-b border-outline-variant/40 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
              <input
                className="bg-transparent outline-none font-headline text-2xl lg:text-3xl font-black tracking-tight text-on-background min-w-0 flex-1"
                onChange={(event) => updateDraft({ title: event.target.value })}
                placeholder="Untitled note"
                type="text"
                value={draft.title}
              />
              <div className="flex items-center gap-2 shrink-0">
                <div className="bg-surface-container-low p-1 flex">
                  <button
                    className={`px-3 py-2 font-label text-[10px] uppercase tracking-widest font-bold ${
                      mode === 'edit' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant'
                    }`}
                    onClick={() => setMode('edit')}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className={`px-3 py-2 font-label text-[10px] uppercase tracking-widest font-bold ${
                      mode === 'preview' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant'
                    }`}
                    onClick={() => setMode('preview')}
                    type="button"
                  >
                    Preview
                  </button>
                </div>
                <button
                  className="inline-flex items-center justify-center h-10 w-10 text-error hover:bg-error/10 transition-colors"
                  onClick={handleDeleteNote}
                  title="Delete note"
                  type="button"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 min-h-0">
              <textarea
                className={`w-full h-full min-h-[420px] resize-none bg-surface-container-lowest border-0 outline-none p-6 font-space text-sm leading-7 text-on-background ${
                  mode === 'preview' ? 'hidden lg:block' : 'block'
                }`}
                onChange={(event) => updateDraft({ content: event.target.value })}
                placeholder="Write Markdown notes..."
                spellCheck="true"
                value={draft.content}
              />
              <div
                className={`overflow-y-auto p-6 border-l border-outline-variant/40 prose prose-sm max-w-none text-on-surface ${
                  mode === 'edit' ? 'hidden lg:block' : 'block'
                }`}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default NotesPage
