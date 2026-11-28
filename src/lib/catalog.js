export function filterCatalog(figures, { search = '', dance = '', video = 'all', style = '', sort = 'catalog' } = {}) {
  const normalize = text => String(text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
  const query = normalize(search)
  const results = figures.filter(figure => {
    const hasVideo = Boolean(figure.videoFileId || figure.youtubeId)
    return (!dance || figure.danza === dance)
      && (!style || figure.stili?.includes(style))
      && (!query || normalize(figure.nome).includes(query))
      && (video === 'all' || (video === 'ready' ? hasVideo : !hasVideo))
  })
  if (sort === 'newest') {
    results.sort((a, b) => (b.$createdAt || '').localeCompare(a.$createdAt || '')
      || a.nome.localeCompare(b.nome, 'it', { numeric: true, sensitivity: 'base' })
      || a.id.localeCompare(b.id))
  }
  return results
}
