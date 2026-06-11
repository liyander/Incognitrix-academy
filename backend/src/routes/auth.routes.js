import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate, signToken } from '../middleware/auth.js'

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

router.post('/register', async (req, res) => {
  const registrationNumber = String(req.body?.registrationNumber || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')

  if (!registrationNumber || !email || !password) {
    return res.status(400).json({ message: 'registrationNumber, email, and password are required' })
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' })
  }

  const [configRows] = await pool.query('SELECT features_json FROM platform_config WHERE id = 1 LIMIT 1')
  const features = parseJsonField(configRows[0]?.features_json, {})
  if (features.publicRegistration === false) {
    return res.status(403).json({ message: 'Public registration is currently disabled' })
  }

  const usernameBase = `operator_${registrationNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`
  const safeUsernameBase = usernameBase || `operator_${Date.now()}`
  let username = safeUsernameBase

  let suffix = 1
  // Ensure generated username uniqueness.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [existingRows] = await pool.query('SELECT 1 FROM users WHERE username = ? LIMIT 1', [username])
    if (!existingRows.length) {
      break
    }
    username = `${safeUsernameBase}_${suffix}`
    suffix += 1
  }

  try {
    const hash = await bcrypt.hash(password, 10)
    const [result] = await pool.query(
      `INSERT INTO users (username, registration_number, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 'operator', true)`,
      [username, registrationNumber, email, hash],
    )

    const token = signToken({ id: result.insertId, username, role: 'operator' })
    return res.status(201).json({
      token,
      user: {
        id: result.insertId,
        username,
        registrationNumber,
        email,
        role: 'operator',
      },
    })
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email or registration number already exists' })
    }
    throw error
  }
})

router.post('/login', async (req, res) => {
  const { password } = req.body || {}
  const identifier = String(
    req.body?.identifier || req.body?.username || req.body?.email || req.body?.registrationNumber || '',
  ).trim()

  if (!identifier || !password) {
    return res.status(400).json({ message: 'identifier and password are required' })
  }

  const [rows] = await pool.query(
    `SELECT id, username, email, registration_number, role, password_hash, is_active
     FROM users
     WHERE username = ? OR email = ? OR registration_number = ?
     LIMIT 1`,
    [identifier, identifier, identifier],
  )

  if (!rows.length) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const user = rows[0]
  if (!user.is_active) {
    return res.status(403).json({ message: 'Account is disabled. Contact admin.' })
  }

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const token = signToken({ id: user.id, username: user.username, role: user.role })
  await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?', [
    user.id,
  ])

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      registrationNumber: user.registration_number,
      role: user.role,
    },
  })
})

router.get('/me', authenticate, async (req, res) => {
  return res.json({ user: req.user })
})

export default router
