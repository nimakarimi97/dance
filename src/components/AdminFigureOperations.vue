<script setup>
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { DANCE_STYLES, DIFFICULTIES, validateFigureRows } from '../../shared/figure-schema.js'
import { applyFigureRows, listFigureAudit, listRoleAudit } from '../lib/admin-api.js'

const props = defineProps({ figures: { type: Array, default: () => [] } })
const emit = defineEmits(['changed'])
const mode = shallowRef('import')
const json = shallowRef('')
const selected = shallowRef([])
const difficulty = shallowRef('beginner')
const draft = shallowRef(null)
const rowErrors = shallowRef([])
const confirmed = shallowRef(false)
const busy = shallowRef(false)
const message = shallowRef('')
const error = shallowRef('')
const errorSummary = useTemplateRef('error-summary')
const auditKind = shallowRef('figure')
const audit = shallowRef(null)
const nextCursor = shallowRef(null)
const auditBusy = shallowRef(false)
const auditError = shallowRef('')
const labels = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato' }
const selectionRows = computed(() => props.figures.filter(figure => selected.value.includes(figure.id || figure.$id)).map(figure => ({
  id: figure.id || figure.$id,
  data: { difficulty: difficulty.value || null },
  ...(figure.$updatedAt ? { expectedUpdatedAt: figure.$updatedAt } : {}),
})))
const example = JSON.stringify([{ data: { nome: 'Enchufla', danza: 'salsa', stili: DANCE_STYLES.salsa.slice(0, 1), difficulty: 'beginner', aliases: [], description: '' } }], null, 2)

function invalidatePreview() {
  draft.value = null
  confirmed.value = false
}
function invalidate() {
  invalidatePreview()
  rowErrors.value = []
  message.value = ''
}
watch([json, mode, selected, difficulty], invalidate)
watch(() => props.figures, invalidatePreview)
watch(auditKind, () => { audit.value = null; nextCursor.value = null; auditError.value = '' })

async function reportError(text) {
  error.value = text
  await nextTick()
  errorSummary.value?.focus()
}

async function readFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  invalidate()
  error.value = ''
  try {
    if (file.size > 1_000_000) throw new Error('Il file JSON deve essere inferiore a 1 MB.')
    json.value = await file.text()
    mode.value = 'import'
  } catch (cause) { await reportError(cause.message || 'Impossibile leggere il file.') }
  event.target.value = ''
}

async function preview() {
  invalidate()
  error.value = ''
  try {
    const input = mode.value === 'import' ? JSON.parse(json.value) : selectionRows.value
    const result = validateFigureRows(input)
    rowErrors.value = result.errors
    if (result.errors.length) return await reportError('Correggi gli errori prima di confermare.')
    draft.value = result.rows
  } catch (cause) { await reportError(cause instanceof SyntaxError ? 'JSON non valido: controlla parentesi, virgole e virgolette.' : cause.message) }
}

async function apply() {
  if (!draft.value || !confirmed.value || busy.value) return
  busy.value = true
  error.value = ''
  const rows = draft.value
  try {
    const result = await applyFigureRows(rows)
    const count = rows.length
    draft.value = null
    confirmed.value = false
    message.value = `${count} ${count === 1 ? 'figura salvata' : 'figure salvate'} con audit.`
    emit('changed', result.figures)
    audit.value = null
    nextCursor.value = null
  } catch (cause) {
    rowErrors.value = cause.errors || []
    confirmed.value = false
    await reportError(cause.message || 'Salvataggio non confermato. Ricarica prima di riprovare.')
  } finally { busy.value = false }
}

async function loadAudit(more = false) {
  if (auditBusy.value) return
  const kind = auditKind.value
  auditBusy.value = true
  auditError.value = ''
  try {
    const page = await (kind === 'role' ? listRoleAudit : listFigureAudit)({ cursor: more ? nextCursor.value : undefined })
    if (kind !== auditKind.value) return
    audit.value = more ? [...audit.value, ...page.entries] : page.entries
    nextCursor.value = page.nextCursor
  } catch (cause) { if (kind === auditKind.value) auditError.value = cause.message || 'Cronologia non disponibile.' }
  finally { auditBusy.value = false }
}
</script>

