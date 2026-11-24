<script setup>
import { gsap } from 'gsap'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { authError, currentUser, ensureAuth, isLoggedIn } from './lib/auth.js'
import { isFeatureEnabled } from './config/features.js'
import { dances, findDance, findFigure } from './data/danze.js'
import { isOnline } from './lib/online.js'
import { canAnimate } from './lib/motion.js'
import { ANALYTICS_EVENTS } from './lib/analytics.js'
import { recordAnalyticsEvent } from './lib/figures.js'

const route = useRoute()
const authEnabled = isFeatureEnabled('auth')
const danceList = Object.values(dances)
const baseTitle = 'Salsa & Bachata · Figure'
const copyrightYears = new Date().getFullYear()

const blobs = ref(null)
let blobContext = null

onMounted(() => {
  if (authEnabled) ensureAuth()
  if (!canAnimate()) return
  blobContext = gsap.context(() => {
    gsap.utils.toArray('.blob').forEach((blob, i) => {
      gsap.to(blob, {
        x: '6vw',
        y: '4vh',
        scale: 1.15,
        duration: 14 + i * 4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: -i * 5,
      })
    })
  }, blobs.value)
})

onBeforeUnmount(() => blobContext?.revert())

// The figure page belongs to its dance, so the matching tab stays highlighted.
const activeDance = computed(() => {
  if (route.name === 'danza') return route.params.danza
  if (route.name === 'figura') return findFigure(route.params.figura)?.danza ?? ''
  return ''
})

const pageTitle = computed(() => {
  if (route.name === 'danza') return findDance(route.params.danza)?.nome
  if (route.name === 'figura') return findFigure(route.params.figura)?.nome
  if (route.name === 'auth') return 'Accedi'
  if (route.name === 'dashboard') return 'Area personale'
  return ''
})

const analyticsPageKey = computed(() => {
  if (route.name === 'danza') return `danza:${route.params.danza}`
  if (route.name === 'figura') return `figura:${route.params.figura}`
  return route.name ? String(route.name) : ''
})

watch(
  pageTitle,
  (title) => {
    document.title = title ? `${title} · ${baseTitle}` : baseTitle
  },
  { immediate: true },
)

watch(
  [analyticsPageKey, currentUser],
  ([target, user]) => {
    if (!target || !user?.$id) return
    recordAnalyticsEvent({
      eventType: ANALYTICS_EVENTS.PAGE_VIEW,
      eventTarget: target,
      userId: user.$id,
    })
  },
  { immediate: true },
)

function focusMain() {
  const main = document.querySelector('main')
  main?.setAttribute('tabindex', '-1')
  main?.focus()
}

function trackNavigation(target) {
  const userId = currentUser.value?.$id
  if (!userId) return
  recordAnalyticsEvent({
    eventType: ANALYTICS_EVENTS.APP_NAV_CLICK,
    eventTarget: target,
    userId,
  })
}
</script>

