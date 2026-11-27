<script setup>
import { computed, defineAsyncComponent, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { onBeforeRouteUpdate, RouterLink, useRoute, useRouter } from 'vue-router'
import { currentUser, isAdmin, isSuperAdmin, signOut } from '../lib/auth.js'
import { figures, refreshFigures, useFigureCatalog } from '../data/danze.js'
import { ANALYTICS_EVENTS } from '../lib/analytics.js'
import { recordAnalyticsEvent } from '../lib/figures.js'
import { deleteAdminFigure } from '../lib/admin-api.js'
import { isFeatureEnabled } from '../config/features.js'
import DashboardCatalog from '../components/DashboardCatalog.vue'
import AdminUserRoles from '../components/AdminUserRoles.vue'
import FigureEditor from '../components/FigureEditor.vue'
import StudioIcon from '../components/StudioIcon.vue'
import PersonalPractice from '../components/PersonalPractice.vue'
import DashboardNavigation from '../components/DashboardNavigation.vue'

const AdminAnalytics = defineAsyncComponent(() => import('../components/AdminAnalytics.vue'))
const AdminAnalyticsSnapshot = defineAsyncComponent(() => import('../components/AdminAnalyticsSnapshot.vue'))
const AdminFigureOperations = defineAsyncComponent(() => import('../components/AdminFigureOperations.vue'))
const router = useRouter()
const route = useRoute()
const { loading, error, retry } = useFigureCatalog()
const isSigningOut = shallowRef(false)
const signOutError = shallowRef('')
const editing = shallowRef(false)
const selectedFigure = shallowRef(null)
const savedId = shallowRef('')
const deletingFigureId = shallowRef('')
const deleteError = shallowRef('')
const deleteMessage = shallowRef('')
const videoFilter = shallowRef('all')
const sectionHeading = useTemplateRef('section-heading')
const personalPractice = useTemplateRef('personal-practice')
const practiceEnabled = isFeatureEnabled('practice')
const catalogEnabled = isFeatureEnabled('catalog')
const figureEditorEnabled = isFeatureEnabled('figureEditor')
const adminOperationsEnabled = isFeatureEnabled('adminOperations')
const analyticsEnabled = isFeatureEnabled('analytics')
const userRolesEnabled = isFeatureEnabled('userRoles')
const favoritesEnabled = isFeatureEnabled('favorites')

function defaultSection() {
  return isAdmin.value || !practiceEnabled ? 'panoramica' : 'pratica'
}

const activeSection = shallowRef(defaultSection())
const sectionTitles = {
  panoramica: 'Panoramica',
  pratica: 'La mia pratica',
  operazioni: 'Importazione e cronologia',
  catalogo: 'Catalogo figure',
  visualizzazioni: 'Visualizzazioni',
  utenti: 'Utenti',
  account: 'Il mio account',
}
const sectionTitle = computed(() => activeSection.value === 'catalogo' && !isAdmin.value
  ? 'Esplora figure' : sectionTitles[activeSection.value])
const sectionDescriptions = {
  panoramica: 'Panoramica del repertorio e progressi video.',
  pratica: favoritesEnabled
    ? 'Preferiti, liste personali e progressi di apprendimento.'
    : 'Liste personali e progressi di apprendimento.',
  operazioni: 'Modifiche massive, importazione con anteprima e audit amministrativo.',
  catalogo: 'Gestisci figure, video e contenuti del catalogo.',
  visualizzazioni: 'Monitora trend e performance delle figure.',
  utenti: 'Gestisci ruoli e accessi degli utenti registrati.',
  account: 'Impostazioni personali e sicurezza account.',
}
const sectionDescription = computed(
  () => activeSection.value === 'catalogo' && !isAdmin.value
    ? 'Trova una figura e apri il video per esercitarti.'
    : sectionDescriptions[activeSection.value] || 'Gestisci il tuo spazio personale.',
)
const sectionItems = computed(() => {
  const items = [{ id: 'panoramica', label: 'Panoramica', icon: 'grid' }]
  if (practiceEnabled) items.push({ id: 'pratica', label: 'La mia pratica', icon: 'music' })
  if (catalogEnabled) items.push({ id: 'catalogo', label: isAdmin.value ? 'Catalogo' : 'Esplora figure', icon: 'library' })
  if (isAdmin.value && adminOperationsEnabled) items.push({ id: 'operazioni', label: 'Import e audit', icon: 'edit' })
  if (isAdmin.value && analyticsEnabled) items.push({ id: 'visualizzazioni', label: 'Analytics', icon: 'video' })
  if (isSuperAdmin.value && userRolesEnabled) items.push({ id: 'utenti', label: 'Utenti', icon: 'user' })
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
const joinedDate = computed(() => {
  const date = currentUser.value?.registration
  return date ? new Intl.DateTimeFormat('it', { month: 'long', year: 'numeric' }).format(new Date(date)) : null
})

async function showSection(id) {
  if (id === activeSection.value) return
  await router.replace({ query: { ...route.query, sezione: id } })
}

onBeforeRouteUpdate((to) => {
  if (to.query.sezione !== route.query.sezione && activeSection.value === 'pratica') {
    return personalPractice.value?.canLeave() !== false
  }
})
watch(() => route.query.sezione, async (section) => {
  const id = section === 'account' || sectionItems.value.some(item => item.id === section)
    ? section : defaultSection()
  if (id === activeSection.value) return
  if (currentUser.value?.$id) {
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
}, { immediate: true })

function openEditor(figure = null) {
  if (!isAdmin.value || !figureEditorEnabled) return
  editorTrigger = document.activeElement
  selectedFigure.value = figure
  savedId.value = ''
  editing.value = true
}

async function closeEditor() {
  editing.value = false
  await nextTick()
  const target = editorTrigger?.isConnected ? editorTrigger : sectionHeading.value
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

async function deleteFigure(figure) {
  if (!isAdmin.value || deletingFigureId.value) return
  const id = figure.id || figure.$id
  if (!id || !figure.$updatedAt) {
    deleteError.value = 'Impossibile verificare la versione della figura. Ricarica il catalogo.'
    return
  }
  deletingFigureId.value = id
  deleteError.value = ''
  deleteMessage.value = ''
  try {
    await deleteAdminFigure({ id, expectedUpdatedAt: figure.$updatedAt })
    await refreshFigures()
    deleteMessage.value = 'Figura eliminata.'
  } catch (cause) {
    deleteError.value = cause.message || 'Eliminazione non riuscita. Ricarica il catalogo prima di riprovare.'
  } finally {
    deletingFigureId.value = ''
  }
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
  } catch (cause) {
    signOutError.value = cause.message || 'Uscita non riuscita. Controlla la connessione e riprova.'
  } finally {
    isSigningOut.value = false
  }
}
</script>

<template>
  <main class="dashboard studio-theme">
    <DashboardNavigation :items="sectionItems" :active="activeSection"
      :count="!loading && !error ? figures.length : null" @select="showSection" />

    <div class="workspace-main">
      <header class="workspace-header">
        <div>
          <p class="greeting">Bentornato, {{ firstName }}</p>
          <h1 ref="section-heading" tabindex="-1">{{ sectionTitle }}</h1>
          <p class="header-description">{{ sectionDescription }}</p>
        </div>
      </header>

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
            <button v-if="catalogEnabled && missingVideo && !loading && !error" type="button" class="text-action"
              @click="showMissingVideos">
              Vedi le figure senza video
              <StudioIcon name="arrow" />
            </button>
          </section>
        </div>
        <AdminAnalyticsSnapshot
          v-if="isAdmin && analyticsEnabled"
          @open-analytics="showSection('visualizzazioni')"
        />

      </template>

      <p v-if="activeSection === 'catalogo' && deleteError" class="account-error" role="alert">{{ deleteError }}</p>
      <p v-if="activeSection === 'catalogo' && deleteMessage" role="status">{{ deleteMessage }}</p>
      <DashboardCatalog v-if="activeSection === 'catalogo'" :figures="figures" :loading="loading" :error="error"
        :admin="isAdmin && figureEditorEnabled" :deleting-id="deletingFigureId" :user-id="currentUser?.$id" v-model:video-filter="videoFilter" @create="openEditor()"
        @edit="openEditor" @delete="deleteFigure" @retry="retry" />

      <PersonalPractice v-if="activeSection === 'pratica'" ref="personal-practice" :figures="figures" :catalog-loading="loading" :catalog-error="error" />
      <AdminAnalytics v-if="isAdmin && activeSection === 'visualizzazioni'" />
      <AdminUserRoles v-if="isSuperAdmin && activeSection === 'utenti'" />
      <AdminFigureOperations v-if="isAdmin && activeSection === 'operazioni'" :figures="figures" @changed="refreshFigures" />

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
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.4rem;
  width: min(1500px, 100% - 2.5rem);
  margin: 0 auto;
  padding: 1.5rem 0 1rem;
  color: var(--studio-text);
  position: relative;
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
  padding: 0.5rem 0 1rem;
  scroll-margin-top: 5rem;
}

.greeting {
  margin: 0 0 0.5rem;
  color: var(--brand-text);
  font-size: 1rem;
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
  font-size: 1rem;
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
  background: var(--brand);
  color: #f8fafc;
  box-shadow: none;
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
  background: var(--studio-hover);
}

.studio-button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.save-notice {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  border: 1px solid color-mix(in srgb, var(--success) 12%, var(--ink-2));
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--success) 12%, var(--ink-2));
  color: var(--success);
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
  color: var(--success);
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
  background: var(--studio-panel);
}

.metric-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid var(--brand-text);
  border-radius: 0.7rem;
  color: var(--brand-text);
  background: var(--brand-soft);
}

