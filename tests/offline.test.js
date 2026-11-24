import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createOfflineLibrary, OFFLINE_KEY } from '../src/lib/offline-library.js'

function fixture() {
  const values = new Map()
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
  return { storage, library: createOfflineLibrary(storage) }
}
const figure = { id: '70', nome: '70', aliases: ['settanta'], description: 'Passi', danza: 'salsa', stili: ['cubana'] }

test('explicit offline copies include allowlisted text only, not notes media or credentials', () => {
  const { library, storage } = fixture()
  library.activate('member')
  library.save('member', { ...figure, notes: 'PRIVATE', videoFileId: 'MEDIA', imageFileId: 'IMAGE', jwt: 'SECRET', youtubeId: 'PRIVATE-LINK' })
  const raw = storage.getItem(OFFLINE_KEY)
  for (const secret of ['PRIVATE', 'MEDIA', 'IMAGE', 'SECRET', 'PRIVATE-LINK']) assert.ok(!raw.includes(secret))
  assert.deepEqual(library.read().figures[0].aliases, ['settanta'])
  assert.ok(library.read().figures[0].savedAt)
})

test('offline access persists across reload but account switching and logout purge copies', () => {
  const { library, storage } = fixture()
  library.activate('first')
  library.save('first', figure)
  assert.equal(createOfflineLibrary(storage).read().figures.length, 1)
  library.activate('first')
  assert.equal(library.read().figures.length, 1)
  library.activate('second')
  assert.deepEqual(library.read(), { owner: 'second', figures: [] })
  assert.throws(() => library.save('first', figure), /Account cambiato/)
  library.save('second', figure)
  library.clear()
  assert.deepEqual(library.read(), { owner: '', figures: [] })
})

test('storage quota failures preserve old data and are not reported as successful saves', () => {
  const { library, storage } = fixture()
  library.activate('member')
  library.save('member', figure)
  storage.setItem = () => { throw new Error('Quota exceeded') }
  assert.throws(() => library.save('member', { ...figure, nome: 'New' }), /Quota exceeded/)
  assert.equal(library.read().figures[0].nome, '70')
})
