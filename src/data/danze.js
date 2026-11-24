import bachata from './bachata.json'
import salsa from './salsa.json'
import { computed, onMounted, shallowRef, watch } from 'vue'
import { isLoggedIn } from '../lib/auth.js'
import { listFigures } from '../lib/figures.js'
import { addPreviewFigure, canOpenPreviewFigure, readPreviewFigures } from '../lib/guestPreview.js'
import { GUEST_PREVIEW_LIMIT, isFeatureEnabled } from '../config/features.js'

const danceData = [salsa, bachata]

export const dances = Object.fromEntries(
  danceData.map(({ id, nome, descrizione, stili }) => [id, { id, nome, descrizione, stili }]),
)

const PREVIEW_STORAGE_KEY = 'dance:guest-preview-figures'

export const figures = shallowRef([])
const loading = shallowRef(false)
const error = shallowRef('')
let generation = 0

export const canReadFigures = computed(() =>
  isFeatureEnabled('publicContent') || isLoggedIn.value || isFeatureEnabled('guestPreview'),
)
export const guestPreviewActive = computed(() =>
  isFeatureEnabled('guestPreview') && !isFeatureEnabled('publicContent') && !isLoggedIn.value,
)

function readStoredPreviewFigures() {
  try {
    return readPreviewFigures(localStorage.getItem(PREVIEW_STORAGE_KEY), GUEST_PREVIEW_LIMIT)
  } catch {
    return []
  }
}

const viewedPreviewFigures = shallowRef(readStoredPreviewFigures())
export const guestPreviewRemaining = computed(() => GUEST_PREVIEW_LIMIT - viewedPreviewFigures.value.length)

export function isFigureLocked(figureId) {
  return guestPreviewActive.value && !canOpenPreviewFigure(viewedPreviewFigures.value, figureId, GUEST_PREVIEW_LIMIT)
}

export function registerPreviewFigure(figureId) {
  if (!guestPreviewActive.value) return
  const next = addPreviewFigure(viewedPreviewFigures.value, figureId, GUEST_PREVIEW_LIMIT)
  if (next === viewedPreviewFigures.value) return
  viewedPreviewFigures.value = next
  try {
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage can be unavailable (private mode); the preview still applies for this page session.
  }
}

watch(isLoggedIn, loggedIn => {
  if (loggedIn) return
  generation++
  figures.value = []
  error.value = ''
  loading.value = false
  if (isFeatureEnabled('guestPreview')) refreshFigures()
}, { flush: 'sync' })

export async function refreshFigures() {
  const request = ++generation
  figures.value = []
  error.value = ''
  loading.value = true
  try {
    const result = await listFigures()
    if (request === generation && canReadFigures.value) figures.value = result
  } catch (cause) {
    if (request === generation) error.value = cause.message || 'Impossibile caricare le figure. Riprova.'
  } finally {
    if (request === generation) loading.value = false
  }
}

export function useFigureCatalog() {
  onMounted(refreshFigures)
  return { loading, error, retry: refreshFigures }
}

export function findDance(id) {
  return dances[id] ?? null
}

export function getFiguresForDance(danceId) {
  return figures.value.filter(figure => figure.danza === danceId)
}

export function findFigure(id) {
  return figures.value.find(figure => figure.id === id) ?? null
}
