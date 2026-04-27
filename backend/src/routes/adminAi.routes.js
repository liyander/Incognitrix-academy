import { Router } from 'express'
import OpenAI from 'openai'
import { pool } from '../db/pool.js'
import { env } from '../config/env.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()
const pendingActionByUser = new Map()

router.use(authenticate, requireAdmin)

function buildId(input, prefix) {
  const base = String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  return base || `${prefix}-${Date.now()}`
}

function parseAiJson(raw) {
  const text = String(raw || '').trim()
  if (!text) {
    return null
  }

  const candidates = []

  candidates.push(text)

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) {
    candidates.push(fenced[1].trim())
  }

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1).trim())
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // try next candidate
    }
  }

  return null
}

function normalizeAction(action) {
  if (!action || typeof action !== 'object') {
    return { type: 'none', payload: {} }
  }

  const supported = new Set(['none', 'create_room', 'create_career_path', 'create_module'])
  const type = String(action.type || 'none')

  return {
    type: supported.has(type) ? type : 'none',
    payload: action.payload && typeof action.payload === 'object' ? action.payload : {},
  }
}

function buildFallbackPlan(raw, userMessage, insights) {
  const message = String(raw || '').trim()
  const prompt = String(userMessage || '').trim()
  const metrics = insights?.metrics || {}

  if (/^(hi|hello|hey|yo|sup)\b/i.test(prompt)) {
    return {
      assistantReply:
        'Hi. I am Admin AI. I can monitor platform insights and create rooms, career paths, or modules when requested.',
      action: { type: 'none', payload: {} },
    }
  }

  if (/\b(what\s+is\s+this|what\s+can\s+you\s+do|help|who\s+are\s+you)\b/i.test(prompt)) {
    return {
      assistantReply:
        `This is the Admin AI Control Center. Current totals: ${Number(metrics.rooms || 0)} rooms, ${Number(metrics.careerPaths || 0)} career paths, ${Number(metrics.modules || 0)} modules, ${Number(metrics.users || 0)} users. Ask me to monitor insights or create platform content.`,
      action: { type: 'none', payload: {} },
    }
  }

  return {
    assistantReply:
      message ||
      'I can help monitor platform insights and manage content. Ask for user lists, platform totals, or creation of rooms, career paths, and modules.',
    action: { type: 'none', payload: {} },
  }
}

function extractMessageText(modelMessage) {
  const content = modelMessage?.content
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }

        if (part && typeof part === 'object') {
          if (typeof part.text === 'string') {
            return part.text
          }

          if (part.type === 'output_text' && typeof part.output_text === 'string') {
            return part.output_text
          }
        }

        return ''
      })
      .join('\n')
      .trim()
  }

  return ''
}

async function fetchUsersPreview(limit = 25) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Number(limit), 100)) : 25
  const [rows] = await pool.query(
    `SELECT id, username, email, role, is_active
     FROM users
     ORDER BY created_at DESC
     LIMIT ${safeLimit}`,
  )

  return rows
}

function isUserCountQuestion(text) {
  return /\b(how\s+many|number\s+of|count\s+of|total)\b[\s\S]*\b(users?|operators?)\b/i.test(text)
}

function detectCountTarget(text) {
  if (/\b(users?|operators?)\b/i.test(text)) return 'users'
  if (/\brooms?|labs?\b/i.test(text)) return 'rooms'
  if (/\b(career\s*paths?|paths?)\b/i.test(text)) return 'careerPaths'
  if (/\bmodules?\b/i.test(text)) return 'modules'
  if (/\b(cves?|vulnerabilit(?:y|ies))\b/i.test(text)) return 'cves'
  return null
}

function isEntityCountQuestion(text) {
  return /\b(how\s+many|number\s+of|count\s+of|total)\b/i.test(text) && Boolean(detectCountTarget(text))
}

function isPlatformInsightsQuestion(text) {
  return /(platf\w*|dashboard|system)\b[\s\S]*\b(insights?|overview|summary|status|risks?)\b/i.test(text)
}

