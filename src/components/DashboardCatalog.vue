<script setup>
import { computed, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import { dances } from '../data/danze.js'
import { difficultyLabels, filterCatalog } from '../lib/catalog.js'
import { ANALYTICS_EVENTS } from '../lib/analytics.js'
import { recordAnalyticsEvent } from '../lib/figures.js'
import StudioIcon from './StudioIcon.vue'

const props = defineProps({
  figures: { type: Array, required: true },
  loading: Boolean,
  error: { type: String, default: '' },
  admin: Boolean,
  userId: { type: String, default: '' },
  deletingId: { type: String, default: '' },
})

const emit = defineEmits(['edit', 'create', 'retry', 'delete'])

const videoFilter = defineModel('videoFilter', { type: String, default: 'all' })
const search = shallowRef('')
const danceFilter = shallowRef('')
const difficulty = shallowRef('')
const sort = shallowRef('recent')
const visibleFigures = computed(() =>
  filterCatalog(props.figures, {
    search: search.value,
    dance: danceFilter.value,
    video: videoFilter.value,
    difficulty: difficulty.value,
    sort: sort.value,
  }),
)

const hasFilters = computed(() => Boolean(search.value || danceFilter.value || difficulty.value || videoFilter.value !== 'all' || sort.value !== 'catalog'))
const resultLabel = computed(() => {
  if (props.loading) return 'Caricamento…'
  if (props.error) return 'Catalogo non disponibile'
  const count = visibleFigures.value.length
  return `${count} ${count === 1 ? 'figura' : 'figure'}`
})
const formatDate = new Intl.DateTimeFormat('it', { day: 'numeric', month: 'short' })

function styleNames(figure) {
  return figure.stili
    .map((id) => dances[figure.danza]?.stili.find((style) => style.id === id)?.nome)
    .filter(Boolean)
    .join(', ')
}

function resetFilters() {
  search.value = ''
  danceFilter.value = ''
  videoFilter.value = 'all'
  difficulty.value = ''
  sort.value = 'recent'
}

function trackFigureOpen(figureId) {
  if (!props.userId) return
  recordAnalyticsEvent({
    eventType: ANALYTICS_EVENTS.FIGURE_CARD_CLICK,
    figureId,
    eventTarget: figureId,
    userId: props.userId,
  })
}

function confirmDelete(figure) {
  if (window.confirm(`Eliminare definitivamente ${figure.nome}? Questa operazione non può essere annullata.`)) {
    emit('delete', figure)
  }
}
</script>

<template>
  <section id="catalogo" class="catalog" aria-label="Catalogo figure" tabindex="-1">
    <header v-if="admin" class="catalog-heading">
      <button type="button" class="catalog-add catalog-create" @click="$emit('create')">
        <StudioIcon name="plus" /> Nuova figura
      </button>
    </header>

    <div class="catalog-toolbar">
      <label class="catalog-search">
        <StudioIcon name="search" />
        <span class="visually-hidden">Cerca nel catalogo</span>
        <input v-model="search" type="search" placeholder="Cerca una figura…" autocomplete="off" />
      </label>
      <details class="catalog-filter-details">
        <summary>
          <StudioIcon name="filters" />Filtri e ordine
        </summary>
        <div class="catalog-selects">
          <label class="video-filter">
            <span>Video</span>
            <select v-model="videoFilter">
              <option value="all">Tutti i video</option>
              <option value="ready">Con video</option>
              <option value="missing">Senza video</option>
            </select>
          </label>
          <label class="video-filter">
            <span>Difficoltà</span>
            <select v-model="difficulty">
              <option value="">Tutte le difficoltà</option>
              <option v-for="(label, value) in difficultyLabels" :key="value" :value="value">{{ label }}</option>
              <option value="unset">Non indicata</option>
            </select>
          </label>
          <label class="video-filter">
            <span>Ordina</span>
            <select v-model="sort">
              <option value="catalog">Ordine del catalogo</option>
              <option value="name">Nome A–Z</option>
              <option value="difficulty">Difficoltà crescente</option>
              <option value="recent">Aggiornate di recente</option>
            </select>
          </label>
        </div>
      </details>
    </div>
    <div class="catalog-meta">
      <div class="dance-filters" role="group" aria-label="Filtra catalogo per danza">
        <button type="button" :aria-pressed="danceFilter === ''" @click="danceFilter = ''">
          Tutte
        </button>
        <button v-for="dance in dances" :key="dance.id" type="button" :aria-pressed="danceFilter === dance.id"
          @click="danceFilter = dance.id">
          {{ dance.nome }}
        </button>
      </div>
      <p class="result-count" role="status" aria-atomic="true">
        {{ resultLabel }}
      </p>
    </div>

    <div v-if="loading" class="catalog-loading" aria-hidden="true">
      <div v-for="n in 4" :key="n" class="loading-row skeleton" />
    </div>
    <div v-else-if="error" class="catalog-state" role="alert">
      <StudioIcon name="library" />
      <h3>Il catalogo non è disponibile</h3>
      <p>{{ error }}</p>
      <button type="button" class="catalog-add" @click="$emit('retry')">
        Riprova
      </button>
    </div>
    <table v-else-if="visibleFigures.length" class="figure-table">
      <caption class="visually-hidden">
        Figure del catalogo, disponibilità dei video e azioni
      </caption>
      <thead>
        <tr>
          <th scope="col">Figura</th>
          <th scope="col" class="dance-column">
            Danza
          </th>
          <th scope="col">Video</th>
          <th scope="col" class="date-column">
            Aggiornata
          </th>
          <th scope="col"><span class="visually-hidden">Azioni</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="figure in visibleFigures" :key="figure.id">
          <td class="figure-cell">
            <div class="figure-identity">
              <span class="dance-symbol" :data-dance="figure.danza" aria-hidden="true">{{ figure.danza === 'salsa' ? 'S'
                : 'B' }}</span>
              <div class="figure-label">
                <RouterLink :to="{ name: 'figura', params: { figura: figure.id } }" class="figure-name"
                  @click="trackFigureOpen(figure.id)">{{ figure.nome
                  }}</RouterLink>
                <span class="figure-styles"><span class="mobile-dance">{{ dances[figure.danza]?.nome }} · </span>{{
                  styleNames(figure) }}</span>
                <span class="figure-styles">{{ difficultyLabels[figure.difficulty] || 'Difficoltà non indicata'
                  }}</span>
              </div>
            </div>
          </td>
          <td class="dance-column">
            <span class="dance-tag" :data-dance="figure.danza">{{ dances[figure.danza]?.nome }}</span>
          </td>
          <td>
            <span class="video-status" :class="{ ready: figure.videoFileId || figure.youtubeId }">
              <StudioIcon :name="figure.videoFileId || figure.youtubeId ? 'video' : 'clock'" />
              <span>{{ figure.videoFileId ? 'Appwrite' : figure.youtubeId ? 'YouTube' : 'Da aggiungere' }}</span>
            </span>
          </td>
          <td class="date-column">
            <time v-if="figure.$updatedAt" :datetime="figure.$updatedAt">{{ formatDate.format(new
              Date(figure.$updatedAt)) }}</time><span v-else>—</span>
          </td>
          <td class="action-cell">
            <button v-if="admin" type="button" class="row-action" :aria-label="`Modifica ${figure.nome}`"
              @click="$emit('edit', figure)">
              <StudioIcon name="edit" />
            </button>
            <button v-if="admin" type="button" class="row-action" :aria-label="`Elimina ${figure.nome}`"
              :disabled="deletingId === (figure.id || figure.$id)" @click="confirmDelete(figure)">
              <StudioIcon name="trash" />
            </button>
            <RouterLink v-else :to="{ name: 'figura', params: { figura: figure.id } }" class="row-action"
              :aria-label="`Apri ${figure.nome}`">
              <StudioIcon name="arrow" />
            </RouterLink>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="catalog-state">
      <StudioIcon :name="hasFilters ? 'search' : 'library'" />
      <h3>{{ hasFilters ? 'Nessuna figura corrisponde' : 'Il catalogo comincia qui' }}</h3>
      <p>
        <template v-if="hasFilters">Prova un altro nome o rimuovi i filtri.</template>
        <template v-else-if="admin">Aggiungi la prima figura e collega un video quando è pronto.</template>
        <template v-else>Le figure saranno disponibili appena aggiunte al catalogo.</template>
      </p>
      <button v-if="hasFilters" type="button" class="catalog-add" @click="resetFilters">
        Rimuovi i filtri
      </button>
    </div>
    <footer class="catalog-footer">
      <StudioIcon name="shield" /><span>Figure e media visibili solo agli utenti che hanno effettuato l'accesso.</span>
    </footer>
  </section>
</template>

<style scoped>
.catalog {
  border: 1px solid var(--studio-line);
  border-radius: 1rem;
  background: var(--studio-panel);
  overflow: clip;
  scroll-margin-top: 5rem;
  box-shadow: var(--shadow);
}

.catalog-heading {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.5rem;
}

.catalog-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-shrink: 0;
  min-height: 2.75rem;
  border: 1px solid var(--studio-line);
  padding: 0.65rem 0.85rem;
  border-radius: 0.75rem;
  color: var(--studio-text);
  background: var(--studio-raised);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.catalog-add:hover {
  border-color: var(--brand-text);
}

.catalog-create {
  background: var(--brand);
  color: var(--on-accent);
  border-color: transparent;
}

.catalog-filter-details {
  flex-basis: 100%;
}

.catalog-filter-details summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  width: fit-content;
  color: var(--studio-text);
  font-weight: 600;
}

