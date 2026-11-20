import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, mock, test } from 'node:test'
import { createServer } from 'vite'

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-tests',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: 'custom',
})
const { account, storage, tablesDB } = await server.ssrLoadModule('/src/lib/appwrite.js')
const auth = await server.ssrLoadModule('/src/lib/auth.js')
const {
  listFigures,
  recordAnalyticsEvent,
  recordFigureView,
  saveFigure,
  MAX_MEDIA_SIZE,
} = await server.ssrLoadModule('/src/lib/figures.js')
const { ANALYTICS_EVENTS } = await server.ssrLoadModule('/src/lib/analytics.js')
const catalog = await server.ssrLoadModule('/src/data/danze.js')

afterEach(() => mock.restoreAll())
beforeEach(() => mock.method(tablesDB, 'getRow', async () => ({ $id: 'member' })))
after(() => server.close())

test('signup rejects mismatched confirmation before creating an account', async () => {
  const create = mock.method(account, 'create', async () => {})
  await assert.rejects(auth.registerWithEmail({
    name: 'Test', email: 'test@example.com', password: 'password-one', confirmPassword: 'password-two',
  }), /password non coincidono/)
  assert.equal(create.mock.callCount(), 0)
})

test('signup creates a session and derives admin only from server labels', async () => {
  const create = mock.method(account, 'create', async () => {})
  const session = mock.method(account, 'createEmailPasswordSession', async () => {})
  const get = mock.method(account, 'get', async () => ({ $id: 'member', labels: [], prefs: { role: 'admin' } }))
  mock.method(tablesDB, 'getRow', async () => ({ $id: 'member' }))
  await auth.registerWithEmail({
    name: 'Test', email: 'test@example.com', password: 'matching-password', confirmPassword: 'matching-password',
  })
  assert.equal(create.mock.callCount(), 1)
  assert.equal(session.mock.callCount(), 1)
  assert.equal(auth.isLoggedIn.value, true)
  assert.equal(auth.isAdmin.value, false)
  get.mock.mockImplementation(async () => ({ $id: 'admin', labels: ['admin'] }))
  await auth.refreshUser()
  assert.equal(auth.isAdmin.value, true)
})

test('unexpected auth failures are visible and never retain the previous user', async () => {
  mock.method(console, 'error', () => {})
  mock.method(account, 'get', async () => { throw new Error('Connection unavailable') })
  await auth.refreshUser()
  assert.equal(auth.isLoggedIn.value, false)
  assert.equal(auth.authError.value, 'Connection unavailable')
})

test('logout clears figures and a stale account response cannot restore access', async () => {
  mock.method(account, 'get', async () => ({ $id: 'member', labels: [] }))
  await auth.refreshUser()
  mock.method(tablesDB, 'listRows', async () => ({ rows: [{ $id: 'figure', nome: 'Test' }] }))
  await catalog.refreshFigures()
  assert.equal(catalog.figures.value.length, 1)
  let resolve
  account.get = () => new Promise(done => { resolve = done })
  const pending = auth.refreshUser()
  mock.method(account, 'deleteSession', async () => {})
  await auth.signOut()
  resolve({ $id: 'member', labels: ['admin'] })
  await pending
  assert.equal(auth.isLoggedIn.value, false)
  assert.equal(catalog.figures.value.length, 0)
})

test('figure listing paginates beyond 100 rows', async () => {
  const first = Array.from({ length: 100 }, (_, i) => ({ $id: `figure-${i}` }))
  const pages = [first, [{ $id: 'last' }]]
  const list = mock.method(tablesDB, 'listRows', async () => ({ rows: pages.shift() }))
  const result = await listFigures()
  assert.equal(result.length, 101)
  assert.equal(result.at(-1).id, 'last')
  assert.equal(list.mock.callCount(), 2)
  assert.ok(list.mock.calls[1].arguments[0].queries.some(query => query.includes('cursorAfter')))
})

test('analytics events write their type and omit empty figure targets', async () => {
  const create = mock.method(tablesDB, 'createRow', async params => params)
  await recordAnalyticsEvent({
    eventType: ANALYTICS_EVENTS.DASHBOARD_NAV_CLICK,
    eventTarget: 'catalogo',
    userId: 'user-1',
  })

  const params = create.mock.calls[0].arguments[0]
  assert.equal(params.tableId, 'figure_views')
  assert.equal(params.data.eventType, 'dashboard_nav_click')
  assert.equal(params.data.eventTarget, 'catalogo')
  assert.equal(params.data.userId, 'user-1')
  assert.equal('figureId' in params.data, false)

  await recordAnalyticsEvent({
    eventType: ANALYTICS_EVENTS.PAGE_VIEW,
    eventTarget: 'home',
    userId: 'user-1',
  })
  assert.equal(create.mock.calls[1].arguments[0].data.eventType, 'page_view')
  assert.equal(create.mock.calls[1].arguments[0].data.eventTarget, 'home')

  await recordFigureView('figure-1', 'user-1')
  assert.equal(create.mock.calls[2].arguments[0].data.eventType, 'figure_view')
  assert.equal(create.mock.calls[2].arguments[0].data.figureId, 'figure-1')
})

test('analytics events are not written for anonymous users', async () => {
  const create = mock.method(tablesDB, 'createRow', async params => params)
  await recordAnalyticsEvent({
    eventType: ANALYTICS_EVENTS.FIGURE_CARD_CLICK,
    figureId: 'figure-1',
  })
  assert.equal(create.mock.callCount(), 0)
})

test('new figures record the creator and edits leave it untouched', async () => {
  const create = mock.method(tablesDB, 'createRow', async () => ({ $id: 'new' }))
  await saveFigure({ data: { nome: 'Nuova' }, userId: 'user-1' })
  assert.equal(create.mock.calls[0].arguments[0].data.createdBy, 'user-1')
})

test('media enforces the exact 50 MB limit and allowed extensions before upload', async () => {
  const upload = mock.method(storage, 'createFile', async () => ({ $id: 'video' }))
  mock.method(tablesDB, 'createRow', async params => params)
  for (const file of [{ name: 'video.webm', size: MAX_MEDIA_SIZE + 1 }, { name: 'video.exe', size: 10 }, { name: 'video.mp4', size: 0 }]) {
    await assert.rejects(saveFigure({ data: {}, video: file }))
  }
  assert.equal(upload.mock.callCount(), 0)
  const result = await saveFigure({ data: { nome: 'Test' }, video: { name: 'video.mp4', size: MAX_MEDIA_SIZE } })
  assert.equal(result.data.videoFileId, 'video')
  assert.deepEqual(result.permissions, [])
})

test('failed row writes remove uploaded files and preserve the original error', async () => {
  mock.method(storage, 'createFile', async () => ({ $id: 'uploaded' }))
  const remove = mock.method(storage, 'deleteFile', async () => {})
  mock.method(tablesDB, 'updateRow', async () => { throw new Error('Row rejected') })
  await assert.rejects(saveFigure({ id: 'existing', data: {}, image: { name: 'image.png', size: 10 } }), /Row rejected/)
  assert.equal(remove.mock.callCount(), 1)
  assert.equal(remove.mock.calls[0].arguments[0].fileId, 'uploaded')
})
