<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authError, refreshUser, isLoggedIn } from '../lib/auth.js'

const router = useRouter()
const status = ref('in-progress')
const error = ref('')

onMounted(async () => {
  await refreshUser()
  if (isLoggedIn.value) return router.replace({ name: 'dashboard' })

  status.value = 'error'
  error.value = authError.value || 'Sessione Appwrite non disponibile dopo l’accesso. Riprova.'
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
