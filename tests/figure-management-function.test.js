import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createFigureManagementHandler } from '../functions/figure-management/figure-management.js'
import { normalizeFigureData, validateFigureRows } from '../shared/figure-schema.js'

const data = { nome: ' Enchufla ', danza: 'salsa', stili: ['cubana'] }
function fixture(overrides = {}) {
  const calls = []
  const api = {
    unique: () => 'new-figure',
    async getUser(id) { calls.push(['user', id]); return { labels: ['admin'] } },
    async begin() { calls.push(['begin']); return { $id: 'tx-1' } },
    async getFigure(id, tx) { calls.push(['get', id, tx]); return { $id: id, $updatedAt: '2026-01-01T00:00:00Z', ...data, difficulty: 'advanced', privateNote: 'secret' } },
    async writeFigure(id, row, update, tx) { calls.push(['write', id, row, update, tx]); return { $id: id, ...row } },
    async createAudit(row, tx) { calls.push(['audit', row, tx]) },
    async commit(tx) { calls.push(['commit', tx]) },
    async rollback(tx) { calls.push(['rollback', tx]) },
    async listAudit(options) { calls.push(['list', options]); return { entries: [], nextCursor: null } },
    ...overrides,
  }
  const handler = createFigureManagementHandler(api)
  return {
    calls,
    async run(body, headers = { 'x-appwrite-user-id': 'trusted' }) {
      return handler({
        req: { method: 'POST', headers, bodyJson: body },
        res: { json: (payload, status = 200) => ({ payload, status }) },
      })
    },
  }
}

test('schema normalizes optional metadata and preserves absent patch fields', () => {
  assert.deepEqual(normalizeFigureData({ nome: ' New ' }, { partial: true }), { nome: 'New' })
  assert.deepEqual(normalizeFigureData({ ...data, aliases: [' Other ', 'Other'], difficulty: null }), { ...data, nome: 'Enchufla', aliases: ['Other'], difficulty: null })
  for (const patch of [{ aliases: Array(21).fill('a') }, { aliases: ['a'.repeat(101)] }, { aliases: [1] }, { description: 'a'.repeat(4001) }, { difficulty: 'expert' }, { notes: 'private' }, { danza: 'bachata', stili: ['cubana'] }]) {
    assert.throws(() => normalizeFigureData(patch, { partial: true }))
  }
  assert.equal(validateFigureRows([{ id: 'one', data: { nome: 'x' } }, { id: 'one', data: { nome: 'y' } }]).errors[0].index, 1)
  assert.ok(validateFigureRows(Array(51).fill({ data })).errors.length)
})

test('authorization uses only fresh server labels and rejects browser impersonation', async () => {
  const f = fixture({ async getUser() { return { labels: [] } } })
  assert.equal((await f.run({ action: 'save', data, userId: 'admin', labels: ['admin'] })).status, 403)
  assert.equal((await f.run({ action: 'save', data }, {})).status, 401)
  assert.equal(f.calls.length, 0)
})

test('all import rows are validated before any mutation', async () => {
  const f = fixture()
  const result = await f.run({ action: 'apply', rows: [{ data }, { data: { ...data, stili: ['moderna'] } }] })
  assert.equal(result.status, 400)
  assert.equal(result.payload.errors[0].index, 1)
  assert.deepEqual(f.calls, [['user', 'trusted']])
})

test('save commits figure and allowlisted immutable audit in same transaction', async () => {
  const f = fixture()
  const result = await f.run({ action: 'save', id: 'existing', data: { nome: 'Changed' } })
  assert.equal(result.status, 200)
  assert.equal(result.payload.figure.nome, 'Changed')
  const audit = f.calls.find(call => call[0] === 'audit')
  assert.equal(audit[2], 'tx-1')
  assert.equal(JSON.parse(audit[1].before).difficulty, 'advanced')
  assert.equal(JSON.parse(audit[1].after).difficulty, 'advanced')
  assert.doesNotMatch(JSON.stringify(audit), /secret|privateNote/)
  assert.deepEqual(f.calls.at(-1), ['commit', 'tx-1'])
  assert.equal(f.calls.find(call => call[0] === 'write')[4], 'tx-1')
})

