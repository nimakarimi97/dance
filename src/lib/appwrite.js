import { Account, Client } from 'appwrite'

// Public values are safe in the browser. Security is enforced by Appwrite permissions.
export const appwriteConfig = {
  endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID || 'dance-salsa-bachata',
  editorsTeamId: import.meta.env.VITE_APPWRITE_EDITORS_TEAM_ID || '',
}

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)

export const account = new Account(client)
export { client }
