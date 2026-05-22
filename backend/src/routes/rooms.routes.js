import { Router } from 'express'
import OpenAI from 'openai'
import { pool } from '../db/pool.js'
import { env } from '../config/env.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { mapRoomRow } from '../services/roomMapper.js'

const router = Router()

function isTheoreticalRoom(room) {
  return String(room?.roomType || 'theoretical').toLowerCase() !== 'practical'
}

function safeJsonParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw || '')
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function extractJsonObject(raw) {
  const text = String(raw || '').trim()
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidates = [
    text,
    fenced?.[1],
    text.includes('{') ? text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1) : '',
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // try next
    }
  }

  return null
}

function buildFallbackTheoreticalQuestions(room, userId) {
  const seed = Number(userId || 1) % 3
  const topic = room.title || room.category || 'this security concept'
  const variants = [
    [
      `Explain the core security risk demonstrated in "${topic}" and why it matters.`,
      `Describe two practical mitigations for "${topic}" and when you would apply them.`,
      `Give a concise example scenario where "${topic}" could affect a real system.`,
    ],
    [
      `Define "${topic}" in your own words and identify the vulnerable trust boundary.`,
      `What indicators would help you detect or validate this issue in an authorized lab?`,
      `Summarize the remediation strategy for "${topic}" as an engineering checklist.`,
    ],
    [
      `What assumptions fail in "${topic}" and how can attackers benefit from those failures?`,
      `Compare prevention and detection controls for "${topic}".`,
      `Write a short incident note explaining the likely impact of "${topic}".`,
    ],
  ]

  return variants[seed].map((prompt, index) => ({
    id: `ai-q-${index + 1}`,
    prompt,
    rubric: 'Assess conceptual accuracy, specificity, remediation quality, and clarity.',
  }))
}

async function generateTheoreticalQuestions(room, userId) {
  if (!env.nvidiaApiKey) {
    return buildFallbackTheoreticalQuestions(room, userId)
  }

  try {
    const client = new OpenAI({
      baseURL: env.aiBaseUrl,
      apiKey: env.nvidiaApiKey,
    })

    const response = await client.chat.completions.create({
      model: env.aiModel,
      temperature: 0.7,
      top_p: env.aiTopP,
      max_tokens: 900,
      stream: false,
      messages: [
        {
          role: 'system',
          content:
            'Generate assessment questions for a cybersecurity learning room. Return strict JSON only: {"questions":[{"id":"q1","prompt":"string","rubric":"string"}]}. Create exactly 3 open-ended theoretical questions. Do not include answers.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            learnerSeed: userId,
            title: room.title,
            category: room.category,
            difficulty: room.difficulty || room.level,
            overview: room.content?.missionOverview || room.description,
            technicalDeepDive: room.content?.technicalDeepDive,
          }),
        },
      ],
    })

    const raw = response?.choices?.[0]?.message?.content || ''
    const parsed = extractJsonObject(raw)
    const questions = Array.isArray(parsed?.questions) ? parsed.questions : []
    const normalized = questions
      .map((question, index) => ({
        id: String(question?.id || `ai-q-${index + 1}`).trim(),
        prompt: String(question?.prompt || '').trim(),
        rubric: String(question?.rubric || '').trim(),
      }))
      .filter((question) => question.id && question.prompt)

    return normalized.length ? normalized.slice(0, 3) : buildFallbackTheoreticalQuestions(room, userId)
  } catch (error) {
    console.error('Failed to generate theoretical questions:', error)
    return buildFallbackTheoreticalQuestions(room, userId)
  }
}

