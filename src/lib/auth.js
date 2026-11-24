import { ID, OAuthProvider } from 'appwrite'
import { reactive, computed } from 'vue'
import { account } from './appwrite.js'
import { browserOfflineLibrary, OFFLINE_KEY } from './offline-library.js'

const state = reactive({ user: null, error: '' })
let loading = null
let generation = 0

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key !== OFFLINE_KEY && event.key !== null) return
    try {
      const { owner } = browserOfflineLibrary().read()
      if (state.user && owner !== state.user.$id) {
        generation++
        state.user = null
        loading = null
      }
    } catch (cause) {
      generation++
      state.user = null
      state.error = cause.message
      loading = null
    }
  })
}

export const currentUser = computed(() => state.user)
export const isLoggedIn = computed(() => state.user !== null)
export const isSuperAdmin = computed(() => state.user?.labels.includes('superadmin') === true)
export const isAdmin = computed(() => isSuperAdmin.value || state.user?.labels.includes('admin') === true)
export const authError = computed(() => state.error)

async function loadUser() {
  const request = ++generation
  state.error = ''
  try {
    const user = await account.get()
    if (request === generation) {
      if (typeof window !== 'undefined') {
        const library = browserOfflineLibrary()
        try {
          library.activate(user.$id)
        } catch (cause) {
          // A full store must not block authentication, but previous-account copies must go.
          library.clear()
          state.error = 'Accesso riuscito, ma archivio offline non disponibile. Le copie precedenti sono state eliminate.'
          console.error('Offline library activation failed', cause)
        }
      }
      state.user = user
    }
  } catch (error) {
    if (request !== generation) return
    state.user = null
    if (error.code === 401 && typeof window !== 'undefined') {
      try {
        browserOfflineLibrary().clear()
      } catch (cause) {
        state.error = 'Sessione terminata, ma le copie offline non sono state eliminate. Cancella i dati del sito su questo dispositivo.'
        console.error('Offline data cleanup failed', cause)
      }
    }
    if (error.code !== 401) {
      state.error = error instanceof TypeError
        ? 'Connessione non disponibile. Puoi aprire i dettagli salvati offline.'
        : error.message || 'Impossibile verificare la sessione. Riprova.'
      console.error('Appwrite authentication failed', error)
      loading = null
    }
  }
}

// Resolves once; call refreshUser() after login or logout.
export function ensureAuth() {
  loading ??= loadUser()
  return loading
}

export function refreshUser() {
  loading = loadUser()
  return loading
}

export function signInWithGoogle() {
  const origin = window.location.origin
  return account.createOAuth2Session({
    provider: OAuthProvider.Google,
    success: `${origin}/auth/success`,
    failure: `${origin}/auth/failure`,
  })
}

export async function signInWithEmail(email, password) {
  await account.createEmailPasswordSession({ email, password })
  await refreshUser()
  if (!isLoggedIn.value) throw new Error(state.error || 'Sessione non disponibile. Riprova.')
}

export async function registerWithEmail({ name, email, password, confirmPassword }) {
  if (password !== confirmPassword) throw new Error('Le password non coincidono.')
  await account.create({ userId: ID.unique(), email, password, name })
  await signInWithEmail(email, password)
}

export async function signOut() {
  await account.deleteSession({ sessionId: 'current' })
  generation++
  state.user = null
  state.error = ''
  loading = null
  if (typeof window !== 'undefined') {
    try {
      browserOfflineLibrary().clear()
    } catch (cause) {
      state.error = 'Uscita completata, ma le copie offline non sono state eliminate. Cancella i dati del sito su questo dispositivo.'
      throw new Error(state.error, { cause })
    }
  }
}
