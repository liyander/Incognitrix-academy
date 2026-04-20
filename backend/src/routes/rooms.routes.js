import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { mapRoomRow } from '../services/roomMapper.js'

const router = Router()

function parseRoomQuestions(room) {
  const questions = Array.isArray(room?.content?.questions) ? room.content.questions : []
  return questions
    .map((question, index) => {
      const id = String(question?.id || `q-${index + 1}`).trim()
      const prompt = String(question?.prompt || '').trim()
      const answer = String(question?.answer || '').trim()
      const hint = String(question?.hint || '').trim()

      if (!id || !prompt || !answer) {
        return null
      }

      return {
        id,
        prompt,
        answer,
        hint,
      }
    })
    .filter(Boolean)
}

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

router.get('/', async (_req, res) => {
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

router.get('/progress', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT room_id, started_at, completed_at
     FROM user_room_progress
     WHERE user_id = ?`,
    [req.user.id],
  )

  const progress = {}
  for (const row of rows) {
    progress[row.room_id] = {
      startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    }
  }

  return res.json(progress)
})

router.put('/:id/progress', authenticate, async (req, res) => {
  const room = await fetchRoomById(req.params.id)
  if (!room) {
    return res.status(404).json({ message: 'Room not found' })
  }

  const status = req.body?.status
  if (!['not-started', 'in-progress', 'completed'].includes(status)) {
    return res.status(400).json({ message: 'status must be one of: not-started, in-progress, completed' })
  }

  if (status === 'not-started') {
    await pool.query('DELETE FROM user_room_progress WHERE user_id = ? AND room_id = ?', [
      req.user.id,
      room.id,
    ])

    return res.json({
      roomId: room.id,
      startedAt: null,
      completedAt: null,
      status,
    })
  }

  if (status === 'in-progress') {
    await pool.query(
      `INSERT INTO user_room_progress (user_id, room_id, started_at, completed_at)
         VALUES (?, ?, NOW(), NULL)
       ON DUPLICATE KEY UPDATE
           started_at = COALESCE(started_at, NOW()),
         completed_at = NULL`,
        [req.user.id, room.id],
    )
  }

  if (status === 'completed') {
    if (room?.content?.questionsEnabled) {
      const requiredQuestions = parseRoomQuestions(room)
      if (requiredQuestions.length > 0) {
        const [progressRows] = await pool.query(
          `SELECT question_id
           FROM user_room_question_progress
           WHERE user_id = ? AND room_id = ? AND answered_correctly = true`,
          [req.user.id, room.id],
        )

        const completedSet = new Set(progressRows.map((row) => String(row.question_id)))
        const allCompleted = requiredQuestions.every((question) => completedSet.has(question.id))

        if (!allCompleted) {
          return res.status(400).json({
            message: 'Complete all configured questions correctly before marking this room complete.',
          })
        }
      }
    }

    await pool.query(
      `INSERT INTO user_room_progress (user_id, room_id, started_at, completed_at)
         VALUES (?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
           started_at = COALESCE(started_at, NOW()),
         completed_at = VALUES(completed_at)`,
        [req.user.id, room.id],
    )
  }

  const [rows] = await pool.query(
    'SELECT started_at, completed_at FROM user_room_progress WHERE user_id = ? AND room_id = ? LIMIT 1',
    [req.user.id, room.id],
  )

  const row = rows[0] || {}
  return res.json({
    roomId: room.id,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    status,
  })
})

router.get('/:id/questions/status', authenticate, async (req, res) => {
  const room = await fetchRoomById(req.params.id)
  if (!room) {
    return res.status(404).json({ message: 'Room not found' })
  }

  const questions = parseRoomQuestions(room)
  if (!room?.content?.questionsEnabled || questions.length === 0) {
    return res.json({
      enabled: false,
      total: 0,
      correct: 0,
      allCorrect: true,
      questions: [],
    })
  }

  const [rows] = await pool.query(
    `SELECT question_id, answered_correctly, answered_at
     FROM user_room_question_progress
     WHERE user_id = ? AND room_id = ?`,
    [req.user.id, room.id],
  )

  const progressMap = new Map(rows.map((row) => [String(row.question_id), row]))
  const questionStatus = questions.map((question) => {
    const progress = progressMap.get(question.id)
    return {
      id: question.id,
      prompt: question.prompt,
      hint: question.hint,
      answeredCorrectly: Boolean(progress?.answered_correctly),
      answeredAt: progress?.answered_at ? new Date(progress.answered_at).toISOString() : null,
    }
  })

  const correct = questionStatus.filter((question) => question.answeredCorrectly).length

  return res.json({
    enabled: true,
    total: questions.length,
    correct,
    allCorrect: correct === questions.length,
    questions: questionStatus,
  })
})

router.post('/:id/questions/submit', authenticate, async (req, res) => {
  const room = await fetchRoomById(req.params.id)
  if (!room) {
    return res.status(404).json({ message: 'Room not found' })
  }

  const questions = parseRoomQuestions(room)
  if (!room?.content?.questionsEnabled || questions.length === 0) {
    return res.status(400).json({ message: 'Question mode is disabled for this room.' })
  }

  const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {}
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    for (const question of questions) {
      const providedAnswer = String(answers[question.id] || '').trim()
      const isCorrect =
        providedAnswer.length > 0 &&
        providedAnswer.localeCompare(question.answer.trim(), undefined, { sensitivity: 'accent' }) === 0

      if (isCorrect) {
        await conn.query(
          `INSERT INTO user_room_question_progress (user_id, room_id, question_id, answered_correctly, answered_at)
           VALUES (?, ?, ?, true, NOW())
           ON DUPLICATE KEY UPDATE
             answered_correctly = true,
             answered_at = NOW()`,
          [req.user.id, room.id, question.id],
        )
      } else {
        await conn.query(
          `INSERT INTO user_room_question_progress (user_id, room_id, question_id, answered_correctly, answered_at)
           VALUES (?, ?, ?, false, NULL)
           ON DUPLICATE KEY UPDATE
             answered_correctly = false,
             answered_at = NULL`,
          [req.user.id, room.id, question.id],
        )
      }
    }

    await conn.commit()
  } catch (error) {
    await conn.rollback()
    return res.status(500).json({ message: error.message })
  } finally {
    conn.release()
  }

  const [rows] = await pool.query(
    `SELECT question_id, answered_correctly
     FROM user_room_question_progress
     WHERE user_id = ? AND room_id = ?`,
    [req.user.id, room.id],
  )

  const completedSet = new Set(
    rows.filter((row) => Boolean(row.answered_correctly)).map((row) => String(row.question_id)),
  )

  const correct = questions.filter((question) => completedSet.has(question.id)).length

  return res.json({
    total: questions.length,
    correct,
    allCorrect: correct === questions.length,
  })
})

router.get('/:id', async (req, res) => {
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
        , youtube_video_url, questions_enabled, questions_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        payload.content?.youtubeVideoUrl || null,
        Boolean(payload.content?.questionsEnabled),
        JSON.stringify(parseRoomQuestions(payload)),
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
        vulnerability_definition = ?, vulnerability_impact = ?, technical_deep_dive = ?,
        youtube_video_url = ?, questions_enabled = ?, questions_json = ?
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
        payload.content?.youtubeVideoUrl ?? existing.content.youtubeVideoUrl ?? null,
        Boolean(payload.content?.questionsEnabled ?? existing.content.questionsEnabled),
        JSON.stringify(
          parseRoomQuestions({
            content: {
              questions:
                payload.content?.questions ??
                existing.content.questions ??
                [],
            },
          }),
        ),
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