function buildTopRisks(insights) {
  const metrics = insights?.metrics || {}
  const risks = []

  if (Number(metrics.cves || 0) === 0) {
    risks.push('No CVE records are currently stored, which limits vulnerability intelligence coverage.')
  }

  if (Number(metrics.rooms || 0) < 5) {
    risks.push('Lab room inventory is small, which can reduce practice variety and learner retention.')
  }

  if (Number(metrics.modules || 0) < Number(metrics.careerPaths || 0)) {
    risks.push('Some career paths may have shallow module depth relative to available tracks.')
  }

  if (!risks.length) {
    risks.push('No critical data-driven risk spikes detected from current aggregate metrics.')
  }

  return risks.slice(0, 3)
}

function isUserListQuestion(text) {
  return /\b(who\s+are\s+those|who\s+are\s+they|who\s+are\s+the\s+users?|who\s+are\s+users?|list\s+users?|show\s+users?|which\s+users?|user\s+list)\b/i.test(
    text,
  )
}

async function tryHandleDirectAdminQuery(message, insights) {
  const text = String(message || '').trim()
  if (!text) {
    return null
  }

  if (isPlatformInsightsQuestion(text)) {
    const metrics = insights?.metrics || {}
    const risks = buildTopRisks(insights)

    return {
      role: 'assistant',
      content: [
        'Platform insights:',
        `- Rooms: ${Number(metrics.rooms || 0)}`,
        `- Career paths: ${Number(metrics.careerPaths || 0)}`,
        `- Modules: ${Number(metrics.modules || 0)}`,
        `- CVEs: ${Number(metrics.cves || 0)}`,
        `- Users: ${Number(metrics.users || 0)}`,
        '',
        'Top risks right now:',
        ...risks.map((risk, index) => `${index + 1}. ${risk}`),
      ].join('\n'),
      action: { type: 'none', status: 'ignored', message: 'No action requested.' },
    }
  }

  if (isEntityCountQuestion(text)) {
    const target = detectCountTarget(text)
    const total = Number(insights?.metrics?.[target] || 0)
    const labelMap = {
      users: 'users',
      rooms: 'rooms',
      careerPaths: 'career paths',
      modules: 'modules',
      cves: 'CVEs',
    }

    return {
      role: 'assistant',
      content: `There are currently ${total} ${labelMap[target]} on the platform.`,
      action: { type: 'none', status: 'ignored', message: 'No action requested.' },
    }
  }

  if (isUserCountQuestion(text)) {
    const totalUsers = Number(insights?.metrics?.users || 0)
    return {
      role: 'assistant',
      content: `There are currently ${totalUsers} users on the platform.`,
      action: { type: 'none', status: 'ignored', message: 'No action requested.' },
    }
  }

  if (isUserListQuestion(text)) {
    const users = await fetchUsersPreview(50)
    if (!users.length) {
      return {
        role: 'assistant',
        content: 'No users were found on the platform.',
        action: { type: 'none', status: 'ignored', message: 'No action requested.' },
      }
    }

    const lines = users.map((user, index) => {
      const name = user.username || `user-${user.id}`
      const email = user.email ? ` | ${user.email}` : ''
      const role = user.role ? ` | role: ${user.role}` : ''
      const status = user.is_active ? 'active' : 'inactive'
      return `${index + 1}. ${name}${email}${role} | status: ${status}`
    })

    return {
      role: 'assistant',
      content: `Current users:\n${lines.join('\n')}`,
      action: { type: 'none', status: 'ignored', message: 'No action requested.' },
    }
  }

  return null
}

async function fetchInsights() {
  const [[roomCount]] = await pool.query('SELECT COUNT(*) AS total FROM rooms')
  const [[pathCount]] = await pool.query('SELECT COUNT(*) AS total FROM career_paths')
  const [[moduleCount]] = await pool.query('SELECT COUNT(*) AS total FROM career_path_modules')
  const [[cveCount]] = await pool.query('SELECT COUNT(*) AS total FROM cves')
  const [[userCount]] = await pool.query('SELECT COUNT(*) AS total FROM users')

  const [latestRooms] = await pool.query(
    'SELECT id, title, category, difficulty, created_at FROM rooms ORDER BY created_at DESC LIMIT 5',
  )
  const [latestPaths] = await pool.query(
    'SELECT id, title, difficulty, created_at FROM career_paths ORDER BY created_at DESC LIMIT 5',
  )
  const [latestCves] = await pool.query(
    'SELECT cve_id, short_description, found_year, created_at FROM cves ORDER BY created_at DESC LIMIT 5',
  )

  return {
    metrics: {
      rooms: Number(roomCount?.total || 0),
      careerPaths: Number(pathCount?.total || 0),
      modules: Number(moduleCount?.total || 0),
      cves: Number(cveCount?.total || 0),
      users: Number(userCount?.total || 0),
    },
    latest: {
      rooms: latestRooms,
      careerPaths: latestPaths,
      cves: latestCves,
    },
  }
}

