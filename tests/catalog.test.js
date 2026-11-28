import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterCatalog } from '../src/lib/catalog.js'

const figures = [
  { id: 'salsa-one', nome: 'Enchufla', danza: 'salsa', videoFileId: 'private-video', youtubeId: null },
  { id: 'salsa-two', nome: 'Enchufla mista', danza: 'salsa', videoFileId: null, youtubeId: null },
  { id: 'bachata-one', nome: 'Pasé básico', danza: 'bachata', videoFileId: null, youtubeId: 'youtube-id' },
]

test('catalog combines search, dance and missing-video filters', () => {
  const result = filterCatalog(figures, { search: ' ENCHUFLA ', dance: 'salsa', video: 'missing' })
  assert.deepEqual(result.map(figure => figure.id), ['salsa-two'])
})

test('catalog finds accented names and recognizes both video sources', () => {
  assert.deepEqual(filterCatalog(figures, { search: 'pase basico', video: 'ready' }).map(figure => figure.id), ['bachata-one'])
  assert.deepEqual(filterCatalog(figures, { video: 'ready' }).map(figure => figure.id), ['salsa-one', 'bachata-one'])
})

test('catalog can recover the full list after filters are reset', () => {
  assert.equal(filterCatalog(figures, { search: 'no matching figure' }).length, 0)
  assert.equal(filterCatalog(figures).length, 3)
})

test('structured aliases and descriptions are accent-insensitive and case-insensitive', () => {
  const entries = [{ id: '70', nome: '70', danza: 'salsa', aliases: ['Settànta'], description: 'Giro básico' }]
  assert.equal(filterCatalog(entries, { search: ' SETTANTA ' })[0].id, '70')
  assert.equal(filterCatalog(entries, { search: 'GIRO BASICO' })[0].id, '70')
  assert.equal(filterCatalog(entries, { search: 'settanta giro' })[0].id, '70')
})

test('difficulty video dance and style filters compose with sorting without mutating input', () => {
  const entries = [
    { id: 'b', nome: 'Figura 10', danza: 'salsa', stili: ['cubana'], difficulty: 'beginner', youtubeId: 'video', $createdAt: '2026-01-01', $updatedAt: '2026-03-01' },
    { id: 'a', nome: 'Figura 2', danza: 'salsa', stili: ['cubana'], difficulty: 'beginner', videoFileId: 'file', $createdAt: '2026-02-01', $updatedAt: '2026-02-01' },
    { id: 'c', nome: 'Advanced', danza: 'salsa', stili: ['cubana'], difficulty: 'advanced' },
    { id: 'd', nome: 'Legacy', danza: 'bachata', stili: [] },
  ]
  const result = filterCatalog(entries, { dance: 'salsa', video: 'ready', style: 'cubana', difficulty: 'beginner', sort: 'name' })
  assert.deepEqual(result.map(item => item.id), ['a', 'b'])
  assert.deepEqual(filterCatalog(entries, { sort: 'newest' }).map(item => item.id), ['a', 'b', 'c', 'd'])
  assert.deepEqual(filterCatalog(entries, { sort: 'recent' }).map(item => item.id), ['b', 'a', 'c', 'd'])
  assert.deepEqual(filterCatalog(entries, { sort: 'difficulty' }).map(item => item.id), ['a', 'b', 'c', 'd'])
  assert.deepEqual(filterCatalog(entries, { difficulty: 'unset' }).map(item => item.id), ['d'])
  assert.deepEqual(entries.map(item => item.id), ['b', 'a', 'c', 'd'])
})
