import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

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
  const [rows] = await pool.query('SELECT routes_json, features_json FROM platform_config WHERE id = 1')
  if (!rows.length) {
    return res.json({ routes: {}, features: {} })
  }

  return res.json({
    routes: parseJsonField(rows[0].routes_json, {}),
    features: parseJsonField(rows[0].features_json, {}),
  })
})

router.put('/', authenticate, requireAdmin, async (req, res) => {
  const { routes, features } = req.body || {}
  await pool.query(
    'UPDATE platform_config SET routes_json = ?, features_json = ? WHERE id = 1',
    [JSON.stringify(routes || {}), JSON.stringify(features || {})],
  )

  return res.json({ routes: routes || {}, features: features || {} })
})

export default router
