import { appwriteConfig, functions } from './appwrite.js'

async function callUserManagement(payload) {
  let execution
  try {
    execution = await functions.createExecution({
      functionId: appwriteConfig.userManagementFunctionId,
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      async: false,
    })
  } catch (cause) {
    throw new Error(payload.action === 'set-role'
      ? 'Risposta non ricevuta: il ruolo potrebbe essere cambiato. Ricarica gli utenti e verifica la cronologia prima di riprovare.'
      : 'Gestione utenti non disponibile. Riprova.', { cause })
  }

  let response
  try {
    response = JSON.parse(execution.responseBody || '{}')
  } catch (cause) {
    throw new Error('La funzione di gestione utenti ha restituito una risposta non valida.', { cause })
  }

  if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
    const error = new Error(response.auditPending
      ? 'Ruolo cambiato, ma completamento audit non confermato. Non ripetere la modifica: verifica e riconcilia la cronologia.'
      : response.error || `Gestione utenti non riuscita (${execution.responseStatusCode}).`)
    error.auditPending = response.auditPending === true
    error.outcome = response.outcome
    throw error
  }
  if (execution.status !== 'completed') {
    throw new Error('Esito della gestione utenti non confermato. Aggiorna gli utenti e verifica la cronologia prima di riprovare.')
  }
  return response
}

export async function listUsers() {
  const response = await callUserManagement({ action: 'list' })
  if (!Array.isArray(response.users)) {
    throw new Error('La funzione di gestione utenti non ha restituito una lista valida.')
  }
  return response.users
}

export async function setUserRole(userId, role) {
  const response = await callUserManagement({ action: 'set-role', userId, role })
  if (response.user?.$id !== userId || response.user?.role !== role) {
    throw new Error('Ruolo aggiornato non confermato. Ricarica gli utenti e verifica la cronologia prima di riprovare.')
  }
  return response
}
