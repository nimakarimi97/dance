import { Client, ID, Permission, Query, Role, TablesDB, Users } from 'node-appwrite'
import { createPracticeHandler } from './practice.js'
import { createPracticeStore } from './store.js'

export default async function (context) {
  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(context.req.headers['x-appwrite-key'] || process.env.APPWRITE_FUNCTION_API_KEY)
    const db = new TablesDB(client)
    const users = new Users(client)
    const api = createPracticeStore({
      db, users, Query,
      databaseId: process.env.APPWRITE_DATABASE_ID || 'dance',
      figuresTableId: process.env.APPWRITE_FIGURES_TABLE_ID || 'figures',
      readPermission: owner => Permission.read(Role.user(owner)),
      uniqueId: () => ID.unique(),
    })
    return await createPracticeHandler(api)(context)
  } catch (cause) {
    context.error(`Practice service unavailable (${cause.code || 'configuration'}).`)
    return context.res.json({ error: 'Servizio pratica non disponibile.' }, 500)
  }
}
