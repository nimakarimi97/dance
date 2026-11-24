import { createHash } from 'node:crypto'

export const progressStates = ['learning', 'practicing', 'mastered']
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(value)
const rowId = (owner, figure) => createHash('sha256').update(JSON.stringify([owner, figure])).digest('hex').slice(0, 36)

export function createPracticeHandler(api) {
  return async ({ req, res, error }) => {
    if (req.method !== 'POST') return res.json({ error: 'Metodo non consentito.' }, 405)
    const owner = req.headers?.['x-appwrite-user-id']
    if (!owner) return res.json({ error: 'Accedi per continuare.' }, 401)
    try {
      await api.getUser(owner)
      const body = req.bodyJson ?? {}
      const { action, figureId, id } = body
      if (action === 'list') {
        const [records, lists] = await Promise.all([api.list('figure_practice', owner), api.list('practice_lists', owner)])
        return res.json({ records, lists })
      }
      if (action === 'save-figure') {
        if (!validId(figureId) || typeof body.favorite !== 'boolean'
          || !(body.progress === null || progressStates.includes(body.progress))
          || typeof body.notes !== 'string' || body.notes.length > 10000) {
          return res.json({ error: 'Preferito, progresso o note non validi (massimo 10.000 caratteri).' }, 400)
        }
        // Removing personal information must also work after a figure has been deleted.
        if (body.favorite || body.progress || body.notes) await api.getFigure(figureId)
        const record = await api.save('figure_practice', rowId(owner, figureId), owner, {
          owner, figureId, favorite: body.favorite, progress: body.progress, notes: body.notes,
        })
        return res.json({ record })
      }
      if (action === 'save-list') {
        if ((id !== undefined && !validId(id)) || typeof body.name !== 'string' || !body.name.trim()
          || body.name.trim().length > 100 || !Array.isArray(body.figureIds) || body.figureIds.length > 200
          || !body.figureIds.every(validId)) {
          return res.json({ error: 'Lista non valida: nome fino a 100 caratteri, massimo 200 figure.' }, 400)
        }
        let previous = null
        if (id) previous = await api.owned('practice_lists', id, owner)
        const figureIds = [...new Set(body.figureIds)]
        const added = figureIds.filter(value => !previous?.figureIds.includes(value))
        for (const value of added) await api.getFigure(value)
        const list = await api.save('practice_lists', id || api.uniqueId(), owner, {
          owner, name: body.name.trim(), figureIds,
        })
        return res.json({ list })
      }
      if (action === 'delete-list' && validId(id)) {
        await api.owned('practice_lists', id, owner)
        await api.remove('practice_lists', id)
        return res.json({ deleted: id })
      }
      return res.json({ error: 'Richiesta pratica non valida.' }, 400)
    } catch (cause) {
      // Do not write request bodies or notes to runtime logs.
      error(`Practice request failed (${cause.code || 'internal'}).`)
      const status = [401, 403, 404].includes(cause.code) ? cause.code : 500
      return res.json({ error: status === 404 ? 'Figura o lista non disponibile. Aggiorna e riprova.' : 'Operazione non riuscita. Le modifiche non salvate restano nella pagina.' }, status)
    }
  }
}
