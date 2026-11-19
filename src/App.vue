<script setup>
import { onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { ensureAuth, isLoggedIn } from './lib/auth.js'
import { isFeatureEnabled } from './config/features.js'

onMounted(() => {
  if (isFeatureEnabled('auth')) ensureAuth()
})
</script>

<template>
  <div class="app">
    <div class="blobs" aria-hidden="true">
      <span class="blob blob-rose" />
      <span class="blob blob-indigo" />
      <span class="blob blob-amber" />
    </div>

    <header class="topbar">
      <RouterLink to="/" class="brand">
        <span class="brand-mark">♪</span>
        <span>Salsa &amp; Bachata</span>
      </RouterLink>
      <RouterLink
        v-if="isFeatureEnabled('auth')"
        :to="isLoggedIn ? { name: 'dashboard' } : { name: 'auth' }"
        class="account"
      >
        {{ isLoggedIn ? 'Dashboard' : 'Accedi' }}
      </RouterLink>
    </header>

    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <footer class="footer">
      <a href="https://nimakarimi.me" target="_blank" rel="noopener">nimakarimi.me</a>
    </footer>
  </div>
</template>

<style scoped>
.app {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
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
  filter: blur(90px);
  opacity: 0.35;
  animation: drift 22s ease-in-out infinite alternate;
}
.blob-rose { background: #e11d48; top: -20%; left: -15%; }
.blob-indigo { background: #2629e1; bottom: -25%; right: -15%; animation-delay: -7s; }
.blob-amber { background: #f59e0b; top: 30%; left: 40%; opacity: 0.18; animation-delay: -14s; }

@keyframes drift {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(6vw, 4vh, 0) scale(1.15); }
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 1rem clamp(1rem, 4vw, 3rem);
  backdrop-filter: blur(12px);
  background: rgba(15, 23, 42, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: #f8fafc;
  text-decoration: none;
  font-family: 'Caveat', cursive;
  font-size: 1.6rem;
  font-weight: 700;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #e11d48, #2629e1);
  font-size: 1rem;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.account {
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  text-decoration: none;
  font-size: 0.9rem;
}
.account:hover { background: rgba(255, 255, 255, 0.06); }

.footer {
  margin-top: auto;
  padding: 2rem 1rem;
  text-align: center;
  font-size: 0.85rem;
  color: #64748b;
}
.footer a { color: #a5b4fc; text-decoration: none; }

.page-enter-active,
.page-leave-active { transition: opacity 0.35s ease, transform 0.35s ease; }
.page-enter-from { opacity: 0; transform: translateY(16px); }
.page-leave-to { opacity: 0; transform: translateY(-16px); }
</style>
