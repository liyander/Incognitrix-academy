import { env } from '../config/env.js'
import { pool } from '../db/pool.js'

const curatedAiModels = [
  {
    id: 'moonshotai/kimi-k2-thinking',
    label: 'Kimi K2 Thinking',
    provider: 'NVIDIA',
    description: 'Default reasoning model for room generation, evaluation, and platform assistants.',
  },
  {
    id: 'deepseek-ai/deepseek-r1',
    label: 'DeepSeek R1',
    provider: 'NVIDIA',
    description: 'Reasoning-focused option for detailed analysis and evaluation.',
  },
  {
    id: 'qwen/qwen3-235b-a22b',
    label: 'Qwen3 235B A22B',
    provider: 'NVIDIA',
    description: 'Large general reasoning model for broad assistant tasks.',
  },
  {
    id: 'meta/llama-3.1-405b-instruct',
    label: 'Llama 3.1 405B Instruct',
    provider: 'NVIDIA',
    description: 'General instruction model for stable Q&A and content operations.',
  },
]

export const availableAiModels = curatedAiModels.some((model) => model.id === env.aiModel)
  ? curatedAiModels
  : [
      {
        id: env.aiModel,
        label: `${env.aiModel} (Environment Default)`,
        provider: 'Configured',
        description: 'Model currently configured in backend .env.',
      },
      ...curatedAiModels,
    ]

function parseJsonField(value, fallback = {}) {
  if (!value) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }
  return typeof value === 'object' ? value : fallback
}

function normalizeModelId(value) {
  const model = String(value || '').trim()
  const allowedModels = new Set([
    env.aiModel,
    ...availableAiModels.map((item) => item.id),
  ])
  return allowedModels.has(model) ? model : env.aiModel
}

export async function getAiRuntimeConfig() {
  let selectedModel = env.aiModel

  try {
    const [rows] = await pool.query('SELECT ai_json FROM platform_config WHERE id = 1 LIMIT 1')
    const aiConfig = parseJsonField(rows[0]?.ai_json, {})
    selectedModel = normalizeModelId(aiConfig.model)
  } catch {
    selectedModel = env.aiModel
  }

  return {
    baseUrl: env.aiBaseUrl,
    apiKey: env.nvidiaApiKey,
    model: selectedModel,
    temperature: env.aiTemperature,
    topP: env.aiTopP,
    maxTokens: env.aiMaxTokens,
    availableModels,
  }
}

export function buildAiPlatformConfig(input = {}) {
  return {
    model: normalizeModelId(input.model),
    availableModels,
  }
}
