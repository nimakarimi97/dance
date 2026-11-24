import assert from 'node:assert/strict'
import { after, afterEach, mock, test } from 'node:test'
import { createServer } from 'vite'

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-admin-tests',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
})
const { functions } = await server.ssrLoadModule('/src/lib/appwrite.js')
const api = await server.ssrLoadModule('/src/lib/admin-api.js')
afterEach(() => mock.restoreAll())
after(() => server.close())

test('single saves and imports use synchronous trusted function actions without browser identity', async () => {
  const calls = []
  mock.method(functions, 'createExecution', async params => {
    calls.push(params)
    return { status: 'completed', responseStatusCode: 200, responseBody: JSON.stringify({ figure: { $id: 'saved' }, figures: [{ $id: 'saved' }] }) }
  })
  const data = { nome: 'Test' }
  assert.equal((await api.saveAdminFigure({ id: 'existing', data, userId: 'spoof' })).$id, 'saved')
  await api.applyFigureRows([{ id: 'existing', data }])
  assert.equal(calls[0].functionId, 'dance-library')
  assert.equal(calls[0].async, false)
  assert.deepEqual(JSON.parse(calls[0].body), { service: 'figures', action: 'save', id: 'existing', data })
  assert.deepEqual(JSON.parse(calls[1].body), { service: 'figures', action: 'apply', rows: [{ id: 'existing', data }] })
})

test('audit calls route to their respective backends with cursor pagination', async () => {
  const calls = []
  mock.method(functions, 'createExecution', async params => {
    calls.push(params)
    return { status: 'completed', responseStatusCode: 200, responseBody: '{"entries":[],"nextCursor":null}' }
  })
  await api.listFigureAudit({ cursor: 'last', limit: 10 })
  await api.listRoleAudit()
  assert.equal(calls[0].functionId, 'dance-library')
  assert.equal(calls[1].functionId, 'dance-user-management')
  assert.deepEqual(JSON.parse(calls[0].body), { service: 'figures', action: 'audit', cursor: 'last', limit: 10 })
})

test('backend validation errors preserve row details and pending role status', async () => {
  const errors = [{ index: 1, field: 'nome', message: 'Missing' }]
  mock.method(functions, 'createExecution', async () => ({
    status: 'completed', responseStatusCode: 400,
    responseBody: JSON.stringify({ error: 'Invalid rows', errors, auditPending: true }),
  }))
  await assert.rejects(api.applyFigureRows([]), error => {
    assert.deepEqual(error.errors, errors)
    assert.equal(error.auditPending, true)
    assert.equal(error.outcome, 'rejected')
    return true
  })
})

test('invalid execution JSON and failed executions are not accepted as saves', async () => {
  const execution = mock.method(functions, 'createExecution', async () => ({
    status: 'completed', responseStatusCode: 200, responseBody: 'not json',
  }))
  await assert.rejects(api.saveAdminFigure({ data: {} }), /non valida/)
  execution.mock.mockImplementation(async () => ({ status: 'failed', responseStatusCode: 200, responseBody: '{"figure":{"$id":"fake"}}' }))
  await assert.rejects(api.saveAdminFigure({ data: {} }), /non riuscita/)
})

test('lost execution responses and commit timeouts are explicitly unknown, not rejected', async () => {
  const execution = mock.method(functions, 'createExecution', async () => { throw new Error('Network lost') })
  await assert.rejects(api.saveAdminFigure({ data: {} }), error => error.outcome === 'unknown')
  execution.mock.mockImplementation(async () => ({
    status: 'completed', responseStatusCode: 500,
    responseBody: '{"error":"Commit response lost","outcome":"unknown"}',
  }))
  await assert.rejects(api.saveAdminFigure({ data: {} }), error => error.outcome === 'unknown')
  execution.mock.mockImplementation(async () => ({
    status: 'completed', responseStatusCode: 500,
    responseBody: '{"error":"Audit staging failed","outcome":"rejected"}',
  }))
  await assert.rejects(api.saveAdminFigure({ data: {} }), error => error.outcome === 'rejected')
})
