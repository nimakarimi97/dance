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
    createAudit: (data, transactionId) => db.createRow({ databaseId, tableId: auditTableId, rowId: ID.unique(), data, permissions: [], transactionId }),
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