.catalog-filter-details summary::after {
  content: '+';
  margin-left: 0.5rem;
}

.catalog-filter-details[open] summary::after {
  content: '-';
}

.catalog-selects {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.catalog-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1rem 1.5rem 0;
}

.catalog-heading+.catalog-toolbar {
  padding-top: 0;
}

.catalog-search {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 0.8rem;
  flex: 1;
  flex-basis: 18rem;
  min-width: 0;
  border: 1px solid var(--input-line);
  border-radius: 0.75rem;
  color: var(--studio-muted);
  background: var(--studio-bg);
}

.catalog-search input {
  width: 100%;
  min-width: 0;
  min-height: 2.85rem;
  border: 0;
  background: none;
  color: var(--studio-text);
  font-size: 1rem;
}

.catalog-search input::placeholder {
  color: var(--studio-muted);
}

.video-filter {
  display: grid;
  flex: 1 1 10rem;
  gap: 0.5rem;
  min-width: 0;
}

.video-filter select {
  min-height: 2.85rem;
  max-width: 100%;
  border: 1px solid var(--input-line);
  border-radius: 0.75rem;
  padding: 0.5rem 1.8rem 0.5rem 0.7rem;
  background: var(--studio-bg);
  color: var(--studio-text);
  font: inherit;
  font-size: 1rem;
}

