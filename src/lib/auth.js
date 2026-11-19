import { ID, OAuthProvider } from 'appwrite'
import { reactive, computed } from 'vue'
import { account, appwriteConfig } from './appwrite.js'

const state = reactive({ user: null, roles: [] })
let loading = null

export const currentUser = computed(() => state.user)
export const isLoggedIn = computed(() => state.user !== null)
export const isEditor = computed(() => state.roles.includes('editor'))

// Roles are derived from memberships in the Appwrite "editors" team.
async function loadRoles() {
  if (!appwriteConfig.editorsTeamId) return []
  const { memberships } = await account.listMemberships()
  const isEditorMember = memberships.some(
    m => m.teamId === appwriteConfig.editorsTeamId && m.confirmed,
  )
  return isEditorMember ? ['editor'] : []
}

async function loadUser() {
  try {
    state.user = await account.get()
    state.roles = await loadRoles()
  } catch {
    state.user = null
    state.roles = []
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
    success: `${origin}/#/auth/success`,
    failure: `${origin}/#/auth/failure`,
  })
}

export async function signInWithEmail(email, password) {
  await account.createEmailPasswordSession({ email, password })
  await refreshUser()
}

export async function registerWithEmail({ name, email, password }) {
  await account.create({ userId: ID.unique(), email, password, name })
  await signInWithEmail(email, password)
}

export async function signOut() {
  await account.deleteSession({ sessionId: 'current' })
  state.user = null
  state.roles = []
  loading = null
}