<template>
  <section class="figure-operations" aria-labelledby="operations-title" :aria-busy="busy">
    <header class="operations-header">
      <p class="eyebrow">Repertorio · Strumenti amministrativi</p>
      <h2 id="operations-title">Prepara, controlla, conferma</h2>
      <p>Importa o aggiorna fino a 50 figure alla volta. Nessuna modifica prima della conferma.</p>
    </header>
    <p v-if="error" ref="error-summary" class="operation-error" role="alert" tabindex="-1">{{ error }}</p>
    <p v-if="message" role="status" class="operation-status">{{ message }}</p>
    <fieldset class="operations-fields" :disabled="busy">
      <legend class="section-label">1. Prepara il lotto</legend>
      <label class="operation-field">Operazione
        <select v-model="mode">
          <option value="import">Importa JSON</option>
          <option value="edit">Modifica difficoltà in gruppo</option>
        </select>
      </label>
      <div v-if="mode === 'import'" class="import-form">
        <label class="operation-field">File JSON (massimo 1 MB)
          <input type="file" accept=".json,application/json" @change="readFile" />
        </label>
        <label class="operation-field">Righe JSON
          <textarea v-model="json" rows="8" spellcheck="false" aria-describedby="import-help" />
        </label>
        <p id="import-help" class="help">Array di righe { id?, data, expectedUpdatedAt? }. Con un ID si aggiorna una figura esistente; senza ID si crea.</p>
        <details class="format-example"><summary>Esempio di formato</summary><pre>{{ example }}</pre></details>
      </div>
      <div v-else class="bulk-edit">
        <label class="operation-field">Nuova difficoltà
          <select v-model="difficulty">
            <option value="">Non specificata</option>
            <option v-for="level in DIFFICULTIES" :key="level" :value="level">{{ labels[level] }}</option>
          </select>
        </label>
        <p class="help">{{ selected.length }} {{ selected.length === 1 ? 'selezionata' : 'selezionate' }} · massimo 50. Gli altri campi restano invariati.</p>
        <div class="figure-selection" aria-label="Figure da modificare">
          <label v-for="figure in figures" :key="figure.id || figure.$id" class="selection-row">
            <input v-model="selected" type="checkbox" :value="figure.id || figure.$id" />
            <span><strong>{{ figure.nome }}</strong><small>{{ figure.danza }} · {{ labels[figure.difficulty] || 'Difficoltà non specificata' }}</small></span>
          </label>
          <p v-if="!figures.length" class="help">Nessuna figura disponibile.</p>
        </div>
      </div>
      <button class="operation-button" type="button" @click="preview">Controlla anteprima</button>
    </fieldset>
    <ul v-if="rowErrors.length" class="row-errors" aria-label="Errori nelle righe">
      <li v-for="(issue, index) in rowErrors" :key="index">
        <strong>{{ issue.index >= 0 ? `Riga ${issue.index + 1}` : 'Lotto' }} · {{ issue.field }}</strong>: {{ issue.message }}
      </li>
    </ul>
    <section v-if="draft" class="batch-preview" aria-labelledby="preview-title">
      <h3 id="preview-title">2. Controlla {{ draft.length }} {{ draft.length === 1 ? 'figura' : 'figure' }}</h3>
      <ol class="preview-list">
        <li v-for="(row, index) in draft" :key="index">
          <strong>{{ row.id ? 'Aggiorna' : 'Crea' }} · {{ row.data.nome || row.id }}</strong>
          <pre>{{ JSON.stringify(row.data, null, 2) }}</pre>
        </li>
      </ol>
      <label class="confirm-row"><input v-model="confirmed" type="checkbox" :disabled="busy" />Ho verificato tutte le righe e confermo le modifiche.</label>
      <button class="operation-button primary" type="button" :disabled="busy || !confirmed" @click="apply">{{ busy ? 'Salvataggio…' : `Conferma ${draft.length} ${draft.length === 1 ? 'figura' : 'figure'}` }}</button>
    </section>
    <section class="audit-section" aria-labelledby="audit-title">
      <h3 id="audit-title">Cronologia verificabile</h3>
      <p class="help">Operazioni registrate dal server. I ruoli sono visibili solo ai super admin.</p>
      <div class="audit-controls">
        <label class="operation-field">Registro
          <select v-model="auditKind" :disabled="auditBusy">
            <option value="figure">Figure</option>
            <option value="role">Ruoli</option>
          </select>
        </label>
        <button class="operation-button" type="button" :disabled="auditBusy" @click="loadAudit()">{{ auditBusy ? 'Caricamento…' : 'Carica cronologia' }}</button>
      </div>
      <p v-if="auditError" class="operation-error" role="alert">{{ auditError }}</p>
      <p v-if="audit && !audit.length" class="help">Nessuna operazione registrata.</p>
      <ol v-if="audit?.length" class="audit-list">
        <li v-for="entry in audit" :key="entry.$id">
          <strong>{{ entry.action }} · {{ entry.targetId }}</strong>
          <small>{{ entry.actorId }} · {{ entry.status }} · {{ entry.$createdAt }}</small>
          <details><summary>Confronta prima / dopo</summary><pre>Prima: {{ entry.before }}