async function createRoom(payload) {
  const id = buildId(payload?.slug || payload?.title, 'room')
  const roomPayload = {
    id,
    slug: id,
    category: payload?.category || 'General',
    level: payload?.level || 'Easy',
    title: payload?.title,
    description: payload?.description || '',
    xp: payload?.xp || '500 XP',
    difficulty: payload?.difficulty || payload?.level || 'Easy',
    estimateTime: payload?.estimateTime || '45 minutes',
    environment: payload?.environment || 'Web Browser',
    categoryTag: payload?.categoryTag || payload?.category || 'General',
    tags: Array.isArray(payload?.tags) ? payload.tags : [],
    requiredKeywords: Array.isArray(payload?.requiredKeywords) ? payload.requiredKeywords : [],
    content: {
      markdown: payload?.markdown || `# ${payload?.title || 'New Room'}\n\n${payload?.description || ''}`,
      html: payload?.html || '',
      missionOverview: payload?.missionOverview || payload?.description || '',
      remediationProtocols:
        payload?.remediationProtocols ||
        'Validate inputs, apply least privilege, and enforce secure defaults.',
      vulnerabilityBriefing: {
        definition: payload?.vulnerabilityDefinition || 'Vulnerability definition pending.',
        impact: payload?.vulnerabilityImpact || 'Potential impact pending.',
      },
      technicalDeepDive: payload?.technicalDeepDive || 'Technical deep dive pending.',
      youtubeVideoUrl: payload?.youtubeVideoUrl || '',
      questionsEnabled: false,
      questions: [],
    },
  }

  if (!roomPayload.title) {
    throw new Error('Room creation requires a title.')
  }

  await pool.query(
    `INSERT INTO rooms (
      id, slug, category, level, level_tone, dot_tone, title, description, xp,
      difficulty, estimate_time, environment, category_tag, content_markdown,
      content_html, mission_overview, remediation_protocols,
      vulnerability_definition, vulnerability_impact, technical_deep_dive,
      youtube_video_url, questions_enabled, questions_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      roomPayload.id,
      roomPayload.slug,
      roomPayload.category,
      roomPayload.level,
      payload?.levelTone || null,
      payload?.dotTone || null,
      roomPayload.title,
      roomPayload.description,
      roomPayload.xp,
      roomPayload.difficulty,
      roomPayload.estimateTime,
      roomPayload.environment,
      roomPayload.categoryTag,
      roomPayload.content.markdown,
      roomPayload.content.html,
      roomPayload.content.missionOverview,
      roomPayload.content.remediationProtocols,
      roomPayload.content.vulnerabilityBriefing.definition,
      roomPayload.content.vulnerabilityBriefing.impact,
      roomPayload.content.technicalDeepDive,
      roomPayload.content.youtubeVideoUrl || null,
      false,
      '[]',
    ],
  )

  for (const tag of roomPayload.tags) {
    await pool.query('INSERT INTO room_tags (room_id, tag) VALUES (?, ?)', [roomPayload.id, tag])
  }

  for (const keyword of roomPayload.requiredKeywords) {
    await pool.query('INSERT INTO room_required_keywords (room_id, keyword) VALUES (?, ?)', [
      roomPayload.id,
      keyword,
    ])
  }

  return { id: roomPayload.id, title: roomPayload.title }
}

async function createCareerPath(payload) {
  const id = buildId(payload?.slug || payload?.title, 'path')
  if (!payload?.title) {
    throw new Error('Career path creation requires a title.')
  }

  await pool.query(
    `INSERT INTO career_paths (
      id, slug, title, description, icon, learning_path_level,
      difficulty, estimated_hours, enrolled_count, mastery, color
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      id,
      payload.title,
      payload.description || '',
      payload.icon || 'school',
      payload.learningPathLevel || 'Basic',
      payload.difficulty || payload.learningPathLevel || 'Basic',
      Number(payload.estimatedHours || 0),
      Number(payload.enrolledCount || 0),
      Number(payload.mastery || 0),
      payload.color || 'primary',
    ],
  )

  return { id, title: payload.title }
}

