<script setup>
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { currentUser, isAdmin, signOut } from '../lib/auth.js'
import { dances, figures, refreshFigures, useFigureCatalog } from '../data/danze.js'
import DashboardCatalog from '../components/DashboardCatalog.vue'
import FigureEditor from '../components/FigureEditor.vue'
import StudioIcon from '../components/StudioIcon.vue'

const router = useRouter()
const { loading, error, retry } = useFigureCatalog()
const isSigningOut = shallowRef(false)
const signOutError = shallowRef('')
const editing = shallowRef(false)
const selectedFigure = shallowRef(null)
const savedId = shallowRef('')
const videoFilter = shallowRef('all')
const createButton = useTemplateRef('create-button')
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

function scrollToSection(id) {
  const element = document.getElementById(id)
  element?.scrollIntoView({ block: 'start' })
  element?.focus({ preventScroll: true })
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
  const refreshing = refreshFigures()
  await closeEditor()
  await refreshing
}

function showMissingVideos() {
  videoFilter.value = 'missing'
  scrollToSection('catalogo')
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
        <a href="#panoramica" class="selected" @click.prevent="scrollToSection('panoramica')">
          <StudioIcon name="grid" /> Panoramica
        </a>
        <a href="#catalogo" @click.prevent="scrollToSection('catalogo')">
          <StudioIcon name="library" /> Catalogo figure
          <span v-if="!loading && !error" class="nav-count">{{ figures.length }}</span>
        </a>
        <a href="#account" @click.prevent="scrollToSection('account')">
          <StudioIcon name="user" /> Il mio account
        </a>
      </nav>
      <div class="rail-dances">
        <p>Ritrova il tuo ritmo</p>
        <RouterLink v-for="dance in dances" :key="dance.id" :to="{ name: 'danza', params: { danza: dance.id } }"><span
            :data-dance="dance.id" class="dance-dot" />{{ dance.nome }}
          <StudioIcon name="arrow" />
        </RouterLink>
      </div>
      <div class="rail-note">
        <StudioIcon name="shield" />
        <p>{{ isAdmin ? 'Spazio amministratore' : 'Spazio personale' }}<span>I tuoi contenuti, al sicuro.</span></p>
      </div>
      <a href="#account" class="rail-person" @click.prevent="scrollToSection('account')"><span class="avatar small">{{
          initials }}</span>
        <div>
          <strong>{{ currentUser?.name || 'Il tuo account' }}</strong><span>{{
            isAdmin ? 'Amministratore' : 'Ballerino'
            }}</span>
        </div>
      </a>
    </aside>

    <div class="workspace-main">
      <header id="panoramica" class="workspace-header" tabindex="-1">
        <div>
          <p class="greeting">Bentornato, {{ firstName }}</p>
          <h1>Panoramica</h1>
          <p class="header-description">
            {{
              isAdmin ? 'Fai crescere il repertorio. Una figura alla volta.' : 'Il tuo prossimo passo comincia da qui.'
            }}
          </p>
        </div>
        <button v-if="isAdmin" ref="create-button" type="button" class="studio-button primary" @click="openEditor()">
          <StudioIcon name="plus" /> Nuova figura
        </button>
        <RouterLink v-else :to="{ name: 'danza', params: { danza: 'salsa' } }" class="studio-button primary">Esplora le
          figure
          <StudioIcon name="arrow" />
        </RouterLink>
      </header>

      <div v-if="savedId" class="save-notice" role="status">
        <StudioIcon name="check" /><span>Figura salvata.
          <RouterLink :to="{ name: 'figura', params: { figura: savedId } }">Apri la figura</RouterLink>
        </span><button type="button" aria-label="Chiudi conferma" @click="savedId = ''">
          <StudioIcon name="close" />
        </button>
      </div>

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
                  ? `${missingVideo} ${missingVideo === 1 ? 'figura aspetta' : 'figure aspettano'} un video per passare dalla
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

      <DashboardCatalog :figures="figures" :loading="loading" :error="error" :admin="isAdmin"
        v-model:video-filter="videoFilter" @create="openEditor()" @edit="openEditor" @retry="retry" />

      <section id="account" class="account-panel" aria-labelledby="account-title" tabindex="-1">
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
  --studio-bg: #111b2d;
  --studio-panel: #172338;
  --studio-raised: #22314a;
  --studio-line: #33425a;
  --studio-text: #f3f6fc;
  --studio-muted: #a9b8cf;
  --studio-accent: #c4b5fd;
  --studio-accent-soft: #302f50;
  --studio-hover: #1d2b42;
  --studio-success: #93dfc2;
  --studio-warning: #f5cd8a;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2rem;
  width: min(1480px, 100% - 3rem);
  margin: 0 auto;
  padding: 2rem 0 1rem;
  color: var(--studio-text);
}

.workspace-rail {
  display: none;
}

.workspace-main {
  display: grid;
  align-content: start;
  gap: 1.5rem;
  min-width: 0;
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  scroll-margin-top: 5rem;
}

.greeting {
  margin: 0 0 0.5rem;
  color: var(--studio-muted);
  font-size: 0.875rem;
}

.workspace-header h1 {
  font-size: clamp(1.9rem, 3.5vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.2;
}

.header-description {
  margin: 0.65rem 0 0;
  color: var(--studio-muted);
  font-size: 0.9rem;
}

.studio-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 2.9rem;
  padding: 0.65rem 1rem;
  flex-shrink: 0;
  border: 1px solid transparent;
  border-radius: 9px;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.studio-button.primary {
  background: var(--studio-accent);
  color: var(--studio-bg);
}

.studio-button.primary:hover {
  background: #d7ceff;
}

.studio-button.secondary {
  background: var(--studio-raised);
  border-color: var(--studio-line);
  color: var(--studio-text);
}

.studio-button.secondary:hover {
  border-color: var(--studio-muted);
}

.studio-button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 1.4rem 0;
  border-block: 1px solid var(--studio-line);
}

.metric {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
}

.metric+.metric {
  border-left: 1px solid var(--studio-line);
}

.metric-icon {
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid var(--studio-line);
  border-radius: 10px;
  color: var(--studio-accent);
  background: var(--studio-panel);
}

.metric-icon.mint {
  color: var(--studio-success);
}

.metric-icon.amber {
  color: var(--studio-warning);
}

.metric p {
  font-size: 0.8rem;
  color: var(--studio-muted);
  margin: 0 0 0.4rem;
}

.metric strong {
  display: block;
  font-size: 1.9rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 1.25rem;
}

.repertoire-panel,
.coverage-panel {
  border: 1px solid var(--studio-line);
  border-radius: 14px;
  padding: 1.35rem;
  background: var(--studio-panel);
  min-width: 0;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.panel-heading h2 {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.4;
}

.panel-heading>.studio-icon {
  color: var(--studio-muted);
}

.dance-overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 1rem;
}

.dance-summary {
  text-decoration: none;
  min-width: 0;
  padding: 0.5rem 1.25rem 0.1rem 0;
}

.dance-summary+.dance-summary {
  border-left: 1px solid var(--studio-line);
  padding: 0.5rem 0 0.1rem 1.25rem;
}

.dance-summary-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--studio-muted);
}

.dance-initial {
  font-family: 'Caveat', cursive;
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1;
  color: var(--accent-text);
}

.dance-summary h3 {
  font-size: 1rem;
  margin-top: 0.8rem;
}

.dance-summary p {
  margin: 0.4rem 0;
  color: var(--studio-muted);
  font-size: 0.8rem;
}

.dance-style-list {
  font-size: 0.75rem;
  color: var(--studio-muted);
}

.dance-summary:hover h3 {
  color: var(--accent-text);
}

.coverage-value {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin: 1.2rem 0 1rem;
}

.coverage-value strong {
  font-size: 2.25rem;
  line-height: 1;
  font-weight: 600;
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
  height: 6px;
  border: 0;
  border-radius: 20px;
  overflow: hidden;
  background: var(--studio-line);
  color: var(--studio-accent);
  accent-color: var(--studio-accent);
}

.coverage-panel progress::-webkit-progress-bar {
  background: var(--studio-line);
}

.coverage-panel progress::-webkit-progress-value {
  background: var(--studio-accent);
  border-radius: 20px;
}

.coverage-panel progress::-moz-progress-bar {
  background: var(--studio-accent);
}

.coverage-panel>p {
  font-size: 0.8rem;
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
  color: var(--studio-accent);
  cursor: pointer;
  font-size: 0.8rem;
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
  border-radius: 14px;
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
  border: 1px solid #6d6595;
  border-radius: 50%;
  color: var(--studio-accent);
  background: var(--studio-accent-soft);
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
  color: var(--studio-warning);
  font-size: 0.9rem;
}

.save-notice {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border: 1px solid var(--studio-success);
  border-radius: 9px;
  background: var(--studio-panel);
  color: var(--studio-success);
  font-size: 0.9rem;
}

.save-notice>span {
  flex: 1;
}

.save-notice button {
  display: grid;
  place-items: center;
  border: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  background: none;
  color: inherit;
  cursor: pointer;
}

@media (min-width: 1200px) {
  .dashboard {
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 2.25rem;
    padding-top: 2.5rem;
  }

  .workspace-rail {
    display: flex;
    flex-direction: column;
    align-self: start;
    position: sticky;
    top: 6rem;
    min-height: min(720px, calc(100dvh - 8rem));
    padding-right: 1.5rem;
    border-right: 1px solid var(--studio-line);
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
    border-radius: 10px;
    color: var(--studio-accent);
    background: var(--studio-panel);
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
    gap: 0.4rem;
    margin-top: 2.5rem;
  }

  .workspace-nav a {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-height: 2.85rem;
    padding: 0.6rem;
    border-radius: 9px;
    color: var(--studio-muted);
    text-decoration: none;
    font-size: 0.8rem;
  }

  .workspace-nav a.selected {
    background: var(--studio-accent-soft);
    color: var(--studio-accent);
  }

  .workspace-nav a:hover {
    color: var(--studio-text);
  }

  .nav-count {
    margin-left: auto;
    padding: 0.1rem 0.4rem;
    border: 1px solid var(--studio-line);
    border-radius: 5px;
    font-size: 0.75rem;
  }

  .rail-dances {
    margin-top: 2rem;
  }

  .rail-dances p {
    font-size: 0.75rem;
    color: var(--studio-muted);
    margin: 0 0 0.6rem 0.6rem;
  }

  .rail-dances a {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-height: 2.75rem;
    padding: 0.5rem 0.6rem;
    text-decoration: none;
    font-size: 0.8rem;
  }

  .rail-dances .studio-icon {
    margin-left: auto;
    width: 0.9rem;
  }

  .dance-dot {
    height: 0.45rem;
    width: 0.45rem;
    border-radius: 50%;
    background: var(--accent-text);
  }

  .rail-note {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    margin: auto 0 1.5rem;
    padding-top: 3rem;
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
    padding: 1rem 0;
    border-top: 1px solid var(--studio-line);
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
    padding-top: 1.5rem;
  }

  .workspace-main {
    gap: 1.1rem;
  }

  .workspace-header {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1.1rem;
  }

  .workspace-header .studio-button {
    width: 100%;
  }

  .header-description {
    font-size: 0.85rem;
  }

  .metrics {
    padding-block: 1rem;
    gap: 0;
  }

  .metric {
    display: block;
    padding: 0.25rem 0.65rem;
  }

  .metric:first-child {
    padding-left: 0;
  }

  .metric-icon {
    display: none;
  }

  .metric p {
    font-size: 0.75rem;
    min-height: 2.8em;
    line-height: 1.4;
  }

  .metric strong {
    font-size: 1.65rem;
  }

  .overview-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .repertoire-panel,
  .coverage-panel {
    padding: 1.1rem;
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
