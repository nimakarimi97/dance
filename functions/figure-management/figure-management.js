import { FIGURE_FIELDS, FigureValidationError, normalizeFigureData, validateFigureRows, validFigureId } from '../../shared/figure-schema.js'

const snapshot = figure => figure
  ? Object.fromEntries(FIGURE_FIELDS.filter(field => Object.hasOwn(figure, field)).map(field => [field, figure[field]]))
  : null

function mostFrequent(counts) {
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'))[0]?.[0] ?? null
}

async function summarizeUserActivity(api) {
  const [events, users] = await Promise.all([api.listUsageRows(), api.listUsers()])
  const usersById = new Map(users.map(user => [user.userId, user]))
  const activityByUser = new Map()

  for (const event of events) {
    const userId = event.userId
    const eventType = event.eventType || 'figure_view'
    if (!userId || !(eventType === 'page_view' || eventType === 'figure_view' || eventType.endsWith('_click'))) continue
    let activity = activityByUser.get(userId)
    if (!activity) {
      activity = { pageViews: 0, figureViews: 0, clicks: 0, areas: new Map(), viewedFigures: new Map(), clickedTargets: new Map() }
      activityByUser.set(userId, activity)
    }

    if (eventType === 'page_view') {
      activity.pageViews++
      if (event.eventTarget) activity.areas.set(event.eventTarget, (activity.areas.get(event.eventTarget) ?? 0) + 1)
    } else if (eventType === 'figure_view') {
      activity.figureViews++
      if (event.figureId) activity.viewedFigures.set(event.figureId, (activity.viewedFigures.get(event.figureId) ?? 0) + 1)
    } else {
      activity.clicks++
      const target = event.eventTarget || event.figureId || eventType
      activity.clickedTargets.set(target, (activity.clickedTargets.get(target) ?? 0) + 1)
    }
  }

  return [...activityByUser].map(([userId, activity]) => {
    const user = usersById.get(userId)
    return {
      userId,
      name: user?.name || 'Nome non disponibile',
      pageViews: activity.pageViews,
      figureViews: activity.figureViews,
      clicks: activity.clicks,
      totalActivity: activity.pageViews + activity.figureViews + activity.clicks,
      mostVisitedArea: mostFrequent(activity.areas),
      mostViewedFigureId: mostFrequent(activity.viewedFigures),
      mostClickedTarget: mostFrequent(activity.clickedTargets),
    }
  })
    .sort((a, b) => b.totalActivity - a.totalActivity || a.name.localeCompare(b.name, 'it'))
    .slice(0, 10)
}

function versionConflict(index) {
  const conflict = new Error('Figure changed. Reload before saving.')
  conflict.code = 409
  conflict.errors = [{ index, field: 'expectedUpdatedAt', message: 'La figura è cambiata dopo l’anteprima. Ricarica il repertorio e prepara di nuovo il lotto.' }]
  return conflict
}