async function createModule(payload) {
  const pathRef = String(payload?.careerPathId || payload?.pathId || '').trim()
  if (!pathRef) {
    throw new Error('Module creation requires careerPathId or pathId.')
  }

  const [pathRows] = await pool.query(
    'SELECT id, title FROM career_paths WHERE id = ? OR slug = ? LIMIT 1',
    [pathRef, pathRef],
  )

  if (!pathRows.length) {
    throw new Error(`Career path not found for id/slug: ${pathRef}`)
  }

  const path = pathRows[0]
  const moduleId = buildId(payload?.moduleId || payload?.title, 'mod')
  const [sortRows] = await pool.query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort FROM career_path_modules WHERE career_path_id = ?',
    [path.id],
  )

  const sortOrder = Number(sortRows?.[0]?.next_sort || 0)

  await pool.query(
    'INSERT INTO career_path_modules (id, career_path_id, phase, title, description, module_image_data, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      moduleId,
      path.id,
      payload?.phase || `Module ${sortOrder + 1}`,
      payload?.title || 'New Module',
      payload?.description || '',
      payload?.imageData || null,
      sortOrder,
    ],
  )

  const rooms = Array.isArray(payload?.rooms) ? payload.rooms : []
  for (let i = 0; i < rooms.length; i += 1) {
    await pool.query(
      'INSERT INTO career_path_module_rooms (module_id, room_id, sort_order) VALUES (?, ?, ?)',
      [moduleId, rooms[i], i],
    )
  }

  return { id: moduleId, title: payload?.title || 'New Module', careerPathId: path.id, careerPathTitle: path.title }
}

async function resolveCareerPathId(pathRef) {
  const normalized = String(pathRef || '').trim()
  if (!normalized) {
    return null
  }

  const [rows] = await pool.query(
    `SELECT id, slug, title
     FROM career_paths
     WHERE id = ? OR slug = ? OR LOWER(title) = LOWER(?)
     LIMIT 1`,
    [normalized, normalized, normalized],
  )

  return rows[0] || null
}

async function resolveRoomId(roomRef) {
  const normalized = String(roomRef || '').trim()
  if (!normalized) {
    return null
  }

  const [rows] = await pool.query(
    `SELECT id, title
     FROM rooms
     WHERE id = ? OR slug = ? OR LOWER(title) = LOWER(?)
     LIMIT 1`,
    [normalized, normalized, normalized],
  )

  return rows[0] || null
}

async function findExistingRoomByTitleOrSlug(titleOrSlug) {
  const normalized = String(titleOrSlug || '').trim()
  if (!normalized) {
    return null
  }

  const slug = buildId(normalized, 'room')
  const [rows] = await pool.query(
    `SELECT id, title
     FROM rooms
     WHERE id = ? OR slug = ? OR LOWER(title) = LOWER(?)
     LIMIT 1`,
    [slug, slug, normalized],
  )

  return rows[0] || null
}

function parseListValues(text) {
  return String(text || '')
    .split(/,|\band\b/gi)
    .map((value) => value.trim())
    .filter(Boolean)
}

function parseRoomRefsFromText(text) {
  const match = String(text || '').match(/(?:rooms?|with\s+rooms?)\s*[:=]?\s*(.+)$/i)
  if (!match?.[1]) {
    return []
  }

  return parseListValues(match[1])
}

function parsePathRefFromText(text) {
  const match = String(text || '').match(/(?:path|career\s*path)\s*[:=]?\s*([a-z0-9 _-]+)/i)
  return match?.[1] ? match[1].trim() : ''
}

