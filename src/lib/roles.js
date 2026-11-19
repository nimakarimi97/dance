import { AppwriteException, Permission, Query, Role } from 'appwrite'
import { appwriteConfig, tablesDB } from './appwrite.js'

const table = () => ({ databaseId: appwriteConfig.databaseId, tableId: appwriteConfig.userRolesTableId })

// The row id is the user id, so each user has at most one role row.
export async function ensureUserRole(user) {
  try {
    await tablesDB.getRow({ ...table(), rowId: user.$id })
  } catch (error) {
    if (!(error instanceof AppwriteException) || error.code !== 404) throw error
    await tablesDB.createRow({
      ...table(),
      rowId: user.$id,
      data: { userId: user.$id, name: user.name ?? '', email: user.email ?? '', role: 'user' },
      permissions: [
        Permission.read(Role.user(user.$id)),
        Permission.read(Role.label('superadmin')),
        Permission.update(Role.label('superadmin')),
        Permission.delete(Role.label('superadmin')),
      ],
    })
  }
}

export async function listUserRoles() {
  const page = await tablesDB.listRows({
    ...table(),
    queries: [Query.limit(100), Query.orderAsc('name')],
  })
  return page.rows
}

export function setUserRole(userId, role) {
  return tablesDB.updateRow({ ...table(), rowId: userId, data: { role } })
}
