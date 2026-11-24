<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { dances } from '../data/danze.js'
import { saveFigure } from '../lib/figures.js'
import { parseYoutubeId } from '../lib/youtube.js'
import StudioIcon from './StudioIcon.vue'
import { difficultyLabels } from '../lib/catalog.js'

const props = defineProps({ figure: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const dialog = useTemplateRef('dialog')
const errorSummary = useTemplateRef('error-summary')
const nome = shallowRef(props.figure?.nome || '')
const danza = shallowRef(props.figure?.danza || 'salsa')
const stili = shallowRef([...(props.figure?.stili || [])])
const youtubeId = shallowRef(props.figure?.youtubeId || '')
const aliases = shallowRef((props.figure?.aliases || []).join('\n'))
const description = shallowRef(props.figure?.description || '')
const difficulty = shallowRef(props.figure?.difficulty || '')
const video = shallowRef(null)
const image = shallowRef(null)
const videoKey = shallowRef(0)
const imageKey = shallowRef(0)
const saving = shallowRef(false)
const error = shallowRef('')
const submitted = shallowRef(false)
const availableStyles = computed(() => dances[danza.value].stili)
const dirty = computed(
  () =>
    nome.value !== (props.figure?.nome || '') ||
    danza.value !== (props.figure?.danza || 'salsa') ||
    stili.value.join(',') !== (props.figure?.stili || []).join(',') ||
    youtubeId.value !== (props.figure?.youtubeId || '') ||
    aliases.value !== (props.figure?.aliases || []).join('\n') ||
    description.value !== (props.figure?.description || '') ||
    difficulty.value !== (props.figure?.difficulty || '') ||
    Boolean(video.value || image.value),
)

watch(danza, () => {
  stili.value = stili.value.filter((id) => availableStyles.value.some((style) => style.id === id))
})
onMounted(() => dialog.value.showModal())
onBeforeUnmount(() => dialog.value?.close())

function canClose() {
  return !saving.value && (!dirty.value || window.confirm('Vuoi chiudere senza salvare le modifiche?'))
}

function requestClose() {
  if (canClose()) emit('close')
}

onBeforeRouteLeave(canClose)

async function showError(message) {
  error.value = message
  await nextTick()
  errorSummary.value?.focus()
}

async function submit() {
  error.value = ''
  submitted.value = true
  if (!nome.value.trim() || !stili.value.length) {
    await showError('Inserisci il nome e scegli almeno uno stile prima di salvare.')
    return
  }
  const parsedYoutubeId = parseYoutubeId(youtubeId.value)
  const parsedAliases = [...new Set(aliases.value.split('\n').map(value => value.trim()).filter(Boolean))]
  if (parsedAliases.length > 20 || parsedAliases.some(value => value.length > 100)) {
    await showError('Inserisci al massimo 20 nomi alternativi, fino a 100 caratteri ciascuno.')
    return
  }
  if (youtubeId.value.trim() && !parsedYoutubeId) {
    await showError(
      'Il link o l’ID YouTube non è valido. Incolla un ID di 11 caratteri oppure un link youtube.com o youtu.be.',
    )
    return
  }
  saving.value = true
  try {
    const result = await saveFigure({
      id: props.figure?.id,
      data: {
        nome: nome.value.trim(), danza: danza.value, stili: [...stili.value], youtubeId: parsedYoutubeId,
        aliases: parsedAliases, description: description.value.trim(), difficulty: difficulty.value || null,
      },
      video: video.value,
      image: image.value,
      expectedUpdatedAt: props.figure?.$updatedAt,
    })
    emit('saved', result.$id)
  } catch (cause) {
    await showError(cause.message || 'Salvataggio non riuscito. I dati sono ancora qui: riprova.')
  } finally {
    saving.value = false
  }
}

function removeVideo() {
  video.value = null
  videoKey.value++
}

function removeImage() {
  image.value = null
  imageKey.value++
}

function fileSize(file) {
  return file.size < 1_000_000
    ? `${Math.max(1, Math.round(file.size / 1000))} KB`
    : `${(file.size / 1_000_000).toFixed(1)} MB`
}
</script>

<template>
  <dialog ref="dialog" class="figure-editor" aria-labelledby="editor-title" aria-describedby="editor-description"
    @cancel.prevent="requestClose">
    <form class="editor-form" @submit.prevent="submit">
      <header class="editor-header">
        <div>
          <p>{{ figure ? 'Modifica il repertorio' : 'Amplia il repertorio' }}</p>
          <h2 id="editor-title">{{ figure ? 'Modifica figura' : 'Nuova figura' }}</h2>
        </div>
        <button type="button" class="editor-close" :disabled="saving" aria-label="Chiudi editor" @click="requestClose">
          <StudioIcon name="close" />
        </button>
      </header>
      <div class="editor-body">
        <p id="editor-description" class="editor-description">
          Definisci la figura, poi aggiungi un video o un’immagine. Puoi completarla anche in un secondo momento.
        </p>
        <fieldset :disabled="saving" class="editor-fields">
          <section class="details-section" aria-labelledby="details-title">
            <h3 id="details-title">
              <StudioIcon name="library" /> Dettagli della figura
            </h3>
            <label class="field">Nome della figura <span class="required-note">Obbligatorio</span>
              <input v-model="nome" name="figureName" placeholder="Ad esempio, Enchufla" maxlength="255"
                autocomplete="off" required autofocus />
            </label>
            <label class="field">Nomi alternativi
              <textarea v-model="aliases" name="aliases" rows="3" placeholder="Un nome per riga, ad esempio settanta per 70" aria-describedby="aliases-hint" />
              <span id="aliases-hint" class="field-hint">Un nome per riga. Massimo 20 nomi di 100 caratteri. Usati nella ricerca.</span>
            </label>
            <label class="field">Descrizione
              <textarea v-model="description" name="description" rows="4" maxlength="4000" />
            </label>
            <label class="field">Difficoltà
              <select v-model="difficulty" name="difficulty">
                <option value="">Non indicata</option>
                <option v-for="(label, value) in difficultyLabels" :key="value" :value="value">{{ label }}</option>
              </select>
            </label>
            <label class="field">Danza
              <select v-model="danza" name="dance">
                <option v-for="dance in dances" :key="dance.id" :value="dance.id">
                  {{ dance.nome }}
                </option>
              </select>
            </label>
            <fieldset class="style-choices"
              :aria-describedby="submitted && !stili.length ? 'styles-error' : 'styles-hint'">
              <legend>Stili</legend>
              <p id="styles-hint" class="field-hint">
                Scegli almeno uno stile per questa figura.
              </p>
              <div class="style-options">
                <label v-for="style in availableStyles" :key="style.id" class="style-option"
                  :class="{ checked: stili.includes(style.id) }">
                  <input v-model="stili" type="checkbox" :value="style.id"
                    :aria-invalid="submitted && !stili.length" /><span>{{ style.nome }}</span>
                </label>
              </div>
              <p v-if="submitted && !stili.length" id="styles-error" class="field-error">
                Seleziona almeno uno stile.
              </p>
            </fieldset>
            <div class="editor-privacy">
              <StudioIcon name="shield" />
              <div>
                <strong>Solo per chi è in pista con noi</strong>
                <p>Figure, immagini e video Appwrite restano riservati agli utenti che hanno effettuato l’accesso.</p>
              </div>
            </div>
          </section>

          <section class="media-section" aria-labelledby="media-title">
            <h3 id="media-title">
              <StudioIcon name="video" /> Video e immagine <span>Facoltativi</span>
            </h3>
            <div class="upload-group">
              <label class="upload-tile" :class="{ chosen: video }">
                <StudioIcon :name="video ? 'check' : 'upload'" /><strong>{{
                  video ? video.name : figure?.videoFileId ? 'Sostituisci il video' : 'Carica un video'
                  }}</strong>
                <span>{{ video ? fileSize(video) : 'MP4, WebM o MOV · Fino a 50 MB' }}</span>
                <input :key="videoKey" type="file" name="video" accept=".mp4,.webm,.mov"
                  :aria-label="figure?.videoFileId ? 'Sostituisci video' : 'Carica video'"
                  @change="video = $event.target.files[0] || null" />
              </label>
              <button v-if="video" type="button" class="remove-file" @click="removeVideo">
                Rimuovi selezione video
              </button>
              <p v-else-if="figure?.videoFileId" class="existing-file">
                <StudioIcon name="check" /> Il video attuale resta collegato.
              </p>
            </div>
            <div class="upload-group">
              <label class="upload-tile image-tile" :class="{ chosen: image }">
                <StudioIcon :name="image ? 'check' : 'image'" /><strong>{{
                  image ? image.name : figure?.imageFileId ? 'Sostituisci l’immagine' : 'Aggiungi un’immagine'
                  }}</strong>
                <span>{{ image ? fileSize(image) : 'JPG, PNG o WebP · Fino a 50 MB' }}</span>
                <input :key="imageKey" type="file" name="image" accept=".jpg,.jpeg,.png,.webp"
                  :aria-label="figure?.imageFileId ? 'Sostituisci immagine' : 'Carica immagine'"
                  @change="image = $event.target.files[0] || null" />
              </label>
              <button v-if="image" type="button" class="remove-file" @click="removeImage">
                Rimuovi selezione immagine
              </button>
              <p v-else-if="figure?.imageFileId" class="existing-file">
                <StudioIcon name="check" /> L’immagine attuale resta collegata.
              </p>
            </div>
            <label class="field youtube-field">Oppure collega YouTube
              <input v-model="youtubeId" name="youtubeId"
                placeholder="ID o link YouTube, es. https://youtube.com/shorts/…" autocomplete="off"
                aria-describedby="youtube-hint" />
              <span id="youtube-hint" class="field-hint">Puoi incollare l’ID di 11 caratteri oppure il link (watch,
                shorts, youtu.be). Se carichi un video, sarà
                mostrato al posto di YouTube.</span>
            </label>
          </section>
        </fieldset>
        <div v-if="error" ref="error-summary" class="editor-error" role="alert" tabindex="-1">
          <strong>Controlla la figura</strong>
          <p>{{ error }}</p>
        </div>
      </div>
      <footer class="editor-footer">
        <span class="save-hint">
          <StudioIcon name="shield" /> Salvataggio protetto
        </span>
        <button type="button" class="editor-button cancel-button" :disabled="saving" @click="requestClose">
          Annulla
        </button>
        <button type="submit" class="editor-button save-button" :disabled="saving">
          <StudioIcon :name="saving ? 'upload' : 'check'" />{{ saving ? 'Salvataggio…' : 'Salva figura' }}
        </button>
      </footer>
    </form>
  </dialog>
</template>

<style scoped>
.figure-editor {
  width: min(920px, calc(100% - 3rem));
  max-width: none;
  max-height: calc(100dvh - 3rem);
  margin: auto;
  padding: 0;
  border: 1px solid var(--studio-line);
  border-radius: 18px;
  background: var(--studio-panel);
  color: var(--studio-text);
  box-shadow: 0 24px 100px #0008;
}

.figure-editor::backdrop {
  background: #070d1cc9;
  backdrop-filter: blur(5px);
}

.editor-form {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 3rem);
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 1.75rem;
  border-bottom: 1px solid var(--studio-line);
}

.editor-header p {
  margin: 0 0 0.4rem;
  color: var(--studio-muted);
  font-size: 0.8rem;
}

.editor-header h2 {
  font-size: 1.5rem;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.editor-close {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  background: var(--studio-raised);
  color: var(--studio-muted);
  border: 1px solid var(--studio-line);
  border-radius: 9px;
  cursor: pointer;
}

.editor-close:hover {
  color: var(--studio-text);
}

.editor-body {
  overflow-y: auto;
  min-height: 0;
  padding: 1.5rem 1.75rem;
  overscroll-behavior: contain;
  scroll-padding-block: 1rem;
}

.editor-description {
  margin: 0 0 1.5rem;
  color: var(--studio-muted);
  font-size: 0.875rem;
  line-height: 1.6;
  max-width: 70ch;
}

.editor-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 2rem;
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}

.editor-fields section {
  min-width: 0;
}

.editor-fields h3 {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0 0 1.5rem;
}

.editor-fields h3 .studio-icon {
  color: var(--studio-accent);
  width: 1.1rem;
  height: 1.1rem;
}

.editor-fields h3>span {
  margin-left: auto;
  color: var(--studio-muted);
  font-size: 0.75rem;
  font-weight: 400;
}

.media-section {
  border-left: 1px solid var(--studio-line);
  padding-left: 2rem;
}

.field {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.field>input,
.field>textarea,
.field>select {
  width: 100%;
  min-width: 0;
  min-height: 3rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--studio-line);
  border-radius: 8px;
  background: var(--studio-bg);
  color: var(--studio-text);
  font: inherit;
  font-size: 1rem;
  font-weight: 400;
}

.field>textarea { resize: vertical; }

.field input::placeholder {
  color: var(--studio-muted);
  font-size: 0.875rem;
}

.field input:hover,
.field select:hover {
  border-color: var(--studio-muted);
}

.required-note {
  margin-left: auto;
  color: var(--studio-muted);
  font-size: 0.75rem;
  font-weight: 400;
}

.style-choices {
  padding: 0;
  margin: 1.5rem 0;
  border: 0;
  min-width: 0;
}

.style-choices legend {
  padding: 0;
  font-size: 0.85rem;
  font-weight: 600;
}

.field-hint {
  display: block;
  color: var(--studio-muted);
  font-size: 0.75rem;
  line-height: 1.6;
  font-weight: 400;
}

.style-choices>.field-hint {
  margin: 0.45rem 0 0.75rem;
}

.style-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.style-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.85rem;
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--studio-line);
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  background: var(--studio-bg);
}

