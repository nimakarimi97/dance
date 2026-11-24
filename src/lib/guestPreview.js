// Pure helpers for the guest figure preview. Storage and reactivity live in data/danze.js.
export function readPreviewFigures(raw, limit) {
  try {
    const ids = JSON.parse(raw ?? '[]')
    if (!Array.isArray(ids)) return []
    return [...new Set(ids.filter(id => typeof id === 'string'))].slice(0, limit)
  } catch {
    return []
  }
}

export function canOpenPreviewFigure(viewed, figureId, limit) {
  return viewed.length < limit
}

export function addPreviewFigure(viewed, figureId, limit) {
  if (viewed.includes(figureId) || viewed.length >= limit) return viewed
  return [...viewed, figureId]
}
