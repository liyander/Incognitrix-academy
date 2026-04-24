import { apiFetch } from '../services/api'

const CAREER_PATHS_STORAGE_KEY = 'careerPathsData'
const CAREER_PATHS_UPDATED_EVENT = 'incognitrix:career-paths-updated'

function emitCareerPathsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CAREER_PATHS_UPDATED_EVENT))
  }
}

// Career paths data storage
function normalizeCareerPath(path) {
  return {
    ...path,
    learningPathLevel: path.learningPathLevel || path.difficulty || 'Basic',
    difficulty: path.difficulty || path.learningPathLevel || 'Basic',
    modules: path.modules || [],
    resources: path.resources || [],
  }
}

export const defaultCareerPaths = [
  {
    id: 'red-team-operator',
    slug: 'red-team-operator',
    title: 'RED TEAM OPERATOR',
    description:
      'Master the art of adversary simulation. This path guides you through advanced reconnaissance, initial access, persistence, and exfiltration techniques used by state-sponsored threat actors.',
    icon: 'security',
    learningPathLevel: 'Expert',
    difficulty: 'Advanced',
    estimatedHours: 120,
    enrolledCount: 14209,
    mastery: 12,
    color: 'primary',
    modules: [
      {
        id: 'mod-01',
        phase: 'Module 01',
        title: 'Network Reconnaissance',
        description: 'Network mapping and target identification',
        rooms: ['sql-injection-the-basement', 'broken-keypad-rsa-101'],
      },
      {
        id: 'mod-02',
        phase: 'Module 02',
        title: 'Initial Access',
        description: 'Exploitation and initial foothold',
        rooms: ['kernel-panic-buffer-overflow', 'ghost-in-the-ram'],
      },
    ],
    resources: [
      {
        id: 'res-01',
        title: 'MITRE ATT&CK Framework',
        url: '#',
        type: 'Reference',
      },
      {
        id: 'res-02',
        title: 'Advanced Exploitation Guide',
        url: '#',
        type: 'Guide',
      },
    ],
  },
  {
    id: 'soc-architect',
    slug: 'soc-architect',
    title: 'SOC ARCHITECT',
    description:
      'Defensive infrastructure, threat hunting, and incident response orchestration for state-level assets.',
    icon: 'shield',
    learningPathLevel: 'Expert',
    difficulty: 'Advanced',
    estimatedHours: 100,
    enrolledCount: 8950,
    mastery: 45,
    color: 'secondary',
    modules: [
      {
        id: 'mod-03',
        phase: 'Module 01',
        title: 'Threat Detection',
        description: 'Detection strategies and analytics',
        rooms: [],
      },
    ],
    resources: [],
  },
  {
    id: 'threat-intelligence',
    slug: 'threat-intelligence',
    title: 'THREAT INTELLIGENCE',
    description:
      'Adversary profiling, tactical intelligence gathering, and strategic assessment for operational planning.',
    icon: 'visibility',
    learningPathLevel: 'Intermediate',
    difficulty: 'Intermediate',
    estimatedHours: 80,
    enrolledCount: 6240,
    mastery: 0,
    color: 'tertiary',
    modules: [],
    resources: [],
  },
]

let fallbackMemoryCareerPaths = null;

export function getCareerPathsData() {
  if (fallbackMemoryCareerPaths) return fallbackMemoryCareerPaths;
  const stored = localStorage.getItem(CAREER_PATHS_STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored).map(normalizeCareerPath)
      fallbackMemoryCareerPaths = parsed;
      return parsed;
    } catch (e) {
      console.error('Error parsing careerPathsData:', e)
      fallbackMemoryCareerPaths = defaultCareerPaths.map(normalizeCareerPath);
      return fallbackMemoryCareerPaths;
    }
  }
  fallbackMemoryCareerPaths = defaultCareerPaths.map(normalizeCareerPath);
  return fallbackMemoryCareerPaths;
}

export function setCareerPathsData(paths) {
  fallbackMemoryCareerPaths = paths;
  try {
    localStorage.setItem(CAREER_PATHS_STORAGE_KEY, JSON.stringify(paths))
  } catch (error) {
    console.warn('localStorage quota exceeded for careerPathsData. Retaining in memory only.', error)
  }
  emitCareerPathsUpdated()
}

export function hydrateCareerPathsData(paths) {
  fallbackMemoryCareerPaths = paths.map(normalizeCareerPath);
  try {
    localStorage.setItem(CAREER_PATHS_STORAGE_KEY, JSON.stringify(fallbackMemoryCareerPaths))
  } catch (error) {
    console.warn('localStorage quota exceeded during career paths hydration. Retaining in memory only.', error)
  }
  emitCareerPathsUpdated()
}

export function subscribeCareerPathsData(listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const onDataUpdate = () => listener()
  const onStorage = (event) => {
    if (event.key === CAREER_PATHS_STORAGE_KEY) {
      listener()
    }
  }

  window.addEventListener(CAREER_PATHS_UPDATED_EVENT, onDataUpdate)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(CAREER_PATHS_UPDATED_EVENT, onDataUpdate)
    window.removeEventListener('storage', onStorage)
  }
}

export function getCareerPathById(id) {
  const paths = getCareerPathsData()
  return paths.find((p) => p.id === id)
}

