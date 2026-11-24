import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPracticeHandler } from '../functions/practice/practice.js'
import { createPracticeStore } from '../functions/practice/store.js'

function fixture() {
  const rows = new Map([
    ['private-list', { $id: 'private-list', owner: 'other', name: 'Private', figureIds: [] }],
    ['my-list', { $id: 'my-list', owner: 'member', name: 'Mine', figureIds: ['deleted'] }],
  ])
  const calls = []
  const api = {
    async getUser(id) { calls.push(['user', id]); return { $id: id, labels: [] } },
    async list(table, owner) {
      calls.push(['list', table, owner])
      return [...rows.values()].filter(row => row.owner === owner)
    },
    async getFigure(id) {
      if (id === 'deleted') throw Object.assign(new Error('Missing'), { code: 404 })
      return { $id: id }
    },
    async owned(table, id, owner) {
      const row = rows.get(id)
      if (row?.owner !== owner) throw Object.assign(new Error('Forbidden'), { code: 403 })
      return row
    },
    async save(table, id, owner, data) { calls.push(['save', table, id, owner, data]); return { ...data, $id: id } },
    async remove(table, id) { calls.push(['delete', id]); rows.delete(id) },
    uniqueId() { return 'new-list' },
  }
  const handler = createPracticeHandler(api)
  async function run(body, owner = 'member') {
    return handler({
      req: { method: 'POST', headers: owner ? { 'x-appwrite-user-id': owner } : {}, bodyJson: body },
      res: { json: (body, status = 200) => ({ body, status }) }, error() {},
    })
  }
  return { run, calls, api }
}

test('practice requires authentication and derives owner from trusted identity, never body', async () => {
  const { run, calls } = fixture()
  assert.equal((await run({ action: 'list' }, '')).status, 401)
  const result = await run({ action: 'list', owner: 'other', userId: 'other' })
  assert.equal(result.status, 200)
  assert.ok(result.body.lists.every(row => row.owner === 'member'))
  assert.ok(calls.filter(call => call[0] === 'list').every(call => call[2] === 'member'))
})

test('an admin has no special access to another user practice lists', async () => {
  const { run, calls, api } = fixture()
  api.getUser = async id => ({ $id: id, labels: ['superadmin'] })
  assert.equal((await run({ action: 'save-list', id: 'private-list', name: 'Stolen', figureIds: [] })).status, 403)
  assert.equal((await run({ action: 'delete-list', id: 'private-list' })).status, 403)
  assert.equal(calls.filter(call => ['save', 'delete'].includes(call[0])).length, 0)
})

test('favorites progress and notes share a deterministic user-specific record and validate exact progress states', async () => {
  const { run, calls } = fixture()
  const body = { action: 'save-figure', figureId: '70', favorite: true, progress: 'learning', notes: 'Privato' }
  assert.equal((await run(body)).status, 200)
  assert.equal((await run({ ...body, progress: 'practicing' })).status, 200)
  assert.equal((await run({ ...body, progress: 'mastered' }, 'second')).status, 200)
  const writes = calls.filter(call => call[0] === 'save')
  assert.equal(writes[0][2], writes[1][2])
  assert.notEqual(writes[1][2], writes[2][2])
  assert.equal((await run({ ...body, progress: 'done' })).status, 400)
  assert.equal((await run({ ...body, progress: '', notes: 'x'.repeat(10001) })).status, 400)
  assert.equal((await run({ ...body, favorite: false, progress: null, notes: '' })).status, 200)
})

test('lists prevent duplicates and allow removing unavailable figures without requiring deleted details', async () => {
  const { run, calls } = fixture()
  assert.equal((await run({ action: 'save-list', name: 'Practice', figureIds: ['70', '70'] })).status, 200)
  assert.deepEqual(calls.find(call => call[0] === 'save')[4].figureIds, ['70'])
  assert.equal((await run({ action: 'save-list', id: 'my-list', name: 'Mine', figureIds: [] })).status, 200)
  assert.equal((await run({ action: 'save-list', name: 'Bad', figureIds: ['deleted'] })).status, 404)
  assert.equal((await run({ action: 'save-list', name: ' ', figureIds: [] })).status, 400)
})

test('storage boundary refuses foreign rows and grants read only to the owner, never admin labels', async () => {
  const writes = []
  const store = createPracticeStore({
    db: {
      async getRow({ rowId }) {
        if (rowId === 'foreign') return { owner: 'other' }
        throw Object.assign(new Error('Missing'), { code: 404 })
      },
      async createRow(params) { writes.push(params); return params },
      async updateRow(params) { writes.push(params); return params },
      async listRows(params) {
        assert.deepEqual(params.queries[0], ['owner', 'member'])
        return { rows: [] }
      },
    },
    users: {},
    databaseId: 'dance', figuresTableId: 'figures',
    Query: { equal: (key, value) => [key, value], limit: count => count, orderAsc: key => key },
    readPermission: owner => `read("user:${owner}")`,
  })
  await assert.rejects(store.save('practice_lists', 'foreign', 'member', { owner: 'member' }), { code: 403 })
  assert.equal(writes.length, 0)
  await store.save('figure_practice', 'new', 'member', { owner: 'member', notes: 'private' })
  assert.deepEqual(writes[0].permissions, ['read("user:member")'])
  await store.list('figure_practice', 'member')
})
