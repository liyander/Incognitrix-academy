import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { buildJobMarkdown, defaultJobListings } from '../seed/jobListings.js'

const router = express.Router()
let schemaReady = false

const PROFILE_FIELDS = [
  'internships',
  'softSkills',
  'hardSkills',
  'tools',
  'techStack',
  'projects',
  'achievements',
  'certifications',
]

function parseJson(value, fallback = []) {
  if (!value) return fallback
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function normalizeJob(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    company: row.company,
    location: row.location,
    salary: row.salary,
    jobType: row.job_type,
    category: row.category,
    workMode: row.work_mode,
    applyUrl: row.apply_url,
    aboutRole: row.about_role,
    responsibilities: parseJson(row.responsibilities_json),
    requirements: parseJson(row.requirements_json),
    skills: parseJson(row.skills_json),
    detailsMarkdown: row.details_markdown,
    source: row.source,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeRecommendation(row) {
  return {
    id: row.recommendation_id || row.id,
    userId: row.user_id,
    username: row.username,
    registrationNumber: row.registration_number,
    email: row.email,
    jobId: row.job_id,
    matchScore: Number(row.match_score || 0),
    probabilityLabel: row.probability_label,
    matchedSkills: parseJson(row.matched_skills_json),
    missingSkills: parseJson(row.missing_skills_json),
    reasons: parseJson(row.reasons_json),
    aiAnalysis: row.ai_analysis,
    sourceSnapshot: parseJson(row.source_snapshot_json, {}),
    updatedAt: row.updated_at,
    job: normalizeJob({
      id: row.job_id,
      slug: row.slug,
      title: row.title,
      company: row.company,
      location: row.location,
      salary: row.salary,
      job_type: row.job_type,
      category: row.category,
      work_mode: row.work_mode,
      apply_url: row.apply_url,
      about_role: row.about_role,
      responsibilities_json: row.responsibilities_json,
      requirements_json: row.requirements_json,
      skills_json: row.skills_json,
      details_markdown: row.details_markdown,
      source: row.source,
      is_active: row.is_active,
      created_at: row.job_created_at,
      updated_at: row.job_updated_at,
    }),
  }
}

function splitSkillText(value) {
  return String(value || '')
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function slugify(value) {
  return String(value || 'job-listing')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180) || 'job-listing'
}

function markdownField(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i'))
  return match?.[1]?.trim() || ''
}

function markdownSection(markdown, title) {
  const pattern = new RegExp(`####?\\s+${title}\\s*\\n([\\s\\S]*?)(?=\\n####?\\s+|\\n---|$)`, 'i')
  const match = String(markdown || '').match(pattern)
  return match?.[1]?.trim() || ''
}

function markdownList(section) {
  return String(section || '')
    .split('\n')
    .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean)
}

function parseMarkdownJob(markdown) {
  const text = String(markdown || '').trim()
  const titleMatch = text.match(/^#{1,4}\s*(?:\d+\.\s*)?(.+)$/m)
  const title = titleMatch?.[1]?.trim() || 'Untitled Job'
  const typeText = markdownField(text, 'Type')
  const typeParts = typeText.split('|').map((part) => part.trim()).filter(Boolean)
  const skillsSection = markdownSection(text, 'Key Skills')
  const skills = Array.from(skillsSection.matchAll(/`([^`]+)`/g)).map((match) => match[1].trim())
  const company = markdownField(text, 'Company') || 'Unknown Company'

  return {
    slug: slugify(`${company}-${title}`),
    title,
    company,
    location: markdownField(text, 'Location'),
    salary: markdownField(text, 'Salary'),
    jobType: typeParts[0] || 'Entry Level',
    category: typeParts[1] || 'Cybersecurity',
    workMode: typeParts[2] || 'Remote',
    applyUrl: markdownField(text, 'Apply'),
    aboutRole: markdownSection(text, 'About the Role'),
    responsibilities: markdownList(markdownSection(text, 'Responsibilities')),
    requirements: markdownList(markdownSection(text, 'Requirements')),
    skills: skills.length ? skills : splitSkillText(skillsSection),
    detailsMarkdown: text,
  }
}

function textTokens(value) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9+#.]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 2),
  )
}

function skillKeywords(skill) {
  const raw = String(skill || '').toLowerCase()
  const cleaned = raw.replace(/[^a-z0-9+#./ ]+/g, ' ')
  const chunks = cleaned
    .split(/[ /]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
  return Array.from(new Set([cleaned.trim(), ...chunks].filter(Boolean)))
}

function fieldValue(body, field) {
  const value = body?.[field]
  if (Array.isArray(value)) return value.join('\n')
  return String(value || '')
}

function buildEvidenceText(profile, user, rooms, attempts, certificates) {
  return [
    user?.projects,
    user?.achievements,
    user?.about_me,
    profile?.internships,
    profile?.soft_skills,
    profile?.hard_skills,
    profile?.tools,
    profile?.tech_stack,
    profile?.projects,
    profile?.achievements,
    profile?.certifications,
    rooms
      .map((room) =>
        [
          room.title,
          room.category,
          room.category_tag,
          room.difficulty,
          room.description,
          room.tags,
          room.keywords,
        ].join(' '),
      )
      .join(' '),
    attempts.map((attempt) => [attempt.feedback, attempt.technical_score, attempt.grammar_score].join(' ')).join(' '),
    certificates.map((certificate) => certificate.path_title).join(' '),
  ]
    .filter(Boolean)
    .join('\n')
}

function profileCompleteness(profile, user) {
  const values = [
    user?.projects,
    user?.achievements,
    profile?.internships,
    profile?.soft_skills,
    profile?.hard_skills,
    profile?.tools,
    profile?.tech_stack,
    profile?.projects,
    profile?.achievements,
    profile?.certifications,
  ]
  return values.filter((value) => String(value || '').trim().length >= 3).length
}

function scoreJob(job, evidence) {
  const corpus = buildEvidenceText(
    evidence.profile,
    evidence.user,
    evidence.rooms,
    evidence.attempts,
    evidence.certificates,
  )
  const corpusLower = corpus.toLowerCase()
  const corpusTokens = textTokens(corpusLower)
  const jobSkills = parseJson(job.skills_json)
  const matchedSkills = []
  const missingSkills = []

  for (const skill of jobSkills) {
    const keywords = skillKeywords(skill)
    const matched = keywords.some((keyword) => {
      if (keyword.length > 3 && corpusLower.includes(keyword)) return true
      return corpusTokens.has(keyword)
    })
    if (matched) matchedSkills.push(skill)
    else missingSkills.push(skill)
  }

  const skillScore = jobSkills.length ? (matchedSkills.length / jobSkills.length) * 58 : 0
  const completedRooms = evidence.rooms.length
  const completedRoomScore = Math.min(18, completedRooms * 4)
  const categoryLower = String(job.category || '').toLowerCase()
  const roomCategoryScore = evidence.rooms.some((room) => {
    const text = `${room.category || ''} ${room.category_tag || ''} ${room.title || ''}`.toLowerCase()
    if (categoryLower.includes('devops')) {
      return /linux|cloud|docker|devops|kubernetes|ci\/cd|bash|python/.test(text)
    }
    return /security|web|forensic|incident|threat|crypto|reverse|exploit|soc|vulnerability|cve/.test(text)
  })
    ? 8
    : 0
  const profileScore = Math.min(10, profileCompleteness(evidence.profile, evidence.user))
  const certScore = Math.min(6, evidence.certificates.length * 3)
  const internshipScore = String(evidence.profile?.internships || '').trim() ? 5 : 0
  const matchScore = Math.min(
    100,
    Math.round(skillScore + completedRoomScore + roomCategoryScore + profileScore + certScore + internshipScore),
  )
  const probabilityLabel = matchScore >= 75 ? 'High' : matchScore >= 55 ? 'Medium' : 'Low'

  const topReasons = []
  if (matchedSkills.length) {
    topReasons.push(`Matched ${matchedSkills.length} required skill${matchedSkills.length === 1 ? '' : 's'}.`)
  }
  if (completedRooms) {
    topReasons.push(`Completed ${completedRooms} room${completedRooms === 1 ? '' : 's'} that strengthen the profile signal.`)
  }
  if (evidence.certificates.length) {
    topReasons.push(`Detected ${evidence.certificates.length} certificate${evidence.certificates.length === 1 ? '' : 's'}.`)
  }
  if (String(evidence.profile?.internships || '').trim()) {
    topReasons.push('Internship experience improves readiness for entry-level screening.')
  }
  if (!topReasons.length) {
    topReasons.push('Add skills, projects, internships, and completed rooms to improve match quality.')
  }

  const aiAnalysis = [
    `${job.company} - ${job.title} is a ${probabilityLabel.toLowerCase()} probability match at ${matchScore}%.`,
    matchedSkills.length
      ? `Strong overlap: ${matchedSkills.slice(0, 6).join(', ')}.`
      : 'No direct skill overlap was detected yet.',
    missingSkills.length
      ? `Improve next: add evidence for ${missingSkills.slice(0, 5).join(', ')}.`
      : 'The listed skills are well covered by the current profile.',
    'The recommendation considers completed rooms, certificates, internships, projects, achievements, and the saved student skill profile.',
  ].join(' ')

  return {
    matchScore,
    probabilityLabel,
    matchedSkills,
    missingSkills,
    reasons: topReasons,
    aiAnalysis,
    sourceSnapshot: {
      completedRooms,
      certificateCount: evidence.certificates.length,
      profileCompleteness: profileScore,
      analyzedAt: new Date().toISOString(),
    },
  }
}

async function ensureJobSchema() {
  if (schemaReady) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS job_listings (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(191) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      salary VARCHAR(255),
      job_type VARCHAR(120),
      category VARCHAR(120),
      work_mode VARCHAR(80),
      apply_url TEXT,
      about_role LONGTEXT,
      responsibilities_json LONGTEXT,
      requirements_json LONGTEXT,
      skills_json LONGTEXT,
      details_markdown LONGTEXT,
      source VARCHAR(120) DEFAULT 'markdown_seed',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_career_profiles (
      user_id INT PRIMARY KEY,
      internships LONGTEXT,
      soft_skills LONGTEXT,
      hard_skills LONGTEXT,
      tools LONGTEXT,
      tech_stack LONGTEXT,
      projects LONGTEXT,
      achievements LONGTEXT,
      certifications LONGTEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_job_recommendations (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      job_id BIGINT NOT NULL,
      match_score INT NOT NULL DEFAULT 0,
      probability_label VARCHAR(40) NOT NULL DEFAULT 'Low',
      matched_skills_json LONGTEXT,
      missing_skills_json LONGTEXT,
      reasons_json LONGTEXT,
      ai_analysis LONGTEXT,
      source_snapshot_json LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_student_job_recommendation (user_id, job_id),
      INDEX idx_student_job_match (user_id, match_score),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES job_listings(id) ON DELETE CASCADE
    );
  `)

  for (const job of defaultJobListings) {
    await pool.query(
      `INSERT INTO job_listings (
        slug, title, company, location, salary, job_type, category, work_mode, apply_url,
        about_role, responsibilities_json, requirements_json, skills_json, details_markdown, source, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'markdown_seed', true)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        company = VALUES(company),
        location = VALUES(location),
        salary = VALUES(salary),
        job_type = VALUES(job_type),
        category = VALUES(category),
        work_mode = VALUES(work_mode),
        apply_url = VALUES(apply_url),
        about_role = VALUES(about_role),
        responsibilities_json = VALUES(responsibilities_json),
        requirements_json = VALUES(requirements_json),
        skills_json = VALUES(skills_json),
        details_markdown = VALUES(details_markdown),
        is_active = true`,
      [
        job.slug,
        job.title,
        job.company,
        job.location,
        job.salary,
        job.jobType,
        job.category,
        job.workMode,
        job.applyUrl,
        job.aboutRole,
        JSON.stringify(job.responsibilities),
        JSON.stringify(job.requirements),
        JSON.stringify(job.skills),
        buildJobMarkdown(job),
      ],
    )
  }

  schemaReady = true
}

async function loadEvidenceForUser(userId) {
  const [[user]] = await pool.query(
    `SELECT id, username, registration_number, email, about_me, projects, achievements
     FROM users WHERE id = ? LIMIT 1`,
    [userId],
  )
  const [[profile]] = await pool.query('SELECT * FROM student_career_profiles WHERE user_id = ? LIMIT 1', [userId])
  const [rooms] = await pool.query(
    `SELECT r.id, r.title, r.category, r.category_tag, r.difficulty, r.description,
       GROUP_CONCAT(DISTINCT rt.tag SEPARATOR ' ') AS tags,
       GROUP_CONCAT(DISTINCT rrk.keyword SEPARATOR ' ') AS keywords
     FROM user_room_progress urp
     JOIN rooms r ON r.id = urp.room_id
     LEFT JOIN room_tags rt ON rt.room_id = r.id
     LEFT JOIN room_required_keywords rrk ON rrk.room_id = r.id
     WHERE urp.user_id = ? AND urp.completed_at IS NOT NULL
     GROUP BY r.id
     ORDER BY urp.completed_at DESC`,
    [userId],
  )
  const [attempts] = await pool.query(
    `SELECT room_id, technical_score, grammar_score, feedback
     FROM user_room_theoretical_attempts
     WHERE user_id = ? AND evaluated_at IS NOT NULL
     ORDER BY evaluated_at DESC
     LIMIT 20`,
    [userId],
  )
  const [certificates] = await pool.query(
    `SELECT path_title FROM certificates WHERE user_id = ? ORDER BY issued_at DESC`,
    [userId],
  )

  return {
    user: user || {},
    profile: profile || {},
    rooms,
    attempts,
    certificates,
  }
}

async function refreshRecommendationsForUser(userId) {
  await ensureJobSchema()
  const [jobs] = await pool.query('SELECT * FROM job_listings WHERE is_active = true ORDER BY company, title')
  const evidence = await loadEvidenceForUser(userId)
  const results = []

  for (const job of jobs) {
    const result = scoreJob(job, evidence)
    await pool.query(
      `INSERT INTO student_job_recommendations (
        user_id, job_id, match_score, probability_label, matched_skills_json,
        missing_skills_json, reasons_json, ai_analysis, source_snapshot_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        match_score = VALUES(match_score),
        probability_label = VALUES(probability_label),
        matched_skills_json = VALUES(matched_skills_json),
        missing_skills_json = VALUES(missing_skills_json),
        reasons_json = VALUES(reasons_json),
        ai_analysis = VALUES(ai_analysis),
        source_snapshot_json = VALUES(source_snapshot_json),
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        job.id,
        result.matchScore,
        result.probabilityLabel,
        JSON.stringify(result.matchedSkills),
        JSON.stringify(result.missingSkills),
        JSON.stringify(result.reasons),
        result.aiAnalysis,
        JSON.stringify(result.sourceSnapshot),
      ],
    )
    results.push({ job, ...result })
  }

  return results.sort((a, b) => b.matchScore - a.matchScore)
}

async function refreshRecommendationsForAllOperators() {
  await ensureJobSchema()
  const [users] = await pool.query("SELECT id FROM users WHERE is_active = true AND role = 'operator'")
  for (const user of users) {
    await refreshRecommendationsForUser(user.id)
  }
}

async function listRecommendations(whereSql, params) {
  await ensureJobSchema()
  const [rows] = await pool.query(
    `SELECT
       sjr.id AS recommendation_id,
       sjr.user_id,
       u.username,
       u.registration_number,
       u.email,
       sjr.job_id,
       sjr.match_score,
       sjr.probability_label,
       sjr.matched_skills_json,
       sjr.missing_skills_json,
       sjr.reasons_json,
       sjr.ai_analysis,
       sjr.source_snapshot_json,
       sjr.updated_at,
       jl.slug,
       jl.title,
       jl.company,
       jl.location,
       jl.salary,
       jl.job_type,
       jl.category,
       jl.work_mode,
       jl.apply_url,
       jl.about_role,
       jl.responsibilities_json,
       jl.requirements_json,
       jl.skills_json,
       jl.details_markdown,
       jl.source,
       jl.is_active,
       jl.created_at AS job_created_at,
       jl.updated_at AS job_updated_at
     FROM student_job_recommendations sjr
     JOIN users u ON u.id = sjr.user_id
     JOIN job_listings jl ON jl.id = sjr.job_id
     ${whereSql}
     ORDER BY sjr.match_score DESC, sjr.updated_at DESC`,
    params,
  )
  return rows.map(normalizeRecommendation)
}

router.use(authenticate)

router.get('/listings', async (_req, res, next) => {
  try {
    await ensureJobSchema()
    const [rows] = await pool.query('SELECT * FROM job_listings WHERE is_active = true ORDER BY category, company, title')
    res.json(rows.map(normalizeJob))
  } catch (error) {
    next(error)
  }
})

router.get('/profile', async (req, res, next) => {
  try {
    await ensureJobSchema()
    const [[row]] = await pool.query('SELECT * FROM student_career_profiles WHERE user_id = ? LIMIT 1', [req.user.id])
    res.json({
      internships: row?.internships || '',
      softSkills: row?.soft_skills || '',
      hardSkills: row?.hard_skills || '',
      tools: row?.tools || '',
      techStack: row?.tech_stack || '',
      projects: row?.projects || '',
      achievements: row?.achievements || '',
      certifications: row?.certifications || '',
      updatedAt: row?.updated_at || null,
    })
  } catch (error) {
    next(error)
  }
})

router.put('/profile', async (req, res, next) => {
  try {
    await ensureJobSchema()
    const values = PROFILE_FIELDS.map((field) => fieldValue(req.body, field))
    await pool.query(
      `INSERT INTO student_career_profiles (
        user_id, internships, soft_skills, hard_skills, tools, tech_stack, projects, achievements, certifications
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        internships = VALUES(internships),
        soft_skills = VALUES(soft_skills),
        hard_skills = VALUES(hard_skills),
        tools = VALUES(tools),
        tech_stack = VALUES(tech_stack),
        projects = VALUES(projects),
        achievements = VALUES(achievements),
        certifications = VALUES(certifications),
        updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, ...values],
    )
    await refreshRecommendationsForUser(req.user.id)
    res.json({ message: 'Career profile saved and recommendations refreshed.' })
  } catch (error) {
    next(error)
  }
})

