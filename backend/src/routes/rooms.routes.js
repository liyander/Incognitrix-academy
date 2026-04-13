import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { mapRoomRow } from '../services/roomMapper.js'

const router = Router()

async function fetchRoomById(id) {
  const [roomRows] = await pool.query('SELECT * FROM rooms WHERE id = ? OR slug = ? LIMIT 1', [id, id])
  if (!roomRows.length) {
    return null
  }

  const room = roomRows[0]
  const [tagRows] = await pool.query('SELECT tag FROM room_tags WHERE room_id = ?', [room.id])
  const [keywordRows] = await pool.query('SELECT keyword FROM room_required_keywords WHERE room_id = ?', [room.id])

  return mapRoomRow(
    room,
    tagRows.map((row) => row.tag),
    keywordRows.map((row) => row.keyword),
  )
}

function buildRoomId(input) {
  const base = (input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  return base || `room-${Date.now()}`
}

router.get('/', authenticate, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM rooms ORDER BY created_at DESC')
  const rooms = []

  for (const room of rows) {
    const [tagRows] = await pool.query('SELECT tag FROM room_tags WHERE room_id = ?', [room.id])
    const [keywordRows] = await pool.query('SELECT keyword FROM room_required_keywords WHERE room_id = ?', [
      room.id,
    ])
    rooms.push(
      mapRoomRow(
        room,
        tagRows.map((row) => row.tag),
        keywordRows.map((row) => row.keyword),
      ),
    )
  }

  return res.json(rooms)
})

router.get('/:id', authenticate, async (req, res) => {
  const room = await fetchRoomById(req.params.id)
  if (!room) {
    return res.status(404).json({ message: 'Room not found' })
  }
  return res.json(room)
})

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const payload = req.body || {}
  if (!payload.title) {
    return res.status(400).json({ message: 'title is required' })
  }

  const id = buildRoomId(payload.slug || payload.title)
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    await conn.query(
      `INSERT INTO rooms (
        id, slug, category, level, level_tone, dot_tone, title, description, xp,
        difficulty, estimate_time, environment, category_tag, content_markdown,
        content_html, mission_overview, remediation_protocols,
        vulnerability_definition, vulnerability_impact, technical_deep_dive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        id,
        payload.category || null,
        payload.level || null,
        payload.levelTone || null,
        payload.dotTone || null,
        payload.title,
        payload.description || null,
        payload.xp || null,
        payload.difficulty || null,
        payload.estimateTime || null,
        payload.environment || null,
        payload.categoryTag || null,
        payload.content?.markdown || '',
        payload.content?.html || '',
        payload.content?.missionOverview || '',
        payload.content?.remediationProtocols || '',
        payload.content?.vulnerabilityBriefing?.definition || '',
        payload.content?.vulnerabilityBriefing?.impact || '',
        payload.content?.technicalDeepDive || '',
      ],
    )

    for (const tag of payload.tags || []) {
      await conn.query('INSERT INTO room_tags (room_id, tag) VALUES (?, ?)', [id, tag])
    }

    for (const keyword of payload.requiredKeywords || []) {
      await conn.query('INSERT INTO room_required_keywords (room_id, keyword) VALUES (?, ?)', [
        id,
        keyword,
      ])
    }

    await conn.commit()
  } catch (error) {
    await conn.rollback()
    return res.status(500).json({ message: error.message })
  } finally {
    conn.release()
  }

  const created = await fetchRoomById(id)
  return res.status(201).json(created)
})

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const existing = await fetchRoomById(req.params.id)
  if (!existing) {
    return res.status(404).json({ message: 'Room not found' })
  }

  const payload = req.body || {}
  const roomId = existing.id
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    await conn.query(
      `UPDATE rooms SET
        category = ?, level = ?, level_tone = ?, dot_tone = ?, title = ?, description = ?, xp = ?,
        difficulty = ?, estimate_time = ?, environment = ?, category_tag = ?,
        content_markdown = ?, content_html = ?, mission_overview = ?, remediation_protocols = ?,
        vulnerability_definition = ?, vulnerability_impact = ?, technical_deep_dive = ?
      WHERE id = ?`,
      [
        payload.category ?? existing.category,
        payload.level ?? existing.level,
        payload.levelTone ?? existing.levelTone,
        payload.dotTone ?? existing.dotTone,
        payload.title ?? existing.title,
        payload.description ?? existing.description,
        payload.xp ?? existing.xp,
        payload.difficulty ?? existing.difficulty,
        payload.estimateTime ?? existing.estimateTime,
        payload.environment ?? existing.environment,
        payload.categoryTag ?? existing.categoryTag,
        payload.content?.markdown ?? existing.content.markdown,
        payload.content?.html ?? existing.content.html,
        payload.content?.missionOverview ?? existing.content.missionOverview,
        payload.content?.remediationProtocols ?? existing.content.remediationProtocols,
        payload.content?.vulnerabilityBriefing?.definition ??
          existing.content.vulnerabilityBriefing.definition,
        payload.content?.vulnerabilityBriefing?.impact ?? existing.content.vulnerabilityBriefing.impact,
        payload.content?.technicalDeepDive ?? existing.content.technicalDeepDive,
        roomId,
      ],
    )

    await conn.query('DELETE FROM room_tags WHERE room_id = ?', [roomId])
    await conn.query('DELETE FROM room_required_keywords WHERE room_id = ?', [roomId])

    for (const tag of payload.tags ?? existing.tags) {
      await conn.query('INSERT INTO room_tags (room_id, tag) VALUES (?, ?)', [roomId, tag])
    }

    for (const keyword of payload.requiredKeywords ?? existing.requiredKeywords) {
      await conn.query('INSERT INTO room_required_keywords (room_id, keyword) VALUES (?, ?)', [
        roomId,
        keyword,
      ])
    }

    await conn.commit()
  } catch (error) {
    await conn.rollback()
    return res.status(500).json({ message: error.message })
  } finally {
    conn.release()
  }

  const updated = await fetchRoomById(roomId)
  return res.json(updated)
})

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const existing = await fetchRoomById(req.params.id)
  if (!existing) {
    return res.status(404).json({ message: 'Room not found' })
  }

  await pool.query('DELETE FROM rooms WHERE id = ?', [existing.id])
  return res.status(204).send()
})

export default router
