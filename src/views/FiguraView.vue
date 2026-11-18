<script setup>
import { gsap } from 'gsap'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { figurePerDanza, trovaDanza, trovaFigura } from '../data/danze.js'

const props = defineProps({ figura: { type: String, required: true } })

const figuraCorrente = computed(() => trovaFigura(props.figura))
const danza = computed(() => (figuraCorrente.value ? trovaDanza(figuraCorrente.value.danza) : null))
const stiliFigura = computed(() =>
  figuraCorrente.value && danza.value
    ? figuraCorrente.value.stili.map(id => danza.value.stili.find(s => s.id === id)).filter(Boolean)
    : [],
)

const altreFigure = computed(() => (figuraCorrente.value ? figurePerDanza(figuraCorrente.value.danza) : []))
const indice = computed(() => altreFigure.value.findIndex(f => f.id === props.figura))
const precedente = computed(() => (indice.value > 0 ? altreFigure.value[indice.value - 1] : null))
const successiva = computed(() => (indice.value >= 0 && indice.value < altreFigure.value.length - 1 ? altreFigure.value[indice.value + 1] : null))

const urlVideo = computed(() => {
  const id = figuraCorrente.value?.youtubeId
  return id ? `https://www.youtube-nocookie.com/embed/${id}?hl=it&cc_lang_pref=it&rel=0&modestbranding=1` : null
})

const root = ref(null)
let ctx = null

function anima() {
  gsap.fromTo('.player', { opacity: 0, y: 30, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' })
  gsap.from('.fig-title > *', { opacity: 0, y: 20, duration: 0.6, stagger: 0.08, delay: 0.2 })
}

onMounted(async () => {
  await nextTick()
  ctx = gsap.context(anima, root.value)
})

watch(() => props.figura, async () => {
  await nextTick()
  anima()
})

onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <main ref="root" class="figura container">
    <template v-if="figuraCorrente && danza">
      <nav class="crumbs" aria-label="Percorso">
        <RouterLink to="/" class="back">Home</RouterLink>
        <span>/</span>
        <RouterLink :to="{ name: 'danza', params: { danza: danza.id } }" class="back">{{ danza.nome }}</RouterLink>
      </nav>

      <div class="player" :class="{ 'player-placeholder': !urlVideo }">
        <iframe
          v-if="urlVideo"
          :src="urlVideo"
          :title="`Video: ${figuraCorrente.nome}`"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        />
        <div v-else class="placeholder-body">
          <span class="placeholder-icon">🎬</span>
          <p class="script">Video in arrivo</p>
        </div>
      </div>

      <header class="fig-title">
        <h1 class="script">{{ figuraCorrente.nome }}</h1>
        <div class="tags">
          <span class="chip active">{{ danza.nome }}</span>
          <span v-for="s in stiliFigura" :key="s.id" class="chip">{{ s.nome }}</span>
        </div>
      </header>

      <nav class="pager" aria-label="Figure precedenti e successive">
        <RouterLink v-if="precedente" :to="{ name: 'figura', params: { figura: precedente.id } }" class="pager-link">
          ← {{ precedente.nome }}
        </RouterLink>
        <span v-else />
        <RouterLink v-if="successiva" :to="{ name: 'figura', params: { figura: successiva.id } }" class="pager-link next">
          {{ successiva.nome }} →
        </RouterLink>
      </nav>
    </template>

    <section v-else class="vuoto">
      <h1 class="script">Figura non trovata</h1>
      <RouterLink to="/" class="back">← Torna alla home</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.figura { padding: clamp(1.5rem, 4vw, 3rem) 0 2rem; max-width: 960px; }

.crumbs {
  display: flex;
  gap: 0.5rem;
  color: var(--muted);
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
}
.back { color: var(--muted); text-decoration: none; }
.back:hover { color: var(--light); }

.player {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius);
  overflow: hidden;
  background: #000;
  box-shadow: 0 40px 80px -40px rgba(38, 41, 225, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.player iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }

.player-placeholder {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 20%, rgba(225, 29, 72, 0.35), transparent 50%),
    radial-gradient(circle at 80% 90%, rgba(38, 41, 225, 0.35), transparent 50%),
    var(--dark-2);
}
.placeholder-body { text-align: center; }
.placeholder-icon { font-size: 3rem; display: block; animation: pulse 2s ease-in-out infinite; }
.placeholder-body p { font-size: 2rem; color: var(--amber); margin: 0.5rem 0 0; }

@keyframes pulse {
  50% { transform: scale(1.12); }
}

.fig-title { margin: 2rem 0 1.5rem; }
.fig-title h1 {
  font-size: clamp(3.5rem, 9vw, 6rem);
  font-weight: 700;
  background: linear-gradient(90deg, #fb7185, #a5b4fc);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }

.pager {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.pager-link {
  color: var(--light);
  text-decoration: none;
  font-family: 'Caveat', cursive;
  font-size: 1.6rem;
}
.pager-link:hover { color: var(--amber); }
.pager-link.next { margin-left: auto; }

.vuoto { text-align: center; color: var(--muted); padding: 3rem 0; }
.vuoto h1 { color: var(--light); font-size: 3rem; margin-bottom: 1rem; }
</style>
