import { Client, ID, Query, TablesDB, Users } from 'node-appwrite'
import { createUserManagementHandler } from './user-management.js'

function createUsersApi(runtimeKey) {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID
  const apiKey = runtimeKey || process.env.APPWRITE_FUNCTION_API_KEY
  if (!endpoint || !projectId || !apiKey) {
    throw new Error('Appwrite Function API configuration is missing.')
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
  const users = new Users(client)
  const db = new TablesDB(client)
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'dance'
  const tableId = process.env.APPWRITE_ROLE_AUDIT_TABLE_ID || 'role_audit'

  return {
    unique: () => ID.unique(),
    createAudit: data => db.createRow({ databaseId, tableId, rowId: ID.unique(), data, permissions: [] }),
    async listAudit({ cursor, limit }) {
      const page = await db.listRows({
        databaseId, tableId,
        queries: [Query.orderDesc('$sequence'), Query.limit(limit + 1), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
      })
      const entries = page.rows.slice(0, limit)
      return { entries, nextCursor: page.rows.length > limit ? entries.at(-1).$id : null }
    },
    getUser: userId => users.get({ userId }),
    listUsersPage: cursor => users.list({
      queries: [Query.orderAsc('$id'), Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    }),
    updateLabels: (userId, labels) => users.updateLabels({ userId, labels }),
  }
}

export default async function ({ req, res, log, error }) {
  try {
    return await createUserManagementHandler(createUsersApi(req.headers?.['x-appwrite-key']))({ req, res, log, error })
  } catch (cause) {
    error('User management function could not start.')
    return res.json({ error: 'User management is temporarily unavailable.' }, 500)
  }
}
