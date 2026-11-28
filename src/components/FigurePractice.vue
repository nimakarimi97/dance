<script setup>
import { computed, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, RouterLink } from 'vue-router'
import { currentUser } from '../lib/auth.js'
import { practiceRequest } from '../lib/practice-api.js'
import { isOnline } from '../lib/online.js'
import { browserOfflineLibrary } from '../lib/offline-library.js'
import { getFigureDetails } from '../lib/figures.js'
import { isFeatureEnabled } from '../config/features.js'
import { useUnsavedWarning } from '../lib/unsaved.js'
import StudioIcon from './StudioIcon.vue'

const props = defineProps({ figure: { type: Object, required: true } })
const favoritesEnabled = isFeatureEnabled('favorites')
const offlineEnabled = isFeatureEnabled('offline')
const favorite = shallowRef(false)
const progress = shallowRef('')
const notes = shallowRef('')
const lists = shallowRef([])
const selectedList = shallowRef('')
const baseline = shallowRef('')
const loading = shallowRef(true)
const busy = shallowRef(false)
const error = shallowRef('')
const message = shallowRef('')
const savedAt = shallowRef('')
const offlineError = shallowRef('')
const formValue = () => JSON.stringify([favorite.value, progress.value, notes.value])
const dirty = computed(() => baseline.value !== '' && formValue() !== baseline.value)
useUnsavedWarning(() => dirty.value || busy.value)
const owner = currentUser.value?.$id
let generation = 0

watch(() => props.figure.id, load, { immediate: true })
async function load() {
  const request = ++generation
  loading.value = true
  baseline.value = ''
  error.value = ''
  message.value = ''
  offlineError.value = ''
  try {
    const snapshot = browserOfflineLibrary().read().figures.find(item => item.id === props.figure.id)
    savedAt.value = snapshot?.savedAt || ''
  } catch (cause) {
    savedAt.value = ''
    offlineError.value = `Archivio offline non disponibile: ${cause.message}`
  }
  try {
    const result = await practiceRequest('list')
    if (request !== generation || currentUser.value?.$id !== owner) return
    const record = result.records.find(item => item.figureId === props.figure.id)
    favorite.value = record?.favorite || false
    progress.value = record?.progress || ''
    notes.value = record?.notes || ''
    lists.value = result.lists
    selectedList.value = ''
    baseline.value = formValue()
  } catch (cause) {
    if (request === generation) error.value = cause.message
  } finally {
    if (request === generation) loading.value = false
  }
}

async function run(operation, success) {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    if (currentUser.value?.$id !== owner) throw new Error('Account cambiato. Riapri la pagina.')
    await operation()
    message.value = success
  } catch (cause) {
    error.value = cause.message
  } finally {
    busy.value = false
  }
}

function save() {
  const value = formValue()
  return run(async () => {
    await practiceRequest('save-figure', {
      figureId: props.figure.id, favorite: favorite.value, progress: progress.value || null, notes: notes.value,
    })
    baseline.value = value
  }, favoritesEnabled ? 'Preferito, progresso e note salvati.' : 'Progresso e note salvati.')
}

function addToList() {
  return run(async () => {
    const list = lists.value.find(item => item.$id === selectedList.value)
    if (!list) throw new Error('Scegli una lista.')
    // Reload before changing membership, so an old form does not replace newer entries.
    const latest = (await practiceRequest('list')).lists.find(item => item.$id === list.$id)
    if (!latest) throw new Error('Lista non più disponibile. Ricarica la pagina.')
    const result = await practiceRequest('save-list', {
      id: latest.$id, name: latest.name, figureIds: [...new Set([...latest.figureIds, props.figure.id])],
    })
    lists.value = lists.value.map(item => item.$id === result.list.$id ? result.list : item)
  }, 'Figura presente nella lista.')
}

function saveOffline() {
  return run(async () => {
    const details = await getFigureDetails(props.figure.id)
    if (currentUser.value?.$id !== owner) throw new Error('Account cambiato. Salvataggio annullato.')
    browserOfflineLibrary().save(owner, details)
    savedAt.value = new Date().toISOString()
  }, 'Dettagli salvati su questo dispositivo. Video, immagini e note esclusi.')
}

function canLeave() {
  return !busy.value && (!dirty.value || window.confirm('Lasciare la pagina senza salvare le note e i progressi?'))
}
onBeforeRouteLeave(canLeave)
onBeforeRouteUpdate(canLeave)
</script>

