import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { buildAiPlatformConfig } from '../services/aiSettings.js'

const router = Router()

function parseJsonField(value, fallback = {}) {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }

  return value
}

router.get('/', async (_req, res) => {
  const [rows] = await pool.query('SELECT routes_json, features_json, ai_json FROM platform_config WHERE id = 1')
  if (!rows.length) {
    return res.json({ routes: {}, features: {}, ai: buildAiPlatformConfig() })
  }

  return res.json({
    routes: parseJsonField(rows[0].routes_json, {}),
    features: parseJsonField(rows[0].features_json, {}),
    ai: buildAiPlatformConfig(parseJsonField(rows[0].ai_json, {})),
  })
})

router.put('/', authenticate, requireAdmin, async (req, res) => {
  const { routes, features, ai } = req.body || {}
  const aiConfig = buildAiPlatformConfig(ai || {})
  await pool.query(
    `INSERT INTO platform_config (id, routes_json, features_json, ai_json)
     VALUES (1, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       routes_json = VALUES(routes_json),
       features_json = VALUES(features_json),
       ai_json = VALUES(ai_json)`,
    [JSON.stringify(routes || {}), JSON.stringify(features || {}), JSON.stringify(aiConfig)],
  )

  return res.json({ routes: routes || {}, features: features || {}, ai: aiConfig })
})

export default router
