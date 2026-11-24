<script setup>
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import { browserOfflineLibrary } from '../lib/offline-library.js'
import { currentUser, ensureAuth } from '../lib/auth.js'
import { getFigureDetails } from '../lib/figures.js'
import { isOnline } from '../lib/online.js'

const library = browserOfflineLibrary()
const data = shallowRef({ owner: '', figures: [] })
const error = shallowRef('')
const message = shallowRef('')
const busy = shallowRef(false)
let active = true
const difficultyNames = { beginner: 'Base', intermediate: 'Intermedia', advanced: 'Avanzata' }
function load() {
  try {
    data.value = library.read()
  } catch (cause) {
    error.value = cause.message
  }
}
onMounted(async () => {
  window.addEventListener('storage', load)
  load()
  if (isOnline.value) {
    await ensureAuth()
    if (active) load()
  }
})
onBeforeUnmount(() => {
  active = false
  window.removeEventListener('storage', load)
})
async function refresh(figure) {
  const owner = data.value.owner
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    if (currentUser.value?.$id !== owner) throw new Error('Accedi con lo stesso account per aggiornare le copie.')
    const updated = await getFigureDetails(figure.id)
    if (currentUser.value?.$id !== owner) throw new Error('Account cambiato. Aggiornamento annullato.')
    library.save(owner, updated)
    load()
    message.value = 'Copia aggiornata.'
  } catch (cause) {
    error.value = cause.code === 404
      ? 'Figura non più disponibile. La vecchia copia è conservata: puoi eliminarla qui sotto.'
      : `${cause.message} La copia precedente è conservata.`
  } finally {
    busy.value = false
  }
}
function remove(id) {
  error.value = ''
  try {
    library.remove(data.value.owner, id)
    load()
  } catch (cause) {
    error.value = cause.message
  }
}
function clear() {
  if (!window.confirm('Eliminare tutte le copie offline da questo dispositivo?')) return
  try {
    library.clear()
    error.value = ''
    load()
  } catch (cause) {
    error.value = cause.message
  }
}
</script>

<template>
  <main class="offline-library container">
    <h1>La mia pratica offline</h1>
    <p>Copie testuali salvate esplicitamente su questo dispositivo. Non includono video, immagini, note private o credenziali.</p>
    <p>Le copie possono essere obsolete. L’accesso offline non verifica la sessione o i permessi sul server; proteggi il dispositivo. Esci dall’account online per rimuoverle, oppure eliminale qui.</p>
    <RouterLink class="btn" :to="currentUser ? '/dashboard?sezione=pratica' : '/auth'">{{ currentUser ? 'Torna alla mia pratica' : 'Accedi online' }}</RouterLink>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="!data.figures.length">Nessuna figura salvata. Quando sei online, apri una figura e scegli “Salva dettagli offline”.</p>
    <article v-for="figure in data.figures" :key="figure.id" class="offline-figure">
      <h2>{{ figure.nome }}</h2>
      <p>{{ figure.danza }} · {{ difficultyNames[figure.difficulty] || 'Difficoltà non indicata' }}</p>
      <p v-if="figure.aliases?.length">Altri nomi: {{ figure.aliases.join(', ') }}</p>
      <p class="description">{{ figure.description || 'Nessuna descrizione disponibile.' }}</p>
      <p>Copia del {{ new Date(figure.savedAt).toLocaleString('it') }}. Per dettagli aggiornati, riconnettiti e aggiorna la copia.</p>
      <div class="offline-actions">
        <button type="button" class="btn" :disabled="busy || !isOnline || currentUser?.$id !== data.owner" @click="refresh(figure)">{{ busy ? 'Aggiornamento…' : 'Aggiorna copia' }}</button>
        <button type="button" class="btn" :disabled="busy" @click="remove(figure.id)">Rimuovi copia</button>
      </div>
    </article>
    <button type="button" class="btn" :disabled="busy" @click="clear">Elimina tutte le copie locali</button>
  </main>
</template>

<style scoped>
.offline-library { display: grid; gap: 1.25rem; padding-block: 2rem; }
h1, h2 { line-height: 1.3; overflow-wrap: anywhere; }
p { color: var(--muted); margin: 0; overflow-wrap: anywhere; }
.offline-figure { display: grid; gap: 1rem; padding: 1.25rem; border: 1px solid var(--line); border-radius: 1rem; background: var(--ink-2); }
.description { white-space: pre-wrap; color: var(--text); }
.offline-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
</style>
