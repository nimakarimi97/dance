import { ID, OAuthProvider } from 'appwrite'
import { reactive, computed } from 'vue'
import { account } from './appwrite.js'

const state = reactive({ user: null, error: '' })
let loading = null
let generation = 0

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
      state.user = user
    }
  } catch (error) {
    if (request !== generation) return
    state.user = null
    if (error.code !== 401) {
      state.error = error.message || 'Impossibile verificare la sessione. Riprova.'
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
}
