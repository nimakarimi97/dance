<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ensureAuth, isLoggedIn } from '../lib/auth.js'

const router = useRouter()
const status = ref('in-progress')
const error = ref('')

onMounted(async () => {
  await ensureAuth()
  if (isLoggedIn.value) return router.replace({ name: 'dashboard' })

  status.value = 'error'
  error.value = 'Sessione Appwrite non disponibile dopo l’accesso. Riprova.'
})
</script>

<template>
  <main class="container callback">
    <p v-if="status === 'in-progress'" class="script">Accesso in corso…</p>
    <template v-else>
      <p class="script">Accesso non completato</p>
      <p class="sub">{{ error }}</p>
      <RouterLink to="/auth" class="back">Torna al login</RouterLink>
    </template>
  </main>
</template>

<style scoped>
.callback {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.75rem;
  min-height: 60dvh;
  text-align: center;
}
.script { font-family: 'Caveat', cursive; font-size: 2.2rem; color: #f8fafc; margin: 0; }
.sub { color: #94a3b8; margin: 0; }
.back { color: #a5b4fc; }
</style>
