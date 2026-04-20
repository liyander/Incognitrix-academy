export function mapRoomRow(roomRow, tags = [], keywords = []) {
  return {
    id: roomRow.id,
    slug: roomRow.slug,
    category: roomRow.category,
    level: roomRow.level,
    levelTone: roomRow.level_tone,
    dotTone: roomRow.dot_tone,
    title: roomRow.title,
    description: roomRow.description,
    xp: roomRow.xp,
    difficulty: roomRow.difficulty,
    estimateTime: roomRow.estimate_time,
    environment: roomRow.environment,
    categoryTag: roomRow.category_tag,
    tags,
    requiredKeywords: keywords,
    content: {
      markdown: roomRow.content_markdown || '',
      html: roomRow.content_html || '',
      missionOverview: roomRow.mission_overview || '',
      remediationProtocols: roomRow.remediation_protocols || '',
      vulnerabilityBriefing: {
        definition: roomRow.vulnerability_definition || '',
        impact: roomRow.vulnerability_impact || '',
      },
      technicalDeepDive: roomRow.technical_deep_dive || '',
      youtubeVideoUrl: roomRow.youtube_video_url || '',
      questionsEnabled: Boolean(roomRow.questions_enabled),
      questions: (() => {
        try {
          const parsed = JSON.parse(roomRow.questions_json || '[]')
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      })(),
    },
  }
}
