const AUTH_STORAGE_KEY = 'incognitrix_auth_session'
const LAB_PROGRESS_KEY = 'incognitrix_lab_progress_v1'
const LAB_PROGRESS_UPDATED_EVENT = 'incognitrix:lab-progress-updated'
const LAB_PROGRESS_UPDATED_STORAGE_KEY = 'incognitrix_lab_progress_updated_at'

function getCurrentUserKey() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return 'anonymous'
    const parsed = JSON.parse(raw)
    return parsed?.username || 'anonymous'
  } catch {
    return 'anonymous'
  }
}

function readAllProgress() {
  try {
    const raw = localStorage.getItem(LAB_PROGRESS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAllProgress(next) {
  localStorage.setItem(LAB_PROGRESS_KEY, JSON.stringify(next))
  const now = String(Date.now())
  localStorage.setItem(LAB_PROGRESS_UPDATED_STORAGE_KEY, now)
  window.dispatchEvent(new Event(LAB_PROGRESS_UPDATED_EVENT))
}

export function getLabProgressEvents() {
  return {
    updatedEvent: LAB_PROGRESS_UPDATED_EVENT,
    updatedStorageKey: LAB_PROGRESS_UPDATED_STORAGE_KEY,
  }
}

export function getLabProgressMap() {
  const allProgress = readAllProgress()
  const userKey = getCurrentUserKey()
  const userProgress = allProgress[userKey]
  return userProgress && typeof userProgress === 'object' ? userProgress : {}
}

export function getLabStatus(roomId) {
  const progress = getLabProgressMap()[roomId]
  if (progress?.completedAt) return 'completed'
  if (progress?.startedAt) return 'in-progress'
  return 'not-started'
}

export function markLabStarted(roomId) {
  if (!roomId) return
  const allProgress = readAllProgress()
  const userKey = getCurrentUserKey()
  const userProgress = allProgress[userKey] && typeof allProgress[userKey] === 'object' ? allProgress[userKey] : {}
  const current = userProgress[roomId] || {}

  if (current.startedAt) {
    return
  }

  userProgress[roomId] = {
    ...current,
    startedAt: new Date().toISOString(),
  }

  allProgress[userKey] = userProgress
  writeAllProgress(allProgress)
}

export function markLabCompleted(roomId) {
  if (!roomId) return
  const allProgress = readAllProgress()
  const userKey = getCurrentUserKey()
  const userProgress = allProgress[userKey] && typeof allProgress[userKey] === 'object' ? allProgress[userKey] : {}
  const current = userProgress[roomId] || {}

  userProgress[roomId] = {
    ...current,
    startedAt: current.startedAt || new Date().toISOString(),
    completedAt: new Date().toISOString(),
  }

  allProgress[userKey] = userProgress
  writeAllProgress(allProgress)
}

export function markLabIncomplete(roomId) {
  if (!roomId) return
  const allProgress = readAllProgress()
  const userKey = getCurrentUserKey()
  const userProgress = allProgress[userKey] && typeof allProgress[userKey] === 'object' ? allProgress[userKey] : {}
  const current = userProgress[roomId]

  if (!current) return

  userProgress[roomId] = {
    ...current,
    completedAt: null,
  }

  allProgress[userKey] = userProgress
  writeAllProgress(allProgress)
}

export function getLabProgressSummary(rooms) {
  const total = Array.isArray(rooms) ? rooms.length : 0
  const progressMap = getLabProgressMap()

  if (!total) {
    return {
      total,
      completed: 0,
      inProgress: 0,
      completionPercentage: 0,
    }
  }

  let completed = 0
  let inProgress = 0

  for (const room of rooms) {
    const progress = progressMap[room.id]
    if (progress?.completedAt) {
      completed += 1
    } else if (progress?.startedAt) {
      inProgress += 1
    }
  }

  const completionPercentage = Math.round((completed / total) * 100)

  return {
    total,
    completed,
    inProgress,
    completionPercentage,
  }
}
