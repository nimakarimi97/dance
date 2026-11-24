<script setup>
import { gsap } from 'gsap'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { findDance, getFiguresForDance, useFigureCatalog } from '../data/danze.js'
import { currentUser } from '../lib/auth.js'
import { ANALYTICS_EVENTS } from '../lib/analytics.js'
import { recordAnalyticsEvent } from '../lib/figures.js'
import { canAnimate } from '../lib/motion.js'
import { difficultyLabels, filterCatalog } from '../lib/catalog.js'
import StudioIcon from '../components/StudioIcon.vue'

const props = defineProps({ danza: { type: String, required: true } })
const route = useRoute()
const router = useRouter()
const { loading, error, retry } = useFigureCatalog()

const dance = computed(() => findDance(props.danza))
const danceFigures = computed(() => getFiguresForDance(props.danza))

const activeStyle = computed(() => (typeof route.query.stile === 'string' ? route.query.stile : ''))
const searchText = ref(typeof route.query.q === 'string' ? route.query.q : '')
const difficulty = computed(() => typeof route.query.difficolta === 'string' ? route.query.difficolta : '')
const videoFilter = computed(() => typeof route.query.video === 'string' ? route.query.video : 'all')
const sort = computed(() => typeof route.query.ordine === 'string' ? route.query.ordine : 'catalog')
const hasFilters = computed(() => Boolean(activeStyle.value || searchText.value.trim() || difficulty.value || videoFilter.value !== 'all' || sort.value !== 'catalog'))

const filteredFigures = computed(() => filterCatalog(danceFigures.value, {
  search: searchText.value, style: activeStyle.value, difficulty: difficulty.value, video: videoFilter.value, sort: sort.value,
}))

const countLabel = computed(() => {
  const n = filteredFigures.value.length
  return `${n} ${n === 1 ? 'figura' : 'figure'}`
})

function styleName(id) {
  return dance.value?.stili.find((style) => style.id === id)?.nome
}

function trackFigureClick(figureId) {
  const userId = currentUser.value?.$id
  if (!userId) return
  recordAnalyticsEvent({
    eventType: ANALYTICS_EVENTS.FIGURE_CARD_CLICK,
    figureId,
    eventTarget: figureId,
    userId,
  })
}

function updateQuery(patch) {
  const query = { ...route.query, ...patch }
  Object.keys(query).forEach((k) => {
    if (!query[k]) delete query[k]
  })
  router.replace({ query })
}

function selectStyle(id) {
  updateQuery({ stile: activeStyle.value === id ? undefined : id })
}

let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => updateQuery({ q: searchText.value.trim() || undefined }), 250)
}

function resetFilters() {
  clearTimeout(searchTimer)
  searchText.value = ''
  updateQuery({ stile: undefined, q: undefined, difficolta: undefined, video: undefined, ordine: undefined })
}

// The same component instance is reused when switching dance, so resync the search box.
watch(
  () => props.danza,
  () => {
    clearTimeout(searchTimer)
    searchText.value = typeof route.query.q === 'string' ? route.query.q : ''
  },
)

const root = ref(null)
let animationContext = null

function animateGrid() {
  if (!canAnimate() || !root.value?.querySelector('.figura-card')) return
  gsap.fromTo(
    '.figura-card',
    { opacity: 0, y: 30, scale: 0.96 },
    { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', stagger: 0.05, clearProps: 'transform,opacity' },
  )
}

onMounted(async () => {
  await nextTick()
  if (!canAnimate()) return
  animationContext = gsap.context(() => {
    gsap.from('.danza-header > *', { opacity: 0, y: 24, duration: 0.7, stagger: 0.1, ease: 'power3.out' })
    gsap.from('.controls > *', {
      opacity: 0,
      y: 16,
      duration: 0.5,
      stagger: 0.08,
      delay: 0.25,
      clearProps: 'transform,opacity',
    })
    animateGrid()
  }, root.value)
})

// Replay the entrance only when the visible set changes, not on every keystroke.
watch(
  () => filteredFigures.value.map((figure) => figure.id).join(),
  async () => {
    await nextTick()
    animateGrid()
  },
)

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  animationContext?.revert()
})
</script>

