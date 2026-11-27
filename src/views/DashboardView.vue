<script setup>
import { computed, defineAsyncComponent, nextTick, shallowRef, useTemplateRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { currentUser, isAdmin, isSuperAdmin, signOut } from '../lib/auth.js'
import { dances, figures, refreshFigures, useFigureCatalog } from '../data/danze.js'
import { ANALYTICS_EVENTS } from '../lib/analytics.js'
import { recordAnalyticsEvent } from '../lib/figures.js'
import DashboardCatalog from '../components/DashboardCatalog.vue'
import AdminUserRoles from '../components/AdminUserRoles.vue'
import FigureEditor from '../components/FigureEditor.vue'
import StudioIcon from '../components/StudioIcon.vue'

const AdminAnalytics = defineAsyncComponent(() => import('../components/AdminAnalytics.vue'))
const AdminAnalyticsSnapshot = defineAsyncComponent(() => import('../components/AdminAnalyticsSnapshot.vue'))
const router = useRouter()
const { loading, error, retry } = useFigureCatalog()
const isSigningOut = shallowRef(false)
const signOutError = shallowRef('')
const editing = shallowRef(false)
const selectedFigure = shallowRef(null)
const savedId = shallowRef('')
const videoFilter = shallowRef('all')
const createButton = useTemplateRef('create-button')
const sectionHeading = useTemplateRef('section-heading')
const activeSection = shallowRef('panoramica')
const sectionTitles = {
  panoramica: 'Panoramica',
  catalogo: 'Catalogo figure',
  visualizzazioni: 'Visualizzazioni',
  utenti: 'Utenti',
  account: 'Il mio account',
}
const sectionTitle = computed(() => sectionTitles[activeSection.value])
const sectionDescriptions = {
  panoramica: 'Panoramica del repertorio e progressi video.',
  catalogo: 'Gestisci figure, video e contenuti del catalogo.',
  visualizzazioni: 'Monitora trend e performance delle figure.',
  utenti: 'Gestisci ruoli e accessi degli utenti registrati.',
  account: 'Impostazioni personali e sicurezza account.',
}
const sectionDescription = computed(
  () => sectionDescriptions[activeSection.value] || 'Gestisci il tuo spazio personale.',
)
const sectionItems = computed(() => {
  const items = [
    { id: 'panoramica', label: 'Panoramica', icon: 'grid' },
    { id: 'catalogo', label: 'Catalogo', icon: 'library' },
  ]
  if (isAdmin.value) items.push({ id: 'visualizzazioni', label: 'Statistiche', icon: 'video' })
  if (isSuperAdmin.value) items.push({ id: 'utenti', label: 'Utenti', icon: 'user' })
  items.push({ id: 'account', label: 'Account', icon: 'shield' })
  return items
})
let editorTrigger = null

const firstName = computed(() => currentUser.value?.name?.trim().split(/\s+/)[0] || 'in pista')
const initials = computed(() =>
  (currentUser.value?.name || currentUser.value?.email || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase(),
)
const withVideo = computed(() => figures.value.filter((figure) => figure.videoFileId || figure.youtubeId).length)
const missingVideo = computed(() => figures.value.length - withVideo.value)
const videoCoverage = computed(() =>
  figures.value.length ? Math.round((withVideo.value / figures.value.length) * 100) : 0,
)
const danceSummary = computed(() =>
  Object.values(dances).map((dance) => ({
    ...dance,
    total: figures.value.filter((figure) => figure.danza === dance.id).length,
    videos: figures.value.filter((figure) => figure.danza === dance.id && (figure.videoFileId || figure.youtubeId))
      .length,
  })),
)
const joinedDate = computed(() => {
  const date = currentUser.value?.registration
  return date ? new Intl.DateTimeFormat('it', { month: 'long', year: 'numeric' }).format(new Date(date)) : null
})

async function showSection(id) {
  if (activeSection.value !== id && currentUser.value?.$id) {
    recordAnalyticsEvent({
      eventType: ANALYTICS_EVENTS.DASHBOARD_NAV_CLICK,
      eventTarget: id,
      userId: currentUser.value.$id,
    })
  }
  activeSection.value = id
  await nextTick()
  window.scrollTo({ top: 0 })
  sectionHeading.value?.focus({ preventScroll: true })
}

function openEditor(figure = null) {
  if (!isAdmin.value) return
  editorTrigger = document.activeElement
  selectedFigure.value = figure
  savedId.value = ''
  editing.value = true
}

async function closeEditor() {
  editing.value = false
  await nextTick()
  const target = editorTrigger?.isConnected ? editorTrigger : createButton.value
  target?.focus({ preventScroll: true })
}

async function onSaved(id) {
  savedId.value = id
  recordAnalyticsEvent({
    eventType: selectedFigure.value
      ? ANALYTICS_EVENTS.ADMIN_FIGURE_EDIT
      : ANALYTICS_EVENTS.ADMIN_FIGURE_CREATE,
    figureId: id,
    eventTarget: id,
    userId: currentUser.value?.$id,
  })
  const refreshing = refreshFigures()
  await closeEditor()
  await refreshing
}

function showMissingVideos() {
  videoFilter.value = 'missing'
  showSection('catalogo')
}

async function signOutUser() {
  isSigningOut.value = true
  signOutError.value = ''
  try {
    await signOut()
    await router.replace({ name: 'auth' })
  } catch {
    signOutError.value = 'Uscita non riuscita. Controlla la connessione e riprova.'
  } finally {
    isSigningOut.value = false
  }
}
</script>

<template>
  <main class="dashboard studio-theme">
    <aside class="workspace-rail" aria-label="Il tuo spazio">
      <div class="workspace-name">
        <span class="workspace-monogram">
          <StudioIcon name="music" />
        </span>
        <div><strong>Il tuo studio</strong><span>Salsa &amp; Bachata</span></div>
      </div>
      <nav class="workspace-nav" aria-label="Navigazione dashboard">
        <a
          v-for="item in sectionItems"
          :key="item.id"
          :href="`#${item.id}`"
          :class="{ selected: activeSection === item.id }"
          :aria-current="activeSection === item.id ? 'page' : undefined"
          @click.prevent="showSection(item.id)"
        >
          <StudioIcon :name="item.icon" /> {{ item.label }}
          <span v-if="item.id === 'catalogo' && !loading && !error" class="nav-count">{{ figures.length }}</span>
        </a>
      </nav>
      <div class="rail-note">
        <StudioIcon name="shield" />
        <p>{{ isAdmin ? 'Spazio amministratore' : 'Spazio personale' }}<span>I tuoi contenuti, al sicuro.</span></p>
      </div>
      <a href="#account" class="rail-person" @click.prevent="showSection('account')"><span class="avatar small">{{
        initials }}</span>
        <div>
          <strong>{{ currentUser?.name || 'Il tuo account' }}</strong><span>{{
            isAdmin ? 'Amministratore' : 'Ballerino'
          }}</span>
        </div>
      </a>
    </aside>

    <div class="workspace-main">
      <header class="workspace-header">
        <div>
          <p class="greeting">Dashboard · Bentornato, {{ firstName }}</p>
          <h1 ref="section-heading" tabindex="-1">{{ sectionTitle }}</h1>
          <p class="header-description">{{ sectionDescription }}</p>
        </div>
        <button v-if="isAdmin" ref="create-button" type="button" class="studio-button primary" @click="openEditor()">
          <StudioIcon name="plus" /> Nuova figura
        </button>
        <RouterLink v-else :to="{ name: 'danza', params: { danza: 'salsa' } }" class="studio-button primary">Esplora le
          figure
          <StudioIcon name="arrow" />
        </RouterLink>
      </header>

      <nav class="section-tabs" aria-label="Sezioni dashboard">
        <button
          v-for="item in sectionItems"
          :key="item.id"
          type="button"
          :class="{ active: activeSection === item.id }"
          :aria-pressed="activeSection === item.id"
          :aria-current="activeSection === item.id ? 'page' : undefined"
          @click="showSection(item.id)"
        >
          <StudioIcon :name="item.icon" />
          <span>{{ item.label }}</span>
          <span v-if="item.id === 'catalogo' && !loading && !error" class="tab-badge">{{ figures.length }}</span>
        </button>
      </nav>

      <div v-if="savedId" class="save-notice" role="status">
        <StudioIcon name="check" /><span>Figura salvata.
          <RouterLink :to="{ name: 'figura', params: { figura: savedId } }">Apri la figura</RouterLink>
        </span><button type="button" aria-label="Chiudi conferma" @click="savedId = ''">
          <StudioIcon name="close" />
        </button>
      </div>

      <template v-if="activeSection === 'panoramica'">
        <section class="metrics" aria-label="Riepilogo del catalogo" :aria-busy="loading">
          <article class="metric">
            <span class="metric-icon">
              <StudioIcon name="library" />
            </span>
            <div>
              <p>Figure nel catalogo</p>
              <strong>{{ loading || error ? '—' : figures.length }}</strong>
            </div>
          </article>
          <article class="metric">
            <span class="metric-icon mint">
              <StudioIcon name="video" />
            </span>
            <div>
              <p>Video disponibili</p>
              <strong>{{ loading || error ? '—' : withVideo }}</strong>
            </div>
          </article>
          <article class="metric">
            <span class="metric-icon amber">
              <StudioIcon name="clock" />
            </span>
            <div>
              <p>Video da aggiungere</p>
              <strong>{{ loading || error ? '—' : missingVideo }}</strong>
            </div>
          </article>
        </section>

        <div class="overview-grid">
          <section class="repertoire-panel" aria-labelledby="repertoire-title">
            <div class="panel-heading">
              <h2 id="repertoire-title">Due ritmi, il tuo repertorio</h2>
              <StudioIcon name="music" />
            </div>
            <div class="dance-overview">
              <RouterLink v-for="dance in danceSummary" :key="dance.id"
                :to="{ name: 'danza', params: { danza: dance.id } }" class="dance-summary" :data-dance="dance.id">
                <div class="dance-summary-top">
                  <span class="dance-initial" aria-hidden="true">{{ dance.nome[0] }}</span>
                  <StudioIcon name="arrow" />
                </div>
                <h3>{{ dance.nome }}</h3>
                <p>
                  {{
                    loading
                      ? 'Caricamento catalogo…'
                      : error
                        ? 'Dati non disponibili'
                        : `${dance.total} figure, ${dance.videos} con video`
                  }}
                </p>
                <span class="dance-style-list">{{dance.stili.map((style) => style.nome).join(' / ')}}</span>
              </RouterLink>
            </div>
          </section>
          <section class="coverage-panel" aria-labelledby="coverage-title">
            <div class="panel-heading">
              <h2 id="coverage-title">Il catalogo prende forma</h2>
              <StudioIcon name="video" />
            </div>
            <div class="coverage-value">
              <strong>{{ loading || error ? '—' : `${videoCoverage}%` }}</strong><span>delle figure ha un video</span>
            </div>
            <progress v-if="!loading && !error" :value="withVideo" :max="figures.length || 1"
              aria-label="Figure con video" />
            <p>
              {{
                loading || error
                  ? 'I dati saranno disponibili con il catalogo.'
                  : missingVideo
                    ? `${missingVideo} ${missingVideo === 1 ? 'figura aspetta' : 'figure aspettano'} un video per passare
              dalla
              teoria alla pista.`
                    : figures.length
                      ? 'Ogni figura ha il suo video. Il repertorio è pronto.'
                      : 'Il primo video darà vita al tuo catalogo.'
              }}
            </p>
            <button v-if="missingVideo && !loading && !error" type="button" class="text-action"
              @click="showMissingVideos">
              Vedi le figure senza video
              <StudioIcon name="arrow" />
            </button>
          </section>
        </div>
        <AdminAnalyticsSnapshot
          v-if="isAdmin"
          @open-analytics="showSection('visualizzazioni')"
        />

      </template>

      <DashboardCatalog v-if="activeSection === 'catalogo'" :figures="figures" :loading="loading" :error="error"
        :admin="isAdmin" :user-id="currentUser?.$id" v-model:video-filter="videoFilter" @create="openEditor()"
        @edit="openEditor" @retry="retry" />

      <AdminAnalytics v-if="isAdmin && activeSection === 'visualizzazioni'" />
      <AdminUserRoles v-if="isSuperAdmin && activeSection === 'utenti'" />

      <section v-if="activeSection === 'account'" id="account" class="account-panel" aria-labelledby="account-title">
        <div class="account-person">
          <span class="avatar">{{ initials }}</span>
          <div>
            <h2 id="account-title">{{ currentUser?.name || 'Il mio account' }}</h2>
            <p>{{ currentUser?.email }}</p>
            <span class="account-role">
              <StudioIcon :name="isAdmin ? 'shield' : 'user'" />{{ isAdmin ? 'Amministratore' : 'Utente registrato'
              }}<template v-if="joinedDate"><span aria-hidden="true">·</span> Qui da {{ joinedDate }}</template>
            </span>
          </div>
        </div>
        <button type="button" class="studio-button secondary logout" :disabled="isSigningOut" @click="signOutUser">
          <StudioIcon name="logout" />{{ isSigningOut ? 'Uscita…' : 'Esci dall’account' }}
        </button>
        <p v-if="signOutError" class="account-error" role="alert">
          {{ signOutError }}
        </p>
      </section>
    </div>

    <FigureEditor v-if="editing && isAdmin" :figure="selectedFigure" @close="closeEditor" @saved="onSaved" />
  </main>
</template>

<style scoped>
.dashboard {
  --studio-bg: #090d1a;
  --studio-panel: #101829;
  --studio-panel-soft: #0f1626;
  --studio-raised: #152037;
  --studio-line: rgba(148, 163, 184, 0.2);
  --studio-text: #e2e8f0;
  --studio-muted: #94a3b8;
  --studio-accent: #7c3aed;
  --studio-accent-2: #22d3ee;
  --studio-accent-soft: rgba(124, 58, 237, 0.18);
  --studio-hover: #111c31;
  --studio-success: #34d399;
  --studio-warning: #f59e0b;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.4rem;
  width: min(1500px, 100% - 2.5rem);
  margin: 0 auto;
  padding: 1.5rem 0 1rem;
  color: var(--studio-text);
  position: relative;
}

.dashboard::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background:
    radial-gradient(circle at 15% -20%, rgba(124, 58, 237, 0.25), transparent 45%),
    radial-gradient(circle at 80% 0%, rgba(34, 211, 238, 0.16), transparent 40%);
}

.workspace-rail {
  display: none;
  min-width: 0;
}

.workspace-main {
  display: grid;
  align-content: start;
  gap: 1rem;
  min-width: 0;
}

.workspace-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.25rem;
  border: 1px solid var(--studio-line);
  border-radius: 1rem;
  background: linear-gradient(160deg, rgba(16, 24, 41, 0.97), rgba(11, 17, 32, 0.94));
  box-shadow: 0 24px 48px rgba(2, 6, 23, 0.34);
  scroll-margin-top: 5rem;
}