.style-option.checked {
  border-color: var(--studio-accent);
  background: var(--studio-accent-soft);
  color: var(--studio-accent);
}

.style-option input {
  width: 1rem;
  height: 1rem;
  margin: 0;
  accent-color: var(--studio-accent);
}

.field-error {
  color: var(--studio-warning);
  font-size: 0.8rem;
}

.editor-privacy {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 1rem;
  border-radius: 9px;
  background: var(--studio-bg);
  margin-top: 2rem;
}

.editor-privacy>.studio-icon {
  color: var(--studio-accent);
  width: 1.1rem;
  height: 1.1rem;
  margin-top: 0.1rem;
}

.editor-privacy strong {
  display: block;
  font-size: 0.75rem;
  line-height: 1.5;
  font-weight: 600;
}

.editor-privacy p {
  margin: 0.4rem 0 0;
  color: var(--studio-muted);
  font-size: 0.75rem;
  line-height: 1.7;
}

.upload-group {
  margin-bottom: 1rem;
}

.upload-tile {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  min-height: 9rem;
  border: 1px dashed var(--studio-muted);
  border-radius: 10px;
  padding: 1.1rem;
  text-align: center;
  cursor: pointer;
  background: var(--studio-bg);
}

.upload-tile:hover,
.upload-tile:focus-within {
  border-color: var(--studio-accent);
  background: var(--studio-accent-soft);
}

