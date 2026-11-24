import { Client, Query, Users } from 'node-appwrite'
import { createUserManagementHandler } from './user-management.js'

function createUsersApi() {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID
  const apiKey = process.env.APPWRITE_FUNCTION_API_KEY
  if (!endpoint || !projectId || !apiKey) {
    throw new Error('Appwrite Function API configuration is missing.')
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
  const users = new Users(client)

  return {
    getUser: userId => users.get({ userId }),
    listUsersPage: cursor => users.list({
      queries: [Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    }),
    updateLabels: (userId, labels) => users.updateLabels({ userId, labels }),
  }
}

export default async function ({ req, res, log, error }) {
  try {
    return await createUserManagementHandler(createUsersApi())({ req, res, log, error })
  } catch (cause) {
    error(`User management function could not start: ${cause.message}`)
    return res.json({ error: 'User management is temporarily unavailable.' }, 500)
  }
}
