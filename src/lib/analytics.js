const DAY = 24 * 60 * 60 * 1000

function countBy(views, keyOf) {
  const counts = new Map()
  for (const view of views) {
    for (const key of keyOf(view)) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export function summarizeViews(views, figures, dances = {}, now = Date.now()) {
  const figureById = new Map(figures.map((figure) => [figure.id, figure]))
  const perFigure = countBy(views, (view) => [view.figureId])
  const viewers = new Set(views.map((view) => view.userId))

  const ranking = figures
    .map((figure) => ({ id: figure.id, nome: figure.nome, views: perFigure.get(figure.id) ?? 0 }))
    .sort((a, b) => b.views - a.views || a.nome.localeCompare(b.nome, 'it'))

  const perDance = countBy(views, (view) => {
    const danza = figureById.get(view.figureId)?.danza
    return danza ? [danza] : []
  })
  const styleNames = new Map(Object.values(dances).flatMap((dance) => dance.stili.map((style) => [style.id, style.nome])))
  const perStyle = countBy(views, (view) => figureById.get(view.figureId)?.stili ?? [])

  const inWindow = (days) => views.filter((view) => now - new Date(view.$createdAt).getTime() <= days * DAY).length

  return {
    totalViews: views.length,
    uniqueViewers: viewers.size,
    neverViewed: ranking.filter((figure) => figure.views === 0).length,
    ranking,
    top: ranking.filter((figure) => figure.views > 0).slice(0, 5),
    byDance: Object.entries(dances)
      .map(([id, dance]) => ({ id, nome: dance.nome, views: perDance.get(id) ?? 0 }))
      .sort((a, b) => b.views - a.views),
    byStyle: [...perStyle]
      .map(([id, count]) => ({ id, nome: styleNames.get(id) ?? id, views: count }))
      .sort((a, b) => b.views - a.views),
    last7Days: inWindow(7),
    last30Days: inWindow(30),
  }
}
