import crypto from 'crypto'
import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requireDeveloper } from '../middleware/auth.js'

const router = Router()

function toIso(value) {
  return value ? new Date(value).toISOString() : null
}

function maskKey(prefix) {
  return `${prefix || 'icx_dev'}...`
}

function hashKey(key) {
  return crypto.createHash('sha256').update(String(key || '')).digest('hex')
}

function extractApiKey(req) {
  const headerKey = req.get('x-api-key') || req.get('X-API-Key') || ''
  if (headerKey) return headerKey.trim()

  const authorization = String(req.get('authorization') || '').trim()
  const [scheme, ...rest] = authorization.split(/\s+/)
  const token = rest.join(' ').trim()
  return /^(bearer|apikey|token)$/i.test(scheme) ? token : ''
}

async function authenticateDeveloperApiKey(req, res, next) {
  const apiKey = extractApiKey(req)
  if (!apiKey) {
    return authenticate(req, res, () => requireDeveloper(req, res, next))
  }

  const [rows] = await pool.query(
    `SELECT k.id, k.user_id, u.username, u.role
     FROM developer_api_keys k
     INNER JOIN users u ON u.id = k.user_id
     WHERE k.key_hash = ? AND k.revoked_at IS NULL AND u.role IN ('admin', 'developer')
     LIMIT 1`,
    [hashKey(apiKey)],
  )

  if (!rows.length) {
    return res.status(401).json({ message: 'Invalid developer API key.' })
  }

  const key = rows[0]
  req.user = { id: key.user_id, username: key.username, role: key.role }
  req.developerApiKeyId = key.id
  void pool.query('UPDATE developer_api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?', [key.id]).catch(() => {})
  return next()
}

async function fetchOverview() {
  const [[userTotals]] = await pool.query(
    `SELECT
       COUNT(*) AS users,
       COUNT(CASE WHEN role = 'operator' THEN 1 END) AS operators,
       COUNT(CASE WHEN role = 'admin' THEN 1 END) AS admins,
       COUNT(CASE WHEN role = 'developer' THEN 1 END) AS developers,
       COUNT(CASE WHEN last_seen_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE) THEN 1 END) AS active_users
     FROM users`,
  )
  const [[progressTotals]] = await pool.query(
    `SELECT
       COUNT(CASE WHEN completed_at IS NULL THEN 1 END) AS rooms_in_progress,
       COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) AS completed_rooms
     FROM user_room_progress`,
  )
  const [[dockerTotals]] = await pool.query(
    `SELECT
       COUNT(*) AS total_instances,
       COUNT(CASE WHEN status = 'running' THEN 1 END) AS running_instances
     FROM user_room_docker_instances`,
  )
  const [[roomTotals]] = await pool.query(
    `SELECT
       COUNT(*) AS rooms,
       COUNT(CASE WHEN room_type = 'practical' THEN 1 END) AS practical_rooms,
       COUNT(CASE WHEN room_type <> 'practical' OR room_type IS NULL THEN 1 END) AS theoretical_rooms
     FROM rooms`,
  )

  return {
    users: {
      total: Number(userTotals?.users || 0),
      operators: Number(userTotals?.operators || 0),
      admins: Number(userTotals?.admins || 0),
      developers: Number(userTotals?.developers || 0),
      active: Number(userTotals?.active_users || 0),
    },
    rooms: {
      total: Number(roomTotals?.rooms || 0),
      practical: Number(roomTotals?.practical_rooms || 0),
      theoretical: Number(roomTotals?.theoretical_rooms || 0),
      inProgress: Number(progressTotals?.rooms_in_progress || 0),
      completed: Number(progressTotals?.completed_rooms || 0),
    },
    docker: {
      totalInstances: Number(dockerTotals?.total_instances || 0),
      runningInstances: Number(dockerTotals?.running_instances || 0),
    },
  }
}

