<script setup>
import { gsap } from 'gsap'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { findDance, findFigure, getFiguresForDance, useFigureCatalog } from '../data/danze.js'
import { currentUser } from '../lib/auth.js'
import { isFeatureEnabled } from '../config/features.js'
import { recordFigureView } from '../lib/figures.js'
import { isOnline } from '../lib/online.js'
import { canAnimate } from '../lib/motion.js'
import ProtectedMedia from '../components/ProtectedMedia.vue'
import FigurePractice from '../components/FigurePractice.vue'
import VideoPlayer from '../components/VideoPlayer.vue'

const practiceEnabled = isFeatureEnabled('practice')

const props = defineProps({ figura: { type: String, required: true } })
const { loading, error, retry } = useFigureCatalog()

const currentFigure = computed(() => findFigure(props.figura))
const dance = computed(() => (currentFigure.value ? findDance(currentFigure.value.danza) : null))
const figureStyles = computed(() =>
  currentFigure.value && dance.value
    ? currentFigure.value.stili
      .map((styleId) => dance.value.stili.find((style) => style.id === styleId))
      .filter(Boolean)
    : [],
)

const otherFigures = computed(() => (currentFigure.value ? getFiguresForDance(currentFigure.value.danza) : []))
const currentIndex = computed(() => otherFigures.value.findIndex((figure) => figure.id === props.figura))
const previousFigure = computed(() => (currentIndex.value > 0 ? otherFigures.value[currentIndex.value - 1] : null))
const nextFigure = computed(() =>
  currentIndex.value >= 0 && currentIndex.value < otherFigures.value.length - 1
    ? otherFigures.value[currentIndex.value + 1]
    : null,
)

const videoId = computed(() => currentFigure.value?.youtubeId ?? null)
const youtubeLink = computed(() => (videoId.value ? `https://www.youtube.com/watch?v=${videoId.value}` : null))

const root = ref(null)
let animationContext = null

