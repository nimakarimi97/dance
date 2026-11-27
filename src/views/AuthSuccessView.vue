<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authError, isLoggedIn, refreshUser, signInWithMagicUrlToken } from '../lib/auth.js'

const route = useRoute()
const router = useRouter()
const status = ref('in-progress')
const error = ref('')

onMounted(async () => {
  const redirect = typeof route.query.redirect === 'string'
    && route.query.redirect.startsWith('/')
    && !route.query.redirect.startsWith('//')
    ? route.query.redirect
    : '/dashboard'
  const hasToken = 'userId' in route.query || 'secret' in route.query

  try {
    if (hasToken) {
      const { userId, secret } = route.query
      if (typeof userId !== 'string' || typeof secret !== 'string') {
        throw new Error('Il link di accesso non è valido o è scaduto.')
      }
      await router.replace({ name: 'auth-success', query: route.query.redirect ? { redirect } : {} })
      await signInWithMagicUrlToken(userId, secret)
    } else {
      await refreshUser()
    }

    if (isLoggedIn.value) return router.replace(redirect)
    throw new Error(authError.value || 'Sessione Appwrite non disponibile dopo l’accesso. Riprova.')
  } catch (cause) {
    status.value = 'error'
    error.value = cause.message || 'Accesso non riuscito. Riprova.'
  }
})
</script>

<template>
  <main class="container state">
    <div v-if="status === 'in-progress'" role="status">
      <p class="script lead">Accesso in corso…</p>
    </div>
    <template v-else>
      <h1 class="script">Accesso non completato</h1>
      <p>{{ error }}</p>
      <RouterLink to="/auth" class="btn btn-primary">Torna al login</RouterLink>
    </template>
  </main>
</template>

<style scoped>
.state {
  min-height: 60dvh;
  align-content: center;
}

.lead {
  margin: 0;
  font-size: 2.6rem;
  color: var(--text);
}
</style>