.metric-icon.mint {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 12%, var(--ink-2));
  background: color-mix(in srgb, var(--success) 12%, var(--ink-2));
}

.metric-icon.amber {
  color: var(--warning);
  border-color: color-mix(in srgb, var(--warning) 12%, var(--ink-2));
  background: color-mix(in srgb, var(--warning) 12%, var(--ink-2));
}

.metric p {
  font-size: 0.875rem;
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
  grid-template-columns: minmax(0, 1fr);
  gap: 0.9rem;
}

.coverage-panel {
  border: 1px solid var(--studio-line);
  border-radius: 1rem;
  padding: 1.25rem;
  background: var(--studio-panel);
  min-width: 0;
  box-shadow: var(--shadow);
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
  font-size: 0.875rem;
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
  font-size: 0.875rem;
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
  color: var(--brand-text);
  cursor: pointer;
  font-size: 0.875rem;
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
  background: var(--studio-panel);
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
  border: 1px solid var(--brand-text);
  border-radius: 50%;
  color: var(--brand-text);
  background: var(--brand-soft);
  font-size: 0.9rem;
  font-weight: 700;
}

.avatar.small {
  width: 2.25rem;
  height: 2.25rem;
  font-size: 0.875rem;
}

.account-person h2 {
  font-size: 1rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.account-person p {
  font-size: 0.875rem;
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
  font-size: 0.875rem;
}

.account-role .studio-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.account-error {
  flex-basis: 100%;
  color: var(--warning);
  font-size: 0.9rem;
}

@media (min-width: 1200px) {
  .dashboard {
    grid-template-columns: 248px minmax(0, 1fr);
    gap: 1.3rem;
    padding-top: 2rem;
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
    padding: 0.5rem 0;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1.1rem;
  }

  .header-description {
    font-size: 1rem;
  }

  .metrics {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .metric {
    display: flex;
    align-content: start;
    justify-items: start;
    gap: 0.55rem;
    min-width: 0;
    padding: 1rem;
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
    font-size: 0.95rem;
    line-height: 1.35;
  }

  .metric strong {
    font-size: 1.4rem;
  }

  .overview-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .coverage-panel {
    padding: 1rem;
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

</style>