.greeting {
  margin: 0 0 0.5rem;
  color: #c4b5fd;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.workspace-header h1 {
  margin: 0;
  font-size: clamp(1.9rem, 3.2vw, 2.4rem);
  font-weight: 650;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.header-description {
  margin: 0.6rem 0 0;
  color: var(--studio-muted);
  font-size: 0.88rem;
  max-width: 42ch;
}

.studio-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 2.85rem;
  padding: 0.65rem 1.05rem;
  flex-shrink: 0;
  border: 1px solid var(--studio-line);
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.studio-button.primary {
  border-color: transparent;
  background: linear-gradient(135deg, var(--studio-accent), #2563eb);
  color: #f8fafc;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.3);
}

.studio-button.primary:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.studio-button.secondary {
  background: var(--studio-raised);
  color: var(--studio-text);
}

.studio-button.secondary:hover {
  border-color: rgba(148, 163, 184, 0.5);
  background: #182746;
}

.studio-button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.section-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.section-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.5rem;
  border: 1px solid var(--studio-line);
  border-radius: 999px;
  padding: 0.4rem 0.85rem;
  background: var(--studio-panel-soft);
  color: var(--studio-muted);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}

.section-tabs button:hover {
  border-color: rgba(148, 163, 184, 0.5);
  color: var(--studio-text);
}

.section-tabs button.active {
  border-color: transparent;
  background: linear-gradient(135deg, var(--studio-accent-soft), rgba(34, 211, 238, 0.16));
  color: #ddd6fe;
}

.tab-badge {
  min-width: 1.4rem;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  border: 1px solid var(--studio-line);
  color: var(--studio-text);
  font-size: 0.68rem;
  text-align: center;
}

.save-notice {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  border: 1px solid rgba(52, 211, 153, 0.45);
  border-radius: 0.75rem;
  background: rgba(16, 185, 129, 0.08);
  color: #6ee7b7;
  font-size: 0.88rem;
}

.save-notice > span {
  flex: 1;
}

.save-notice button {
  display: grid;
  place-items: center;
  border: 0;
  min-width: 2.4rem;
  min-height: 2.4rem;
  background: none;
  color: inherit;
  cursor: pointer;
}

.save-notice a {
  color: #a7f3d0;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.metric {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--studio-line);
  border-radius: 1rem;
  background: linear-gradient(180deg, var(--studio-panel), var(--studio-panel-soft));
}

.metric-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid rgba(124, 58, 237, 0.4);
  border-radius: 0.7rem;
  color: #c4b5fd;
  background: rgba(124, 58, 237, 0.15);
}