async function evaluateTheoreticalAnswers(room, questions, answers) {
  if (!env.nvidiaApiKey) {
    const answeredCount = questions.filter((question) => String(answers?.[question.id] || '').trim().length >= 40).length
    const technicalScore = answeredCount === questions.length ? 100 : Math.round((answeredCount / questions.length) * 80)
    const grammarScore = Math.min(100, Math.max(40, Math.round(
      Object.values(answers || {}).join(' ').split(/\s+/).filter(Boolean).length * 2,
    )))
    return {
      technicalScore,
      grammarScore,
      feedback:
        technicalScore === 100
          ? 'Fallback evaluator accepted all responses as sufficiently detailed.'
          : 'Add more complete, technically specific answers for every question.',
    }
  }

  try {
    const client = new OpenAI({
      baseURL: env.aiBaseUrl,
      apiKey: env.nvidiaApiKey,
    })

    const response = await client.chat.completions.create({
      model: env.aiModel,
      temperature: 0.1,
      top_p: env.aiTopP,
      max_tokens: 900,
      stream: false,
      messages: [
        {
          role: 'system',
          content:
            'Evaluate cybersecurity assessment answers. Return strict JSON only: {"technicalScore":0-100,"grammarScore":0-100,"feedback":"string"}. Technical score must be 100 only when all answers are completely correct, specific, and aligned with the room content. Grammar score evaluates clarity, grammar, and professional writing.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            room: {
              title: room.title,
              category: room.category,
              overview: room.content?.missionOverview || room.description,
              technicalDeepDive: room.content?.technicalDeepDive,
            },
            questions,
            answers,
          }),
        },
      ],
    })

    const parsed = extractJsonObject(response?.choices?.[0]?.message?.content || '')
    return {
      technicalScore: Math.max(0, Math.min(100, Number(parsed?.technicalScore || 0))),
      grammarScore: Math.max(0, Math.min(100, Number(parsed?.grammarScore || 0))),
      feedback: String(parsed?.feedback || 'Evaluation completed.'),
    }
  } catch (error) {
    console.error('Failed to evaluate theoretical answers:', error)
    return {
      technicalScore: 0,
      grammarScore: 0,
      feedback: 'AI evaluation failed. Please try again.',
    }
  }
}

async function getOrCreateTheoreticalAttempt(room, userId) {
  const [rows] = await pool.query(
    `SELECT *
     FROM user_room_theoretical_attempts
     WHERE user_id = ? AND room_id = ?
     LIMIT 1`,
    [userId, room.id],
  )

  if (rows.length) {
    return rows[0]
  }

  const questions = await generateTheoreticalQuestions(room, userId)
  await pool.query(
    `INSERT INTO user_room_theoretical_attempts (user_id, room_id, questions_json)
     VALUES (?, ?, ?)`,
    [userId, room.id, JSON.stringify(questions)],
  )

  const [createdRows] = await pool.query(
    `SELECT *
     FROM user_room_theoretical_attempts
     WHERE user_id = ? AND room_id = ?
     LIMIT 1`,
    [userId, room.id],
  )

  return createdRows[0]
}

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

