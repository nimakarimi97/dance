const DAY = 24 * 60 * 60 * 1000
export const ANALYTICS_EVENTS = Object.freeze({
  PAGE_VIEW: 'page_view',
  FIGURE_VIEW: 'figure_view',
  FIGURE_CARD_CLICK: 'figure_card_click',
  DANCE_CARD_CLICK: 'dance_card_click',
  DASHBOARD_NAV_CLICK: 'dashboard_nav_click',
  APP_NAV_CLICK: 'app_nav_click',
  ADMIN_FIGURE_CREATE: 'admin_figure_create',
  ADMIN_FIGURE_EDIT: 'admin_figure_edit',
  ADMIN_ROLE_PROMOTE: 'admin_role_promote',
  ADMIN_ROLE_DEMOTE: 'admin_role_demote',
})
const VIEW_EVENT = ANALYTICS_EVENTS.FIGURE_VIEW

function eventTypeOf(event) {
  return event.eventType || VIEW_EVENT
}

function isPageView(event) {
  return eventTypeOf(event) === ANALYTICS_EVENTS.PAGE_VIEW
}

function isFigureView(event) {
  return eventTypeOf(event) === VIEW_EVENT
}

function isClickEvent(event) {
  return eventTypeOf(event).endsWith('_click')
}

function isAdminEvent(event) {
  return eventTypeOf(event).startsWith('admin_')
}

function countBy(views, keyOf) {
  const counts = new Map()
  for (const view of views) {
    for (const key of keyOf(view)) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export function summarizeViews(events, figures, dances = {}, now = Date.now()) {
  const views = events.filter(isFigureView)
  const pageViews = events.filter(isPageView)
  const clicks = events.filter(isClickEvent)
  const adminActions = events.filter(isAdminEvent)
  const figureById = new Map(figures.map((figure) => [figure.id, figure]))
  const perFigure = countBy(views, (view) => [view.figureId])
  const visitors = new Set([...pageViews, ...views].map((view) => view.userId))

  const ranking = figures
    .map((figure) => ({ id: figure.id, nome: figure.nome, views: perFigure.get(figure.id) ?? 0 }))
    .sort((a, b) => b.views - a.views || a.nome.localeCompare(b.nome, 'it'))

  const perDance = countBy(views, (view) => {
    const danza = figureById.get(view.figureId)?.danza
    return danza ? [danza] : []
  })
  const styleNames = new Map(Object.values(dances).flatMap((dance) => dance.stili.map((style) => [style.id, style.nome])))
  const perStyle = countBy(views, (view) => figureById.get(view.figureId)?.stili ?? [])
  const eventCounts = countBy(events, (event) => [eventTypeOf(event)])
  const clickedFigures = countBy(clicks.filter((event) => eventTypeOf(event) === 'figure_card_click'), (event) => [
    event.eventTarget || event.figureId,
  ].filter(Boolean))

  const inWindow = (items, days) => items.filter((item) => {
    const createdAt = new Date(item.$createdAt).getTime()
    return createdAt >= now - days * DAY && createdAt <= now
  }).length

  return {
    totalViews: views.length,
    totalPageViews: pageViews.length,
    totalClicks: clicks.length,
    adminActions: adminActions.length,
    uniqueViewers: visitors.size,
    neverViewed: ranking.filter((figure) => figure.views === 0).length,
    ranking,
    top: ranking.filter((figure) => figure.views > 0).slice(0, 5),
    byDance: Object.entries(dances)
      .map(([id, dance]) => ({ id, nome: dance.nome, views: perDance.get(id) ?? 0 }))
      .sort((a, b) => b.views - a.views),
    byStyle: [...perStyle]
      .map(([id, count]) => ({ id, nome: styleNames.get(id) ?? id, views: count }))
      .sort((a, b) => b.views - a.views),
    byEventType: [...eventCounts]
      .map(([eventType, count]) => ({ eventType, count }))
      .sort((a, b) => b.count - a.count),
    topClickedFigures: [...clickedFigures]
      .map(([id, clicks]) => ({ id, nome: figureById.get(id)?.nome ?? id, clicks }))
      .sort((a, b) => b.clicks - a.clicks || a.nome.localeCompare(b.nome, 'it'))
      .slice(0, 5),
    last7Days: inWindow(views, 7),
    last30Days: inWindow(views, 30),
  }
}

function buildTimeline(events, days, now, accept) {
  const matchingEvents = events.filter(accept)
  const end = new Date(now)
  end.setUTCHours(0, 0, 0, 0)
  const dateKey = (date) => date.toISOString().slice(0, 10)
  const monthly = days === 'all'
  const start = new Date(end)
  const buckets = new Map()

  if (monthly) {
    const firstView = matchingEvents.reduce((earliest, event) => {
      const timestamp = new Date(event.$createdAt).getTime()
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

  for (const event of events) {
    const timestamp = new Date(event.$createdAt).getTime()
    if (!Number.isFinite(timestamp) || timestamp > now || !accept(event)) continue
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

export function buildViewTimeline(views, days, now = Date.now()) {
  return buildTimeline(views, days, now, (event) => eventTypeOf(event) === VIEW_EVENT)
}

export function buildEventTimeline(events, days, now = Date.now()) {
  const timeline = (predicate) => buildTimeline(events, days, now, predicate)
  const views = timeline((event) => eventTypeOf(event) === VIEW_EVENT)
  const clicks = timeline(isClickEvent)
  const adminActions = timeline(isAdminEvent)
  return {
    labels: views.labels,
    views: views.values,
    pageViews: timeline((event) => isPageView(event)).values,
    clicks: clicks.values,
    adminActions: adminActions.values,
  }
}
