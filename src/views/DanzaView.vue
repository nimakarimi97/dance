<script setup>
import { gsap } from 'gsap'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { figurePerDanza, trovaDanza } from '../data/danze.js'

const props = defineProps({ danza: { type: String, required: true } })
const route = useRoute()
const router = useRouter()

const danza = computed(() => trovaDanza(props.danza))
const figureDanza = computed(() => figurePerDanza(props.danza))

const stileAttivo = computed(() => (typeof route.query.stile === 'string' ? route.query.stile : ''))
const testoRicerca = ref(typeof route.query.q === 'string' ? route.query.q : '')

function normalizza(s) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

const figureFiltrate = computed(() => {
  const q = normalizza(testoRicerca.value)
  return figureDanza.value.filter((f) => {
    const okStile = !stileAttivo.value || f.stili.includes(stileAttivo.value)
    const okTesto = !q || normalizza(f.nome).includes(q)
    return okStile && okTesto
  })
})

function aggiornaQuery(patch) {
  const query = { ...route.query, ...patch }
  Object.keys(query).forEach((k) => {
    if (!query[k]) delete query[k]
  })
  router.replace({ query })
}

function selezionaStile(id) {
  aggiornaQuery({ stile: stileAttivo.value === id ? undefined : id })
}

let timerRicerca = null
function onRicerca() {
  clearTimeout(timerRicerca)
  timerRicerca = setTimeout(() => aggiornaQuery({ q: testoRicerca.value.trim() || undefined }), 250)
}

const root = ref(null)
let ctx = null

function animaGriglia() {
  gsap.fromTo(
    '.figura-card',
    { opacity: 0, y: 30, scale: 0.96 },
    { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', stagger: 0.05, clearProps: 'transform' },
  )
}

onMounted(async () => {
  await nextTick()
  ctx = gsap.context(() => {
    gsap.from('.danza-header > *', { opacity: 0, y: 24, duration: 0.7, stagger: 0.1, ease: 'power3.out' })
    gsap.from('.stile-chip', { opacity: 0, x: -12, duration: 0.4, stagger: 0.06, delay: 0.3 })
    animaGriglia()
  }, root.value)
})

watch(figureFiltrate, async () => {
  await nextTick()
  animaGriglia()
})

onBeforeUnmount(() => {
  clearTimeout(timerRicerca)
  ctx?.revert()
})
</script>

<template>
  <main ref="root" class="danza container">
    <template v-if="danza">
      <header class="danza-header">
        <RouterLink to="/" class="back">← Tutte le danze</RouterLink>
        <h1 class="danza-title script">{{ danza.nome }}</h1>
        <p class="danza-desc">{{ danza.descrizione }}</p>
      </header>

      <div class="controls">
        <div class="stili" role="group" aria-label="Filtra per stile">
          <button
            v-for="stile in danza.stili"
            :key="stile.id"
            type="button"
            class="chip stile-chip"
            :class="{ active: stileAttivo === stile.id }"
            :aria-pressed="stileAttivo === stile.id"
            @click="selezionaStile(stile.id)"
          >
            {{ stile.nome }}
          </button>
        </div>

        <label class="search">
          <span class="visually-hidden">Cerca figura</span>
          <input
            v-model="testoRicerca"
            type="search"
            placeholder="Cerca una figura…"
            @input="onRicerca"
          >
        </label>
      </div>

      <p class="count">{{ figureFiltrate.length }} {{ figureFiltrate.length === 1 ? 'figura' : 'figure' }}</p>

      <ul v-if="figureFiltrate.length" class="grid">
        <li v-for="figura in figureFiltrate" :key="figura.id">
          <RouterLink :to="{ name: 'figura', params: { figura: figura.id } }" class="figura-card">
            <span class="figura-nome">{{ figura.nome }}</span>
            <span class="figura-stili">
              <span v-for="s in figura.stili" :key="s" class="mini-tag">{{ danza.stili.find(x => x.id === s)?.nome }}</span>
            </span>
            <span class="figura-stato">
              {{ figura.youtubeId ? '▶ Guarda il video' : 'Video in arrivo' }}
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
