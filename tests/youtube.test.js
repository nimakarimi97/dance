import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseYoutubeId } from '../src/lib/youtube.js'

test('youtube parser accepts a bare 11-character id and common link shapes', () => {
  assert.equal(parseYoutubeId(' wohe5qTYWFU '), 'wohe5qTYWFU')
  assert.equal(parseYoutubeId('https://youtube.com/shorts/wohe5qTYWFU'), 'wohe5qTYWFU')
  assert.equal(parseYoutubeId('https://www.youtube.com/watch?v=wohe5qTYWFU&t=10s'), 'wohe5qTYWFU')
  assert.equal(parseYoutubeId('https://youtu.be/wohe5qTYWFU?si=abc'), 'wohe5qTYWFU')
  assert.equal(parseYoutubeId('m.youtube.com/embed/wohe5qTYWFU'), 'wohe5qTYWFU')
})

test('youtube parser rejects empty, foreign or malformed input', () => {
  assert.equal(parseYoutubeId(''), null)
  assert.equal(parseYoutubeId('https://vimeo.com/wohe5qTYWFU'), null)
  assert.equal(parseYoutubeId('https://youtube.com/shorts/short'), null)
  assert.equal(parseYoutubeId('not a link'), null)
})
