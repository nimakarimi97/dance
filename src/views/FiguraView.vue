<script setup>
import { gsap } from 'gsap'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { findDance, findFigure, getFiguresForDance } from '../data/danze.js'

const props = defineProps({ figura: { type: String, required: true } })

const currentFigure = computed(() => findFigure(props.figura))
const dance = computed(() => (currentFigure.value ? findDance(currentFigure.value.danza) : null))
const figureStyles = computed(() =>
  currentFigure.value && dance.value
    ? currentFigure.value.stili.map(styleId => dance.value.stili.find(style => style.id === styleId)).filter(Boolean)
    : [],
)

const otherFigures = computed(() => (currentFigure.value ? getFiguresForDance(currentFigure.value.danza) : []))
const currentIndex = computed(() => otherFigures.value.findIndex(figure => figure.id === props.figura))
const previousFigure = computed(() => (currentIndex.value > 0 ? otherFigures.value[currentIndex.value - 1] : null))
const nextFigure = computed(() => (currentIndex.value >= 0 && currentIndex.value < otherFigures.value.length - 1 ? otherFigures.value[currentIndex.value + 1] : null))

const videoUrl = computed(() => {
  const videoId = currentFigure.value?.youtubeId
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?hl=it&cc_lang_pref=it&rel=0&modestbranding=1` : null
})

const root = ref(null)
let animationContext = null

function animate() {
  gsap.fromTo('.player', { opacity: 0, y: 30, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' })
  gsap.from('.fig-title > *', { opacity: 0, y: 20, duration: 0.6, stagger: 0.08, delay: 0.2 })
}

onMounted(async () => {
  await nextTick()
  animationContext = gsap.context(animate, root.value)
})

watch(() => props.figura, async () => {
  await nextTick()
  animate()
})

onBeforeUnmount(() => animationContext?.revert())
</script>

<template>
  <main ref="root" class="figura container">
    <template v-if="currentFigure && dance">
      <nav class="crumbs" aria-label="Percorso">
        <RouterLink to="/" class="back">Home</RouterLink>
        <span>/</span>
        <RouterLink :to="{ name: 'danza', params: { danza: dance.id } }" class="back">{{ dance.nome }}</RouterLink>
      </nav>

      <div class="player" :class="{ 'player-placeholder': !videoUrl }">
        <iframe
          v-if="videoUrl"
          :src="videoUrl"
          :title="`Video: ${currentFigure.nome}`"
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
        <h1 class="script">{{ currentFigure.nome }}</h1>
        <div class="tags">
          <span class="chip active">{{ dance.nome }}</span>
          <span v-for="style in figureStyles" :key="style.id" class="chip">{{ style.nome }}</span>
        </div>
      </header>

      <nav class="pager" aria-label="Figure precedenti e successive">
        <RouterLink v-if="previousFigure" :to="{ name: 'figura', params: { figura: previousFigure.id } }" class="pager-link">
          ← {{ previousFigure.nome }}
        </RouterLink>
        <span v-else />
        <RouterLink v-if="nextFigure" :to="{ name: 'figura', params: { figura: nextFigure.id } }" class="pager-link next">
          {{ nextFigure.nome }} →
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
