import { apiFetch } from '../services/api'

// Rooms data storage with content
function getToneByLevel(level) {
  if (level === 'Easy') {
    return { levelTone: 'text-emerald-600', dotTone: 'bg-emerald-500' }
  }
  if (level === 'Medium') {
    return { levelTone: 'text-amber-600', dotTone: 'bg-amber-500' }
  }
  return { levelTone: 'text-primary', dotTone: 'bg-primary' }
}

function normalizeRoom(room) {
  const tone = getToneByLevel(room.level)
  return {
    ...room,
    levelTone: room.levelTone || tone.levelTone,
    dotTone: room.dotTone || tone.dotTone,
    difficulty: room.difficulty || room.level || '',
    roomType: room.roomType || room.room_type || 'theoretical',
    estimateTime: room.estimateTime || '',
    environment: room.environment || '',
    tags: room.tags || [],
    requiredKeywords: room.requiredKeywords || [],
    content: {
      markdown: room.content?.markdown || '',
      html: room.content?.html || '',
      missionOverview: room.content?.missionOverview || '',
      remediationProtocols: room.content?.remediationProtocols || '',
      vulnerabilityBriefing: {
        definition: room.content?.vulnerabilityBriefing?.definition || '',
        impact: room.content?.vulnerabilityBriefing?.impact || '',
      },
      technicalDeepDive: room.content?.technicalDeepDive || '',
      youtubeVideoUrl: room.content?.youtubeVideoUrl || '',
      aiQuestionsEnabled: Boolean(room.content?.aiQuestionsEnabled),
      attachment: room.content?.attachment || null,
      questionsEnabled: Boolean(room.content?.questionsEnabled),
      questions: Array.isArray(room.content?.questions) ? room.content.questions : [],
    },
  }
}

export const defaultRooms = [
  {
    id: 'sql-injection-the-basement',
    slug: 'sql-injection-the-basement',
    category: 'Web Exploitation',
    level: 'Easy',
    levelTone: 'text-emerald-600',
    dotTone: 'bg-emerald-500',
    title: 'SQL Injection: The Basement',
    description:
      'Analyze a legacy employee portal and extract encrypted credentials from the underlying database using union-based injection.',
    xp: '500 XP',
    roomType: 'theoretical',
    difficulty: 'Easy',
    estimateTime: '45 minutes',
    environment: 'Web Browser + SQL Sandbox',
    tags: ['Database', 'SQL'],
    requiredKeywords: ['UNION', 'WHERE', 'SELECT'],
    categoryTag: 'Web Exploitation',
    content: {
      markdown: `# SQL Injection: The Basement - Intel

## MISSION_OVERVIEW

You are tasked with infiltrating the "Basement" - a deprecated storage tier of the INCOGNITRIX environment. The target is a localized authentication portal managing access to archival hardware.

Technical reconnaissance indicates the portal utilizes an aging RDBMS. The objective is to identify and exploit input handling failures to bypass security protocols without valid credentials.

## VULNERABILITY_BRIEFING

### Definition
SQL Injection (SQLi) is an attack vector that interferes with the queries an application makes to its database. It allows attackers to view data they are not normally able to retrieve.

### Impact
Successful exploitation can result in unauthorized access to sensitive data, total database compromise, and in some configurations, execution of OS commands.

## TECHNICAL_DEEP_DIVE

In this environment, the application dynamically constructs a SQL query by concatenating user input directly into the string without sanitization.`,
      missionOverview:
        'Infiltrate the deprecated Basement authentication portal and identify exploitable SQL input handling flaws.',
      remediationProtocols:
        'Apply parameterized queries, enforce strict input validation, and implement least-privilege database access.',
      vulnerabilityBriefing: {
        definition:
          'SQL Injection is a vulnerability where untrusted input alters backend SQL query logic.',
        impact:
          'Can lead to data theft, authentication bypass, and in severe cases full database compromise.',
      },
      technicalDeepDive:
        'The query builder concatenates user input directly into SQL statements without sanitization or prepared statements.',
      html: `<section class="bg-surface-container-lowest p-8 relative overflow-hidden">
  <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 -rotate-45 translate-x-16 -translate-y-16"></div>
  <h2 class="font-headline text-2xl font-bold mb-6 flex items-center gap-3">
    <span class="text-primary">01</span> MISSION_OVERVIEW
  </h2>
  <div class="space-y-4 text-on-surface font-body leading-relaxed">
    <p>You are tasked with infiltrating the "Basement" - a deprecated storage tier of the INCOGNITRIX environment.</p>
  </div>
</section>`,
    },
  },
  {
    id: 'broken-keypad-rsa-101',
    slug: 'broken-keypad-rsa-101',
    category: 'Cryptography',
    level: 'Medium',
    levelTone: 'text-amber-600',
    dotTone: 'bg-amber-500',
    title: 'Broken Keypad: RSA 101',
    description:
      'A faulty encryption protocol is leaking prime factors. Intercept the handshake and decrypt the mission-critical command.',
    xp: '1,250 XP',
    roomType: 'theoretical',
    difficulty: 'Medium',
    estimateTime: '60 minutes',
    environment: 'Crypto VM',
    tags: ['Cryptography', 'RSA'],
    requiredKeywords: ['RSA', 'prime factors'],
    categoryTag: 'Cryptography',
    content: {
      markdown: `# Broken Keypad: RSA 101

## Overview
A faulty encryption protocol is leaking prime factors. Intercept the handshake and decrypt the mission-critical command.`,
      html: `<section class="p-8">
  <h2 class="text-2xl font-bold mb-4">RSA Cryptography Challenge</h2>
  <p>Exploit weak encryption implementation.</p>
</section>`,
    },
  },
  {
    id: 'kernel-panic-buffer-overflow',
    slug: 'kernel-panic-buffer-overflow',
    category: 'Binary Exploitation',
    level: 'Hard',
    levelTone: 'text-primary',
    dotTone: 'bg-primary',
    title: 'Kernel Panic: Buffer Overflow',
    description:
      'Exploit a heap-based buffer overflow in a custom Linux driver to achieve ring-0 privilege escalation and maintain persistence.',
    xp: '2,500 XP',
    roomType: 'practical',
    difficulty: 'Hard',
    estimateTime: '120 minutes',
    environment: 'Linux Kernel Lab',
    tags: ['Binary', 'Exploitation'],
    requiredKeywords: ['heap', 'overflow', 'escalation'],
    categoryTag: 'Binary Exploitation',
    content: {
      markdown: `# Kernel Panic: Buffer Overflow

## Overview
Exploit a heap-based buffer overflow to achieve privilege escalation.`,
      html: `<section class="p-8">
  <h2 class="text-2xl font-bold mb-4">Buffer Overflow Exploitation</h2>
  <p>Advanced exploitation techniques.</p>
</section>`,
    },
  },
  {
    id: 'ghost-in-the-ram',
    slug: 'ghost-in-the-ram',
    category: 'Digital Forensics',
    level: 'Medium',
    levelTone: 'text-amber-600',
    dotTone: 'bg-amber-500',
    title: 'Ghost in the RAM',
    description:
      'Examine a captured memory dump from a compromised workstation. Identify the malicious process and recover the exfiltrated file.',
    xp: '1,000 XP',
    roomType: 'theoretical',
    difficulty: 'Medium',
    estimateTime: '75 minutes',
    environment: 'Forensics Workbench',
    tags: ['Forensics', 'Memory'],
    requiredKeywords: ['memory dump', 'process analysis'],
    categoryTag: 'Digital Forensics',
    content: {
      markdown: `# Ghost in the RAM

## Overview
Examine a captured memory dump to identify malicious processes.`,
      html: `<section class="p-8">
  <h2 class="text-2xl font-bold mb-4">Digital Forensics</h2>
  <p>Memory analysis and investigation.</p>
</section>`,
    },
  },
]

