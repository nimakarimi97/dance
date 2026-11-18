import { createRouter, createWebHashHistory } from 'vue-router'
import DanzaView from './views/DanzaView.vue'
import FiguraView from './views/FiguraView.vue'
import HomeView from './views/HomeView.vue'

// Hash history: funziona su GitHub Pages senza configurazioni extra per il routing.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/danza/:danza', name: 'danza', component: DanzaView, props: true },
    { path: '/figura/:figura', name: 'figura', component: FiguraView, props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
