const ROLE_LABELS = ['admin', 'superadmin']

function getRole(user) {
  if (user.labels?.includes('superadmin')) return 'superadmin'
  if (user.labels?.includes('admin')) return 'admin'
  return 'user'
}

function toPublicUser(user) {
  return {
    $id: user.$id,
    userId: user.$id,
    name: user.name ?? '',
    email: user.email ?? '',
    labels: user.labels ?? [],
    role: getRole(user),
    registration: user.registration ?? null,
  }
}

async function listAllUsers(api) {
  const users = []
  let cursor

  while (true) {
    const page = await api.listUsersPage(cursor)
    if (!Array.isArray(page.users)) throw new Error('Appwrite returned an invalid user page.')
    users.push(...page.users)
    if (page.users.length < 100) return users

    const nextCursor = page.users.at(-1)?.$id
    if (!nextCursor || nextCursor === cursor) throw new Error('Appwrite user pagination did not advance.')
    cursor = nextCursor
  }
}

export function createUserManagementHandler(api) {
  return async ({ req, res, log, error }) => {
    if (req.method !== 'POST') return res.json({ error: 'Method not allowed.' }, 405)

    const callerId = req.headers?.['x-appwrite-user-id']
    if (!callerId) return res.json({ error: 'Sign in as a super admin to continue.' }, 401)

    let actor
    try {
      actor = await api.getUser(callerId)
    } catch (cause) {
      error(`Could not verify function caller: ${cause.message}`)
      return res.json({ error: 'Unable to verify your account.' }, 500)
    }
    if (!actor.labels?.includes('superadmin')) {
      return res.json({ error: 'Only a super admin can manage users.' }, 403)
    }

    const { action, userId, role } = req.bodyJson ?? {}

    try {
      if (action === 'list') {
        const users = await listAllUsers(api)
        return res.json({ users: users.map(toPublicUser), total: users.length })
      }

      if (action !== 'set-role' || typeof userId !== 'string' || !['user', 'admin', 'superadmin'].includes(role)) {
        return res.json({ error: 'Invalid user role request.' }, 400)
      }
      if (userId === callerId) {
        return res.json({ error: 'You cannot change your own role.' }, 409)
      }

      let target
      try {
        target = await api.getUser(userId)
      } catch (cause) {
        if (cause.code === 404) return res.json({ error: 'User not found.' }, 404)
        throw cause
      }

      const labels = (target.labels ?? []).filter(label => !ROLE_LABELS.includes(label))
      if (role !== 'user') labels.push(role)
      const updated = await api.updateLabels(userId, labels)
      log(`Role changed by ${callerId} for ${userId}: ${role}`)
      return res.json({ user: toPublicUser(updated) })
    } catch (cause) {
      error(`User management request failed: ${cause.message}`)
      return res.json({ error: 'User management request failed. Please try again.' }, 500)
    }
  }
}
