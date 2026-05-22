import { env } from '../../config/env.js'

function parseApiKeys(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function extractApiKey(req) {
  const headerKey = req.get('x-api-key') || req.get('X-API-Key') || ''
  if (headerKey) {
    return headerKey.trim()
  }

  const authorization = String(req.get('authorization') || '').trim()
  if (!authorization) {
    return ''
  }

  const [scheme, ...rest] = authorization.split(/\s+/)
  const token = rest.join(' ').trim()

  if (!token) {
    return ''
  }

  if (/^(bearer|apikey|token)$/i.test(scheme)) {
    return token
  }

  return ''
}

const configuredApiKeys = parseApiKeys(env.publicApiKeys)

export function requirePublicApiKey(req, res, next) {
  if (!configuredApiKeys.length) {
    return res.status(503).json({
      message: 'Public API key is not configured on this server.',
    })
  }

  const presentedKey = extractApiKey(req)
  if (!presentedKey) {
    return res.status(401).json({ message: 'Missing API key.' })
  }

  if (!configuredApiKeys.includes(presentedKey)) {
    return res.status(401).json({ message: 'Invalid API key.' })
  }

  req.publicApiKey = presentedKey
  return next()
}

export function getPublicApiKeyState() {
  return {
    configured: configuredApiKeys.length > 0,
    keyCount: configuredApiKeys.length,
  }
}