async function fetchActiveUsers() {
  const [rows] = await pool.query(
    `SELECT
       u.id,
       u.username,
       u.registration_number,
       u.email,
       u.role,
       u.last_login_at,
       u.last_seen_at,
       TIMESTAMPDIFF(SECOND, u.last_seen_at, NOW()) AS seconds_idle,
       r.id AS room_id,
       r.slug AS room_slug,
       r.title AS room_title,
       urp.started_at AS room_started_at,
       di.status AS docker_status,
       di.container_name,
       di.host_port,
       di.updated_at AS docker_updated_at
     FROM users u
     LEFT JOIN user_room_progress urp
       ON urp.user_id = u.id
      AND urp.completed_at IS NULL
      AND urp.started_at = (
        SELECT MAX(started_at)
        FROM user_room_progress latest
        WHERE latest.user_id = u.id AND latest.completed_at IS NULL
      )
     LEFT JOIN rooms r ON r.id = urp.room_id
     LEFT JOIN user_room_docker_instances di ON di.user_id = u.id AND di.status = 'running'
     WHERE u.last_seen_at IS NOT NULL
     ORDER BY u.last_seen_at DESC
     LIMIT 100`,
  )

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    registrationNumber: row.registration_number,
    email: row.email,
    role: row.role,
    active: Number(row.seconds_idle || 999999) <= 900,
    secondsIdle: Number(row.seconds_idle || 0),
    lastLoginAt: toIso(row.last_login_at),
    lastSeenAt: toIso(row.last_seen_at),
    currentRoom: row.room_id
      ? {
          id: row.room_id,
          slug: row.room_slug,
          title: row.room_title,
          startedAt: toIso(row.room_started_at),
        }
      : null,
    docker: row.container_name
      ? {
          status: row.docker_status,
          containerName: row.container_name,
          hostPort: row.host_port,
          updatedAt: toIso(row.docker_updated_at),
        }
      : null,
  }))
}

async function fetchDockerInstances() {
  const [rows] = await pool.query(
    `SELECT
       di.id,
       di.user_id,
       u.username,
       u.registration_number,
       di.room_id,
       r.title AS room_title,
       r.slug AS room_slug,
       di.container_name,
       di.host_port,
       di.status,
       di.created_at,
       di.updated_at
     FROM user_room_docker_instances di
     LEFT JOIN users u ON u.id = di.user_id
     LEFT JOIN rooms r ON r.id = di.room_id
     ORDER BY di.updated_at DESC
     LIMIT 200`,
  )

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    registrationNumber: row.registration_number,
    roomId: row.room_id,
    roomTitle: row.room_title,
    roomSlug: row.room_slug,
    containerName: row.container_name,
    hostPort: row.host_port,
    status: row.status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }))
}

async function fetchDataResource(resource) {
  if (resource === 'users') {
    const [items] = await pool.query(
      `SELECT id, username, registration_number, email, role, is_active, last_login_at, last_seen_at, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 1000`,
    )
    return { total: items.length, items }
  }

  if (resource === 'rooms') {
    const [items] = await pool.query(
      `SELECT id, slug, title, category, room_type, difficulty, xp, docker_enabled, created_at, updated_at
       FROM rooms
       ORDER BY updated_at DESC`,
    )
    return { total: items.length, items }
  }

  if (resource === 'progress') {
    const [items] = await pool.query(
      `SELECT urp.*, u.username, r.title AS room_title
       FROM user_room_progress urp
       LEFT JOIN users u ON u.id = urp.user_id
       LEFT JOIN rooms r ON r.id = urp.room_id
       ORDER BY urp.updated_at DESC
       LIMIT 2000`,
    )
    return { total: items.length, items }
  }

  if (resource === 'docker') {
    const items = await fetchDockerInstances()
    return { total: items.length, items }
  }

  if (resource === 'career-paths') {
    const [items] = await pool.query(
      `SELECT id, slug, title, description, roadmap_sort_order, created_at, updated_at
       FROM career_paths
       ORDER BY roadmap_sort_order ASC, title ASC`,
    )
    return { total: items.length, items }
  }

  if (resource === 'all') {
    return {
      overview: await fetchOverview(),
      activeUsers: await fetchActiveUsers(),
      docker: await fetchDockerInstances(),
      users: await fetchDataResource('users'),
      rooms: await fetchDataResource('rooms'),
      progress: await fetchDataResource('progress'),
      careerPaths: await fetchDataResource('career-paths'),
    }
  }

  return null
}