async function fillPendingModulePayload(payload, message) {
  const next = { ...payload }
  const text = String(message || '').trim()

  if (!next.careerPathId) {
    const pathRef = parsePathRefFromText(text) || text
    const path = await resolveCareerPathId(pathRef)
    if (path) {
      next.careerPathId = path.id
    }
  }

  const roomRefs = parseRoomRefsFromText(text)
  if ((!next.rooms || !next.rooms.length) && roomRefs.length) {
    const resolved = []
    for (const ref of roomRefs) {
      const room = await resolveRoomId(ref)
      if (room) {
        resolved.push(room.id)
      }
    }

    if (resolved.length) {
      next.rooms = resolved
    }
  }

  return next
}

function extractRoomTitleFromCreatePrompt(text) {
  const match = String(text || '').match(/(?:add|create)\s+(?:a\s+)?room(?:\s+called|\s+named)?\s+(.+)$/i)
  if (!match?.[1]) {
    return ''
  }

  return match[1].trim().replace(/[.?!]+$/, '')
}

function extractModuleTitleFromCreatePrompt(text) {
  const match = String(text || '').match(/(?:add|create)\s+(?:a\s+)?module(?:\s+called|\s+named)?\s+(.+)$/i)
  if (!match?.[1]) {
    return ''
  }

  return match[1].trim().replace(/[.?!]+$/, '')
}

function extractPathRefFromPrompt(text) {
  const match = String(text || '').match(
    /(?:in|for)\s+the\s+path\s+([a-z0-9 _-]+?)(?:\s+(?:add|create|with|which|where|that)\b|$)/i,
  )
  if (match?.[1]) {
    return match[1].trim()
  }

  return parsePathRefFromText(text)
}

function extractRoomTitleFromModulePrompt(text) {
  const match = String(text || '').match(/(?:add|create)\s+(?:a\s+)?room(?:\s+called|\s+named)?\s+(.+?)(?:\s+(?:which|that)\b|$)/i)
  if (!match?.[1]) {
    return ''
  }

  return match[1].trim().replace(/[.?!]+$/, '')
}

function extractModuleTitleFromCompoundPrompt(text) {
  const match = String(text || '').match(/(?:add|create)\s+(?:a\s+)?module(?:\s+called|\s+named)?\s+(.+?)(?:\s+in\s+which\b|\s+with\s+room\b|\s+which\s+includes\b|$)/i)
  if (!match?.[1]) {
    return ''
  }

  return match[1].trim().replace(/[.?!]+$/, '')
}

function extractRoomContentFromPrompt(text) {
  const match = String(text || '').match(/(?:content\s+about|about)\s+(.+)$/i)
  if (!match?.[1]) {
    return ''
  }

  return match[1].trim().replace(/[.?!]+$/, '')
}

async function createOrGetRoomForModule({ title, description }) {
  const existing = await findExistingRoomByTitleOrSlug(title)
  if (existing) {
    return { id: existing.id, title: existing.title, reused: true }
  }

  const created = await createRoom({
    title,
    description: description || title,
    missionOverview: description || title,
    technicalDeepDive: description || title,
    remediationProtocols: 'Review event telemetry, validate alert fidelity, and tune detection logic.',
  })

  return { ...created, reused: false }
}