test('bulk cross-field validation and stale versions roll back before staging writes', async () => {
  for (const row of [
    { id: 'existing', data: { danza: 'bachata' } },
    { id: 'existing', data: { nome: 'New' }, expectedUpdatedAt: '2025-01-01T00:00:00Z' },
  ]) {
    const f = fixture()
    const result = await f.run({ action: 'apply', rows: [{ data }, row] })
    assert.ok([400, 409].includes(result.status))
    assert.equal(f.calls.some(call => call[0] === 'write'), false)
    assert.deepEqual(f.calls.at(-1), ['rollback', 'tx-1'])
  }
})

test('failed audit or unavailable transactions never falls back to direct writes', async () => {
  const f = fixture({ async createAudit() { throw new Error('private detail') } })
  const result = await f.run({ action: 'save', data })
  assert.equal(result.status, 500)
  assert.equal(result.payload.outcome, 'rejected')
  assert.equal(f.calls.some(call => call[0] === 'commit'), false)
  assert.deepEqual(f.calls.at(-1), ['rollback', 'tx-1'])
  assert.doesNotMatch(JSON.stringify(result), /private detail/)
  const unavailable = fixture({ async begin() { throw new Error('unsupported') } })
  assert.equal((await unavailable.run({ action: 'save', data })).status, 500)
  assert.equal(unavailable.calls.some(call => call[0] === 'write'), false)
})

test('admin audit listing forwards validated cursor pagination', async () => {
  const f = fixture()
  assert.equal((await f.run({ action: 'audit', cursor: 'last-row', limit: 10 })).status, 200)
  assert.deepEqual(f.calls.at(-1), ['list', { cursor: 'last-row', limit: 10 }])
  assert.equal((await f.run({ action: 'audit', limit: 51 })).status, 400)
})

test('a concurrent write between validation and staging cannot produce stale audit snapshots', async () => {
  const f = fixture({
    async getFigure(id, transactionId) {
      return { $id: id, ...data, $updatedAt: transactionId ? '2026-01-01T00:00:00Z' : '2026-01-02T00:00:00Z' }
    },
  })
  const result = await f.run({ action: 'save', id: 'existing', data: { nome: 'Changed' } })
  assert.equal(result.status, 409)
  assert.equal(result.payload.errors[0].field, 'expectedUpdatedAt')
  assert.equal(result.payload.errors[0].index, 0)
  assert.equal(f.calls.some(call => call[0] === 'audit'), false)
  assert.deepEqual(f.calls.at(-1), ['rollback', 'tx-1'])
})

test('stale preview identifies the exact import row and commit timeout remains unknown', async () => {
  const f = fixture()
  const result = await f.run({ action: 'apply', rows: [
    { data },
    { id: 'existing', data: { nome: 'Changed' }, expectedUpdatedAt: '2025-01-01T00:00:00Z' },
  ] })
  assert.equal(result.status, 409)
  assert.equal(result.payload.outcome, 'rejected')
  assert.deepEqual(result.payload.errors.map(({ index, field }) => ({ index, field })), [{ index: 1, field: 'expectedUpdatedAt' }])
  const timeout = fixture({ async commit() { throw new Error('Response lost after commit') } })
  const uncertain = await timeout.run({ action: 'save', data })
  assert.equal(uncertain.status, 500)
  assert.equal(uncertain.payload.outcome, 'unknown')
})

test('a commit conflict is reported without retrying any rows', async () => {
  const f = fixture({ async commit() { throw Object.assign(new Error('conflict'), { code: 409 }) } })
  const result = await f.run({ action: 'apply', rows: [{ data }, { id: 'existing', data: { nome: 'Changed' } }] })
  assert.equal(result.status, 409)
  assert.equal(f.calls.filter(call => call[0] === 'write').length, 2)
  assert.deepEqual(f.calls.at(-1), ['rollback', 'tx-1'])
})