Dopo: {{ entry.after }}</pre><small>Operazione: {{ entry.operationId }}</small></details>
        </li>
      </ol>
      <button v-if="nextCursor" class="operation-button" type="button" :disabled="auditBusy" @click="loadAudit(true)">Carica altre operazioni</button>
    </section>
  </section>
</template>

<style scoped>
.figure-operations { min-width: 0; padding: 1.25rem; border: 1px solid var(--studio-line); border-radius: 1rem; background: var(--studio-panel); color: var(--studio-text); }
.operations-header { margin-bottom: 1.5rem; }
.operations-header h2 { margin: .25rem 0 .75rem; font-size: 1.4rem; line-height: 1.25; text-wrap: balance; }
.operations-header p, .help { color: var(--studio-muted); line-height: 1.5; }
.eyebrow, .section-label { font-size: .8rem; font-weight: 600; letter-spacing: .03em; }
.operations-fields { display: grid; gap: 1rem; min-width: 0; padding: 0; border: 0; }
.section-label { margin-bottom: 1rem; }
.operation-field { display: grid; gap: .5rem; font-size: .9rem; }
.import-form, .bulk-edit { display: grid; gap: .75rem; }
.operation-field input, .operation-field select, .operation-field textarea { box-sizing: border-box; width: 100%; min-width: 0; min-height: 44px; padding: .75rem; border: 1px solid var(--studio-line); border-radius: .5rem; background: var(--studio-panel-soft); color: inherit; font: inherit; }
.operation-field textarea { resize: vertical; font-family: monospace; }
.operation-button { min-height: 44px; padding: .75rem 1rem; border: 1px solid var(--studio-line); border-radius: .5rem; color: inherit; background: var(--studio-panel-soft); font: inherit; cursor: pointer; justify-self: start; }
.operation-button:hover:not(:disabled) { border-color: var(--studio-accent); }
.operation-button:active:not(:disabled) { transform: scale(.98); }
.operation-button:disabled { opacity: .5; cursor: not-allowed; }
.operation-button.primary { background: var(--studio-accent-soft); color: var(--studio-text); border-color: var(--studio-accent); font-weight: 600; }
.figure-operations :focus-visible { outline: 2px solid var(--studio-accent); outline-offset: 3px; }
.help { font-size: .85rem; margin: .25rem 0; }
.figure-selection { max-height: 20rem; overflow: auto; border-block: 1px solid var(--studio-line); }
.selection-row, .confirm-row { display: flex; align-items: center; gap: .75rem; min-height: 44px; padding: .5rem 0; cursor: pointer; }
.selection-row input, .confirm-row input { flex-shrink: 0; width: 1.25rem; height: 1.25rem; accent-color: var(--studio-accent); }
.selection-row span { min-width: 0; overflow-wrap: anywhere; }
.selection-row small, .audit-list small { display: block; color: var(--studio-muted); margin-top: .25rem; }
.batch-preview, .audit-section { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--studio-line); }
.batch-preview h3, .audit-section h3 { margin: 0 0 1rem; font-size: 1.1rem; }
.preview-list, .audit-list { padding-left: 1.25rem; display: grid; gap: 1rem; }
.preview-list { max-height: 24rem; overflow: auto; }
.figure-operations pre { max-width: 100%; white-space: pre-wrap; overflow-wrap: anywhere; font-size: .8rem; line-height: 1.5; color: var(--studio-muted); }
.figure-operations summary { min-height: 44px; display: list-item; align-content: center; cursor: pointer; }
.audit-controls { display: flex; gap: .75rem; align-items: end; flex-wrap: wrap; }
.audit-controls .operation-field { flex: 1; min-width: 8rem; }
.audit-list li { overflow-wrap: anywhere; }
.operation-error, .row-errors { color: var(--studio-warning); line-height: 1.5; }
.operation-status { color: var(--studio-accent); }
.row-errors { padding-left: 1.25rem; }
@media (max-width: 600px) {
  .figure-operations { padding: 1rem; }
  .operation-button { width: 100%; }
  .audit-controls { display: grid; }
}
</style>
