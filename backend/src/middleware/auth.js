import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '12h' })
}

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const [, token] = authHeader.split(' ')

  if (!token) {
    return res.status(401).json({ message: 'Missing auth token' })
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret)
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export function optionalAuthenticate(req, _res, next) {
  const authHeader = req.headers.authorization || ''
  const [, token] = authHeader.split(' ')

  if (!token) {
    return next()
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret)
  } catch {
    req.user = null
  }

  return next()
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin role required' })
  }
  return next()
}
