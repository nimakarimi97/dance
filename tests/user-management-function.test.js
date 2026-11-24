import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createUserManagementHandler } from '../functions/user-management/user-management.js'

function makeContext(body, { actorId = 'admin-1', method = 'POST' } = {}) {
  let response
  const context = {
    req: {
      method,
      headers: actorId ? { 'x-appwrite-user-id': actorId } : {},
      bodyJson: body,
    },
    res: {
      json(payload, status = 200) {
        response = { payload, status }
        return response
      },
    },
    log() {},
    error() {},
  }
  return { context, get response() { return response } }
}

test('user listing requires a super admin and paginates every Appwrite user', async () => {
  const pages = [
    Array.from({ length: 100 }, (_, index) => ({ $id: `user-${index}`, name: `User ${index}`, labels: [] })),
    [{ $id: 'last-user', name: 'Last user', email: 'last@example.com', labels: ['admin'] }],
  ]
  const cursors = []
  const handler = createUserManagementHandler({
    async getUser(userId) {
      assert.equal(userId, 'admin-1')
      return { $id: userId, labels: ['superadmin'] }
    },
    async listUsersPage(cursor) {
      cursors.push(cursor)
      return { users: pages.shift() }
    },
  })
  const call = makeContext({ action: 'list' })

  await handler(call.context)

  assert.equal(call.response.status, 200)
  assert.equal(call.response.payload.users.length, 101)
  assert.equal(call.response.payload.users.at(-1).role, 'admin')
  assert.equal(call.response.payload.total, 101)
  assert.deepEqual(cursors, [undefined, 'user-99'])
})

test('non-super-admins cannot list users or change labels', async () => {
  let listCalled = false
  let updateCalled = false
  const handler = createUserManagementHandler({
    async getUser() { return { labels: ['admin'] } },
    async listUsersPage() { listCalled = true; return { users: [] } },
    async updateLabels() { updateCalled = true },
  })
  const call = makeContext({ action: 'set-role', userId: 'target', role: 'admin' })

  await handler(call.context)

  assert.equal(call.response.status, 403)
  assert.equal(listCalled, false)
  assert.equal(updateCalled, false)
})

test('role updates preserve unrelated labels and cannot target the caller', async () => {
  let updatedLabels
  const handler = createUserManagementHandler({
    async getUser(userId) {
      return userId === 'admin-1'
        ? { $id: userId, labels: ['superadmin'] }
        : { $id: userId, name: 'Target', email: 'target@example.com', labels: ['subscriber'] }
    },
    async updateLabels(userId, labels) {
      assert.equal(userId, 'target')
      updatedLabels = labels
      return { $id: userId, name: 'Target', email: 'target@example.com', labels }
    },
  })
  const call = makeContext({ action: 'set-role', userId: 'target', role: 'admin' })

  await handler(call.context)

  assert.equal(call.response.status, 200)
  assert.deepEqual(updatedLabels, ['subscriber', 'admin'])
  assert.equal(call.response.payload.user.role, 'admin')

  const selfCall = makeContext({ action: 'set-role', userId: 'admin-1', role: 'user' })
  await handler(selfCall.context)
  assert.equal(selfCall.response.status, 409)
})
