import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoomCategory, fetchRoomCategories, getRoomCategories, removeRoomCategory } from '../../data/categoriesData'
import { getRoomsData } from '../../data/roomsData'

function AdminCategoriesPage() {
  const navigate = useNavigate()
  const [categoryInput, setCategoryInput] = useState('')
  const [categories, setCategories] = useState(() =>
    getRoomCategories(getRoomsData().map((room) => room.category)),
  )
  const roomCounts = useMemo(() => {
    const counts = new Map()
    getRoomsData().forEach((room) => {
      const category = room.category || 'Uncategorized'
      counts.set(category, (counts.get(category) || 0) + 1)
    })
    return counts
  }, [])

  const refreshCategories = async () => {
    setCategories(await fetchRoomCategories(getRoomsData().map((room) => room.category)))
  }

  useEffect(() => {
    let cancelled = false
    fetchRoomCategories(getRoomsData().map((room) => room.category)).then((nextCategories) => {
      if (!cancelled) {
        setCategories(nextCategories)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleAddCategory = async () => {
    const next = categoryInput.trim()
    if (!next) {
      return
    }

    await createRoomCategory(next)
    await refreshCategories()
    setCategoryInput('')
  }

  const handleDeleteCategory = async (category) => {
    await removeRoomCategory(category)
    await refreshCategories()
  }

  return (
    <main className="min-h-screen bg-surface px-6 md:px-10 py-10">
      <section className="max-w-5xl mx-auto">
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
              Category Control
            </span>
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight uppercase">
            Room Categories
          </h1>
          <p className="text-sm text-on-surface-variant mt-4 max-w-2xl">
            Add specialization categories for room filters, room creation, and proficiency tracking.
          </p>
        </header>

        <section className="bg-surface-container-lowest p-8 mb-8">
          <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-6">
            Add Category
          </h2>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              className="flex-1 bg-surface-container-highest border-l-2 border-l-primary focus:ring-0 font-body text-sm py-3 px-4 outline-none"
              onChange={(event) => setCategoryInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleAddCategory()
                }
              }}
              placeholder="e.g. Web3 Security"
              type="text"
              value={categoryInput}
            />
            <button
              className="bg-primary text-on-primary px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest"
              onClick={() => void handleAddCategory()}
              type="button"
            >
              Add Category
            </button>
          </div>
        </section>

        <section className="bg-surface-container-lowest p-8">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="font-headline text-xl font-bold uppercase tracking-tight">
                Available Categories
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Categories currently used by rooms cannot be removed from the list view.
              </p>
            </div>
            <span className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">
              {categories.length} Total
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => {
              const roomCount = roomCounts.get(category) || 0
              return (
                <div
                  className="bg-surface-container-high p-5 flex items-center justify-between gap-4"
                  key={category}
                >
                  <div>
                    <p className="font-headline text-sm font-bold uppercase tracking-wide">
                      {category}
                    </p>
                    <p className="text-[10px] text-on-surface-variant mt-1 uppercase tracking-widest">
                      {roomCount} room{roomCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    className="text-on-surface-variant hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={roomCount > 0}
                    onClick={() => void handleDeleteCategory(category)}
                    title={roomCount > 0 ? 'Category is used by rooms' : 'Delete category'}
                    type="button"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      </section>
    </main>
  )
}

export default AdminCategoriesPage
