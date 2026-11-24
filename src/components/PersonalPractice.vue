<script setup>
import { computed, onMounted, shallowRef, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'
import { practiceRequest } from '../lib/practice-api.js'
import { isOnline } from '../lib/online.js'
import PracticeListEditor from './PracticeListEditor.vue'
import StudioIcon from './StudioIcon.vue'

const props = defineProps({
  figures: { type: Array, required: true },
  catalogLoading: Boolean,
  catalogError: { type: String, default: '' },
})
const records = shallowRef([])
const lists = shallowRef([])
const loading = shallowRef(true)
const error = shallowRef('')
const busy = shallowRef(false)
const message = shallowRef('')
const filter = shallowRef('favorites')
const editing = shallowRef(false)
const selectedList = shallowRef(null)
const listEditor = useTemplateRef('list-editor')
defineExpose({ canLeave: () => !editing.value || listEditor.value?.canClose() !== false })
const progressLabels = { learning: 'Da imparare', practicing: 'In pratica', mastered: 'Padroneggiata' }
const visible = computed(() => {
  const ids = filter.value.startsWith('list:')
    ? lists.value.find(list => list.$id === filter.value.slice(5))?.figureIds || []
    : records.value.filter(record => filter.value === 'favorites' ? record.favorite : record.progress === filter.value).map(record => record.figureId)
  return ids.map(id => ({
    id, figure: props.figures.find(figure => figure.id === id),
    progress: records.value.find(record => record.figureId === id)?.progress,
    notes: records.value.find(record => record.figureId === id)?.notes,
  }))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await practiceRequest('list')
    records.value = result.records
    lists.value = result.lists
  } catch (cause) {
    error.value = cause.message
  } finally {
    loading.value = false
  }
}
onMounted(load)
function edit(list = null) {
  selectedList.value = list
  editing.value = true
}
async function saved() {
  editing.value = false
  message.value = 'Lista salvata.'
  await load()
}
async function remove(list) {
  if (!window.confirm(`Eliminare la lista “${list.name}”? Le note e i progressi restano salvati.`)) return
  busy.value = true
  error.value = ''
  try {
    await practiceRequest('delete-list', { id: list.$id })
    lists.value = lists.value.filter(item => item.$id !== list.$id)
    if (filter.value === `list:${list.$id}`) filter.value = 'favorites'
    message.value = 'Lista eliminata.'
  } catch (cause) {
    error.value = cause.message
  } finally {
    busy.value = false
  }
  async function clearUnavailable(id) {
    if (!window.confirm('Rimuovere preferito, progresso e note di questa figura non disponibile? Le liste restano invariate.')) return
    busy.value = true
    error.value = ''
    try {
      await practiceRequest('save-figure', { figureId: id, favorite: false, progress: null, notes: '' })
      records.value = records.value.filter(record => record.figureId !== id)
      message.value = 'Dati personali della figura rimossi.'
    } catch (cause) {
      error.value = cause.message
    } finally {
      busy.value = false
    }
  }
}
</script>

<template>
  <section class="personal-practice" aria-labelledby="personal-title">
    <header>
      <h2 id="personal-title">
        <StudioIcon name="bookmark" /> Preferiti e liste
      </h2>
      <RouterLink class="btn" to="/offline">
        <StudioIcon name="download" />Copie offline
      </RouterLink>
    </header>
    <p v-if="loading" role="status">Caricamento della tua pratica…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <button v-if="error" type="button" class="btn" :disabled="loading || !isOnline" @click="load">Riprova</button>
    <p v-if="message" role="status">{{ message }}</p>
    <template v-if="!loading && !error">
      <label>Mostra
        <select v-model="filter">
          <option value="favorites">Preferiti</option>
          <option v-for="(label, state) in progressLabels" :key="state" :value="state">{{ label }}</option>
          <option v-for="list in lists" :key="list.$id" :value="`list:${list.$id}`">Lista · {{ list.name }}</option>
        </select>
      </label>
      <p v-if="catalogLoading" role="status">Verifica disponibilità delle figure…</p>
      <p v-else-if="catalogError" role="alert">Catalogo non disponibile: {{ catalogError }} Le liste personali restano
        salvate.</p>
      <ul v-else class="personal-entries">
        <li v-for="entry in visible" :key="entry.id">
          <RouterLink v-if="entry.figure" :to="{ name: 'figura', params: { figura: entry.id } }">{{ entry.figure.nome }}
          </RouterLink>
          <span v-else>Figura eliminata o non disponibile ({{ entry.id }})</span>
          <span v-if="entry.progress">{{ progressLabels[entry.progress] }}</span>
          <details v-if="!entry.figure && entry.notes">
            <summary>Le mie note private</summary>
            <p class="private-note">{{ entry.notes }}</p>
          </details>
          <button v-if="!entry.figure" type="button" class="btn" :disabled="busy || !isOnline"
            @click="clearUnavailable(entry.id)">Rimuovi dalla mia pratica</button>
        </li>
      </ul>
      <p v-if="!visible.length">Ancora nessuna figura in questa raccolta. Aggiungila dalle schede del catalogo.</p>
      <div v-if="!editing" class="list-management">
        <h3>Le mie liste</h3>
        <p v-if="!lists.length">Crea la prima lista per la prossima sessione di pratica.</p>
        <button type="button" class="btn" :disabled="busy || !isOnline" @click="edit()">
          <StudioIcon name="plus" />Nuova lista
        </button>
        <article v-for="list in lists" :key="list.$id" class="personal-list">
          <h4>{{ list.name }} · {{ list.figureIds.length }} figure</h4>
          <div class="list-actions">
            <button type="button" class="btn" @click="filter = `list:${list.$id}`">Apri</button>
            <button type="button" class="btn" :disabled="busy || !isOnline" @click="edit(list)">
              <StudioIcon name="edit" />Modifica
            </button>
            <button type="button" class="btn" :disabled="busy || !isOnline" @click="remove(list)">
              <StudioIcon name="trash" />Elimina
            </button>
          </div>
        </article>
      </div>
      <PracticeListEditor v-else ref="list-editor" :key="selectedList?.$id || 'new'" :list="selectedList"
        :figures="figures" @saved="saved" @close="editing = false" />
    </template>
  </section>
</template>

<style scoped>
.personal-practice {
  display: grid;
  gap: 1rem;
  padding: clamp(1rem, 3vw, 1.5rem);
  background: var(--studio-panel);
  border: 1px solid var(--studio-line);
  border-radius: 1rem;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
}

h2,
h3,
h4 {
  line-height: 1.4;
  overflow-wrap: anywhere;
}

p {
  color: var(--studio-muted);
}

label {
  display: grid;
  gap: 0.5rem;
}

select {
  width: 100%;
  min-width: 0;
  min-height: 3rem;
  font: inherit;
  font-size: 1rem;
  padding: 0.7rem;
  color: var(--studio-text);
  background: var(--studio-bg);
  border: 1px solid var(--input-line);
  border-radius: 0.5rem;
}

.personal-entries {
  padding: 0;
  list-style: none;
  margin: 0;
}

.personal-entries li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-block: 0.5rem;
  border-bottom: 1px solid var(--studio-line);
  overflow-wrap: anywhere;
}

.personal-entries a {
  display: flex;
  align-items: center;
  min-height: 3rem;
}

.personal-entries details {
  flex-basis: 100%;
}

.personal-entries summary {
  min-height: 3rem;
  padding-block: 0.75rem;
  cursor: pointer;
}

.private-note {
  white-space: pre-wrap;
}

.list-management {
  display: grid;
  gap: 1rem;
}

.personal-list {
  padding: 1rem;
  background: var(--studio-bg);
  border-radius: 0.75rem;
}

.list-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
</style>
