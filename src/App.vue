<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { authError, currentUser, ensureAuth, isLoggedIn } from './lib/auth.js'
import { isFeatureEnabled } from './config/features.js'
import { dances, findDance, findFigure } from './data/danze.js'
import { isOnline } from './lib/online.js'
import { ANALYTICS_EVENTS } from './lib/analytics.js'
import { recordAnalyticsEvent } from './lib/figures.js'
import ThemeSwitch from '../ThemeSwitch.vue'
import StudioIcon from './components/StudioIcon.vue'
import Footer from './components/Footer.vue'
import { initializeTheme, isDarkMode, themeError } from './lib/theme.js'

const route = useRoute()
const authEnabled = isFeatureEnabled('auth')
const offlineEnabled = isFeatureEnabled('offline')
const themeEnabled = isFeatureEnabled('theme')
const danceList = Object.values(dances)
const baseTitle = 'Salsa & Bachata · Figure'

const themeController = initializeTheme()

onMounted(() => {
  if (authEnabled) ensureAuth()
})

onBeforeUnmount(() => themeController.dispose())

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
  if (route.name === 'dashboard') return 'Dashboard'
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
    <a href="#/" class="skip" @click.prevent="focusMain">Vai al contenuto</a>

    <header class="topbar">
      <RouterLink to="/" class="brand" @click="trackNavigation('home')">
        <img class="brand-mark" src="/pwa-192.png" alt="" aria-hidden="true" />
        <span class="brand-name" translate="no">Salsa &amp; Bachata</span>
      </RouterLink>
      <div class="header-actions">
        <ThemeSwitch v-if="themeEnabled" :model-value="isDarkMode" @update:model-value="themeController.setDarkMode" />
        <RouterLink v-if="authEnabled" class="user-link"
          :class="{ 'user-link--on': route.name === 'dashboard' && route.query.sezione === 'account' }"
          :to="isLoggedIn ? { name: 'dashboard', query: { sezione: 'account' } } : { name: 'auth' }"
          :aria-label="isLoggedIn ? 'Il mio account' : 'Accedi'"
          @click="trackNavigation(isLoggedIn ? 'account' : 'auth')">
          <StudioIcon name="user" />
        </RouterLink>
      </div>

      <nav class="tabs" aria-label="Principale">
        <RouterLink to="/" class="tab" :class="{ 'tab-on': route.name === 'home' }" @click="trackNavigation('home')"
          :aria-current="route.name === 'home' ? 'page' : undefined">
          <StudioIcon name="home" />
          <span>Home</span>
        </RouterLink>
        <RouterLink v-for="dance in danceList" :key="dance.id" :to="{ name: 'danza', params: { danza: dance.id } }"
          class="tab" :class="{ 'tab-on': activeDance === dance.id }" :data-dance="dance.id"
          @click="trackNavigation(`dance:${dance.id}`)" :aria-current="activeDance === dance.id ? 'page' : undefined">
          <StudioIcon name="dance" />
          <span>{{ dance.nome }}</span>
        </RouterLink>
        <RouterLink v-if="authEnabled" :to="isLoggedIn ? { name: 'dashboard' } : { name: 'auth' }" class="tab"
          :class="{ 'tab--dashboard': isLoggedIn, 'tab-on': route.name === 'auth' || route.name === 'dashboard' }"
          @click="trackNavigation(isLoggedIn ? 'dashboard' : 'auth')"
          :aria-current="route.name === 'auth' || route.name === 'dashboard' ? 'page' : undefined">
          <StudioIcon :name="isLoggedIn ? 'grid' : 'user'" />
          <span>{{ isLoggedIn ? 'Dashboard' : 'Accedi' }}</span>
        </RouterLink>
      </nav>
    </header>
    <p v-if="themeError" class="theme-notice" role="status">{{ themeError }}</p>
    <p v-if="!isOnline" class="offline" role="status">
      Sei offline.<template v-if="offlineEnabled">
        <RouterLink to="/offline">Apri i dettagli salvati per la pratica</RouterLink>.
      </template>
      I video richiedono una connessione.
    </p>
    <p v-if="authError && route.name !== 'auth'" class="offline" role="alert">
      {{ authError }}
    </p>

    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" v-if="!route.meta.requiresAuth || isLoggedIn" :key="currentUser?.$id || 'guest'" />
      </Transition>
    </RouterView>

    <Footer />
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

.skip {
  position: fixed;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 40;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  background: var(--brand);
  color: var(--on-accent);
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
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 4rem;
  padding: 0.5rem clamp(1rem, 4vw, 3rem);
  padding-top: calc(0.5rem + env(safe-area-inset-top));
  background: var(--chrome);
  border-bottom: 1px solid var(--line);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-height: var(--touch);
  text-decoration: none;
  font-family: 'Caveat', cursive;
  font-size: clamp(1.15rem, 5vw, 1.7rem);
  font-weight: 700;
  color: var(--text);
}

.brand-mark {
  display: block;
  width: 2.4rem;
  height: 2.4rem;
  flex: 0 0 auto;
  border-radius: 0.65rem;
  object-fit: cover;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-link {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--text);
}

.user-link:hover {
  background: var(--ink-3);
}

.user-link--on {
  border-color: var(--accent-text);
  color: var(--accent-text);
  background: var(--brand-soft);
}

.app>main {
  flex: 1 0 auto;
}

.theme-notice {
  margin: 0;
  padding: 0.75rem 1rem;
  background: var(--brand-soft);
  color: var(--text);
}

.offline {
  margin: 0;
  padding: 0.6rem 1rem;
  background: var(--gold);
  color: var(--ink-2);
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
}

/* Mobile: app-style bottom tab bar. */
.tabs {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 20;
  display: flex;
  height: calc(var(--nav-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--chrome);
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
  color: var(--accent-text);
  font-weight: 700;
}

/* Desktop: same links, moved to the top right. */
@media (min-width: 960px) {
  .tabs {
    position: static;
    order: 1;
    margin-left: auto;
    height: auto;
    padding: 0;
    gap: 0.25rem;
    background: none;
    backdrop-filter: none;
    border: 0;
  }

  .header-actions {
    order: 2;
  }

  .tab {
    flex-direction: row;
    gap: 0.5rem;
    min-height: 44px;
    padding: 0 0.75rem;
    border-radius: 0.8rem;
    font-size: 0.95rem;
  }

  .tab--dashboard {
    padding-inline: 1.5rem;
  }

  .tab:hover {
    background: var(--ink-3);
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
