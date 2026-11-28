import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sortByNewestSaved } from '../src/lib/sorting.js'

test('sortByNewestSaved puts the latest update first and uses ID for ties or missing dates', () => {
  const items = [
    { $id: '3', $updatedAt: '2026-03-01T00:00:00.000Z' },
    { $id: '2', $updatedAt: '2026-03-01T00:00:00.000Z' },
    { $id: '10', $createdAt: '2026-04-01T00:00:00.000Z' },
    { $id: '1' },
  ]

  assert.deepEqual(sortByNewestSaved(items).map(item => item.$id), ['10', '2', '3', '1'])
})

test('sortByNewestSaved can use local savedAt timestamps', () => {
  const items = [{ id: 'old', savedAt: '2026-01-01' }, { id: 'new', savedAt: '2026-02-01' }]

  assert.deepEqual(sortByNewestSaved(items, 'savedAt').map(item => item.id), ['new', 'old'])
})
