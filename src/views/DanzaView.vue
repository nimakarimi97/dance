<script setup>
import { gsap } from 'gsap'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { findDance, getFiguresForDance } from '../data/danze.js'

const props = defineProps({ danza: { type: String, required: true } })
const route = useRoute()
const router = useRouter()

const dance = computed(() => findDance(props.danza))
const danceFigures = computed(() => getFiguresForDance(props.danza))

const activeStyle = computed(() => (typeof route.query.stile === 'string' ? route.query.stile : ''))
const searchText = ref(typeof route.query.q === 'string' ? route.query.q : '')

function normalize(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

const filteredFigures = computed(() => {
  const query = normalize(searchText.value)
  return danceFigures.value.filter((figure) => {
    const matchesStyle = !activeStyle.value || figure.stili.includes(activeStyle.value)
    const matchesText = !query || normalize(figure.nome).includes(query)
    return matchesStyle && matchesText
  })
})

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

const root = ref(null)
let animationContext = null

function animateGrid() {
  gsap.fromTo(
    '.figura-card',
    { opacity: 0, y: 30, scale: 0.96 },
    { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', stagger: 0.05, clearProps: 'transform' },
  )
}

onMounted(async () => {
  await nextTick()
  animationContext = gsap.context(() => {
    gsap.from('.danza-header > *', { opacity: 0, y: 24, duration: 0.7, stagger: 0.1, ease: 'power3.out' })
    gsap.from('.stile-chip', { opacity: 0, x: -12, duration: 0.4, stagger: 0.06, delay: 0.3 })
    animateGrid()
  }, root.value)
})

watch(filteredFigures, async () => {
  await nextTick()
  animateGrid()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  animationContext?.revert()
})
</script>

<template>
  <main ref="root" class="danza container">
    <template v-if="dance">
      <header class="danza-header">
        <RouterLink to="/" class="back">← Tutte le danze</RouterLink>
        <h1 class="danza-title script">{{ dance.nome }}</h1>
        <p class="danza-desc">{{ dance.descrizione }}</p>
      </header>

      <div class="controls">
        <div class="stili" role="group" aria-label="Filtra per stile">
          <button
            v-for="style in dance.stili"
            :key="style.id"
            type="button"
            class="chip stile-chip"
            :class="{ active: activeStyle === style.id }"
            :aria-pressed="activeStyle === style.id"
            @click="selectStyle(style.id)"
          >
            {{ style.nome }}
          </button>
        </div>

        <label class="search">
          <span class="visually-hidden">Cerca figura</span>
          <input
            v-model="searchText"
            type="search"
            placeholder="Cerca una figura…"
            @input="onSearch"
          >
        </label>
      </div>

      <p class="count">{{ filteredFigures.length }} {{ filteredFigures.length === 1 ? 'figura' : 'figure' }}</p>

      <ul v-if="filteredFigures.length" class="grid">
        <li v-for="figure in filteredFigures" :key="figure.id">
          <RouterLink :to="{ name: 'figura', params: { figura: figure.id } }" class="figura-card">
            <span class="figura-nome">{{ figure.nome }}</span>
            <span class="figura-stili">
              <span v-for="styleId in figure.stili" :key="styleId" class="mini-tag">{{ dance.stili.find(style => style.id === styleId)?.nome }}</span>
            </span>
            <span class="figura-stato">
              {{ figure.youtubeId ? '▶ Guarda il video' : 'Video in arrivo' }}
            </span>
          </RouterLink>
        </li>
      </ul>
      <p v-else class="vuoto">Nessuna figura trovata con questi filtri.</p>
    </template>

    <section v-else class="vuoto">
      <h1 class="script">Danza non trovata</h1>
      <RouterLink to="/" class="back">← Torna alla home</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.danza { padding: clamp(2rem, 5vw, 3.5rem) 0 2rem; }

.back {
  color: var(--muted);
  text-decoration: none;
  font-size: 0.95rem;
}
.back:hover { color: var(--light); }

.danza-header { margin-bottom: 2rem; }
.danza-title {
  margin-top: 0.75rem;
  font-size: clamp(4rem, 10vw, 7rem);
  font-weight: 700;
  background: linear-gradient(90deg, #fb7185, #a5b4fc);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.danza-desc { margin: 0.75rem 0 0; color: #cbd5e1; max-width: 60ch; }

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}
.stili { display: flex; flex-wrap: wrap; gap: 0.5rem; }

.search { flex: 0 1 320px; }
.search input {
  width: 100%;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(15, 23, 42, 0.8);
  color: var(--light);
}
.search input::placeholder { color: var(--muted); }

.count { color: var(--muted); font-size: 0.9rem; margin: 0 0 1rem; }

.grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.figura-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  height: 100%;
  min-height: 160px;
  padding: 1.25rem;
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--light);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.25s, border-color 0.25s, background 0.25s;
}
.figura-card:hover {
  transform: translateY(-4px);
  border-color: var(--amber);
  background: rgba(255, 255, 255, 0.08);
}

.figura-nome {
  font-family: 'Caveat', cursive;
  font-size: 2.2rem;
  font-weight: 700;
  line-height: 1;
}
.figura-stili { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: auto; }
.mini-tag {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: rgba(38, 41, 225, 0.35);
}
.figura-stato { font-size: 0.85rem; color: var(--amber); }

.vuoto { text-align: center; color: var(--muted); padding: 3rem 0; }
.vuoto h1 { color: var(--light); font-size: 3rem; margin-bottom: 1rem; }

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
