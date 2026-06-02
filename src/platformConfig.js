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
  ai: {
    model: 'moonshotai/kimi-k2-thinking',
    availableModels: [
      {
        id: 'moonshotai/kimi-k2-thinking',
        label: 'Kimi K2 Thinking',
        provider: 'NVIDIA',
      },
      {
        id: 'deepseek-ai/deepseek-r1',
        label: 'DeepSeek R1',
        provider: 'NVIDIA',
      },
      {
        id: 'qwen/qwen3-235b-a22b',
        label: 'Qwen3 235B A22B',
        provider: 'NVIDIA',
      },
      {
        id: 'meta/llama-3.1-405b-instruct',
        label: 'Llama 3.1 405B Instruct',
        provider: 'NVIDIA',
      },
    ],
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
    ai: {
      ...DEFAULT_PLATFORM_CONFIG.ai,
      ...(input?.ai ?? {}),
      availableModels: Array.isArray(input?.ai?.availableModels)
        ? input.ai.availableModels
        : DEFAULT_PLATFORM_CONFIG.ai.availableModels,
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
