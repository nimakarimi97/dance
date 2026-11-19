<script setup>
import { gsap } from 'gsap'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { findDance, getFiguresForDance, useFigureCatalog } from '../data/danze.js'
import { canAnimate } from '../lib/motion.js'

const props = defineProps({ danza: { type: String, required: true } })
const route = useRoute()
const router = useRouter()
const { loading, error, retry } = useFigureCatalog()

const dance = computed(() => findDance(props.danza))
const danceFigures = computed(() => getFiguresForDance(props.danza))

const activeStyle = computed(() => (typeof route.query.stile === 'string' ? route.query.stile : ''))
const searchText = ref(typeof route.query.q === 'string' ? route.query.q : '')
const hasFilters = computed(() => Boolean(activeStyle.value || searchText.value.trim()))

function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

const filteredFigures = computed(() => {
  const query = normalize(searchText.value)
  return danceFigures.value.filter((figure) => {
    const matchesStyle = !activeStyle.value || figure.stili.includes(activeStyle.value)
    const matchesText = !query || normalize(figure.nome).includes(query)
    return matchesStyle && matchesText
  })
})

const countLabel = computed(() => {
  const n = filteredFigures.value.length
  return `${n} ${n === 1 ? 'figura' : 'figure'}`
})

function styleName(id) {
  return dance.value?.stili.find((style) => style.id === id)?.nome
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
  updateQuery({ stile: undefined, q: undefined })
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
          <span class="visually-hidden">Cerca una figura</span>
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
          <RouterLink :to="{ name: 'figura', params: { figura: figure.id } }" class="figura-card">
            <span class="figura-nome">{{ figure.nome }}</span>
            <span class="figura-stili">
              <span v-for="styleId in figure.stili" :key="styleId" class="tag">{{ styleName(styleId) }}</span>
            </span>
            <span class="figura-stato" :class="{ ready: figure.youtubeId || figure.videoFileId }">
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
  background: linear-gradient(90deg, #fb7185, #a5b4fc);
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
  position: sticky;
  top: calc(3.75rem + env(safe-area-inset-top));
  z-index: 5;
  display: grid;
  gap: 0.75rem;
  margin-inline: -1rem;
  padding: 0.75rem 1rem;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}

.stili {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.stili .chip {
  flex: none;
}

.search input {
  width: 100%;
  min-height: 3rem;
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--ink-2);
  color: var(--text);
  font-size: 1rem;
}

.search input:focus {
  border-color: var(--accent-text);
}

.search input::placeholder {
  color: var(--muted);
}

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
  border-radius: var(--radius);
  border-left: 6px solid var(--accent-text);
  text-decoration: none;
  background: var(--ink-2);
  transition:
    background-color 0.2s,
    transform 0.2s;
}

.figura-card:hover {
  background: var(--ink-3);
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
    padding-inline: 0;
    top: 3.75rem;
  }
}
</style>
