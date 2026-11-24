import { appwriteConfig, functions } from './appwrite.js'

export async function practiceRequest(action, data = {}) {
  let execution
  try {
    execution = await functions.createExecution({
      functionId: appwriteConfig.libraryFunctionId,
      body: JSON.stringify({ ...data, action, service: 'practice' }),
      async: false,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (cause) {
    throw new Error('Risposta non ricevuta. Le modifiche restano qui: verifica la connessione e ricarica i dati prima di ripetere una creazione.', { cause })
  }
  let result
  try {
    result = JSON.parse(execution.responseBody)
  } catch (cause) {
    throw new Error('Risposta del servizio pratica non valida. Riprova.', { cause })
  }
  if (!result || typeof result !== 'object') throw new Error('Risposta del servizio pratica non valida. Riprova.')
  if (execution.status !== 'completed' || execution.responseStatusCode < 200 || execution.responseStatusCode >= 300 || result.error) {
    throw new Error(result.error || 'Servizio pratica non disponibile. Riprova.')
  }
  const valid = action === 'list' ? Array.isArray(result.records) && Array.isArray(result.lists)
    : action === 'save-figure' ? result.record?.figureId === data.figureId
      : action === 'save-list' ? typeof result.list?.$id === 'string'
        : action === 'delete-list' && result.deleted === data.id
  if (!valid) throw new Error('Dati del servizio pratica non validi. Verifica lo stato salvato prima di riprovare.')
  return result
}
