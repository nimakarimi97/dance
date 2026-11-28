export const difficultyLabels = { beginner: 'Base', intermediate: 'Intermedia', advanced: 'Avanzata' }
const difficultyRank = { beginner: 1, intermediate: 2, advanced: 3 }

export function normalizeSearch(text) {
  return String(text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

export function filterCatalog(figures, { search = '', dance = '', video = 'all', difficulty = '', sort = 'catalog', style = '' } = {}) {
  const normalize = normalizeSearch
  const query = normalize(search)
  const results = figures.filter(figure => {
    const hasVideo = Boolean(figure.videoFileId || figure.youtubeId)
    const text = [figure.nome, ...(figure.aliases || []), figure.description].map(normalize).join(' ')
    return (!dance || figure.danza === dance)
      && (!style || figure.stili?.includes(style))
      && (!difficulty || (difficulty === 'unset' ? !figure.difficulty : figure.difficulty === difficulty))
      && (!query || query.split(/\s+/).every(word => text.includes(word)))
      && (video === 'all' || (video === 'ready' ? hasVideo : !hasVideo))
  })
  const byName = (a, b) => a.nome.localeCompare(b.nome, 'it', { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id)
  const byCreatedAt = (a, b) => (b.$createdAt || '').localeCompare(a.$createdAt || '') || byName(a, b)
  if (sort === 'name') results.sort(byName)
  if (sort === 'difficulty') results.sort((a, b) => (difficultyRank[a.difficulty] || 4) - (difficultyRank[b.difficulty] || 4) || byName(a, b))
  if (sort === 'newest') results.sort(byCreatedAt)
  if (sort === 'recent') results.sort((a, b) => (b.$updatedAt || '').localeCompare(a.$updatedAt || '') || byName(a, b))
  return results
}
