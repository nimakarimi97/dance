import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildEventTimeline, buildViewTimeline, summarizeFavorites, summarizeViews } from '../src/lib/analytics.js'

test('favorite summary ranks current saves and ignores figures outside the catalog', () => {
  const favorites = [
    { figureId: 'b', count: 3 },
    { figureId: 'a', count: 3 },
    { figureId: 'missing', count: 5 },
  ]
  const figures = [
    { id: 'a', nome: 'Alfa' },
    { id: 'b', nome: 'Beta' },
    { id: 'c', nome: 'Gamma' },
  ]

  assert.deepEqual(summarizeFavorites(favorites, figures), [
    { id: 'a', nome: 'Alfa', favorites: 3 },
    { id: 'b', nome: 'Beta', favorites: 3 },
  ])
})

test('event summary separates views, clicks and admin actions', () => {
  const figures = [
    { id: 'a', nome: 'Alfa', danza: 'salsa', stili: ['on1'] },
    { id: 'b', nome: 'Beta', danza: 'bachata', stili: ['sensual'] },
  ]
  const events = [
    { eventType: 'page_view', eventTarget: 'home', userId: 'u1' },
    { eventType: 'figure_view', figureId: 'a', userId: 'u1' },
    { eventType: 'figure_card_click', figureId: 'a', eventTarget: 'a', userId: 'u1' },
    { eventType: 'dance_card_click', eventTarget: 'bachata', userId: 'u2' },
    { eventType: 'admin_figure_edit', figureId: 'b', userId: 'admin-1' },
    { figureId: 'b', userId: 'u2' },
  ]

  const stats = summarizeViews(events, figures)
  assert.equal(stats.totalPageViews, 1)
  assert.equal(stats.totalViews, 2)
  assert.equal(stats.totalClicks, 2)
  assert.equal(stats.adminActions, 1)
  assert.equal(stats.uniqueViewers, 2)
  assert.deepEqual(stats.topClickedFigures, [{ id: 'a', nome: 'Alfa', clicks: 1 }])
})

test('event timeline groups views, clicks and admin actions independently', () => {
  const now = Date.parse('2025-06-30T12:00:00Z')
  const timeline = buildEventTimeline([
    { eventType: 'page_view', $createdAt: '2025-06-29T07:00:00Z' },
    { eventType: 'figure_view', $createdAt: '2025-06-29T08:00:00Z' },
    { eventType: 'figure_card_click', $createdAt: '2025-06-29T18:00:00Z' },
    { eventType: 'admin_figure_edit', $createdAt: '2025-06-30T08:00:00Z' },
  ], 3, now)

  assert.deepEqual(timeline.pageViews, [0, 1, 0])
  assert.deepEqual(timeline.views, [0, 1, 0])
  assert.deepEqual(timeline.clicks, [0, 1, 0])
  assert.deepEqual(timeline.adminActions, [0, 0, 1])
})

test('view summary counts totals, unique viewers and ranks figures by views', () => {
  const figures = [
    { id: 'a', nome: 'Alfa' },
    { id: 'b', nome: 'Beta' },
    { id: 'c', nome: 'Gamma' },
  ]
  const views = [
    { figureId: 'b', userId: 'u1' },
    { figureId: 'b', userId: 'u2' },
    { figureId: 'b', userId: 'u1' },
    { figureId: 'a', userId: 'u2' },
  ]
  const stats = summarizeViews(views, figures)
  assert.equal(stats.totalViews, 4)
  assert.equal(stats.uniqueViewers, 2)
  assert.equal(stats.neverViewed, 1)
  assert.deepEqual(stats.top, [
    { id: 'b', nome: 'Beta', views: 3 },
    { id: 'a', nome: 'Alfa', views: 1 },
  ])
})

test('view summary groups by dance and style and splits 7 and 30 day windows', () => {
  const day = 24 * 60 * 60 * 1000
  const now = Date.parse('2025-06-30T12:00:00Z')
  const figures = [
    { id: 'a', nome: 'Alfa', danza: 'salsa', stili: ['on1'] },
    { id: 'b', nome: 'Beta', danza: 'bachata', stili: ['on1', 'sensual'] },
  ]
  const dances = {
    salsa: { nome: 'Salsa', stili: [{ id: 'on1', nome: 'On1' }] },
    bachata: { nome: 'Bachata', stili: [{ id: 'sensual', nome: 'Sensuale' }] },
  }
  const views = [
    { figureId: 'b', userId: 'u1', $createdAt: new Date(now - 1 * day).toISOString() },
    { figureId: 'b', userId: 'u2', $createdAt: new Date(now - 10 * day).toISOString() },
    { figureId: 'a', userId: 'u1', $createdAt: new Date(now - 40 * day).toISOString() },
  ]
  const stats = summarizeViews(views, figures, dances, now)
  assert.equal(stats.last7Days, 1)
  assert.equal(stats.last30Days, 2)
  assert.deepEqual(stats.byDance, [
    { id: 'bachata', nome: 'Bachata', views: 2 },
    { id: 'salsa', nome: 'Salsa', views: 1 },
  ])
  assert.deepEqual(stats.byStyle[0], { id: 'on1', nome: 'On1', views: 3 })
})

test('view timeline fills missing days and ignores future or invalid timestamps', () => {
  const now = Date.parse('2025-06-30T12:00:00Z')
  const timeline = buildViewTimeline([
    { $createdAt: '2025-06-29T08:00:00Z' },
    { $createdAt: '2025-06-29T18:00:00Z' },
    { $createdAt: '2025-07-01T08:00:00Z' },
    { $createdAt: 'not-a-date' },
  ], 3, now)

  assert.equal(timeline.values.length, 3)
  assert.deepEqual(timeline.values, [0, 2, 0])
})

test('all-time timeline shows a bounded twelve-month view', () => {
  const now = Date.parse('2025-06-30T12:00:00Z')
  const timeline = buildViewTimeline([
    { $createdAt: '2024-01-15T08:00:00Z' },
    { $createdAt: '2025-06-29T08:00:00Z' },
  ], 'all', now)

  assert.equal(timeline.values.length, 12)
  assert.equal(timeline.values.reduce((total, count) => total + count, 0), 1)
  assert.equal(timeline.values.at(-1), 1)
})

test('view summary excludes future events from recent-period totals', () => {
  const now = Date.parse('2025-06-30T12:00:00Z')
  const stats = summarizeViews([
    { figureId: 'a', userId: 'u1', $createdAt: '2025-06-29T08:00:00Z' },
    { figureId: 'a', userId: 'u2', $createdAt: '2025-07-01T08:00:00Z' },
  ], [{ id: 'a', nome: 'Alfa' }], {}, now)

  assert.equal(stats.last7Days, 1)
  assert.equal(stats.last30Days, 1)
})
