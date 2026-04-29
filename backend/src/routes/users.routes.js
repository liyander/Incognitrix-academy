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

export default router
