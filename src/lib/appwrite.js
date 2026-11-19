import { Account, Client, Storage, TablesDB } from 'appwrite'

// Public values are safe in the browser. Security is enforced by Appwrite permissions.
export const appwriteConfig = {
  endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID || 'dance-salsa-bachata',
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || 'dance',
  figuresTableId: import.meta.env.VITE_APPWRITE_FIGURES_TABLE_ID || 'figures',
  mediaBucketId: import.meta.env.VITE_APPWRITE_MEDIA_BUCKET_ID || 'figure-media',
}

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)

export const account = new Account(client)
export const tablesDB = new TablesDB(client)
export const storage = new Storage(client)
export { client }
