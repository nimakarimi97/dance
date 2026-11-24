import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addPreviewFigure, canOpenPreviewFigure, readPreviewFigures } from '../src/lib/guestPreview.js'

test('stored preview ids are sanitized, deduplicated and capped', () => {
  assert.deepEqual(readPreviewFigures('["a","a","b",3,null,"c","d"]', 3), ['a', 'b', 'c'])
  assert.deepEqual(readPreviewFigures('not json', 3), [])
  assert.deepEqual(readPreviewFigures('{"a":1}', 3), [])
  assert.deepEqual(readPreviewFigures(null, 3), [])
})

test('guests cannot open any figure after reaching the preview limit', () => {
  const viewed = ['a', 'b', 'c']
  assert.equal(canOpenPreviewFigure(viewed, 'b', 3), false)
  assert.equal(canOpenPreviewFigure(viewed, 'd', 3), false)
  assert.equal(canOpenPreviewFigure(['a', 'b'], 'a', 3), true)
  assert.equal(canOpenPreviewFigure(['a'], 'd', 3), true)
})

test('adding a figure returns a new list only when the quota allows it', () => {
  const viewed = ['a', 'b']
  assert.deepEqual(addPreviewFigure(viewed, 'c', 3), ['a', 'b', 'c'])
  assert.equal(addPreviewFigure(viewed, 'a', 3), viewed)

  const full = ['a', 'b', 'c']
  assert.equal(addPreviewFigure(full, 'd', 3), full)
})