export function createFigureManagementHandler(api) {
  return async ({ req, res, error = () => {} }) => {
    if (req.method !== 'POST') return res.json({ error: 'Method not allowed.' }, 405)
    const callerId = req.headers?.['x-appwrite-user-id']
    if (!callerId) return res.json({ error: 'Authentication required.' }, 401)
    let transactionId
    let commitAttempted = false
    try {
      const actor = await api.getUser(callerId)
      if (!actor.labels?.some(label => ['admin', 'superadmin'].includes(label))) return res.json({ error: 'Admin required.' }, 403)
      const body = req.bodyJson ?? {}
      if (body.action === 'favoriteStats') {
        return res.json({ favorites: await api.listFavoriteFigureIds() })
      }
      if (body.action === 'usageStats') {
        return res.json({ users: await summarizeUserActivity(api) })
      }
      if (body.action === 'audit') {
        if ((body.cursor !== undefined && !validFigureId(body.cursor)) || (body.limit !== undefined && (!Number.isInteger(body.limit) || body.limit < 1 || body.limit > 50))) {
          return res.json({ error: 'Invalid pagination.' }, 400)
        }
        return res.json(await api.listAudit({ cursor: body.cursor, limit: body.limit ?? 25 }))
      }
      if (body.action === 'delete') {
        if (!validFigureId(body.id) || typeof body.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) {
          return res.json({ error: 'Invalid figure deletion request.' }, 400)
        }
        const transaction = await api.begin()
        transactionId = transaction.$id
        const before = await api.getFigure(body.id, transactionId)
        if (before.$updatedAt !== body.expectedUpdatedAt) throw versionConflict(0)
        await api.deleteFigure(body.id, transactionId)
        const current = await api.getFigure(body.id)
        if (current.$updatedAt !== before.$updatedAt) throw versionConflict(0)
        await api.createAudit({
          kind: 'figure',
          actorId: callerId,
          targetId: body.id,
          operationId: transactionId,
          status: 'completed',
          action: 'delete',
          before: JSON.stringify(snapshot(before)),
          after: 'null',
        }, transactionId)
        commitAttempted = true
        await api.commit(transactionId)
        transactionId = undefined
        return res.json({ deleted: body.id })
      }
      if (!['save', 'apply'].includes(body.action)) return res.json({ error: 'Invalid action.' }, 400)
      const input = body.action === 'save'
        ? [{ ...(body.id !== undefined ? { id: body.id } : {}), data: body.data, ...(body.expectedUpdatedAt !== undefined ? { expectedUpdatedAt: body.expectedUpdatedAt } : {}) }]
        : body.rows
      const validation = validateFigureRows(input)
      if (validation.errors.length) return res.json({ error: 'Invalid figure data.', errors: validation.errors }, 400)
      // No nontransactional fallback: audit and figures must commit together.
      const transaction = await api.begin()
      transactionId = transaction.$id
      const prepared = []
      for (const [index, row] of validation.rows.entries()) {
        const before = row.id ? await api.getFigure(row.id, transactionId) : null
        if (row.expectedUpdatedAt && row.expectedUpdatedAt !== before.$updatedAt) {
          throw versionConflict(index)
        }
        try {
          normalizeFigureData({ ...snapshot(before), ...row.data })
        } catch (cause) {
          if (cause instanceof FigureValidationError) {
            cause.errors = cause.errors.map(entry => ({ index, ...entry }))
          }
          throw cause
        }
        prepared.push({ ...row, id: row.id || api.unique(), before, index })
      }
      const figures = []
      for (const row of prepared) {
        const data = row.before ? row.data : { ...row.data, createdBy: callerId }
        const figure = await api.writeFigure(row.id, data, Boolean(row.before), transactionId)
        if (row.before) {
          // Appwrite detects conflicts since staging, not since our initial read.
          const current = await api.getFigure(row.id)
          if (current.$updatedAt !== row.before.$updatedAt) {
            throw versionConflict(row.index)
          }
        }
        await api.createAudit({
          kind: 'figure',
          actorId: callerId,
          targetId: row.id,
          operationId: transactionId,
          status: 'completed',
          action: row.before ? 'update' : 'create',
          before: JSON.stringify(snapshot(row.before)),
          after: JSON.stringify({ ...snapshot(row.before), ...row.data }),
        }, transactionId)
        figures.push(figure)
      }
      commitAttempted = true
      await api.commit(transactionId)
      transactionId = undefined
      return res.json(body.action === 'save' ? { figure: figures[0] } : { figures })
    } catch (cause) {
      if (transactionId) {
        try { await api.rollback(transactionId) } catch { error('Figure transaction rollback could not be confirmed.') }
      }
      if (cause instanceof FigureValidationError) return res.json({ error: 'Invalid figure data.', errors: cause.errors, outcome: 'rejected' }, 400)
      error('Figure management request failed.')
      const status = [404, 409].includes(cause.code) ? cause.code : 500
      return res.json({
        error: status === 409 ? 'Figure changed. Reload before saving.' : 'Figure request failed. Check history and reload before retrying.',
        outcome: commitAttempted && status !== 409 ? 'unknown' : 'rejected',
        ...(status === 409 ? { errors: cause.errors || [{ index: -1, field: 'expectedUpdatedAt', message: 'Una figura del lotto è cambiata durante il salvataggio. Ricarica il repertorio e ripeti l’anteprima.' }] } : {}),
      }, status)
    }
  }
}