let fallbackMemoryRooms = null;

export function getRoomsData() {
  if (fallbackMemoryRooms) return fallbackMemoryRooms;
  const stored = localStorage.getItem('roomsData')
  if (stored) {
    try {
      const parsed = JSON.parse(stored).map(normalizeRoom)
      fallbackMemoryRooms = parsed;
      return parsed;
    } catch (e) {
      console.error('Error parsing roomsData:', e)
      fallbackMemoryRooms = defaultRooms.map(normalizeRoom);
      return fallbackMemoryRooms;
    }
  }
  fallbackMemoryRooms = defaultRooms.map(normalizeRoom);
  return fallbackMemoryRooms;
}

export function setRoomsData(rooms) {
  fallbackMemoryRooms = rooms;
  try {
    localStorage.setItem('roomsData', JSON.stringify(rooms))
  } catch (error) {
    console.warn('localStorage quota exceeded for roomsData. Retaining in memory only.', error)
  }
}

export function hydrateRoomsData(rooms) {
  fallbackMemoryRooms = rooms.map(normalizeRoom);
  try {
    localStorage.setItem('roomsData', JSON.stringify(fallbackMemoryRooms))
  } catch (error) {
    console.warn('localStorage quota exceeded during room hydration. Retaining in memory only.', error)
  }
}

export function getRoomById(id) {
  const rooms = getRoomsData()
  return rooms.find((r) => r.id === id)
}

export function updateRoom(id, updates) {
  const rooms = getRoomsData()
  const index = rooms.findIndex((r) => r.id === id)
  if (index !== -1) {
    rooms[index] = normalizeRoom({ ...rooms[index], ...updates })
    setRoomsData(rooms)
    void apiFetch(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rooms[index]),
    }).catch((error) => console.error('Failed to sync room update:', error))
    return rooms[index]
  }
  return null
}

export function addRoom(room) {
  const rooms = getRoomsData()
  const slugBase = (room.slug || room.title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  const slug = slugBase || `room-${Date.now()}`
  const newRoom = {
    ...room,
    id: slug,
    slug,
    content: room.content || { markdown: '', html: '' },
  }
  rooms.push(normalizeRoom(newRoom))
  setRoomsData(rooms)
  void apiFetch('/rooms', {
    method: 'POST',
    body: JSON.stringify(newRoom),
  }).catch((error) => console.error('Failed to sync room create:', error))
  return newRoom
}

export function deleteRoom(id) {
  const rooms = getRoomsData()
  const filtered = rooms.filter((r) => r.id !== id)
  setRoomsData(filtered)
  void apiFetch(`/rooms/${id}`, {
    method: 'DELETE',
  }).catch((error) => console.error('Failed to sync room delete:', error))
}
