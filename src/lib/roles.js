import { appwriteConfig, functions } from './appwrite.js'

async function callUserManagement(payload) {
  const execution = await functions.createExecution({
    functionId: appwriteConfig.userManagementFunctionId,
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    async: false,
  })

  let response
  try {
    response = JSON.parse(execution.responseBody || '{}')
  } catch (cause) {
    throw new Error('La funzione di gestione utenti ha restituito una risposta non valida.', { cause })
  }

  if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
    throw new Error(response.error || `Gestione utenti non riuscita (${execution.responseStatusCode}).`)
  }
  if (execution.status === 'failed') {
    throw new Error('La funzione di gestione utenti non è riuscita.')
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
  return callUserManagement({ action: 'set-role', userId, role })
}