<template>
  <section class="practice-panel" aria-labelledby="practice-title">
    <h2 id="practice-title">La mia pratica</h2>
    <p>Salva questa figura e tieni traccia dei tuoi progressi. Le note sono solo tue.</p>
    <p v-if="loading" role="status">Caricamento dei dati personali…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <button v-if="!loading && !baseline" type="button" class="btn" :disabled="busy || !isOnline" @click="load">Riprova
      caricamento</button>
    <form v-if="baseline" @submit.prevent="save">
      <fieldset :disabled="busy || !isOnline">
        <button v-if="favoritesEnabled" type="button" class="favorite-choice" :class="{ saved: favorite }"
          :aria-pressed="favorite" @click="favorite = !favorite">
          <StudioIcon name="bookmark" />
          <span>{{ favorite ? 'Nei miei preferiti' : 'Aggiungi ai preferiti' }}</span>
        </button>
        <label>Progresso
          <select v-model="progress">
            <option value="">Non impostato</option>
            <option value="learning">Da imparare</option>
            <option value="practicing">In pratica</option>
            <option value="mastered">Padroneggiata</option>
          </select>
        </label>
        <label>Note private
          <textarea v-model="notes" rows="5" maxlength="10000" placeholder="Passi, ritmo, dettagli da ricordare…" />
        </label>
        <button type="submit" class="btn btn-primary" :disabled="!dirty">
          <StudioIcon name="check" />{{ busy ? 'Salvataggio…' : 'Salva la mia pratica' }}
        </button>
        <span v-if="dirty">Modifiche non salvate</span>
      </fieldset>
    </form>
    <div v-if="baseline" class="list-controls">
      <label>Aggiungi a una lista
        <select v-model="selectedList" :disabled="busy || !isOnline">
          <option value="">Scegli una lista</option>
          <option v-for="list in lists" :key="list.$id" :value="list.$id">{{ list.name }}{{
            list.figureIds.includes(figure.id) ? ' · Già presente' : '' }}</option>
        </select>
      </label>
      <button type="button" class="btn" :disabled="!selectedList || busy || !isOnline" @click="addToList">
        <StudioIcon name="plus" />Aggiungi alla lista
      </button>
      <RouterLink class="btn" to="/dashboard?sezione=pratica">Gestisci le mie liste</RouterLink>
    </div>
    <div v-if="offlineEnabled" class="offline-controls">
      <h3>Dettagli offline</h3>
      <p v-if="offlineError" role="alert">{{ offlineError }}</p>
      <p v-if="savedAt">Disponibile offline · Copia del {{ new Date(savedAt).toLocaleString('it') }}.</p>
      <p v-else>Non ancora salvata offline.</p>
      <p>Solo testo su questo dispositivo, senza video, immagini o note. Le copie vengono eliminate all’uscita o al
        cambio account.</p>
      <button type="button" class="btn" :disabled="busy || !isOnline" @click="saveOffline">
        <StudioIcon name="download" />{{ savedAt ? 'Aggiorna copia offline' : 'Salva dettagli offline' }}
      </button>
      <RouterLink class="btn" to="/offline">Apri le copie offline</RouterLink>
    </div>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="!isOnline" role="status">Sei offline: le modifiche personali richiedono una connessione. Le bozze restano
      qui finché non lasci la pagina.</p>
  </section>
</template>

<style scoped>
.practice-panel {
  margin-block: 1.5rem;
  padding: 1.25rem;
  border: 1px solid var(--line);
  border-radius: 1rem;
  background: var(--ink-2);
  overflow-wrap: anywhere;
}

.practice-panel h2,
.practice-panel h3 {
  line-height: 1.4;
}

.practice-panel p {
  color: var(--muted);
}

fieldset {
  display: grid;
  gap: 1rem;
  border: 0;
  padding: 0;
  min-width: 0;
}

label {
  display: grid;
  gap: 0.5rem;
}

select,
textarea {
  width: 100%;
  min-width: 0;
  min-height: 3rem;
  padding: 0.7rem;
  font: inherit;
  color: var(--text);
  background: var(--ink);
  border: 1px solid var(--input-line);
  border-radius: 0.6rem;
}

textarea {
  resize: vertical;
}

.favorite-choice {
  display: flex;
  align-items: center;
  min-height: 3rem;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  background: var(--ink);
  color: var(--text);
  text-align: left;
  font-weight: 600;
  cursor: pointer;
}

.favorite-choice.saved {
  background: var(--brand-soft);
  color: var(--brand-text);
  border-color: var(--brand-text);
}

.favorite-choice.saved :deep(.studio-icon) {
  fill: currentColor;
}

.list-controls,
.offline-controls {
  display: grid;
  gap: 0.75rem;
  border-top: 1px solid var(--line);
  padding-top: 1.25rem;
  margin-top: 1.25rem;
}

.offline-controls p {
  margin: 0;
}

button:active {
  opacity: 0.8;
}
</style>