router.get('/recommendations/me', async (req, res, next) => {
  try {
    const recommendations = await listRecommendations(
      'WHERE sjr.user_id = ? AND sjr.match_score >= 45 AND jl.is_active = true',
      [req.user.id],
    )
    if (!recommendations.length) {
      await refreshRecommendationsForUser(req.user.id)
      const refreshed = await listRecommendations(
        'WHERE sjr.user_id = ? AND sjr.match_score >= 45 AND jl.is_active = true',
        [req.user.id],
      )
      res.json(refreshed)
      return
    }
    res.json(recommendations)
  } catch (error) {
    next(error)
  }
})

router.post('/recommendations/refresh', async (req, res, next) => {
  try {
    await refreshRecommendationsForUser(req.user.id)
    const recommendations = await listRecommendations(
      'WHERE sjr.user_id = ? AND sjr.match_score >= 45 AND jl.is_active = true',
      [req.user.id],
    )
    res.json(recommendations)
  } catch (error) {
    next(error)
  }
})

router.get('/admin/recommendations', requireAdmin, async (_req, res, next) => {
  try {
    const recommendations = await listRecommendations(
      'WHERE sjr.match_score >= 55 AND jl.is_active = true',
      [],
    )
    res.json(recommendations)
  } catch (error) {
    next(error)
  }
})