router.get('/data/:resource', authenticateDeveloperApiKey, async (req, res, next) => {
  try {
    const data = await fetchDataResource(req.params.resource)
    if (!data) {
      return res.status(404).json({ message: 'Unknown data resource' })
    }
    return res.json(data)
  } catch (error) {
    return next(error)
  }
})

router.use(authenticate)
router.use(requireDeveloper)

router.get('/overview', async (_req, res, next) => {
  try {
    return res.json(await fetchOverview())
  } catch (error) {
    return next(error)
  }
})

router.get('/active-users', async (_req, res, next) => {
  try {
    const items = await fetchActiveUsers()
    return res.json({ total: items.length, items })
  } catch (error) {
    return next(error)
  }
})

router.get('/docker', async (_req, res, next) => {
  try {
    const items = await fetchDockerInstances()
    return res.json({ total: items.length, running: items.filter((item) => item.status === 'running').length, items })
  } catch (error) {
    return next(error)
  }
})

router.get('/api-keys', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, key_prefix, scopes_json, last_used_at, revoked_at, created_at
       FROM developer_api_keys
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id],
    )
    return res.json({
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        key: maskKey(row.key_prefix),
        scopes: row.scopes_json,
        lastUsedAt: toIso(row.last_used_at),
        revokedAt: toIso(row.revoked_at),
        createdAt: toIso(row.created_at),
      })),
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/api-keys', async (req, res, next) => {
  try {
    const name = String(req.body?.name || 'Developer Key').trim().slice(0, 120) || 'Developer Key'
    const rawKey = `icx_dev_${crypto.randomBytes(28).toString('hex')}`
    const keyPrefix = rawKey.slice(0, 18)
    const [result] = await pool.query(
      `INSERT INTO developer_api_keys (user_id, name, key_hash, key_prefix, scopes_json)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, name, hashKey(rawKey), keyPrefix, JSON.stringify(['read:all'])],
    )

    return res.status(201).json({
      id: result.insertId,
      name,
      key: rawKey,
      keyPreview: maskKey(keyPrefix),
      scopes: ['read:all'],
    })
  } catch (error) {
    return next(error)
  }
})

router.delete('/api-keys/:id', async (req, res, next) => {
  try {
    const keyId = Number(req.params.id)
    if (!Number.isInteger(keyId) || keyId <= 0) {
      return res.status(400).json({ message: 'Invalid API key id' })
    }
    const [result] = await pool.query(
      'UPDATE developer_api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND revoked_at IS NULL',
      [keyId, req.user.id],
    )
    return res.json({ revoked: Number(result.affectedRows || 0), id: keyId })
  } catch (error) {
    return next(error)
  }
})

router.get('/docs', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT markdown, updated_at FROM developer_documents WHERE user_id = ? LIMIT 1', [
      req.user.id,
    ])
    return res.json({
      markdown:
        rows[0]?.markdown ||
        '# Incognitrix Developer Notes\n\nDocument your integrations, endpoint behavior, and API usage here.',
      updatedAt: toIso(rows[0]?.updated_at),
    })
  } catch (error) {
    return next(error)
  }
})

router.put('/docs', async (req, res, next) => {
  try {
    const markdown = String(req.body?.markdown || '').slice(0, 200000)
    await pool.query(
      `INSERT INTO developer_documents (user_id, markdown)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE markdown = VALUES(markdown), updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, markdown],
    )
    return res.json({ saved: true })
  } catch (error) {
    return next(error)
  }
})

router.post('/console', async (req, res, next) => {
  try {
    const resource = String(req.body?.resource || '').trim()
    const data = await fetchDataResource(resource)
    if (!data) {
      return res.status(400).json({ message: 'Choose one of: all, users, rooms, progress, docker, career-paths.' })
    }
    return res.json({ resource, response: data })
  } catch (error) {
    return next(error)
  }
})

export default router