<template>
  <main ref="root" class="danza container" :data-dance="danza">
    <template v-if="dance">
      <header class="danza-header">
        <h1 class="danza-title script">{{ dance.nome }}</h1>
        <p class="danza-desc">{{ dance.descrizione }}</p>
      </header>

      <div class="controls">
        <label class="search">
          <span class="search-label"><StudioIcon name="search" /> Cerca una figura</span>
          <input v-model="searchText" type="search" name="figura" autocomplete="off" enterkeyhint="search"
            placeholder="Cerca, ad esempio Enchufla…" @input="onSearch" />
        </label>

        <div class="stili" role="group" aria-label="Filtra per stile">
          <button v-for="style in dance.stili" :key="style.id" type="button" class="chip"
            :class="{ active: activeStyle === style.id }" :aria-pressed="activeStyle === style.id"
            @click="selectStyle(style.id)">
            {{ style.nome }}
          </button>
        </div>
      </div>

      <details class="advanced-filters">
        <summary><StudioIcon name="filters" />Filtri e ordine</summary>
        <div class="extra-filters">
          <label>Difficoltà
            <select :value="difficulty" @change="updateQuery({ difficolta: $event.target.value })">
              <option value="">Tutte</option>
              <option v-for="(label, value) in difficultyLabels" :key="value" :value="value">{{ label }}</option>
              <option value="unset">Non indicata</option>
            </select>
          </label>
          <label>Video
            <select :value="videoFilter" @change="updateQuery({ video: $event.target.value })">
              <option value="all">Tutti</option>
              <option value="ready">Con video</option>
              <option value="missing">Senza video</option>
            </select>
          </label>
          <label>Ordina
            <select :value="sort" @change="updateQuery({ ordine: $event.target.value })">
              <option value="catalog">Catalogo</option>
              <option value="name">Nome A–Z</option>
              <option value="difficulty">Difficoltà crescente</option>
              <option value="recent">Aggiornate di recente</option>
            </select>
          </label>
        </div>
      </details>

      <p v-if="loading" class="count" role="status">
        Caricamento figure…
      </p>
      <section v-else-if="error" class="state" role="alert">
        <p>{{ error }}</p>
        <button type="button" class="btn" @click="retry">
          Riprova
        </button>
      </section>
      <p v-else class="count" role="status">
        {{ countLabel }}
      </p>

      <ul v-if="!loading && !error && filteredFigures.length" class="grid">
        <li v-for="figure in filteredFigures" :key="figure.id">
          <RouterLink :to="{ name: 'figura', params: { figura: figure.id } }" class="figura-card"
            @click="trackFigureClick(figure.id)">
            <span class="figura-nome">{{ figure.nome }}</span>
            <span class="tag">{{ difficultyLabels[figure.difficulty] || 'Difficoltà non indicata' }}</span>
            <span class="figura-stili">
              <span v-for="styleId in figure.stili" :key="styleId" class="tag">{{ styleName(styleId) }}</span>
            </span>
            <span class="figura-stato" :class="{ ready: figure.youtubeId || figure.videoFileId }">
              <StudioIcon :name="figure.youtubeId || figure.videoFileId ? 'video' : 'clock'" />
              {{ figure.youtubeId || figure.videoFileId ? 'Guarda il video' : 'Video in arrivo' }}
            </span>
          </RouterLink>
        </li>
      </ul>

      <section v-else-if="!loading && !error" class="state">
        <h2 class="script">Nessuna figura trovata</h2>
        <p>Prova con un altro nome oppure togli i filtri per vedere tutte le figure di {{ dance.nome }}.</p>
        <button v-if="hasFilters" type="button" class="btn btn-primary" @click="resetFilters">
          Mostra tutte le figure
        </button>
      </section>
    </template>

    <section v-else class="state">
      <h1 class="script">Danza non trovata</h1>
      <p>Questa danza non esiste. Scegline una dalla home.</p>
      <RouterLink to="/" class="btn btn-primary">Torna alla home</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.advanced-filters { margin-block: 0.75rem; }
.advanced-filters summary { display: flex; align-items: center; gap: 0.5rem; width: fit-content; min-height: 44px; font-weight: 600; }
.advanced-filters summary::after { content: '+'; margin-left: 0.5rem; }
.advanced-filters[open] summary::after { content: '-'; }
.extra-filters { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-block: 1rem; }
.extra-filters label { flex: 1 1 9rem; display: grid; gap: 0.4rem; }
.extra-filters select { width: 100%; min-width: 0; min-height: 3rem; padding: 0.6rem; font: inherit; background: var(--ink-2); color: var(--text); border: 1px solid var(--input-line); border-radius: 0.6rem; }
.danza {
  padding: clamp(1.5rem, 5vw, 3rem) 0 1rem;
}

.danza-header {
  margin-bottom: 1.5rem;
}

.danza-title {
  font-size: clamp(4.5rem, 16vw, 7.5rem);
  font-weight: 700;
  line-height: 1;
  padding-bottom: 0.1em;
  background: var(--grad-text);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.danza-desc {
  margin: 0.5rem 0 0;
  color: var(--muted);
  font-size: 1.1rem;
  max-width: 56ch;
}

.controls {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 1rem;
  background: var(--ink-2);
  border: 1px solid var(--line);
}

.stili {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stili .chip {
  flex: none;
}

.search input {
  width: 100%;
  min-height: 3rem;
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  border: 1px solid var(--input-line);
  background: var(--input-bg);
  color: var(--text);
  font-size: 1rem;
}

.search input:focus {
  border-color: var(--accent-text);
}

.search input::placeholder {
  color: var(--muted);
}
.search-label { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-weight: 600; }

.count {
  color: var(--muted);
  font-size: 0.95rem;
  margin: 1rem 0 0.75rem;
}

.grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr));
  gap: 0.75rem;
}

.figura-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  height: 100%;
  min-height: 150px;
  padding: 1.1rem 1.25rem;
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent-text);
  border-radius: 0.9rem;
  text-decoration: none;
  background: var(--ink-2);
  transition:
    background-color 0.2s,
    transform 0.2s;
}

.figura-card:hover {
  background: var(--ink-3);
  border-color: var(--accent-text);
}

.figura-card > .tag {
  align-self: flex-start;
}

.figura-card:active {
  transform: scale(0.98);
}

.figura-nome {
  font-family: 'Caveat', cursive;
  font-size: 2.4rem;
  font-weight: 700;
  line-height: 1;
  overflow-wrap: anywhere;
}

.figura-stili {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: auto;
}

.figura-stato {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: var(--muted);
}

.figura-stato.ready {
  color: var(--gold);
  font-weight: 700;
}

@media (min-width: 760px) {
  .controls {
    grid-template-columns: minmax(0, 340px) 1fr;
    align-items: center;
    margin-inline: 0;
    padding-inline: 1rem;
  }
}
</style>