.catalog-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.75rem 1.5rem;
}

.dance-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.dance-filters button {
  min-height: 2.75rem;
  padding: 0.5rem 0.85rem;
  border: 0;
  border-radius: 7px;
  color: var(--studio-muted);
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
}

.dance-filters button[aria-pressed='true'] {
  background: var(--studio-accent-soft);
  color: var(--brand-text);
  font-weight: 700;
}

.dance-filters button:hover {
  color: var(--studio-text);
}

.result-count {
  margin: 0;
  color: var(--studio-muted);
  font-size: 0.875rem;
}

.figure-table {
  border-collapse: collapse;
  width: 100%;
  text-align: left;
  table-layout: fixed;
}

.figure-table th {
  padding: 0.8rem 0.65rem;
  border-block: 1px solid var(--studio-line);
  background: var(--studio-bg);
  color: var(--studio-muted);
  font-weight: 400;
  font-size: 0.875rem;
}

.figure-table th:first-child {
  padding-left: 1.5rem;
  width: 40%;
}

.figure-table th:last-child {
  width: 4.5rem;
}

.figure-table td {
  border-bottom: 1px solid var(--studio-line);
  padding: 0.8rem 0.65rem;
  font-size: 0.875rem;
}

.figure-table td:first-child {
  padding-left: 1.5rem;
}

