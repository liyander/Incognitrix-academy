import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRoomsData } from '../../data/roomsData'

function AdminRoomsManagementPage() {
  const navigate = useNavigate()
  const [rooms] = useState(getRoomsData())
  const [searchTerm, setSearchTerm] = useState('')

  const filteredRooms = rooms.filter(
    (room) =>
      (room.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (room.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getLevelColor = (level) => {
    switch (level) {
      case 'Easy':
        return 'bg-emerald-500/20 text-emerald-600'
      case 'Medium':
        return 'bg-amber-500/20 text-amber-600'
      case 'Hard':
        return 'bg-red-500/20 text-red-600'
      default:
        return 'bg-primary/20 text-primary'
    }
  }

  return (
    <main className="min-h-screen bg-surface px-6 md:px-10 py-10">
      <section className="max-w-6xl mx-auto">
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
              Content Management
            </span>
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight uppercase">
            Manage Experimental Rooms
          </h1>
          <p className="text-sm text-on-surface-variant mt-4 max-w-2xl">
            Configure available lab rooms. Click on any room to edit title, description, content, and metadata.
          </p>
          <div className="mt-6">
            <button
              className="bg-primary text-on-primary px-5 py-2.5 font-headline text-xs font-bold uppercase tracking-widest"
              onClick={() => navigate('/admin/rooms/new')}
              type="button"
            >
              Add Experimental Room
            </button>
          </div>
        </header>

        <div className="mb-6">
          <input
            className="w-full bg-surface-container-lowest border-l-2 border-l-primary border-t-0 border-r-0 border-b-0 focus:ring-0 font-body text-sm py-3 px-4 outline-none"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search rooms by name or category..."
            type="text"
            value={searchTerm}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredRooms.map((room) => (
            <button
              className="bg-surface-container-lowest p-6 hover:bg-surface-container-high transition-colors text-left border-l-4 border-primary/30 hover:border-primary flex items-start justify-between"
              key={room.id}
              onClick={() => navigate(`/admin/rooms/${room.id}`)}
              type="button"
            >
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 font-label text-[10px] font-bold uppercase tracking-wider rounded ${getLevelColor(room.level)}`}>
                    {room.level || 'N/A'}
                  </span>
                  <span className="bg-primary-container text-on-primary-container px-2 py-1 font-label text-[10px] font-bold uppercase tracking-wider rounded">
                    {room.category || 'Uncategorized'}
                  </span>
                </div>
                <h3 className="font-headline text-lg font-bold uppercase mb-2">{room.title}</h3>
                <p className="text-sm text-on-surface-variant max-w-2xl line-clamp-2">
                  {room.description}
                </p>
                <div className="flex gap-6 mt-4 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">star</span>
                    {room.xp}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">folder</span>
                    {room.slug || room.id}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant ml-4 mt-1">
                chevron_right
              </span>
            </button>
          ))}

          {filteredRooms.length === 0 && (
            <div className="bg-surface-container-lowest p-12 text-center">
              <p className="text-on-surface-variant">No rooms found matching your search.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default AdminRoomsManagementPage
