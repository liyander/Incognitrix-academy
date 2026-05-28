import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

const editableProfileFields = [
  'first_name',
  'last_name',
  'email',
  'hackthebox_profile',
  'tryhackme_profile',
  'picoctf_profile',
  'github_profile',
  'linkedin_profile',
  'resume_url',
  'about_me',
  'projects',
  'achievements',
]

function normalizeNullable(value) {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const trimmed = String(value).trim()
  return trimmed.length ? trimmed : null
}

function normalizeUserIds(value) {
  const values = Array.isArray(value) ? value : [value]
  return [...new Set(
    values
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0),
  )]
}

function isProtectedAdminUser(user) {
  return String(user?.username || '').trim().toLowerCase() === 'admin01'
}

async function getUserById(userId) {
  const [rows] = await pool.query(
    'SELECT id, username, role, password_hash FROM users WHERE id = ? LIMIT 1',
    [userId],
  )
  return rows[0] || null
}

async function resetUserActivity(conn, userIds) {
  if (!userIds.length) {
    return 0
  }

  await conn.query('DELETE FROM user_room_question_progress WHERE user_id IN (?)', [userIds])
  await conn.query('DELETE FROM user_room_theoretical_attempts WHERE user_id IN (?)', [userIds])
  await conn.query('DELETE FROM user_room_progress WHERE user_id IN (?)', [userIds])
  await conn.query('DELETE FROM user_notes WHERE user_id IN (?)', [userIds])
  await conn.query('DELETE FROM certificates WHERE user_id IN (?)', [userIds])
  await conn.query('DELETE FROM ctf_event_registrations WHERE user_id IN (?)', [userIds])
  await conn.query('DELETE FROM ctf_notification_logs WHERE user_id IN (?)', [userIds])

  return userIds.length
}

router.get('/me', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT
      id,
      username,
      registration_number,
      first_name,
      last_name,
      email,
      role,
      hackthebox_profile,
      tryhackme_profile,
      picoctf_profile,
      github_profile,
      linkedin_profile,
      resume_url,
      about_me,
      projects,
      achievements,
      created_at,
      updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [req.user.id],
  )

  if (!rows.length) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.json(rows[0])
})

router.put('/me', authenticate, async (req, res) => {
  const updates = []
  const values = []

  for (const field of editableProfileFields) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
      updates.push(`${field} = ?`)
      values.push(normalizeNullable(req.body[field]))
    }
  }

  if (!updates.length) {
    return res.status(400).json({ message: 'No editable fields provided' })
  }

  values.push(req.user.id)

  try {
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values)
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email is already in use' })
    }
    throw error
  }

  const [rows] = await pool.query(
    `SELECT
      id,
      username,
      registration_number,
      first_name,
      last_name,
      email,
      role,
      hackthebox_profile,
      tryhackme_profile,
      picoctf_profile,
      github_profile,
      linkedin_profile,
      resume_url,
      about_me,
      projects,
      achievements,
      created_at,
      updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [req.user.id],
  )

  return res.json(rows[0])
})

router.post('/me/password', authenticate, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '')
  const newPassword = String(req.body?.newPassword || '')

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' })
  }

  if (newPassword.trim().length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' })
  }

  const user = await getUserById(req.user.id)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.password_hash)
  if (!passwordMatches) {
    return res.status(403).json({ message: 'Current password is incorrect' })
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id])

  return res.json({ changed: true })
})

router.get('/admin/registrations', authenticate, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT
      id,
      username,
      registration_number,
      first_name,
      last_name,
      email,
      role,
      is_active,
      hackthebox_profile,
      tryhackme_profile,
      picoctf_profile,
      github_profile,
      linkedin_profile,
      resume_url,
      about_me,
      projects,
      achievements,
      created_at,
      updated_at
     FROM users
     ORDER BY created_at DESC`,
  )

  return res.json(rows)
})