router.post('/admin/recommendations/refresh', requireAdmin, async (_req, res, next) => {
  try {
    await refreshRecommendationsForAllOperators()
    const recommendations = await listRecommendations(
      'WHERE sjr.match_score >= 55 AND jl.is_active = true',
      [],
    )
    res.json(recommendations)
  } catch (error) {
    next(error)
  }
})

router.post('/admin/listings', requireAdmin, async (req, res, next) => {
  try {
    await ensureJobSchema()
    const job = req.body?.markdown
      ? parseMarkdownJob(req.body.markdown)
      : {
          slug: slugify(`${req.body?.company || 'company'}-${req.body?.title || 'job'}`),
          title: String(req.body?.title || 'Untitled Job'),
          company: String(req.body?.company || 'Unknown Company'),
          location: String(req.body?.location || ''),
          salary: String(req.body?.salary || ''),
          jobType: String(req.body?.jobType || 'Entry Level'),
          category: String(req.body?.category || 'Cybersecurity'),
          workMode: String(req.body?.workMode || 'Remote'),
          applyUrl: String(req.body?.applyUrl || ''),
          aboutRole: String(req.body?.aboutRole || ''),
          responsibilities: Array.isArray(req.body?.responsibilities)
            ? req.body.responsibilities
            : splitSkillText(req.body?.responsibilities),
          requirements: Array.isArray(req.body?.requirements)
            ? req.body.requirements
            : splitSkillText(req.body?.requirements),
          skills: Array.isArray(req.body?.skills) ? req.body.skills : splitSkillText(req.body?.skills),
          detailsMarkdown: String(req.body?.detailsMarkdown || ''),
        }

    if (!job.title || !job.company) {
      res.status(400).json({ message: 'Job title and company are required.' })
      return
    }

    const detailsMarkdown = job.detailsMarkdown || buildJobMarkdown(job)
    await pool.query(
      `INSERT INTO job_listings (
        slug, title, company, location, salary, job_type, category, work_mode, apply_url,
        about_role, responsibilities_json, requirements_json, skills_json, details_markdown, source, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin_markdown', true)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        company = VALUES(company),
        location = VALUES(location),
        salary = VALUES(salary),
        job_type = VALUES(job_type),
        category = VALUES(category),
        work_mode = VALUES(work_mode),
        apply_url = VALUES(apply_url),
        about_role = VALUES(about_role),
        responsibilities_json = VALUES(responsibilities_json),
        requirements_json = VALUES(requirements_json),
        skills_json = VALUES(skills_json),
        details_markdown = VALUES(details_markdown),
        source = 'admin_markdown',
        is_active = true`,
      [
        job.slug,
        job.title,
        job.company,
        job.location,
        job.salary,
        job.jobType,
        job.category,
        job.workMode,
        job.applyUrl,
        job.aboutRole,
        JSON.stringify(job.responsibilities || []),
        JSON.stringify(job.requirements || []),
        JSON.stringify(job.skills || []),
        detailsMarkdown,
      ],
    )

    await refreshRecommendationsForAllOperators()
    const recommendations = await listRecommendations(
      'WHERE sjr.match_score >= 55 AND jl.is_active = true',
      [],
    )
    res.status(201).json({ message: 'Job listing saved and recommendations refreshed.', recommendations })
  } catch (error) {
    next(error)
  }
})

export default router