<template>
  <div class="app" :class="{ 'app--dashboard': route.name === 'dashboard' }">
    <div ref="blobs" class="blobs" aria-hidden="true">
      <span class="blob blob-rose" />
      <span class="blob blob-indigo" />
      <span class="blob blob-amber" />
    </div>

    <a href="#/" class="skip" @click.prevent="focusMain">Vai al contenuto</a>

    <header class="topbar">
      <RouterLink to="/" class="brand" @click="trackNavigation('home')">
        <img class="brand-mark" src="/pwa-192.png" alt="" aria-hidden="true" />
        <span class="brand-name" translate="no">Salsa &amp; Bachata</span>
      </RouterLink>
    </header>

    <p v-if="!isOnline" class="offline" role="status">
      Sei offline. <RouterLink to="/offline">Apri i dettagli salvati per la pratica</RouterLink>. I video richiedono una connessione.
    </p>
    <p v-if="authError && route.name !== 'auth'" class="offline" role="alert">
      {{ authError }}
    </p>

    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" v-if="!route.meta.requiresAuth || isLoggedIn" :key="currentUser?.$id || 'guest'" />
      </Transition>
    </RouterView>

    <footer class="footer">
      <a href="https://nimakarimi.me" target="_blank" rel="noopener">nimakarimi.me</a>
      <p class="copyright">
        © {{ copyrightYears }} Nima Karimi · <a href="mailto:dance@nimakarimi.me">dance@nimakarimi.me</a>
      </p>
    </footer>

    <nav class="tabs" aria-label="Principale">
      <RouterLink to="/" class="tab" :class="{ 'tab-on': route.name === 'home' }" @click="trackNavigation('home')"
        :aria-current="route.name === 'home' ? 'page' : undefined">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
        </svg>
        <span>Home</span>
      </RouterLink>
      <RouterLink v-for="dance in danceList" :key="dance.id" :to="{ name: 'danza', params: { danza: dance.id } }"
        class="tab" :class="{ 'tab-on': activeDance === dance.id }" :data-dance="dance.id"
        @click="trackNavigation(`dance:${dance.id}`)"
        :aria-current="activeDance === dance.id ? 'page' : undefined">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zm11-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3z" />
        </svg>
        <span>{{ dance.nome }}</span>
      </RouterLink>
      <RouterLink v-if="authEnabled" :to="isLoggedIn ? { name: 'dashboard' } : { name: 'auth' }" class="tab"
        :class="{ 'tab-on': route.name === 'auth' || route.name === 'dashboard' }"
        @click="trackNavigation(isLoggedIn ? 'dashboard' : 'auth')"
        :aria-current="route.name === 'auth' || route.name === 'dashboard' ? 'page' : undefined">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-8 8a8 8 0 0 1 16 0z" />
        </svg>
        <span>{{ isLoggedIn ? 'Profilo' : 'Accedi' }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.app {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow-x: clip;
}

.app--dashboard {
  background: #090d1a;
}

.app--dashboard .blobs {
  display: none;
}

.blobs {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.blob {
  position: absolute;
  width: 55vmax;
  height: 55vmax;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.35;
  will-change: transform;
}

.blob-rose {
  background: var(--salsa);
  top: -20%;
  left: -15%;
}

.blob-indigo {
  background: var(--bachata);
  bottom: -25%;
  right: -15%;
}

.blob-amber {
  background: var(--gold);
  top: 30%;
  left: 40%;
  opacity: 0.18;
}

.skip {
  position: fixed;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 40;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  background: var(--gold);
  color: var(--ink);
  font-weight: 700;
  transform: translateY(-200%);
}

.skip:focus {
  transform: none;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  padding: 0.5rem clamp(1rem, 4vw, 3rem);
  padding-top: calc(0.5rem + env(safe-area-inset-top));
  background: rgba(9, 13, 26, 0.86);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-height: var(--touch);
  text-decoration: none;
  font-family: 'Caveat', cursive;
  font-size: 1.7rem;
  font-weight: 700;
}

.brand-mark {
  display: block;
  width: 2.4rem;
  height: 2.4rem;
  flex: 0 0 auto;
  border-radius: 0.65rem;
  object-fit: cover;
}

.offline {
  margin: 0;
  padding: 0.6rem 1rem;
  background: var(--gold);
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
}

.footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin-top: auto;
  padding: 2rem 1rem calc(var(--nav-h) + 2rem + env(safe-area-inset-bottom));
  text-align: center;
  font-size: 0.9rem;
  color: var(--muted);
}

.footer a {
  display: inline-block;
  padding: 0.6rem;
  color: var(--text);
}

.copyright {
  margin: 0;
  font-size: 0.8rem;
}

/* Mobile: app-style bottom tab bar. */
.tabs {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 20;
  display: flex;
  height: calc(var(--nav-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(9, 13, 26, 0.96);
  backdrop-filter: blur(14px);
  border-top: 1px solid var(--line);
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-width: 0;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
}

.tab svg {
  width: 1.5rem;
  height: 1.5rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tab-on {
  color: var(--accent-text, #fcd34d);
}

.tab-on[data-dance] svg {
  fill: currentColor;
  fill-opacity: 0.2;
}

/* Desktop: same links, moved to the top right. */
@media (min-width: 760px) {
  .tabs {
    inset: 0 clamp(1rem, 4vw, 3rem) auto auto;
    height: 3.75rem;
    padding: 0;
    gap: 0.25rem;
    background: none;
    backdrop-filter: none;
    border: 0;
  }

  .tab {
    flex-direction: row;
    gap: 0.5rem;
    padding: 0 1rem;
    border-radius: 0.8rem;
    font-size: 0.95rem;
  }

  .tab:hover {
    background: rgba(30, 41, 59, 0.72);
  }

  .tab-on:not([data-dance]) {
    background: rgba(124, 58, 237, 0.16);
    color: #c4b5fd;
  }

  .footer {
    padding-bottom: 2rem;
  }
}

.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(14px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
