const CONFIG_KEY = 'incognitrix_platform_config'

export const DEFAULT_PLATFORM_CONFIG = {
  routes: {
    dashboard: true,
    learningPaths: true,
    practiceLabs: true,
    upcomingCtf: true,
    profile: true,
  },
  features: {
    labRooms: true,
    redTeamPath: true,
    newMissionButton: true,
    navbarSearch: true,
    navbarNotifications: true,
    navbarSettings: true,
    publicRegistration: true,
  },
}

function mergeConfig(input) {
  return {
    routes: {
      ...DEFAULT_PLATFORM_CONFIG.routes,
      ...(input?.routes ?? {}),
    },
    features: {
      ...DEFAULT_PLATFORM_CONFIG.features,
      ...(input?.features ?? {}),
    },
  }
}

export function loadPlatformConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) {
      return DEFAULT_PLATFORM_CONFIG
    }

    const parsed = JSON.parse(raw)
    return mergeConfig(parsed)
  } catch {
    return DEFAULT_PLATFORM_CONFIG
  }
}

export function savePlatformConfig(nextConfig) {
  const merged = mergeConfig(nextConfig)
  localStorage.setItem(CONFIG_KEY, JSON.stringify(merged))
  return merged
}

export function resetPlatformConfig() {
  localStorage.removeItem(CONFIG_KEY)
  return DEFAULT_PLATFORM_CONFIG
}
