<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { dances, figures, refreshFigures, useFigureCatalog } from '../data/danze.js'
import { saveFigure } from '../lib/figures.js'

const { loading, error: catalogError, retry } = useFigureCatalog()
const selectedId = ref('')
const nome = ref('')
const danza = ref('salsa')
const stili = ref([])
const youtubeId = ref('')
const video = ref(null)
const image = ref(null)
const formKey = ref(0)
const saving = ref(false)
const error = ref('')
const savedId = ref('')
const availableStyles = computed(() => dances[danza.value].stili)
const selectedFigure = computed(() => figures.value.find(figure => figure.id === selectedId.value))

watch(danza, () => { stili.value = stili.value.filter(id => availableStyles.value.some(style => style.id === id)) })
watch(selectedId, () => {
  const figure = selectedFigure.value
  nome.value = figure?.nome || ''
  danza.value = figure?.danza || 'salsa'
  stili.value = [...(figure?.stili || [])]
  youtubeId.value = figure?.youtubeId || ''
  video.value = null
  image.value = null
  error.value = ''
  savedId.value = ''
  formKey.value++
})

async function submit() {
  error.value = ''
  savedId.value = ''
  if (!nome.value.trim() || !stili.value.length) {
    error.value = 'Inserisci il nome e scegli almeno uno stile.'
    return
  }
  if (youtubeId.value && !/^[\w-]{11}$/.test(youtubeId.value.trim())) {
    error.value = 'Inserisci un ID YouTube valido di 11 caratteri, non un URL.'
    return
  }
  saving.value = true
  try {
    const result = await saveFigure({
      id: selectedId.value || undefined,
      data: { nome: nome.value.trim(), danza: danza.value, stili: [...stili.value], youtubeId: youtubeId.value.trim() || null },
      video: video.value,
      image: image.value,
    })
    video.value = null
    image.value = null
    formKey.value++
    await refreshFigures()
    selectedId.value = result.$id
    // Let the selection watcher populate the saved row before announcing success.
    await nextTick()
    savedId.value = result.$id
  } catch (cause) {
    error.value = cause.message || 'Salvataggio non riuscito. Riprova.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="editor" aria-labelledby="editor-title">
    <h2 id="editor-title">Gestione figure e video</h2>
    <p>Solo gli amministratori possono aggiungere figure e caricare file.</p>
    <p v-if="loading" role="status">Caricamento figure…</p>
    <div v-if="catalogError" role="alert">
      <p>{{ catalogError }}</p>
      <button type="button" class="btn" @click="retry">Riprova</button>
    </div>
    <form v-else @submit.prevent="submit">
      <fieldset :disabled="saving || loading">
        <label>
          Figura da modificare
          <select v-model="selectedId">
            <option value="">Nuova figura</option>
            <option v-for="figure in figures" :key="figure.id" :value="figure.id">{{ dances[figure.danza].nome }} — {{ figure.nome }}</option>
          </select>
        </label>
        <label>
          Nome
          <input v-model="nome" name="figureName" maxlength="255" required />
        </label>
        <label>
          Danza
          <select v-model="danza" name="dance">
            <option v-for="dance in dances" :key="dance.id" :value="dance.id">{{ dance.nome }}</option>
          </select>
        </label>
        <fieldset class="styles">
          <legend>Stili (almeno uno)</legend>
          <label v-for="style in availableStyles" :key="style.id" class="check">
            <input v-model="stili" type="checkbox" :value="style.id" /> {{ style.nome }}
          </label>
        </fieldset>
        <label>
          Video YouTube (facoltativo)
          <input v-model="youtubeId" name="youtubeId" maxlength="11" aria-describedby="youtube-hint" />
          <span id="youtube-hint" class="hint">Solo l'ID di 11 caratteri. Il video caricato su Appwrite ha la precedenza.</span>
        </label>
        <label>
          {{ selectedFigure?.videoFileId ? 'Sostituisci video' : 'Carica video' }} (facoltativo)
          <input :key="`video-${formKey}`" type="file" name="video" accept=".mp4,.webm,.mov" aria-describedby="media-hint" @change="video = $event.target.files[0] || null" />
        </label>
        <label>
          {{ selectedFigure?.imageFileId ? 'Sostituisci immagine' : 'Immagine della figura' }} (facoltativa)
          <input :key="`image-${formKey}`" type="file" name="image" accept=".jpg,.jpeg,.png,.webp" aria-describedby="media-hint" @change="image = $event.target.files[0] || null" />
        </label>
        <p id="media-hint" class="hint">Massimo 50 MB per file. Video: MP4, WebM, MOV. Immagini: JPG, PNG, WebP. I file sono accessibili solo dopo l'accesso.</p>
        <button type="submit" class="btn btn-primary">{{ saving ? 'Salvataggio e caricamento…' : 'Salva figura' }}</button>
      </fieldset>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="savedId" role="status">
        Figura salvata. <RouterLink :to="{ name: 'figura', params: { figura: savedId } }">Apri la figura</RouterLink>
      </p>
    </form>
  </section>
</template>

<style scoped>
.editor { padding: 1.5rem; border: 1px solid var(--line); border-radius: 24px; background: var(--ink-2); }
.editor h2 { margin-top: 0; }
fieldset { display: grid; gap: 1rem; border: 0; padding: 0; margin: 0; min-width: 0; }
label { display: grid; gap: 0.4rem; font-weight: 600; min-width: 0; }
input, select { width: 100%; min-width: 0; min-height: 3rem; padding: 0.7rem; border: 1px solid var(--line); border-radius: 12px; background: var(--ink); color: var(--text); font: inherit; }
.styles { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; }
.styles legend { padding: 0; margin-bottom: 0.5rem; }
.check { display: flex; align-items: center; min-height: var(--touch); }
.check input { width: 1.25rem; min-height: 1.25rem; }
.hint { color: var(--muted); font-size: 0.9rem; font-weight: 400; margin: 0; }
.error { border-left: 3px solid var(--salsa); padding: 0.75rem; }
</style>
