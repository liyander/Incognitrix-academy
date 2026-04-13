export function mapCareerPath(pathRow, modules = [], resources = []) {
  return {
    id: pathRow.id,
    slug: pathRow.slug,
    title: pathRow.title,
    description: pathRow.description,
    icon: pathRow.icon,
    learningPathLevel: pathRow.learning_path_level,
    difficulty: pathRow.difficulty,
    estimatedHours: pathRow.estimated_hours,
    enrolledCount: pathRow.enrolled_count,
    mastery: pathRow.mastery,
    color: pathRow.color,
    modules,
    resources,
  }
}