async function tryHandleDirectActionIntent({ message, userId }) {
  const text = String(message || '').trim()
  const lower = text.toLowerCase()

  if (!text) {
    return null
  }

  const pending = pendingActionByUser.get(userId)
  if (pending?.type === 'create_module') {
    const filled = await fillPendingModulePayload(pending.payload || {}, text)

    if (!filled.careerPathId) {
      pendingActionByUser.set(userId, { type: 'create_module', payload: filled })
      return {
        role: 'assistant',
        content: 'Which career path should this module belong to? Provide path id, slug, or exact title.',
        action: { type: 'create_module', status: 'needs_input', message: 'careerPathId is required' },
      }
    }

    if (!Array.isArray(filled.rooms) || !filled.rooms.length) {
      pendingActionByUser.set(userId, { type: 'create_module', payload: filled })
      return {
        role: 'assistant',
        content:
          'Which room(s) should be linked to this module? Provide room ids/slugs/titles separated by commas.',
        action: { type: 'create_module', status: 'needs_input', message: 'At least one room is required' },
      }
    }

    const created = await createModule(filled)
    pendingActionByUser.delete(userId)
    return {
      role: 'assistant',
      content: `Module '${created.title}' created successfully in ${created.careerPathTitle}.`,
      action: {
        type: 'create_module',
        status: 'completed',
        message: `Module created: ${created.title} (${created.id}) in ${created.careerPathTitle}`,
        created,
      },
    }
  }

  const isCreateModuleIntent = /\b(add|create)\b[\s\S]*\bmodule\b/i.test(lower)
  const isCreateRoomIntent = /\b(add|create)\b[\s\S]*\broom\b/i.test(lower)

  if (isCreateModuleIntent && isCreateRoomIntent) {
    const moduleTitle = extractModuleTitleFromCompoundPrompt(text) || extractModuleTitleFromCreatePrompt(text)
    const roomTitle = extractRoomTitleFromModulePrompt(text)
    const contentHint = extractRoomContentFromPrompt(text)
    const pathRef = extractPathRefFromPrompt(text)

    if (!moduleTitle) {
      return {
        role: 'assistant',
        content: 'What should the module title be?',
        action: { type: 'create_module', status: 'needs_input', message: 'module title is required' },
      }
    }

    const path = pathRef ? await resolveCareerPathId(pathRef) : null
    if (!path) {
      pendingActionByUser.set(userId, {
        type: 'create_module',
        payload: {
          title: moduleTitle,
          rooms: roomTitle ? [roomTitle] : [],
          roomContentHint: contentHint,
        },
      })

      return {
        role: 'assistant',
        content: 'I can create that module and room. Which career path should this module belong to? Provide path id, slug, or exact title.',
        action: { type: 'create_module', status: 'needs_input', message: 'careerPathId is required' },
      }
    }

    if (!roomTitle) {
      pendingActionByUser.set(userId, {
        type: 'create_module',
        payload: {
          title: moduleTitle,
          careerPathId: path.id,
          rooms: [],
          roomContentHint: contentHint,
        },
      })

      return {
        role: 'assistant',
        content: 'Which room should be added to this module? Provide room title, id, or slug.',
        action: { type: 'create_module', status: 'needs_input', message: 'At least one room is required' },
      }
    }

    const room = await createOrGetRoomForModule({
      title: roomTitle,
      description: contentHint || `Introductory content for ${roomTitle}.`,
    })

    const createdModule = await createModule({
      title: moduleTitle,
      careerPathId: path.id,
      rooms: [room.id],
    })

    return {
      role: 'assistant',
      content: `Module '${createdModule.title}' created in ${createdModule.careerPathTitle}. Room '${room.title}' ${room.reused ? 'was linked' : 'was created and linked'} with event content context.`,
      action: {
        type: 'create_module',
        status: 'completed',
        message: `Module created: ${createdModule.title} (${createdModule.id}) in ${createdModule.careerPathTitle}; room linked: ${room.title} (${room.id})`,
        created: {
          module: createdModule,
          room,
        },
      },
    }
  }

  if (isCreateRoomIntent) {
    const title = extractRoomTitleFromCreatePrompt(text)
    if (!title) {
      return {
        role: 'assistant',
        content: 'What should the room title be?',
        action: { type: 'create_room', status: 'needs_input', message: 'title is required' },
      }
    }

    const created = await createRoom({ title })
    return {
      role: 'assistant',
      content: `Room '${created.title}' has been created successfully.`,
      action: {
        type: 'create_room',
        status: 'completed',
        message: `Room created: ${created.title} (${created.id})`,
        created,
      },
    }
  }

  if (isCreateModuleIntent) {
    const title = extractModuleTitleFromCreatePrompt(text)
    const payload = {
      title: title || 'New Module',
      careerPathId: '',
      rooms: [],
    }

    const pathRef = parsePathRefFromText(text)
    if (pathRef) {
      const path = await resolveCareerPathId(pathRef)
      if (path) {
        payload.careerPathId = path.id
      }
    }

    const roomRefs = parseRoomRefsFromText(text)
    if (roomRefs.length) {
      const resolved = []
      for (const ref of roomRefs) {
        const room = await resolveRoomId(ref)
        if (room) {
          resolved.push(room.id)
        }
      }
      payload.rooms = resolved
    }

    pendingActionByUser.set(userId, { type: 'create_module', payload })

    if (!payload.careerPathId) {
      return {
        role: 'assistant',
        content: 'Which career path should this module belong to? Provide path id, slug, or exact title.',
        action: { type: 'create_module', status: 'needs_input', message: 'careerPathId is required' },
      }
    }

    if (!payload.rooms.length) {
      return {
        role: 'assistant',
        content:
          'Which room(s) should be linked to this module? Provide room ids/slugs/titles separated by commas.',
        action: { type: 'create_module', status: 'needs_input', message: 'At least one room is required' },
      }
    }

    const created = await createModule(payload)
    pendingActionByUser.delete(userId)
    return {
      role: 'assistant',
      content: `Module '${created.title}' created successfully in ${created.careerPathTitle}.`,
      action: {
        type: 'create_module',
        status: 'completed',
        message: `Module created: ${created.title} (${created.id}) in ${created.careerPathTitle}`,
        created,
      },
    }
  }

  return null
}