.metric-icon.mint {
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.4);
  background: rgba(16, 185, 129, 0.12);
}

.metric-icon.amber {
  color: #fcd34d;
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.12);
}

.metric p {
  font-size: 0.78rem;
  color: var(--studio-muted);
  margin: 0 0 0.4rem;
}

.metric strong {
  display: block;
  font-size: 1.75rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 0.9rem;
}

.repertoire-panel,
.coverage-panel {
  border: 1px solid var(--studio-line);
  border-radius: 1rem;
  padding: 1.25rem;
  background: var(--studio-panel);
  min-width: 0;
  box-shadow: 0 14px 34px rgba(2, 6, 23, 0.26);
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.panel-heading h2 {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
}

.panel-heading>.studio-icon {
  color: var(--studio-muted);
}

.dance-overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 0.9rem;
  border: 1px solid var(--studio-line);
  border-radius: 0.9rem;
  overflow: hidden;
}

.dance-summary {
  text-decoration: none;
  min-width: 0;
  padding: 0.9rem 1rem;
  background: var(--studio-panel-soft);
  transition: background-color 0.2s ease;
}

.dance-summary+.dance-summary {
  border-left: 1px solid var(--studio-line);
}

.dance-summary-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--studio-muted);
}

.dance-initial {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
  color: #ddd6fe;
}

