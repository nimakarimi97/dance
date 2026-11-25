<script setup>
import { gsap } from 'gsap'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { dances, getFiguresForDance, refreshFigures } from '../data/danze.js'
import { canAnimate, hasHover } from '../lib/motion.js'
import { currentUser, isLoggedIn } from '../lib/auth.js'
import { isFeatureEnabled } from '../config/features.js'
import { ANALYTICS_EVENTS } from '../lib/analytics.js'
import { recordAnalyticsEvent } from '../lib/figures.js'
import InstallGuide from '../components/InstallGuide.vue'
import StudioIcon from '../components/StudioIcon.vue'

const publicContent = isFeatureEnabled('publicContent')
const installGuideEnabled = isFeatureEnabled('installGuide')

const root = ref(null)
let animationContext = null

const title = 'Salsa & Bachata'
const danceIcons = {
  salsa: '/dance-icons/salsa-couple.svg',
  bachata: '/dance-icons/bachata-embrace.svg',
}
const titleLength = title.replaceAll(' ', '').length
// Each letter gets its share of the gradient as a solid colour, so glyphs that overflow their box are never clipped.
const titleWords = title.split(' ').reduce((words, word) => {
  const start = words.reduce((total, current) => total + current.letters.length, 0)
  words.push({
    word,
    letters: [...word].map((letter, i) => ({
      letter,
      mix: `${Math.round(((start + i) / (titleLength - 1)) * 100)}%`,
    })),
  })
  return words
}, [])

const cards = computed(() =>
  Object.values(dances).map((dance) => {
    const figures = getFiguresForDance(dance.id)
    return {
      ...dance,
      icon: danceIcons[dance.id],
      total: figures.length,
      videos: figures.filter((figure) => figure.youtubeId || figure.videoFileId).length,
    }
  }),
)

onMounted(async () => {
  if (publicContent || isLoggedIn.value) refreshFigures()
  await nextTick()
  if (!canAnimate()) return
  animationContext = gsap.context(() => {
    gsap.from('.hero-letter', {
      yPercent: 110,
      rotate: 8,
      opacity: 0,
      duration: 0.8,
      ease: 'back.out(1.6)',
      stagger: 0.03,
      clearProps: 'transform,opacity',
    })
    gsap.from('.hero-sub', { opacity: 0, y: 20, duration: 0.8, delay: 0.5, stagger: 0.1 })
    gsap.from('.dance-card', {
      opacity: 0,
      y: 60,
      scale: 0.94,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.15,
      delay: 0.7,
      clearProps: 'transform,opacity',
    })
  }, root.value)
})

onBeforeUnmount(() => animationContext?.revert())

function tilt(event) {
  if (!hasHover() || !canAnimate()) return
  const element = event.currentTarget
  const bounds = element.getBoundingClientRect()
  const x = (event.clientX - bounds.left) / bounds.width - 0.5
  const y = (event.clientY - bounds.top) / bounds.height - 0.5
  gsap.to(element, { rotateY: x * 12, rotateX: -y * 12, duration: 0.4, ease: 'power2.out', transformPerspective: 900 })
}

