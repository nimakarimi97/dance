import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLibraryHandler } from '../functions/library/dispatch.js'
import { createFigureManagementHandler } from '../functions/figure-management/figure-management.js'
import { createPracticeHandler } from '../functions/practice/practice.js'

function context(body, userId = 'member') {
  return {
    req: { method: 'POST', headers: userId ? { 'x-appwrite-user-id': userId } : {}, bodyJson: body },
    res: { json: (body, status = 200) => ({ body, status }) },
    error() {},
  }
}

test('shared function rejects missing or unknown service without constructing a privileged API', async () => {
  const unexpected = () => { throw new Error('Must not dispatch') }
  const handler = createLibraryHandler({ figures: unexpected, practice: unexpected })
  assert.equal((await handler(context({ action: 'list' }))).status, 400)
  assert.equal((await handler(context({ service: '__proto__', action: 'save' }))).status, 400)
})

test('users execution access does not confer figure-admin privileges or trust body labels', async () => {
  const handler = createLibraryHandler({
    figures: createFigureManagementHandler({
      getUser: async () => ({ labels: [] }),
      begin: () => { throw new Error('Must not write') },
    }),
    practice: createPracticeHandler({
      getUser: async () => ({ labels: [] }),
      list: async (_table, owner) => [{ owner }],
    }),
  })
  const denied = await handler(context({ service: 'figures', action: 'save', actorId: 'admin', labels: ['superadmin'] }))
  assert.equal(denied.status, 403)
  const own = await handler(context({ service: 'practice', action: 'list', owner: 'other' }))
  assert.equal(own.status, 200)
  assert.deepEqual(own.body.records, [{ owner: 'member' }])
})

test('neither shared route accepts unauthenticated execution or role-management actions', async () => {
  const handler = createLibraryHandler({
    figures: createFigureManagementHandler({ getUser: async () => ({ labels: ['admin'] }) }),
    practice: createPracticeHandler({ getUser: async () => ({ labels: ['superadmin'] }) }),
  })
  for (const service of ['figures', 'practice']) {
    assert.equal((await handler(context({ service, action: 'list' }, ''))).status, 401)
    assert.equal((await handler(context({ service, action: 'set-role', userId: 'target', role: 'superadmin' }))).status, 400)
  }
})