.figure-table tbody tr:last-child td {
  border-bottom: 0;
}

.figure-table tbody tr:hover {
  background: var(--studio-hover);
}

.figure-identity {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
}

.dance-symbol {
  display: grid;
  place-items: center;
  flex: 0 0 2.5rem;
  height: 2.5rem;
  border-radius: 0.7rem;
  background: var(--brand-soft);
  color: var(--brand-text);
  font-weight: 700;
}

.figure-label {
  min-width: 0;
  display: grid;
  gap: 0.15rem;
}

.figure-name {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  font-weight: 600;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.figure-name:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.figure-styles {
  color: var(--studio-muted);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}

.mobile-dance {
  display: none;
}

.dance-tag {
  color: var(--brand-text);
  font-size: 0.875rem;
}

.video-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--studio-muted);
  font-size: 0.875rem;
}

.video-status .studio-icon {
  width: 1rem;
  height: 1rem;
}

.video-status.ready {
  color: var(--studio-success);
}

.date-column {
  color: var(--studio-muted);
}

.row-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border: 1px solid transparent;
  border-radius: 0.65rem;
  background: none;
  color: var(--studio-muted);
  cursor: pointer;
}

.row-action:hover {
  border-color: var(--studio-line);
  background: var(--studio-hover);
  color: var(--studio-text);
}

.catalog-footer {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--studio-line);
  color: var(--studio-muted);
  font-size: 0.875rem;
}

.catalog-footer .studio-icon {
  width: 1rem;
  height: 1rem;
}

.catalog-state {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  padding: 3rem 1.25rem;
  text-align: center;
}

.catalog-state>.studio-icon {
  width: 2rem;
  height: 2rem;
  color: var(--brand-text);
}

.catalog-state h3 {
  font-size: 1.1rem;
  line-height: 1.4;
}

.catalog-state p {
  margin: 0;
  max-width: 45ch;
  color: var(--studio-muted);
  font-size: 0.9rem;
}

.catalog-loading {
  display: grid;
  gap: 0.75rem;
  padding: 1.5rem;
}

.loading-row {
  height: 3.5rem;
  border-radius: 8px;
}

@media (max-width: 1100px) {
  .date-column {
    display: none;
  }

  .figure-table th:first-child {
    width: 45%;
  }
}

@media (max-width: 640px) {
  .catalog-heading {
    padding: 1.1rem;
  }

  .catalog-toolbar {
    flex-wrap: wrap;
    padding-inline: 1rem;
  }

  .catalog-search {
    flex-basis: 100%;
  }

  .video-filter {
    width: 100%;
  }

  .video-filter select {
    width: 100%;
    font-size: 1rem;
  }

  .catalog-meta {
    padding-inline: 0.8rem;
  }

  .figure-table th {
    font-size: 0.875rem;
  }

  .figure-table th:first-child {
    width: auto;
    padding-left: 1rem;
  }

  .figure-table th:nth-child(3) {
    width: 6rem;
  }

  .figure-table th:last-child {
    width: 3.6rem;
  }

  .figure-table td {
    padding: 0.8rem 0.35rem;
  }

  .figure-table td:first-child {
    padding-left: 1rem;
  }

  .dance-column,
  .dance-symbol {
    display: none;
  }

  .mobile-dance {
    display: inline;
  }

  .figure-name {
    min-height: 2.75rem;
    font-size: 1rem;
    line-height: 1.3;
  }

  .video-status {
    display: grid;
    gap: 0.2rem;
    font-size: 0.875rem;
  }

  .video-status .studio-icon {
    display: none;
  }

  .catalog-footer {
    padding-inline: 1rem;
  }
}
</style>