.dance-summary h3 {
  font-size: 1rem;
  margin: 0.55rem 0 0;
}

.dance-summary p {
  margin: 0.4rem 0;
  color: var(--studio-muted);
  font-size: 0.78rem;
}

.dance-style-list {
  font-size: 0.72rem;
  color: var(--studio-muted);
}

.dance-summary:hover h3 {
  color: #c4b5fd;
}

.dance-summary:hover {
  background: #132039;
}

.coverage-value {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin: 1.2rem 0 1rem;
}

.coverage-value strong {
  font-size: 2.1rem;
  line-height: 1;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
}

.coverage-value span {
  color: var(--studio-muted);
  font-size: 0.75rem;
}

.coverage-panel progress {
  display: block;
  width: 100%;
  height: 0.5rem;
  border: 0;
  border-radius: 999px;
  overflow: hidden;
  background: var(--studio-line);
  color: var(--studio-accent-2);
  accent-color: var(--studio-accent-2);
}

.coverage-panel progress::-webkit-progress-bar {
  background: var(--studio-line);
}

.coverage-panel progress::-webkit-progress-value {
  background: linear-gradient(90deg, var(--studio-accent), var(--studio-accent-2));
  border-radius: 999px;
}

.coverage-panel progress::-moz-progress-bar {
  background: linear-gradient(90deg, var(--studio-accent), var(--studio-accent-2));
}

