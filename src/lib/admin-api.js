import { appwriteConfig, functions } from './appwrite.js'

async function invoke(functionId, payload) {
  let execution
  try {
    execution = await functions.createExecution({
      functionId, body: JSON.stringify(payload), async: false,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (cause) {
    throw Object.assign(new Error('Esito non confermato. Controlla la cronologia e ricarica prima di riprovare.', { cause }), { outcome: 'unknown' })
  }
  let response
  try {
    response = JSON.parse(execution.responseBody || '{}')
    if (!response || typeof response !== 'object' || Array.isArray(response)) throw new Error('Invalid response')
  } catch {
    throw Object.assign(new Error('Risposta amministrativa non valida. Esito non confermato: controlla la cronologia.'), { outcome: 'unknown' })
  }
  if (execution.status === 'failed' || execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
    const error = new Error(response.error || 'Operazione non riuscita. Ricarica prima di riprovare.')
    error.errors = response.errors
    error.auditPending = response.auditPending
    error.outcome = execution.status === 'completed'
      && (response.outcome === 'rejected' || [400, 401, 403, 405].includes(execution.responseStatusCode))
      ? 'rejected'
      : 'unknown'
    throw error
  }
  return response
}

export async function saveAdminFigure({ id, data, expectedUpdatedAt }) {
  const result = await invoke(appwriteConfig.libraryFunctionId, { service: 'figures', action: 'save', id, data, expectedUpdatedAt })
  if (!result.figure?.$id) throw Object.assign(new Error('Figura salvata non confermata: ricarica il repertorio.'), { outcome: 'unknown' })
  return result.figure
}
export async function deleteAdminFigure({ id, expectedUpdatedAt }) {
  const result = await invoke(appwriteConfig.libraryFunctionId, { service: 'figures', action: 'delete', id, expectedUpdatedAt })
  if (result.deleted !== id) throw Object.assign(new Error('Eliminazione non confermata: ricarica il repertorio.'), { outcome: 'unknown' })
  return result.deleted
}
export async function listFavoriteStats() {
  const result = await invoke(appwriteConfig.libraryFunctionId, { service: 'figures', action: 'favoriteStats' })
  if (!Array.isArray(result.favorites) || !result.favorites.every(item =>
    typeof item?.figureId === 'string' && Number.isInteger(item.count) && item.count > 0,
  )) {
    throw new Error('Dati dei preferiti non validi. Ricarica le statistiche.')
  }
  return result.favorites
}
export async function listUserUsageStats() {
  const result = await invoke(appwriteConfig.libraryFunctionId, { service: 'figures', action: 'usageStats' })
  const validCount = value => Number.isInteger(value) && value >= 0
  if (!Array.isArray(result.users) || !result.users.every(user =>
    typeof user?.userId === 'string' && typeof user.name === 'string'
    && validCount(user.pageViews) && validCount(user.figureViews) && validCount(user.clicks)
    && validCount(user.totalActivity)
    && [user.mostVisitedArea, user.mostViewedFigureId, user.mostClickedTarget].every(value => value === null || typeof value === 'string'),
  )) {
    throw new Error('Dati delle attività utenti non validi. Ricarica le statistiche.')
  }
  return result.users
}
export const applyFigureRows = rows => invoke(appwriteConfig.libraryFunctionId, { service: 'figures', action: 'apply', rows })
export const listFigureAudit = ({ cursor, limit = 25 } = {}) => invoke(appwriteConfig.libraryFunctionId, { service: 'figures', action: 'audit', cursor, limit })
export const listRoleAudit = ({ cursor, limit = 25 } = {}) => invoke(appwriteConfig.userManagementFunctionId, { action: 'audit', cursor, limit })