router.get('/scoreboard/summary', authenticate, async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT
       u.id,
       u.username,
       COUNT(DISTINCT CASE WHEN urp.completed_at IS NOT NULL THEN urp.room_id END) AS completed_rooms,
       COALESCE(SUM(CASE WHEN urp.completed_at IS NOT NULL THEN CAST(REPLACE(REPLACE(r.xp, ',', ''), ' XP', '') AS UNSIGNED) ELSE 0 END), 0) AS xp,
       COALESCE(ROUND(AVG(NULLIF(uta.technical_score, 0))), 0) AS avg_technical_score,
       COALESCE(ROUND(AVG(NULLIF(uta.grammar_score, 0))), 0) AS avg_grammar_score,
       MAX(urp.completed_at) AS last_completed_at
     FROM users u
     LEFT JOIN user_room_progress urp ON urp.user_id = u.id
     LEFT JOIN rooms r ON r.id = urp.room_id
     LEFT JOIN user_room_theoretical_attempts uta ON uta.user_id = u.id
     WHERE u.role = 'operator'
     GROUP BY u.id, u.username
     ORDER BY xp DESC, completed_rooms DESC, avg_technical_score DESC, u.username ASC
     LIMIT 100`,
  )

  return res.json(rows.map((row, index) => ({
    rank: index + 1,
    userId: row.id,
    username: row.username,
    completedRooms: Number(row.completed_rooms || 0),
    xp: Number(row.xp || 0),
    averageTechnicalScore: Number(row.avg_technical_score || 0),
    averageGrammarScore: Number(row.avg_grammar_score || 0),
    lastCompletedAt: row.last_completed_at ? new Date(row.last_completed_at).toISOString() : null,
  })))
})

router.get('/streaks/me', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT DATE(completed_at) AS completed_date
     FROM user_room_progress
     WHERE user_id = ? AND completed_at IS NOT NULL
     GROUP BY DATE(completed_at)
     ORDER BY completed_date DESC`,
    [req.user.id],
  )

  const dates = new Set(rows.map((row) => new Date(row.completed_date).toISOString().slice(0, 10)))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let cursor = new Date(today)
  if (!dates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let currentStreak = 0
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    currentStreak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  const ordered = [...dates].sort()
  let longestStreak = 0
  let activeRun = 0
  let previous = null

  for (const dateKey of ordered) {
    const date = new Date(`${dateKey}T00:00:00Z`)
    if (previous) {
      const diffDays = Math.round((date - previous) / 86400000)
      activeRun = diffDays === 1 ? activeRun + 1 : 1
    } else {
      activeRun = 1
    }
    longestStreak = Math.max(longestStreak, activeRun)
    previous = date
  }

  return res.json({
    currentStreak,
    longestStreak,
    activeDays: dates.size,
    lastCompletedDate: rows[0]?.completed_date ? new Date(rows[0].completed_date).toISOString().slice(0, 10) : null,
  })
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
    if (isTheoreticalRoom(room)) {
      const [attemptRows] = await pool.query(
        `SELECT passed
         FROM user_room_theoretical_attempts
         WHERE user_id = ? AND room_id = ?
         LIMIT 1`,
        [req.user.id, room.id],
      )

      if (!attemptRows[0]?.passed) {
        return res.status(400).json({
          message: 'Score 100 in the theoretical technical evaluation before marking this room complete.',
        })
      }
    } else if (room?.content?.questionsEnabled) {
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

  if (isTheoreticalRoom(room)) {
    const attempt = await getOrCreateTheoreticalAttempt(room, req.user.id)
    const questions = safeJsonParse(attempt.questions_json, [])
    const answers = safeJsonParse(attempt.answers_json, {})

    return res.json({
      enabled: true,
      mode: 'theoretical',
      total: questions.length,
      correct: Number(attempt.technical_score || 0) === 100 ? questions.length : 0,
      allCorrect: Boolean(attempt.passed),
      technicalScore: Number(attempt.technical_score || 0),
      grammarScore: Number(attempt.grammar_score || 0),
      feedback: attempt.feedback || '',
      evaluatedAt: attempt.evaluated_at ? new Date(attempt.evaluated_at).toISOString() : null,
      answers,
      questions: questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        hint: question.rubric || '',
        answeredCorrectly: Boolean(attempt.passed),
        answeredAt: attempt.evaluated_at ? new Date(attempt.evaluated_at).toISOString() : null,
      })),
    })
  }

  const questions = parseRoomQuestions(room)
  if (!room?.content?.questionsEnabled || questions.length === 0) {
    return res.json({
      enabled: false,
      mode: 'practical',
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
    mode: 'practical',
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

  if (isTheoreticalRoom(room)) {
    const attempt = await getOrCreateTheoreticalAttempt(room, req.user.id)
    const questions = safeJsonParse(attempt.questions_json, [])
    const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {}
    const evaluation = await evaluateTheoreticalAnswers(room, questions, answers)
    const passed = Number(evaluation.technicalScore) === 100

    await pool.query(
      `UPDATE user_room_theoretical_attempts
       SET answers_json = ?,
           technical_score = ?,
           grammar_score = ?,
           feedback = ?,
           passed = ?,
           evaluated_at = NOW()
       WHERE user_id = ? AND room_id = ?`,
      [
        JSON.stringify(answers),
        evaluation.technicalScore,
        evaluation.grammarScore,
        evaluation.feedback,
        passed,
        req.user.id,
        room.id,
      ],
    )

    if (passed) {
      await pool.query(
        `INSERT INTO user_room_progress (user_id, room_id, started_at, completed_at)
           VALUES (?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
             started_at = COALESCE(started_at, NOW()),
             completed_at = NOW()`,
        [req.user.id, room.id],
      )
    }

    return res.json({
      mode: 'theoretical',
      total: questions.length,
      correct: passed ? questions.length : 0,
      allCorrect: passed,
      technicalScore: evaluation.technicalScore,
      grammarScore: evaluation.grammarScore,
      feedback: evaluation.feedback,
    })
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
        room_type, difficulty, estimate_time, environment, category_tag, content_markdown,
        content_html, mission_overview, remediation_protocols,
        vulnerability_definition, vulnerability_impact, technical_deep_dive
        , youtube_video_url, questions_enabled, questions_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        payload.roomType === 'practical' ? 'practical' : 'theoretical',
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
        room_type = ?, difficulty = ?, estimate_time = ?, environment = ?, category_tag = ?,
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
        payload.roomType === 'practical' ? 'practical' : 'theoretical',
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