function animate() {
  if (!canAnimate() || !root.value?.querySelector('.player')) return
  gsap.fromTo(
    '.player',
    { opacity: 0, y: 30, scale: 0.97 },
    { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out', clearProps: 'transform,opacity' },
  )
  gsap.from('.fig-title > *', { opacity: 0, y: 20, duration: 0.6, stagger: 0.08, delay: 0.2 })
  if (root.value.querySelector('.pager-link')) {
    gsap.from('.pager-link', {
      opacity: 0,
      y: 20,
      duration: 0.6,
      stagger: 0.1,
      delay: 0.5,
      clearProps: 'transform,opacity',
    })
  }
}

onMounted(async () => {
  await nextTick()
  animationContext = gsap.context(animate, root.value)
})

watch(currentFigure, async (figure) => {
  if (!figure) return
  await nextTick()
  animationContext?.add(animate)
})

watch(
  () => currentFigure.value?.id,
  (figureId) => {
    const userId = currentUser.value?.$id
    if (figureId && userId) recordFigureView(figureId, userId)
  },
  { immediate: true },
)

onBeforeUnmount(() => animationContext?.revert())
</script>

<template>
  <main ref="root" class="figura container" :data-dance="currentFigure?.danza">
    <p v-if="loading" class="state" role="status">
      Caricamento figura…
    </p>
    <section v-else-if="error" class="state" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="btn" @click="retry">
        Riprova
      </button>
    </section>
    <template v-else-if="currentFigure && dance">
      <nav class="crumbs" aria-label="Percorso">
        <RouterLink :to="{ name: 'danza', params: { danza: dance.id } }" class="back">
          <span aria-hidden="true">←</span> Tutte le figure di {{ dance.nome }}
        </RouterLink>
      </nav>

      <header class="fig-title">
        <h1 class="script">{{ currentFigure.nome }}</h1>
        <div class="tags">
          <span class="tag tag-dance">{{ dance.nome }}</span>
          <span v-for="style in figureStyles" :key="style.id" class="tag">{{ style.nome }}</span>
        </div>
      </header>

      <p v-if="currentFigure.aliases?.length">Altri nomi: {{ currentFigure.aliases.join(', ') }}</p>
      <p v-if="currentFigure.description" class="figure-description">{{ currentFigure.description }}</p>
      <p v-if="currentFigure.difficulty">Difficoltà: {{ {
        beginner: 'Base', intermediate: 'Intermedia', advanced:
          'Avanzata'
      }[currentFigure.difficulty] }}</p>

      <div class="player" :class="{ 'player-placeholder': !videoId && !currentFigure.videoFileId }">
        <ProtectedMedia v-if="currentFigure.videoFileId" :file-id="currentFigure.videoFileId" kind="video"
          :title="`Video: ${currentFigure.nome}`" />
        <div v-else-if="videoId" class="youtube-frame-wrap">
          <iframe :src="`https://www.youtube-nocookie.com/embed/${videoId}?hl=it&cc_lang_pref=it&rel=0&playsinline=1`"
            :title="`Video: ${currentFigure.nome}`"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin" allowfullscreen />
        </div>
        <div v-else class="placeholder-body">
          <p class="script">Video in arrivo</p>
          <p class="placeholder-note">Per ora puoi provare la figura con le altre {{ dance.nome }}.</p>
        </div>
      </div>

      <p v-if="videoId && !currentFigure.videoFileId && !isOnline" class="video-note" role="status">
        Sei offline: il video non si carica. Riprova quando torni online.
      </p>
      <a v-else-if="youtubeLink && !currentFigure.videoFileId" :href="youtubeLink" class="video-note yt" target="_blank"
        rel="noopener">
        Il video non parte? Aprilo su YouTube
      </a>

      <ProtectedMedia v-if="currentFigure.imageFileId" :file-id="currentFigure.imageFileId" kind="image"
        :title="currentFigure.nome" />
      <FigurePractice v-if="currentUser && practiceEnabled" :key="currentFigure.id" :figure="currentFigure" />
      <nav class="pager" aria-label="Figure precedenti e successive">
        <RouterLink v-if="previousFigure" :to="{ name: 'figura', params: { figura: previousFigure.id } }"
          class="pager-link">
          <span class="pager-hint">Precedente</span>
          <span class="pager-name">{{ previousFigure.nome }}</span>
        </RouterLink>
        <span v-else />
        <RouterLink v-if="nextFigure" :to="{ name: 'figura', params: { figura: nextFigure.id } }"
          class="pager-link next">
          <span class="pager-hint">Prossima</span>
          <span class="pager-name">{{ nextFigure.nome }}</span>
        </RouterLink>
      </nav>
      <p class="position">Figura {{ currentIndex + 1 }} di {{ otherFigures.length }}</p>
    </template>

    <section v-else class="state">
      <h1 class="script">Figura non trovata</h1>
      <p>Questa figura non esiste o è stata spostata. Scegline un’altra dalla home.</p>
      <RouterLink to="/" class="btn btn-primary">Torna alla home</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.figura {
  padding: clamp(0.75rem, 4vw, 2.5rem) 0 1rem;
  max-width: 960px;
}

.figure-description {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: var(--touch);
  color: var(--muted);
  text-decoration: none;
}

.back:hover {
  color: var(--text);
}

.fig-title {
  margin: 0.5rem 0 1.25rem;
}

.fig-title h1 {
  font-size: clamp(4rem, 14vw, 6.5rem);
  font-weight: 700;
  line-height: 1;
  padding-bottom: 0.1em;
  background: var(--grad-text);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  overflow-wrap: anywhere;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.6rem;
}

.tag-dance {
  background: var(--brand-soft);
  border-color: var(--brand-text);
  color: var(--brand-text);
  font-weight: 700;
}

.player {
  position: relative;
  border-radius: 1.25rem;
  background: #000;
  box-shadow: var(--shadow);
  border: 1px solid var(--line);
}

.player-placeholder {
  aspect-ratio: 16 / 9;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: var(--ink-2);
}

.youtube-frame-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: inherit;
  background: #000;
}

.youtube-frame-wrap iframe {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.placeholder-body {
  text-align: center;
}

.placeholder-body .script {
  margin: 0;
  font-size: 2.4rem;
  color: var(--gold);
}

.placeholder-note {
  margin: 0.25rem 0 0;
  color: var(--muted);
}

.video-note {
  display: inline-flex;
  align-items: center;
  min-height: var(--touch);
  margin: 0.5rem 0 0;
  color: var(--muted);
  font-size: 0.95rem;
}

.yt {
  color: var(--text);
}

.pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.pager-link {
  display: grid;
  gap: 0.1rem;
  min-height: 4.5rem;
  padding: 0.8rem 1.1rem;
  border: 1px solid var(--line);
  border-radius: 0.9rem;
  background: var(--ink-2);
  text-decoration: none;
  transition: background-color 0.2s;
}

.pager-link:hover {
  background: var(--ink-3);
  border-color: var(--line);
}

.pager-link.next {
  grid-column: 2;
  text-align: right;
  border-right: 6px solid var(--accent-text);
}

.pager-link:not(.next) {
  border-left: 6px solid var(--accent-text);
}

.pager-hint {
  font-size: 0.875rem;
  color: var(--muted);
}

.pager-name {
  font-family: 'Caveat', cursive;
  font-size: 1.9rem;
  font-weight: 700;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.position {
  margin: 1rem 0 0;
  text-align: center;
  color: var(--muted);
  font-size: 0.9rem;
}
</style>
