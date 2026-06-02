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
    id: 'openai/gpt-oss-20b',
    label: 'GPT OSS 20B',
    provider: 'NVIDIA',
    description: 'OpenAI open-weight model available through NVIDIA NIM chat completions.',
  },
  {
    id: 'openai/gpt-oss-120b',
    label: 'GPT OSS 120B',
    provider: 'NVIDIA',
    description: 'Larger OpenAI open-weight model for deeper reasoning workloads.',
  },
  {
    id: 'deepseek-ai/deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    provider: 'NVIDIA',
    description: 'Fast DeepSeek chat model for responsive assistant tasks.',
  },
  {
    id: 'deepseek-ai/deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    provider: 'NVIDIA',
    description: 'Reasoning-focused option for detailed analysis and evaluation.',
  },
  {
    id: 'qwen/qwen3-coder-480b-a35b-instruct',
    label: 'Qwen3 Coder 480B A35B Instruct',
    provider: 'NVIDIA',
    description: 'Large coding and instruction model for technical tasks.',
  },
  {
    id: 'qwen/qwen3-next-80b-a3b-thinking',
    label: 'Qwen3 Next 80B A3B Thinking',
    provider: 'NVIDIA',
    description: 'Thinking-oriented Qwen model for analysis and multi-step reasoning.',
  },
  {
    id: 'qwen/qwq-32b',
    label: 'QwQ 32B',
    provider: 'NVIDIA',
    description: 'Compact reasoning model for structured assessment and feedback.',
  },
  {
    id: 'meta/llama-3.3-70b-instruct',
    label: 'Llama 3.3 70B Instruct',
    provider: 'NVIDIA',
    description: 'General instruction model for stable Q&A and content operations.',
  },
  {
    id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    label: 'Llama 3.3 Nemotron Super 49B v1.5',
    provider: 'NVIDIA',
    description: 'NVIDIA Nemotron model for general reasoning and assistant workflows.',
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b',
    label: 'Nemotron 3 Super 120B A12B',
    provider: 'NVIDIA',
    description: 'High-capacity NVIDIA model for complex reasoning tasks.',
  },
  {
    id: 'mistralai/mistral-nemotron',
    label: 'Mistral Nemotron',
    provider: 'NVIDIA',
    description: 'Mistral/NVIDIA model option for general chat and instruction following.',
  },
  {
    id: 'z-ai/glm5.1',
    label: 'GLM 5.1',
    provider: 'NVIDIA',
    description: 'General chat model available through NVIDIA NIM.',
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
    availableModels: availableAiModels,
  }
}

export function buildAiPlatformConfig(input = {}) {
  return {
    model: normalizeModelId(input.model),
    availableModels: availableAiModels,
  }
}