.upload-tile:focus-within {
  outline: 3px solid var(--studio-accent);
  outline-offset: 3px;
}

.upload-tile>.studio-icon {
  color: var(--studio-accent);
  margin-block: 0.1rem 0.3rem;
}

.upload-tile strong {
  font-size: 0.8rem;
  line-height: 1.5;
  max-width: 100%;
  overflow-wrap: anywhere;
  font-weight: 600;
}

.upload-tile>span {
  font-size: 0.75rem;
  color: var(--studio-muted);
}

.upload-tile input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.upload-tile.chosen {
  border-style: solid;
  border-color: var(--studio-success);
}

.upload-tile.chosen>.studio-icon {
  color: var(--studio-success);
}

.image-tile {
  min-height: 7rem;
}

.remove-file {
  min-height: 2.75rem;
  padding: 0.4rem 0;
  background: none;
  border: 0;
  color: var(--studio-muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  font-size: 0.75rem;
  cursor: pointer;
}

.existing-file {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--studio-success);
  font-size: 0.75rem;
}

.existing-file .studio-icon {
  width: 0.8rem;
  height: 0.8rem;
}

.youtube-field {
  margin-top: 1.5rem;
  margin-bottom: 0;
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1rem 1.75rem;
  border-top: 1px solid var(--studio-line);
  background: var(--studio-bg);
}

