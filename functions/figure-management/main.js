import { Client, ID, Query, TablesDB, Users } from 'node-appwrite'
import { createFigureManagementHandler } from './figure-management.js'

export function createFigureApi(env = process.env, runtimeKey) {
  const endpoint = env.APPWRITE_FUNCTION_API_ENDPOINT
  const projectId = env.APPWRITE_FUNCTION_PROJECT_ID
  const apiKey = runtimeKey || env.APPWRITE_FUNCTION_API_KEY
  if (!endpoint || !projectId || !apiKey) throw new Error('Missing function configuration.')
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
  const users = new Users(client)
  const db = new TablesDB(client)
  const databaseId = env.APPWRITE_DATABASE_ID || 'dance'
  const tableId = env.APPWRITE_FIGURES_TABLE_ID || 'figures'
  const practiceTableId = env.APPWRITE_FIGURE_PRACTICE_TABLE_ID || 'figure_practice'
  const analyticsTableId = env.APPWRITE_ANALYTICS_TABLE_ID || 'figure_views'
  const auditTableId = env.APPWRITE_FIGURE_AUDIT_TABLE_ID || 'figure_audit'
  return {
    unique: () => ID.unique(),
    getUser: userId => users.get({ userId }),
    begin: () => db.createTransaction({ ttl: 120 }),
    commit: transactionId => db.updateTransaction({ transactionId, commit: true }),
    rollback: transactionId => db.updateTransaction({ transactionId, rollback: true }),
    getFigure: (rowId, transactionId) => db.getRow({ databaseId, tableId, rowId, transactionId }),
    writeFigure: (rowId, data, update, transactionId) => update
      ? db.updateRow({ databaseId, tableId, rowId, data, permissions: [], transactionId })
      : db.createRow({ databaseId, tableId, rowId, data, permissions: [], transactionId }),
    deleteFigure: (rowId, transactionId) => db.deleteRow({ databaseId, tableId, rowId, transactionId }),
    createAudit: (data, transactionId) => db.createRow({ databaseId, tableId: auditTableId, rowId: ID.unique(), data, permissions: [], transactionId }),
    async listFavoriteFigureIds() {
      const figureIds = []
      let page
      let cursor
      do {
        page = await db.listRows({
          databaseId,
          tableId: practiceTableId,
          queries: [
            Query.select(['figureId', 'favorite']),
            Query.orderAsc('$sequence'),
            Query.limit(100),
            ...(cursor ? [Query.cursorAfter(cursor)] : []),
          ],
        })
        figureIds.push(...page.rows.filter(row => row.favorite && row.figureId).map(row => row.figureId))
        if (page.rows.length === 100) cursor = page.rows.at(-1).$id
      } while (page.rows.length === 100)
      const counts = new Map()
      for (const figureId of figureIds) counts.set(figureId, (counts.get(figureId) ?? 0) + 1)
      return [...counts].map(([figureId, count]) => ({ figureId, count }))
    },
    async listUsageRows() {
      const rows = []
      let page
      let cursor
      do {
        page = await db.listRows({
          databaseId,
          tableId: analyticsTableId,
          queries: [
            Query.select(['userId', 'eventType', 'figureId', 'eventTarget']),
            Query.orderAsc('$sequence'),
            Query.limit(100),
            ...(cursor ? [Query.cursorAfter(cursor)] : []),
          ],
        })
        rows.push(...page.rows)
        cursor = page.rows.length === 100 ? page.rows.at(-1).$id : undefined
      } while (page.rows.length === 100)
      return rows
    },
    async listUsers() {
      const result = []
      let page
      let cursor
      do {
        page = await users.list({
          queries: [Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
        })
        result.push(...page.users.map(user => ({ userId: user.$id, name: user.name ?? '' })))
        cursor = page.users.length === 100 ? page.users.at(-1).$id : undefined
      } while (page.users.length === 100)
      return result
    },
    async listAudit({ cursor, limit }) {
      const page = await db.listRows({
        databaseId, tableId: auditTableId,
        queries: [Query.orderDesc('$sequence'), Query.limit(limit + 1), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
      })
      const entries = page.rows.slice(0, limit)
      return { entries, nextCursor: page.rows.length > limit ? entries.at(-1).$id : null }
    },
  }
}

export default async function (context) {
  try {
    return await createFigureManagementHandler(createFigureApi(process.env, context.req.headers?.['x-appwrite-key']))(context)
  } catch {
    context.error('Figure management startup failed.')
    return context.res.json({ error: 'Figure management unavailable.' }, 500)
  }
}