async function executeAction(action) {
  if (!action || typeof action !== 'object') {
    return { type: 'none', status: 'ignored', message: 'No action requested.' }
  }

  const type = String(action.type || 'none')
  const payload = action.payload && typeof action.payload === 'object' ? action.payload : {}

  if (type === 'none') {
    return { type: 'none', status: 'ignored', message: 'No action requested.' }
  }

  if (type === 'create_room') {
    const created = await createRoom(payload)
    return { type, status: 'completed', message: `Room created: ${created.title} (${created.id})`, created }
  }

  if (type === 'create_career_path') {
    const created = await createCareerPath(payload)
    return { type, status: 'completed', message: `Career path created: ${created.title} (${created.id})`, created }
  }

  if (type === 'create_module') {
    const created = await createModule(payload)
    return {
      type,
      status: 'completed',
      message: `Module created: ${created.title} (${created.id}) in ${created.careerPathTitle}`,
      created,
    }
  }

  return { type: 'none', status: 'ignored', message: `Unsupported action type: ${type}` }
}

function extractPlanFromText(rawText) {
  const parsed = parseAiJson(rawText)
  if (!parsed || typeof parsed !== 'object') {
    return {
      assistantReply: String(rawText || '').trim(),
      action: { type: 'none', payload: {} },
    }
  }

  return {
    assistantReply: String(parsed.assistantReply || '').trim(),
    action: normalizeAction(parsed.action),
  }
}

function normalizeHistoryEntries(entries) {
  if (!Array.isArray(entries)) {
    return []
  }

  return entries
    .map((entry) => ({
      role: entry?.role === 'assistant' ? 'assistant' : 'user',
      message: String(entry?.message || '').trim(),
    }))
    .filter((entry) => entry.message)
}

async function fetchPersistedHistory(userId, limit = 24) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Number(limit), 60)) : 24
  try {
    const [rows] = await pool.query(
      `SELECT role, message
       FROM admin_ai_chat_history
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT ${safeLimit}`,
      [userId],
    )

    return rows
      .reverse()
      .map((row) => ({
        role: row.role === 'assistant' ? 'assistant' : 'user',
        message: String(row.message || '').trim(),
      }))
      .filter((row) => row.message)
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return []
    }
    throw error
  }
}

function mergeHistory(serverHistory, clientHistory, limit = 24) {
  const merged = [...normalizeHistoryEntries(serverHistory), ...normalizeHistoryEntries(clientHistory)]
  const compacted = []

  for (const entry of merged) {
    const prev = compacted[compacted.length - 1]
    if (prev && prev.role === entry.role && prev.message === entry.message) {
      continue
    }
    compacted.push(entry)
  }

  return compacted.slice(-limit)
}

