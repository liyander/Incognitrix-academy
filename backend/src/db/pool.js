import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import {
  defaultUsers,
  defaultPlatformConfig,
  defaultRooms,
  defaultCareerPaths,
} from '../seed/defaultData.js'

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
})

export async function testConnection() {
  const connection = await pool.getConnection()
  try {
    await connection.query('SELECT 1')
  } finally {
    connection.release()
  }
}

export async function initializeDatabaseIfNeeded() {
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  })

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.database}\``)
    await conn.query(`USE \`${env.db.database}\``)

    const [tableCheck] = await conn.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = 'users' LIMIT 1",
      [env.db.database],
    )
    if (tableCheck.length > 0) {
      console.log('✓ Database tables already initialized')
      return
    }

    console.log('📦 Creating database tables and seeding default data...')

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('operator', 'admin') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS platform_config (
        id INT PRIMARY KEY,
        routes_json JSON NOT NULL,
        features_json JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(191) PRIMARY KEY,
        slug VARCHAR(191) NOT NULL UNIQUE,
        category VARCHAR(120),
        level VARCHAR(50),
        level_tone VARCHAR(60),
        dot_tone VARCHAR(60),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        xp VARCHAR(50),
        difficulty VARCHAR(50),
        estimate_time VARCHAR(80),
        environment VARCHAR(255),
        category_tag VARCHAR(120),
        content_markdown LONGTEXT,
        content_html LONGTEXT,
        mission_overview LONGTEXT,
        remediation_protocols LONGTEXT,
        vulnerability_definition LONGTEXT,
        vulnerability_impact LONGTEXT,
        technical_deep_dive LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS room_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id VARCHAR(191) NOT NULL,
        tag VARCHAR(120) NOT NULL,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS room_required_keywords (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id VARCHAR(191) NOT NULL,
        keyword VARCHAR(120) NOT NULL,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS career_paths (
        id VARCHAR(191) PRIMARY KEY,
        slug VARCHAR(191) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(80),
        learning_path_level VARCHAR(50),
        difficulty VARCHAR(50),
        estimated_hours INT DEFAULT 0,
        enrolled_count INT DEFAULT 0,
        mastery INT DEFAULT 0,
        color VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS career_path_modules (
        id VARCHAR(191) PRIMARY KEY,
        career_path_id VARCHAR(191) NOT NULL,
        phase VARCHAR(100),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        sort_order INT DEFAULT 0,
        FOREIGN KEY (career_path_id) REFERENCES career_paths(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS career_path_module_rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        module_id VARCHAR(191) NOT NULL,
        room_id VARCHAR(191) NOT NULL,
        sort_order INT DEFAULT 0,
        FOREIGN KEY (module_id) REFERENCES career_path_modules(id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS career_path_resources (
        id VARCHAR(191) PRIMARY KEY,
        career_path_id VARCHAR(191) NOT NULL,
        title VARCHAR(255) NOT NULL,
        url TEXT,
        type VARCHAR(80),
        sort_order INT DEFAULT 0,
        FOREIGN KEY (career_path_id) REFERENCES career_paths(id) ON DELETE CASCADE
      );
    `)

    for (const user of defaultUsers) {
      const hash = await bcrypt.hash(user.password, 10)
      await conn.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [
        user.username,
        hash,
        user.role,
      ])
    }

    await conn.query('INSERT INTO platform_config (id, routes_json, features_json) VALUES (1, ?, ?)', [
      JSON.stringify(defaultPlatformConfig.routes),
      JSON.stringify(defaultPlatformConfig.features),
    ])

    for (const room of defaultRooms) {
      await conn.query(
        `INSERT INTO rooms (
          id, slug, category, level, level_tone, dot_tone, title, description, xp,
          difficulty, estimate_time, environment, category_tag, content_markdown,
          content_html, mission_overview, remediation_protocols,
          vulnerability_definition, vulnerability_impact, technical_deep_dive
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          room.id,
          room.slug,
          room.category,
          room.level,
          room.levelTone,
          room.dotTone,
          room.title,
          room.description,
          room.xp,
          room.difficulty,
          room.estimateTime,
          room.environment,
          room.categoryTag || null,
          room.content?.markdown || '',
          room.content?.html || '',
          room.content?.missionOverview || '',
          room.content?.remediationProtocols || '',
          room.content?.vulnerabilityBriefing?.definition || '',
          room.content?.vulnerabilityBriefing?.impact || '',
          room.content?.technicalDeepDive || '',
        ],
      )

      for (const tag of room.tags || []) {
        await conn.query('INSERT INTO room_tags (room_id, tag) VALUES (?, ?)', [room.id, tag])
      }

      for (const keyword of room.requiredKeywords || []) {
        await conn.query('INSERT INTO room_required_keywords (room_id, keyword) VALUES (?, ?)', [
          room.id,
          keyword,
        ])
      }
    }

    for (const path of defaultCareerPaths) {
      await conn.query(
        `INSERT INTO career_paths (
          id, slug, title, description, icon, learning_path_level,
          difficulty, estimated_hours, enrolled_count, mastery, color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          path.id,
          path.slug,
          path.title,
          path.description,
          path.icon || null,
          path.learningPathLevel || null,
          path.difficulty || null,
          path.estimatedHours || 0,
          path.enrolledCount || 0,
          path.mastery || 0,
          path.color || null,
        ],
      )

      for (let i = 0; i < (path.modules || []).length; i += 1) {
        const module = path.modules[i]
        await conn.query(
          'INSERT INTO career_path_modules (id, career_path_id, phase, title, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [module.id, path.id, module.phase || null, module.title, module.description || null, i],
        )

        for (let j = 0; j < (module.rooms || []).length; j += 1) {
          await conn.query(
            'INSERT INTO career_path_module_rooms (module_id, room_id, sort_order) VALUES (?, ?, ?)',
            [module.id, module.rooms[j], j],
          )
        }
      }

      for (let i = 0; i < (path.resources || []).length; i += 1) {
        const resource = path.resources[i]
        await conn.query(
          'INSERT INTO career_path_resources (id, career_path_id, title, url, type, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [resource.id, path.id, resource.title, resource.url || null, resource.type || null, i],
        )
      }
    }

    console.log('✓ Database initialization completed!')
  } finally {
    await conn.end()
  }
}