.coverage-panel>p {
  font-size: 0.82rem;
  color: var(--studio-muted);
  line-height: 1.6;
  margin: 0.8rem 0 0.25rem;
}

.text-action {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  border: 0;
  padding: 0.5rem 0;
  min-height: 2.75rem;
  background: none;
  color: #c4b5fd;
  cursor: pointer;
  font-size: 0.82rem;
  text-align: left;
}

.text-action .studio-icon {
  width: 1rem;
  height: 1rem;
}

.account-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding: 1.5rem;
  border: 1px solid var(--studio-line);
  border-radius: 1rem;
  background: linear-gradient(180deg, var(--studio-panel), var(--studio-panel-soft));
  scroll-margin-top: 5rem;
}

.account-person {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.account-person>div {
  min-width: 0;
}

.avatar {
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid rgba(124, 58, 237, 0.45);
  border-radius: 50%;
  color: #ddd6fe;
  background: rgba(124, 58, 237, 0.16);
  font-size: 0.9rem;
  font-weight: 700;
}

.avatar.small {
  width: 2.25rem;
  height: 2.25rem;
  font-size: 0.7rem;
}

.account-person h2 {
  font-size: 1rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.account-person p {
  font-size: 0.8rem;
  margin: 0.2rem 0 0.5rem;
  color: var(--studio-muted);
  overflow-wrap: anywhere;
}

.account-role {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  color: var(--studio-muted);
  font-size: 0.75rem;
}

.account-role .studio-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.account-error {
  flex-basis: 100%;
  color: #fcd34d;
  font-size: 0.9rem;
}

@media (min-width: 1200px) {
  .dashboard {
    grid-template-columns: 248px minmax(0, 1fr);
    gap: 1.3rem;
    padding-top: 2rem;
  }

  .section-tabs {
    display: none;
  }

  .workspace-rail {
    display: flex;
    flex-direction: column;
    align-self: start;
    position: sticky;
    top: 5.5rem;
    min-height: min(720px, calc(100dvh - 8rem));
    padding: 1rem;
    border: 1px solid var(--studio-line);
    border-radius: 1rem;
    background: linear-gradient(180deg, var(--studio-panel), var(--studio-panel-soft));
  }

  .workspace-name {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .workspace-monogram {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    border: 1px solid var(--studio-line);
    border-radius: 0.7rem;
    color: #c4b5fd;
    background: rgba(124, 58, 237, 0.14);
  }

  .workspace-name strong {
    display: block;
    font-size: 0.95rem;
  }

  .workspace-name div>span {
    display: block;
    margin-top: 0.15rem;
    color: var(--studio-muted);
    font-size: 0.75rem;
  }

  .workspace-nav {
    display: grid;
    gap: 0.35rem;
    margin-top: 1.6rem;
  }

  .workspace-nav a {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-height: 2.75rem;
    padding: 0.6rem;
    border-radius: 0.7rem;
    border: 1px solid transparent;
    color: var(--studio-muted);
    text-decoration: none;
    font-size: 0.82rem;
  }

  .workspace-nav a.selected {
    border-color: rgba(124, 58, 237, 0.35);
    background: var(--studio-accent-soft);
    color: #ddd6fe;
  }

  .workspace-nav a:hover {
    border-color: var(--studio-line);
    color: var(--studio-text);
    background: rgba(15, 23, 42, 0.7);
  }

  .nav-count {
    margin-left: auto;
    padding: 0.1rem 0.4rem;
    border: 1px solid var(--studio-line);
    border-radius: 999px;
    font-size: 0.75rem;
  }

  .rail-note {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    margin: auto 0 1rem;
    padding-top: 1.5rem;
    color: var(--studio-muted);
  }

  .rail-note .studio-icon {
    width: 1rem;
    height: 1rem;
  }

  .rail-note p {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.5;
  }

  .rail-note p span {
    display: block;
    margin-top: 0.3rem;
  }

  .rail-person {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.85rem 0 0;
    border-top: 1px solid var(--studio-line);
    margin-top: 0.8rem;
    color: inherit;
    text-decoration: none;
  }

  .rail-person>div {
    min-width: 0;
  }

  .rail-person strong {
    display: block;
    font-size: 0.75rem;
    overflow-wrap: anywhere;
  }

  .rail-person div>span {
    display: block;
    font-size: 0.75rem;
    margin-top: 0.2rem;
    color: var(--studio-muted);
  }
}

@media (max-width: 767px) {
  .dashboard {
    width: calc(100% - 2rem);
    padding-top: 1.1rem;
  }

  .workspace-main {
    gap: 1.1rem;
  }

  .workspace-header {
    padding: 1rem;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1.1rem;
  }

  .workspace-header .studio-button {
    width: 100%;
  }

  .section-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .section-tabs button {
    justify-content: center;
    min-width: 0;
    padding-inline: 0.6rem;
  }

  .section-tabs button:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .header-description {
    font-size: 0.85rem;
  }

  .metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .metric {
    display: grid;
    align-content: start;
    justify-items: start;
    gap: 0.55rem;
    min-width: 0;
    padding: 0.75rem 0.65rem;
    border-radius: 0.8rem;
  }

  .metric-icon {
    display: grid;
    width: 2rem;
    height: 2rem;
    border-radius: 0.6rem;
  }

  .metric p {
    min-height: auto;
    margin-bottom: 0;
    font-size: 0.68rem;
    line-height: 1.35;
  }

  .metric strong {
    font-size: 1.4rem;
  }

  .overview-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .repertoire-panel,
  .coverage-panel {
    padding: 1rem;
  }

  .dance-overview {
    grid-template-columns: 1fr;
  }

  .dance-summary + .dance-summary {
    border-left: 0;
    border-top: 1px solid var(--studio-line);
  }

  .coverage-value {
    margin-block: 1rem;
  }

  .account-panel {
    padding: 1.1rem;
    gap: 1.25rem;
  }

  .account-person {
    align-items: flex-start;
    gap: 0.75rem;
  }

  .account-panel .logout {
    width: 100%;
  }
}

@media (max-width: 380px) {
  .metrics {
    gap: 0.35rem;
  }

  .metric {
    padding: 0.65rem 0.5rem;
  }

  .metric-icon {
    display: none;
  }

  .metric p {
    font-size: 0.65rem;
  }

  .section-tabs button {
    gap: 0.3rem;
    font-size: 0.74rem;
  }
}
</style>
