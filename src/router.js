import { createRouter, createWebHistory } from 'vue-router'
import { ensureAuth, refreshUser, isLoggedIn } from './lib/auth.js'
import { isFeatureEnabled } from './config/features.js'
import AuthFailureView from './views/AuthFailureView.vue'
import AuthSuccessView from './views/AuthSuccessView.vue'
import AuthView from './views/AuthView.vue'
import DanzaView from './views/DanzaView.vue'
import DashboardView from './views/DashboardView.vue'
import FiguraView from './views/FiguraView.vue'
import HomeView from './views/HomeView.vue'
import OfflineView from './views/OfflineView.vue'

const contentRequiresAuth = !isFeatureEnabled('publicContent')

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/offline', name: 'offline', component: OfflineView },
    { path: '/danza/:danza', name: 'danza', component: DanzaView, props: true, meta: { requiresAuth: contentRequiresAuth } },
    { path: '/figura/:figura', name: 'figura', component: FiguraView, props: true, meta: { requiresAuth: contentRequiresAuth } },
    { path: '/auth', name: 'auth', component: AuthView, meta: { feature: 'auth', guestOnly: true } },
    { path: '/auth/success', name: 'auth-success', component: AuthSuccessView, meta: { feature: 'auth' } },
    { path: '/auth/failure', name: 'auth-failure', component: AuthFailureView, meta: { feature: 'auth' } },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { feature: 'dashboard', requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async to => {
  const { feature, requiresAuth, guestOnly } = to.meta

  if (feature && !isFeatureEnabled(feature)) return { name: 'home' }
  if (requiresAuth && !isFeatureEnabled('auth')) return { name: 'home' }
  if (!requiresAuth && !guestOnly) return true

  await (requiresAuth ? refreshUser() : ensureAuth())

  if (requiresAuth && !isLoggedIn.value) {
    return { name: 'auth', query: { redirect: to.fullPath } }
  }
  if (guestOnly && isLoggedIn.value) return { name: 'dashboard' }
  return true
})
