import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeViews } from '../src/lib/analytics.js'

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
