import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate, signToken } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}

  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' })
  }

  const [rows] = await pool.query('SELECT id, username, role, password_hash FROM users WHERE username = ?', [
    username,
  ])

  if (!rows.length) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const user = rows[0]
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const token = signToken({ id: user.id, username: user.username, role: user.role })

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  })
})

router.get('/me', authenticate, async (req, res) => {
  return res.json({ user: req.user })
})

export default router