router.post('/admin/admins', authenticate, requireAdmin, async (req, res) => {
  const username = String(req.body?.username || '').trim()
  const registrationNumber = normalizeNullable(req.body?.registrationNumber)
  const email = normalizeNullable(req.body?.email)?.toLowerCase() || null
  const password = String(req.body?.password || '')

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' })
  }

  if (password.trim().length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' })
  }

  const hash = await bcrypt.hash(password, 10)

  try {
    const [result] = await pool.query(
      `INSERT INTO users (username, registration_number, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 'admin', true)`,
      [username, registrationNumber, email, hash],
    )

    const [rows] = await pool.query(
      `SELECT
        id,
        username,
        registration_number,
        first_name,
        last_name,
        email,
        role,
        is_active,
        created_at,
        updated_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [result.insertId],
    )

    return res.status(201).json(rows[0])
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username, email, or registration number already exists' })
    }
    throw error
  }
})

router.post('/admin/registrations/bulk-promote-admin', authenticate, requireAdmin, async (req, res) => {
  const userIds = normalizeUserIds(req.body?.userIds)

  if (!userIds.length) {
    return res.status(400).json({ message: 'Select at least one valid user.' })
  }

  const [result] = await pool.query(
    "UPDATE users SET role = 'admin', is_active = true WHERE id IN (?) AND role <> 'admin'",
    [userIds],
  )

  return res.json({
    promoted: Number(result.affectedRows || 0),
    skipped: userIds.length - Number(result.affectedRows || 0),
  })
})

router.post('/admin/registrations/bulk-revoke-admin', authenticate, requireAdmin, async (req, res) => {
  const requestedIds = normalizeUserIds(req.body?.userIds)
  const [protectedRows] = requestedIds.length
    ? await pool.query(
        "SELECT id FROM users WHERE id IN (?) AND LOWER(username) = 'admin01'",
        [requestedIds],
      )
    : [[]]
  const protectedIds = new Set(protectedRows.map((row) => row.id))
  const userIds = requestedIds.filter((id) => id !== req.user.id && !protectedIds.has(id))

  if (!requestedIds.length) {
    return res.status(400).json({ message: 'Select at least one valid user.' })
  }

  if (!userIds.length) {
    return res.status(400).json({ message: 'You cannot revoke your own active admin account.' })
  }

  const [result] = await pool.query(
    "UPDATE users SET role = 'operator' WHERE id IN (?) AND role = 'admin'",
    [userIds],
  )

  return res.json({
    revoked: Number(result.affectedRows || 0),
    skipped: requestedIds.length - Number(result.affectedRows || 0),
  })
})

router.post('/admin/registrations/:id/promote-admin', authenticate, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id)
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'Invalid user id' })
  }

  const [result] = await pool.query(
    "UPDATE users SET role = 'admin', is_active = true WHERE id = ? AND role <> 'admin'",
    [userId],
  )

  if (!result.affectedRows) {
    const [rows] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [userId])
    if (!rows.length) {
      return res.status(404).json({ message: 'User not found' })
    }
  }

  return res.json({ promoted: Number(result.affectedRows || 0), userId })
})

router.post('/admin/registrations/:id/revoke-admin', authenticate, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id)
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'Invalid user id' })
  }

  if (userId === req.user.id) {
    return res.status(400).json({ message: 'You cannot revoke your own active admin account.' })
  }

  const user = await getUserById(userId)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  if (isProtectedAdminUser(user)) {
    return res.status(400).json({ message: 'admin01 is a permanent admin and cannot be revoked.' })
  }

  const [result] = await pool.query(
    "UPDATE users SET role = 'operator' WHERE id = ? AND role = 'admin'",
    [userId],
  )
  return res.json({ revoked: Number(result.affectedRows || 0), userId })
})

router.post('/admin/registrations/:id/password', authenticate, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id)
  const newPassword = String(req.body?.newPassword || '')

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'Invalid user id' })
  }

  if (newPassword.trim().length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' })
  }

  const user = await getUserById(userId)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId])

  return res.json({ changed: true, userId })
})

router.get('/admin/registrations/:id', authenticate, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id)
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ message: 'Invalid user id' })
  }

  const [rows] = await pool.query(
    `SELECT
      id,
      username,
      registration_number,
      first_name,
      last_name,
      email,
      role,
      is_active,
      hackthebox_profile,
      tryhackme_profile,
      picoctf_profile,
      github_profile,
      linkedin_profile,
      resume_url,
      about_me,
      projects,
      achievements,
      created_at,
      updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  )

  if (!rows.length) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.json(rows[0])
})