.save-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: auto;
  color: var(--studio-muted);
  font-size: 0.75rem;
}

.save-hint .studio-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.editor-button {
  min-height: 2.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  border: 1px solid var(--studio-line);
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.cancel-button {
  background: var(--studio-raised);
  color: var(--studio-text);
}

.save-button {
  background: var(--studio-accent);
  color: var(--studio-bg);
  border-color: var(--studio-accent);
}

.editor-button:hover {
  filter: brightness(1.1);
}

button:disabled,
fieldset:disabled {
  opacity: 0.6;
}

button:disabled {
  cursor: wait;
}

.editor-error {
  margin-top: 1.5rem;
  padding: 1rem;
  border: 1px solid var(--studio-warning);
  border-radius: 9px;
  color: var(--studio-warning);
}

.editor-error strong {
  font-size: 0.85rem;
}

.editor-error p {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
}

:global(body:has(.figure-editor[open])) {
  overflow: hidden;
}

@media (max-width: 700px) {
  .figure-editor {
    width: 100%;
    height: 100dvh;
    max-height: 100dvh;
    margin: 0;
    border: 0;
    border-radius: 0;
  }

  .editor-form {
    height: 100dvh;
    max-height: 100dvh;
  }

  .editor-header {
    padding: calc(1rem + env(safe-area-inset-top)) 1.25rem 1rem;
  }

  .editor-header h2 {
    font-size: 1.35rem;
  }

  .editor-body {
    flex: 1;
    padding: 1.25rem;
  }

  .editor-fields {
    grid-template-columns: 1fr;
    gap: 1.75rem;
  }

  .media-section {
    border-left: 0;
    border-top: 1px solid var(--studio-line);
    padding: 1.5rem 0 0;
  }

  .editor-privacy {
    margin-top: 1.5rem;
  }

  .editor-footer {
    padding: 1rem 1.25rem calc(1rem + env(safe-area-inset-bottom));
    gap: 0.65rem;
  }

  .save-hint {
    display: none;
  }

  .editor-button {
    flex: 1;
  }
}
</style>
