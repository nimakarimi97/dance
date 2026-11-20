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

  const inWindow = (days) => views.filter((view) => {
    const createdAt = new Date(view.$createdAt).getTime()
    return createdAt >= now - days * DAY && createdAt <= now
  }).length

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

export function buildViewTimeline(views, days, now = Date.now()) {
  const end = new Date(now)
  end.setUTCHours(0, 0, 0, 0)
  const dateKey = (date) => date.toISOString().slice(0, 10)
  const monthly = days === 'all'
  const start = new Date(end)
  const buckets = new Map()

  if (monthly) {
    const firstView = views.reduce((earliest, view) => {
      const timestamp = new Date(view.$createdAt).getTime()
      return Number.isFinite(timestamp) && timestamp <= now
        ? Math.min(earliest, timestamp)
        : earliest
    }, now)
    start.setUTCDate(1)
    start.setUTCMonth(start.getUTCMonth() - 11)
    const firstDate = new Date(firstView)
    firstDate.setUTCDate(1)
    if (firstDate > start) start.setTime(firstDate.getTime())

    for (const cursor = new Date(start); cursor <= end; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
      buckets.set(dateKey(cursor).slice(0, 7), 0)
    }
  } else {
    start.setUTCDate(start.getUTCDate() - days + 1)
    for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      buckets.set(dateKey(cursor), 0)
    }
  }

  for (const view of views) {
    const timestamp = new Date(view.$createdAt).getTime()
    if (!Number.isFinite(timestamp) || timestamp > now) continue
    const key = dateKey(new Date(timestamp))
    const bucket = monthly ? key.slice(0, 7) : key
    if (buckets.has(bucket)) buckets.set(bucket, buckets.get(bucket) + 1)
  }

  const formatter = new Intl.DateTimeFormat('it', monthly
    ? { month: 'short', year: '2-digit', timeZone: 'UTC' }
    : { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const keys = [...buckets.keys()]

  return {
    labels: keys.map((key) => formatter.format(new Date(`${key}${monthly ? '-01' : ''}T00:00:00Z`))),
    values: keys.map((key) => buckets.get(key)),
  }
}