router.put('/admin/registrations/:id', authenticate, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id)
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ message: 'Invalid user id' })
  }

  const existingUser = await getUserById(userId)
  if (!existingUser) {
    return res.status(404).json({ message: 'User not found' })
  }

  const updates = []
  const values = []

  const editableAdminFields = [
    'registration_number',
    'first_name',
    'last_name',
    'email',
    'role',
    'is_active',
    'hackthebox_profile',
    'tryhackme_profile',
    'picoctf_profile',
    'github_profile',
    'linkedin_profile',
    'resume_url',
    'about_me',
    'projects',
    'achievements',
  ]

  for (const field of editableAdminFields) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
      if (isProtectedAdminUser(existingUser) && field === 'role' && normalizeNullable(req.body[field]) !== 'admin') {
        return res.status(400).json({ message: 'admin01 is a permanent admin and cannot be demoted.' })
      }

      if (isProtectedAdminUser(existingUser) && field === 'is_active' && !Boolean(req.body[field])) {
        return res.status(400).json({ message: 'admin01 cannot be disabled.' })
      }

      if (field === 'is_active') {
        updates.push(`${field} = ?`)
        values.push(Boolean(req.body[field]))
      } else {
        updates.push(`${field} = ?`)
        values.push(normalizeNullable(req.body[field]))
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'password')) {
    const rawPassword = String(req.body.password || '')
    if (rawPassword.trim().length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    }
    const hash = await bcrypt.hash(rawPassword, 10)
    updates.push('password_hash = ?')
    values.push(hash)
  }

  if (!updates.length) {
    return res.status(400).json({ message: 'No editable fields provided' })
  }

  values.push(userId)

  try {
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values)
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email or registration number already in use' })
    }
    throw error
  }

  const [rows] = await pool.query(
    `SELECT
      id,
      username,
      registration_number,
      first_name,
      last_name,
      email,
      role,
      is_active,
      hackthebox_profile,
      tryhackme_profile,
      picoctf_profile,
      github_profile,
      linkedin_profile,
      resume_url,
      about_me,
      projects,
      achievements,
      created_at,
      updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  )

  if (!rows.length) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.json(rows[0])
})

router.post('/admin/registrations/bulk-reset', authenticate, requireAdmin, async (req, res) => {
  const requestedIds = normalizeUserIds(req.body?.userIds)
  const userIds = requestedIds.filter((id) => id !== req.user.id)

  if (!requestedIds.length) {
    return res.status(400).json({ message: 'Select at least one valid user.' })
  }

  if (!userIds.length) {
    return res.status(400).json({ message: 'You cannot reset your own active admin account.' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const resetCount = await resetUserActivity(conn, userIds)
    await conn.commit()

    return res.json({
      reset: resetCount,
      skipped: requestedIds.length - userIds.length,
    })
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
})

router.delete('/admin/registrations/bulk-delete', authenticate, requireAdmin, async (req, res) => {
  const requestedIds = normalizeUserIds(req.body?.userIds)
  const [protectedRows] = requestedIds.length
    ? await pool.query(
        "SELECT id FROM users WHERE id IN (?) AND LOWER(username) = 'admin01'",
        [requestedIds],
      )
    : [[]]
  const protectedIds = new Set(protectedRows.map((row) => row.id))
  const userIds = requestedIds.filter((id) => id !== req.user.id && !protectedIds.has(id))

  if (!requestedIds.length) {
    return res.status(400).json({ message: 'Select at least one valid user.' })
  }

  if (!userIds.length) {
    return res.status(400).json({ message: 'You cannot delete your own active admin account.' })
  }

  const [result] = await pool.query('DELETE FROM users WHERE id IN (?)', [userIds])

  return res.json({
    deleted: Number(result.affectedRows || 0),
    skipped: requestedIds.length - userIds.length,
  })
})

router.post('/admin/registrations/:id/reset', authenticate, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id)
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'Invalid user id' })
  }

  if (userId === req.user.id) {
    return res.status(400).json({ message: 'You cannot reset your own active admin account.' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await resetUserActivity(conn, [userId])
    await conn.commit()
    return res.json({ reset: 1, userId })
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
})

router.delete('/admin/registrations/:id', authenticate, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id)
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'Invalid user id' })
  }

  if (userId === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own active admin account.' })
  }

  const user = await getUserById(userId)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  if (isProtectedAdminUser(user)) {
    return res.status(400).json({ message: 'admin01 is a permanent admin and cannot be deleted.' })
  }

  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId])
  if (!result.affectedRows) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.json({ deleted: true, userId })
})

export default router
