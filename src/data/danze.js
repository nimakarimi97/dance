import bachata from './bachata.json'
import salsa from './salsa.json'
import { onMounted, shallowRef, watch } from 'vue'
import { isLoggedIn } from '../lib/auth.js'
import { listFigures } from '../lib/figures.js'

const danceData = [salsa, bachata]

export const dances = Object.fromEntries(
  danceData.map(({ id, nome, descrizione, stili }) => [id, { id, nome, descrizione, stili }]),
)

export const figures = shallowRef([])
const loading = shallowRef(false)
const error = shallowRef('')
let generation = 0

watch(isLoggedIn, loggedIn => {
  if (loggedIn) return
  generation++
  figures.value = []
  error.value = ''
  loading.value = false
}, { flush: 'sync' })

export async function refreshFigures() {
  const request = ++generation
  figures.value = []
  error.value = ''
  loading.value = true
  try {
    const result = await listFigures()
    if (request === generation && isLoggedIn.value) figures.value = result
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