export function updateCareerPath(id, updates) {
  const paths = getCareerPathsData()
  const index = paths.findIndex((p) => p.id === id)
  if (index !== -1) {
    paths[index] = normalizeCareerPath({ ...paths[index], ...updates })
    setCareerPathsData(paths)
    void apiFetch(`/career-paths/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paths[index]),
    }).catch((error) => console.error('Failed to sync career path update:', error))
    return paths[index]
  }
  return null
}

export function addCareerPath(path) {
  const paths = getCareerPathsData()
  const slugBase = (path.slug || path.title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  const slug = slugBase || `path-${Date.now()}`
  const newPath = {
    ...path,
    id: slug,
    slug,
    learningPathLevel: path.learningPathLevel || path.difficulty || 'Basic',
    difficulty: path.difficulty || path.learningPathLevel || 'Basic',
    modules: path.modules || [],
    resources: path.resources || [],
  }
  paths.push(normalizeCareerPath(newPath))
  setCareerPathsData(paths)
  void apiFetch('/career-paths', {
    method: 'POST',
    body: JSON.stringify(newPath),
  }).catch((error) => console.error('Failed to sync career path create:', error))
  return newPath
}

export function deleteCareerPath(id) {
  const paths = getCareerPathsData()
  const filtered = paths.filter((p) => p.id !== id)
  setCareerPathsData(filtered)
  void apiFetch(`/career-paths/${id}`, {
    method: 'DELETE',
  }).catch((error) => console.error('Failed to sync career path delete:', error))
}

export function addModuleToPath(pathId, module) {
  const paths = getCareerPathsData()
  const pathIndex = paths.findIndex((p) => p.id === pathId)
  if (pathIndex !== -1) {
    const newModule = {
      id: `mod-${Date.now()}`,
      ...module,
      rooms: module.rooms || [],
    }
    paths[pathIndex].modules.push(newModule)
    setCareerPathsData(paths)
    void apiFetch(`/career-paths/${pathId}`, {
      method: 'PUT',
      body: JSON.stringify(paths[pathIndex]),
    }).catch((error) => console.error('Failed to sync module create:', error))
    return newModule
  }
  return null
}

export function updateModuleInPath(pathId, moduleId, updates) {
  const paths = getCareerPathsData()
  const pathIndex = paths.findIndex((p) => p.id === pathId)
  if (pathIndex !== -1) {
    const moduleIndex = paths[pathIndex].modules.findIndex((m) => m.id === moduleId)
    if (moduleIndex !== -1) {
      paths[pathIndex].modules[moduleIndex] = {
        ...paths[pathIndex].modules[moduleIndex],
        ...updates,
      }
      setCareerPathsData(paths)
      void apiFetch(`/career-paths/${pathId}`, {
        method: 'PUT',
        body: JSON.stringify(paths[pathIndex]),
      }).catch((error) => console.error('Failed to sync module update:', error))
      return paths[pathIndex].modules[moduleIndex]
    }
  }
  return null
}

export function deleteModuleFromPath(pathId, moduleId) {
  const paths = getCareerPathsData()
  const pathIndex = paths.findIndex((p) => p.id === pathId)
  if (pathIndex !== -1) {
    paths[pathIndex].modules = paths[pathIndex].modules.filter((m) => m.id !== moduleId)
    setCareerPathsData(paths)
    void apiFetch(`/career-paths/${pathId}`, {
      method: 'PUT',
      body: JSON.stringify(paths[pathIndex]),
    }).catch((error) => console.error('Failed to sync module delete:', error))
  }
}

export function addResourceToPath(pathId, resource) {
  const paths = getCareerPathsData()
  const pathIndex = paths.findIndex((p) => p.id === pathId)
  if (pathIndex !== -1) {
    const newResource = {
      id: `res-${Date.now()}`,
      ...resource,
    }
    paths[pathIndex].resources.push(newResource)
    setCareerPathsData(paths)
    void apiFetch(`/career-paths/${pathId}`, {
      method: 'PUT',
      body: JSON.stringify(paths[pathIndex]),
    }).catch((error) => console.error('Failed to sync resource create:', error))
    return newResource
  }
  return null
}

export function updateResourceInPath(pathId, resourceId, updates) {
  const paths = getCareerPathsData()
  const pathIndex = paths.findIndex((p) => p.id === pathId)
  if (pathIndex !== -1) {
    const resourceIndex = paths[pathIndex].resources.findIndex((r) => r.id === resourceId)
    if (resourceIndex !== -1) {
      paths[pathIndex].resources[resourceIndex] = {
        ...paths[pathIndex].resources[resourceIndex],
        ...updates,
      }
      setCareerPathsData(paths)
      void apiFetch(`/career-paths/${pathId}`, {
        method: 'PUT',
        body: JSON.stringify(paths[pathIndex]),
      }).catch((error) => console.error('Failed to sync resource update:', error))
      return paths[pathIndex].resources[resourceIndex]
    }
  }
  return null
}

export function deleteResourceFromPath(pathId, resourceId) {
  const paths = getCareerPathsData()
  const pathIndex = paths.findIndex((p) => p.id === pathId)
  if (pathIndex !== -1) {
    paths[pathIndex].resources = paths[pathIndex].resources.filter((r) => r.id !== resourceId)
    setCareerPathsData(paths)
    void apiFetch(`/career-paths/${pathId}`, {
      method: 'PUT',
      body: JSON.stringify(paths[pathIndex]),
    }).catch((error) => console.error('Failed to sync resource delete:', error))
  }
}
