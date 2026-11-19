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
