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
      error('Could not verify function caller.')
      return res.json({ error: 'Unable to verify your account.' }, 500)
    }
    if (!actor.labels?.includes('superadmin')) {
      return res.json({ error: 'Only a super admin can manage users.' }, 403)
    }

    const { action, userId, role, cursor, limit = 25 } = req.bodyJson ?? {}

    try {
      if (action === 'audit') {
        if ((cursor !== undefined && (typeof cursor !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(cursor)))
          || !Number.isInteger(limit) || limit < 1 || limit > 50) return res.json({ error: 'Invalid pagination.' }, 400)
        return res.json(await api.listAudit({ cursor, limit }))
      }
      if (action === 'list') {
        const users = await listAllUsers(api)
        return res.json({ users: users.map(toPublicUser), total: users.length })
      }

      if (action !== 'set-role' || typeof userId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(userId) || !['user', 'admin', 'superadmin'].includes(role)) {
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
      const pending = await api.createAudit({
        kind: 'role', actorId: callerId, targetId: userId,
        action: 'set-role', status: 'pending', operationId: api.unique(),
        before: JSON.stringify({ role: getRole(target) }), after: JSON.stringify({ role }),
      })
      let updated
      try {
        updated = await api.updateLabels(userId, labels)
      } catch {
        try {
          await api.createAudit({
            kind: 'role', actorId: callerId, targetId: userId,
            action: 'set-role', status: 'error', operationId: pending.operationId,
            before: JSON.stringify({ role: getRole(target) }), after: JSON.stringify({ requestedRole: role, outcome: 'unknown' }),
          })
        } catch { error('Role change outcome audit could not be recorded; pending entry requires reconciliation.') }
        return res.json({ error: 'Role change could not be confirmed. Reload users and reconcile the pending audit before retrying.' }, 500)
      }
      try {
        await api.createAudit({
          kind: 'role', actorId: callerId, targetId: userId,
          action: 'set-role', status: 'completed', operationId: pending.operationId,
          before: JSON.stringify({ role: getRole(target) }), after: JSON.stringify({ role: getRole(updated) }),
        })
      } catch {
        error('Role changed but completion audit failed; pending entry requires reconciliation.')
        return res.json({ user: toPublicUser(updated), error: 'Role changed, but audit completion failed. Do not retry; reconcile pending audit.', auditPending: true }, 500)
      }
      log(`Role changed by ${callerId} for ${userId}: ${role}`)
      return res.json({ user: toPublicUser(updated) })
    } catch (cause) {
      error('User management request failed.')
      return res.json({ error: 'User management request failed. Please try again.' }, 500)
    }
  }
}
