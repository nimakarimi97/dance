export function filterCatalog(figures, { search = '', dance = '', video = 'all' } = {}) {
  const normalize = text => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
  const query = normalize(search)
  return figures.filter(figure => {
    const hasVideo = Boolean(figure.videoFileId || figure.youtubeId)
    return (!dance || figure.danza === dance)
      && (!query || normalize(figure.nome).includes(query))
      && (video === 'all' || (video === 'ready' ? hasVideo : !hasVideo))
  })
}