async function persistHistory(userId, userMessage, assistantMessage) {
  const entries = []
  if (String(userMessage || '').trim()) {
    entries.push({ role: 'user', message: String(userMessage).trim() })
  }
  if (String(assistantMessage || '').trim()) {
    entries.push({ role: 'assistant', message: String(assistantMessage).trim() })
  }

  if (!entries.length) {
    return
  }

  try {
    const placeholders = entries.map(() => '(?, ?, ?)').join(', ')
    const params = entries.flatMap((entry) => [userId, entry.role, entry.message])

    await pool.query(
      `INSERT INTO admin_ai_chat_history (user_id, role, message)
       VALUES ${placeholders}`,
      params,
    )

    await pool.query(
      `DELETE FROM admin_ai_chat_history
       WHERE user_id = ?
         AND id NOT IN (
           SELECT id FROM (
             SELECT id
             FROM admin_ai_chat_history
             WHERE user_id = ?
             ORDER BY id DESC
             LIMIT 60
           ) AS recent
         )`,
      [userId, userId],
    )
  } catch (error) {
    console.error('Failed to persist admin AI chat history:', error)
  }
}

router.get('/insights', async (_req, res, next) => {
  try {
    const insights = await fetchInsights()
    return res.json(insights)
  } catch (error) {
    return next(error)
  }
})

router.post('/chat', async (req, res, next) => {
  try {
    if (!env.nvidiaApiKey) {
      return res.status(503).json({ message: 'NVIDIA_API_KEY is not configured.' })
    }

    const message = String(req.body?.message || '').trim()
    const clientHistory = Array.isArray(req.body?.history) ? req.body.history.slice(-20) : []
    const serverHistory = await fetchPersistedHistory(req.user.id, 24)
    const history = mergeHistory(serverHistory, clientHistory, 24)
    if (!message) {
      return res.status(400).json({ message: 'message is required' })
    }

    const insights = await fetchInsights()

    const directActionResponse = await tryHandleDirectActionIntent({
      message,
      userId: req.user.id,
    })
    if (directActionResponse) {
      await persistHistory(req.user.id, message, directActionResponse.content)
      return res.json({
        ...directActionResponse,
        insights,
      })
    }

    const directResponse = await tryHandleDirectAdminQuery(message, insights)
    if (directResponse) {
      await persistHistory(req.user.id, message, directResponse.content)
      return res.json({
        ...directResponse,
        insights,
      })
    }

    const client = new OpenAI({
      baseURL: env.aiBaseUrl,
      apiKey: env.nvidiaApiKey,
    })

    const payload = await client.chat.completions.create({
      model: env.aiModel,
      temperature: 0.2,
      top_p: env.aiTopP,
      max_tokens: Math.min(env.aiMaxTokens, 2000),
      stream: false,
      messages: [
        {
          role: 'system',
          content:
            'You are Admin AI for Incognitrix Academy. Answer all user questions helpfully, including general and platform-specific questions. You can also perform admin content operations. If the user explicitly asks to create platform content, respond in JSON using this schema: {"assistantReply":"string","action":{"type":"none|create_room|create_career_path|create_module","payload":{}}}. For all normal Q&A, respond in plain text (not JSON). Use action "none" unless the user clearly requests creation. For create_room payload include title and optional category, level, description, tags, requiredKeywords, missionOverview, remediationProtocols, vulnerabilityDefinition, vulnerabilityImpact, technicalDeepDive, estimateTime, environment, xp. For create_career_path payload include title and optional description, learningPathLevel, estimatedHours, icon, color. For create_module payload include careerPathId (or pathId), title and optional phase, description, rooms array.',
        },
        {
          role: 'system',
          content: `Current platform insights: ${JSON.stringify(insights)}`,
        },
        ...history.map((entry) => ({
          role: entry.role,
          content: entry.message,
        })),
        { role: 'user', content: message },
      ],
    })

    const raw = extractMessageText(payload?.choices?.[0]?.message)
    const extracted = extractPlanFromText(raw)
    const plan =
      extracted.assistantReply || extracted.action?.type !== 'none'
        ? extracted
        : buildFallbackPlan(raw, message, insights)

    const actionResult = await executeAction(plan.action)

    const reply = String(plan.assistantReply || 'Action processed.').trim()
    const resultSuffix =
      actionResult?.status === 'completed'
        ? `\n\nAction result: ${actionResult.message}`
        : ''

    const finalContent = `${reply}${resultSuffix}`.trim()
    await persistHistory(req.user.id, message, finalContent)

    return res.json({
      role: 'assistant',
      content: finalContent,
      action: actionResult,
      insights,
    })
  } catch (error) {
    return next(error)
  }
})

export default router
