<script setup>
import { computed, shallowRef } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { practiceRequest } from '../lib/practice-api.js'
import { isOnline } from '../lib/online.js'
import { useUnsavedWarning } from '../lib/unsaved.js'

const props = defineProps({
  list: { type: Object, default: null },
  figures: { type: Array, required: true },
})
const emit = defineEmits(['saved', 'close'])
const name = shallowRef(props.list?.name || '')
const ids = shallowRef([...(props.list?.figureIds || [])])
const selected = shallowRef('')
const error = shallowRef('')
const busy = shallowRef(false)
const dirty = computed(() => name.value !== (props.list?.name || '')
  || JSON.stringify(ids.value) !== JSON.stringify(props.list?.figureIds || []))
useUnsavedWarning(() => dirty.value || busy.value)
const entries = computed(() => ids.value.map(id => ({
  id, nome: props.figures.find(figure => figure.id === id)?.nome || `Figura non disponibile (${id})`,
})))
function add() {
  if (selected.value && !ids.value.includes(selected.value)) ids.value = [...ids.value, selected.value]
  selected.value = ''
}
async function submit() {
  busy.value = true
  error.value = ''
  try {
    await practiceRequest('save-list', {
      ...(props.list ? { id: props.list.$id } : {}),
      name: name.value, figureIds: ids.value,
    })
    emit('saved')
  } catch (cause) {
    error.value = cause.message
  } finally {
    busy.value = false
  }
}
function canClose() {
  return !busy.value && (!dirty.value || window.confirm('Scartare le modifiche alla lista?'))
}
defineExpose({ canClose })
onBeforeRouteLeave(canClose)
function close() {
  if (canClose()) emit('close')
}
</script>

<template>
  <form class="list-editor" @submit.prevent="submit">
    <h3>{{ list ? 'Modifica lista' : 'Nuova lista' }}</h3>
    <fieldset :disabled="busy || !isOnline">
      <label>Nome della lista<input v-model="name" required maxlength="100" /></label>
      <label>Aggiungi figura
        <select v-model="selected">
          <option value="">Scegli una figura</option>
          <option v-for="figure in figures" :key="figure.id" :value="figure.id" :disabled="ids.includes(figure.id)">{{
            figure.nome }}</option>
        </select>
      </label>
      <button type="button" class="btn" :disabled="!selected || ids.length >= 200" @click="add">Aggiungi</button>
      <p v-if="!entries.length">La lista è vuota. Puoi aggiungere figure anche dalle loro schede.</p>
      <ul class="entries">
        <li v-for="entry in entries" :key="entry.id">
          <span>{{ entry.nome }}</span>
          <button type="button" class="btn" :aria-label="`Rimuovi ${entry.nome}`"
            @click="ids = ids.filter(id => id !== entry.id)">Rimuovi</button>
        </li>
      </ul>
      <button type="submit" class="btn btn-primary">{{ busy ? 'Salvataggio…' : 'Salva lista' }}</button>
    </fieldset>
    <button type="button" class="btn" :disabled="busy" @click="close">Chiudi</button>
    <p v-if="error" role="alert">{{ error }}</p>
  </form>
</template>

<style scoped>
.list-editor {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
}

h3 {
  line-height: 1.4;
}

fieldset {
  display: grid;
  gap: 0.75rem;
  border: 0;
  padding: 0;
  min-width: 0;
}

label {
  display: grid;
  gap: 0.5rem;
}

input,
select {
  font: inherit;
  font-size: 1rem;
  width: 100%;
  min-width: 0;
  min-height: 3rem;
  padding: 0.7rem;
  color: var(--text);
  background: var(--ink);
  border: 1px solid var(--input-line);
  border-radius: 0.5rem;
}

.entries {
  padding: 0;
  list-style: none;
}

.entries li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-block: 0.5rem;
  overflow-wrap: anywhere;
}

.entries span {
  min-width: 0;
}

.entries button {
  flex-shrink: 0;
}
</style>