function resetTilt(event) {
  if (!hasHover() || !canAnimate()) return
  gsap.to(event.currentTarget, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
}

// Touch feedback: a quick press that springs back, since there is no hover on phones.
function press(event) {
  if (hasHover() || !canAnimate()) return
  gsap.to(event.currentTarget, { scale: 0.97, duration: 0.15, ease: 'power2.out' })
}

function release(event) {
  if (hasHover() || !canAnimate()) return
  gsap.to(event.currentTarget, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
}

function trackDanceClick(danceId) {
  const userId = currentUser.value?.$id
  if (!userId) return
  recordAnalyticsEvent({
    eventType: ANALYTICS_EVENTS.DANCE_CARD_CLICK,
    eventTarget: danceId,
    userId,
  })
}
</script>

<template>
  <main ref="root" class="home container">
    <InstallGuide v-if="installGuideEnabled" />
    <section class="hero">
      <p class="hero-hi script">Benvenuto in pista</p>
      <h1 class="hero-title" translate="no" aria-label="Salsa & Bachata">
        <span v-for="{ word, letters } in titleWords" :key="word" class="hero-word" aria-hidden="true">
          <span v-for="({ letter, mix }, i) in letters" :key="i" class="hero-letter" :style="{ '--mix': mix }">{{ letter }}</span>
        </span>
      </h1>
      <p class="hero-sub">Scegli una danza, apri una figura e provala con il video.</p>
    </section>

    <nav class="cards" aria-label="Danze">
      <RouterLink v-for="dance in cards" :key="dance.id" :to="{ name: 'danza', params: { danza: dance.id } }"
        class="dance-card" :data-dance="dance.id" @click="trackDanceClick(dance.id)" @pointermove="tilt"
        @pointerleave="resetTilt" @pointerdown="press"
        @pointerup="release" @pointercancel="release">
        <span class="card-count">
          <template v-if="(isLoggedIn || publicContent) && dance.total">{{ dance.total }} {{ dance.total === 1 ? 'figura' : 'figure'
          }}<template v-if="dance.videos">, {{ dance.videos }} con video</template></template>
          <template v-else>{{ publicContent ? 'Nessuna figura disponibile' : 'Figure e video riservati agli iscritti' }}</template>
        </span>
        <span class="card-heading">
          <h2 class="card-title">{{ dance.nome }}</h2>
          <span class="card-illustration" :style="{
            maskImage: `url(${dance.icon})`,
            WebkitMaskImage: `url(${dance.icon})`,
          }" aria-hidden="true"></span>
        </span>
        <p class="card-desc">{{ dance.descrizione }}</p>
        <span class="card-foot">
          <span class="card-stili">
            <span v-for="style in dance.stili" :key="style.id" class="card-tag">{{ style.nome }}</span>
          </span>
          <span class="card-cta">Esplora <StudioIcon name="arrow" /></span>
        </span>
      </RouterLink>
    </nav>
  </main>
</template>

<style scoped>
.home {
  padding: clamp(1.5rem, 5vw, 4rem) 0 1rem;
}

.hero {
  margin-bottom: clamp(1.75rem, 5vw, 3rem);
  text-align: center;
}

.hero-hi {
  margin: 0;
  font-size: 1.9rem;
  color: var(--gold);
}

.hero-letter {
  display: inline-block;
  color: color-mix(in oklab, var(--title-to) var(--mix), var(--title-from));
}

.hero-word { display: inline-block; white-space: nowrap; }
.hero-title {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  column-gap: 0.2em;
  font-family: 'Caveat', cursive;
  font-size: clamp(3rem, 11vw, 7rem);
  font-weight: 700;
  line-height: 1;
}

.hero-sub {
  margin: 0.75rem 0 0;
  max-width: 36ch;
  margin-inline: auto;
  color: var(--muted);
  font-size: 1.1rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 1rem;
}

.dance-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 280px;
  padding: clamp(1.25rem, 3vw, 2rem);
  border-radius: 1.25rem;
  text-decoration: none;
  color: var(--text);
  background: var(--ink-2);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  border-top: 4px solid var(--accent);
  transform-style: preserve-3d;
  position: relative;
  overflow: hidden;
}

.dance-card:hover {
  border-color: var(--accent);
}

.dance-card:focus-visible {
  outline-offset: 4px;
  border-radius: 1.25rem;
}

.dance-card>* {
  position: relative;
  z-index: 1;
}

.card-count {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--muted);
}

.card-title {
  font-family: 'Caveat', cursive;
  font-size: clamp(3.6rem, 12vw, 5.5rem);
  font-weight: 700;
}

.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.card-illustration {
  width: clamp(4.5rem, 16vw, 6rem);
  height: clamp(4.5rem, 16vw, 6rem);
  flex: 0 0 auto;
  background-color: var(--accent);
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
}

.card-desc {
  margin: 0;
  max-width: 40ch;
  font-size: 1.05rem;
  color: var(--muted);
}

.card-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: auto;
}

.card-stili {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.card-tag {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--ink-3);
  font-size: 0.9rem;
  font-weight: 600;
}

.card-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.1rem;
  border-radius: 0.75rem;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
  transition: background-color 160ms ease, transform 160ms ease;
}

.dance-card:hover .card-cta {
  background: var(--accent);
  transform: translateY(-1px);
}

@media (prefers-reduced-motion: reduce) {
  .card-cta {
    transition: none;
  }
}
</style>
