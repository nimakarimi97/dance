import { FIGURE_FIELDS, FigureValidationError, normalizeFigureData, validateFigureRows, validFigureId } from '../../shared/figure-schema.js'

const snapshot = figure => figure
  ? Object.fromEntries(FIGURE_FIELDS.filter(field => Object.hasOwn(figure, field)).map(field => [field, figure[field]]))
  : null

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
      if (body.action === 'audit') {
        if ((body.cursor !== undefined && !validFigureId(body.cursor)) || (body.limit !== undefined && (!Number.isInteger(body.limit) || body.limit < 1 || body.limit > 50))) {
          return res.json({ error: 'Invalid pagination.' }, 400)
        }
        return res.json(await api.listAudit({ cursor: body.cursor, limit: body.limit ?? 25 }))
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
