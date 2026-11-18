<script setup>
import { gsap } from 'gsap'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { danze, figurePerDanza } from '../data/danze.js'

const root = ref(null)
let ctx = null

const titolo = 'Salsa & Bachata'
const cards = Object.values(danze)

onMounted(async () => {
  await nextTick()
  ctx = gsap.context(() => {
    gsap.from('.hero-letter', {
      yPercent: 110,
      rotate: 8,
      opacity: 0,
      duration: 0.8,
      ease: 'back.out(1.6)',
      stagger: 0.03,
    })
    gsap.from('.hero-sub', { opacity: 0, y: 20, duration: 0.8, delay: 0.5 })
    gsap.from('.dance-card', {
      opacity: 0,
      y: 60,
      scale: 0.94,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.15,
      delay: 0.7,
    })
    gsap.to('.float', { y: -12, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.4 })
  }, root.value)
})

onBeforeUnmount(() => ctx?.revert())

function tilt(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width - 0.5
  const y = (e.clientY - r.top) / r.height - 0.5
  gsap.to(el, { rotateY: x * 12, rotateX: -y * 12, duration: 0.4, ease: 'power2.out', transformPerspective: 900 })
}

function resetTilt(e) {
  gsap.to(e.currentTarget, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
}
</script>

<template>
  <main ref="root" class="home container">
    <section class="hero">
      <p class="hero-sub script float">Benvenuto in pista 💃🕺</p>
      <h1 class="hero-title" aria-label="Salsa & Bachata">
        <span
          v-for="(lettera, i) in titolo.split('')"
          :key="i"
          class="hero-letter"
          :class="{ 'hero-letter-space': lettera === ' ' }"
        >{{ lettera === ' ' ? '\u00A0' : lettera }}</span>
      </h1>
      <p class="hero-sub">Scegli una danza e sfoglia le figure, divise per stile.</p>
    </section>

    <nav class="cards" aria-label="Danze">
      <RouterLink
        v-for="danza in cards"
        :key="danza.id"
        :to="{ name: 'danza', params: { danza: danza.id } }"
        class="dance-card"
        :class="`dance-card-${danza.id}`"
        @pointermove="tilt"
        @pointerleave="resetTilt"
      >
        <span class="card-count">{{ figurePerDanza(danza.id).length }} figure</span>
        <h2 class="card-title">{{ danza.nome }}</h2>
        <p class="card-desc">{{ danza.descrizione }}</p>
        <span class="card-stili">
          <span v-for="stile in danza.stili" :key="stile.id" class="chip">{{ stile.nome }}</span>
        </span>
        <span class="card-cta script">Apri →</span>
      </RouterLink>
    </nav>
  </main>
</template>

<style scoped>
.home { padding: clamp(2rem, 6vw, 5rem) 0 2rem; }

.hero { text-align: center; margin-bottom: clamp(2.5rem, 6vw, 4.5rem); }

.hero-title {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0;
  font-family: 'Caveat', cursive;
  font-size: clamp(3.5rem, 12vw, 8.5rem);
  font-weight: 700;
  background: linear-gradient(90deg, #fb7185, #a5b4fc 60%, #fcd34d);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hero-letter { display: inline-block; }

.hero-sub {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: clamp(1rem, 2.2vw, 1.2rem);
}
.hero-sub.script {
  font-family: 'Caveat', cursive;
  font-size: 1.6rem;
  color: var(--amber);
  margin-bottom: 0.5rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: clamp(1.25rem, 3vw, 2rem);
}

.dance-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-height: 320px;
  padding: clamp(1.5rem, 3vw, 2.25rem);
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--light);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.6);
  transform-style: preserve-3d;
  overflow: hidden;
  transition: border-color 0.3s;
}
.dance-card::after {
  content: '';
  position: absolute;
  inset: auto -30% -40% auto;
  width: 70%;
  aspect-ratio: 1;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.45;
  pointer-events: none;
}
.dance-card-salsa::after { background: var(--rose); }
.dance-card-bachata::after { background: var(--primary); }
.dance-card:hover { border-color: rgba(255, 255, 255, 0.3); }

.card-count {
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.card-title {
  font-family: 'Caveat', cursive;
  font-size: clamp(3rem, 7vw, 4.5rem);
  font-weight: 700;
}
.card-desc { margin: 0; color: #cbd5e1; line-height: 1.5; }
.card-stili { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: auto; }
.card-cta {
  margin-top: 0.5rem;
  font-size: 1.6rem;
  color: var(--amber);
  transition: transform 0.3s;
}
.dance-card:hover .card-cta { transform: translateX(8px); }
</style>
