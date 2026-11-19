<script setup>
import { computed, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import { dances } from '../data/danze.js'
import { filterCatalog } from '../lib/catalog.js'
import StudioIcon from './StudioIcon.vue'

const props = defineProps({
  figures: { type: Array, required: true },
  loading: Boolean,
  error: { type: String, default: '' },
  admin: Boolean,
})

defineEmits(['edit', 'create', 'retry'])

const videoFilter = defineModel('videoFilter', { type: String, default: 'all' })
const search = shallowRef('')
const danceFilter = shallowRef('')
const visibleFigures = computed(() =>
  filterCatalog(props.figures, {
    search: search.value,
    dance: danceFilter.value,
    video: videoFilter.value,
  }),
)

const hasFilters = computed(() => Boolean(search.value || danceFilter.value || videoFilter.value !== 'all'))
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
}
</script>

<template>
  <section id="catalogo" class="catalog" aria-labelledby="catalog-title" tabindex="-1">
    <header class="catalog-heading">
      <div>
        <h2 id="catalog-title">Catalogo figure</h2>
        <p>
          <template v-if="admin">Tutte le figure, i video e i prossimi contenuti da completare.</template>
          <template v-else>Il tuo repertorio di salsa e bachata, in un solo posto.</template>
        </p>
      </div>
      <button v-if="admin" type="button" class="catalog-add" @click="$emit('create')">
        <StudioIcon name="plus" /> Nuova figura
      </button>
    </header>

    <div class="catalog-toolbar">
      <label class="catalog-search">
        <StudioIcon name="search" />
        <span class="visually-hidden">Cerca nel catalogo</span>
        <input v-model="search" type="search" placeholder="Cerca una figura…" autocomplete="off" />
      </label>
      <label class="video-filter">
        <span class="visually-hidden">Filtra per disponibilità video</span>
        <select v-model="videoFilter">
          <option value="all">Tutti i video</option>
          <option value="ready">Con video</option>
          <option value="missing">Senza video</option>
        </select>
      </label>
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
                <RouterLink :to="{ name: 'figura', params: { figura: figure.id } }" class="figure-name">{{ figure.nome
                }}</RouterLink>
                <span class="figure-styles"><span class="mobile-dance">{{ dances[figure.danza]?.nome }} · </span>{{
                  styleNames(figure) }}</span>
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
      <button v-else-if="admin" type="button" class="catalog-add" @click="$emit('create')">
        Aggiungi una figura
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
  border-radius: 16px;
  background: var(--studio-panel);
  overflow: clip;
  scroll-margin-top: 5rem;
}

.catalog-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
}

.catalog-heading h2 {
  font-size: 1.2rem;
  line-height: 1.35;
}

.catalog-heading p {
  max-width: 55ch;
  margin: 0.4rem 0 0;
  color: var(--studio-muted);
  font-size: 0.9rem;
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
  border-radius: 9px;
  color: var(--studio-text);
  background: var(--studio-raised);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.catalog-add:hover {
  border-color: var(--studio-accent);
}

.catalog-toolbar {
  display: flex;
  gap: 0.75rem;
  padding: 0 1.5rem;
}

.catalog-search {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 0.8rem;
  flex: 1;
  min-width: 0;
  border: 1px solid var(--studio-line);
  border-radius: 9px;
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
  min-width: 0;
}

.video-filter select {
  min-height: 2.85rem;
  max-width: 100%;
  border: 1px solid var(--studio-line);
  border-radius: 9px;
  padding: 0.5rem 1.8rem 0.5rem 0.7rem;
  background: var(--studio-bg);
  color: var(--studio-text);
  font: inherit;
  font-size: 0.875rem;
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
  color: var(--studio-accent);
  font-weight: 700;
}

.dance-filters button:hover {
  color: var(--studio-text);
}

.result-count {
  margin: 0;
  color: var(--studio-muted);
  font-size: 0.8rem;
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
  font-size: 0.75rem;
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
  font-size: 0.85rem;
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
  border-radius: 9px;
  background: var(--studio-raised);
  color: var(--accent-text);
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
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}

.mobile-dance {
  display: none;
}

.dance-tag {
  color: var(--accent-text);
  font-size: 0.8rem;
}

.video-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--studio-muted);
  font-size: 0.75rem;
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
  border-radius: 8px;
  background: none;
  color: var(--studio-muted);
  cursor: pointer;
}

.row-action:hover {
  border-color: var(--studio-line);
  background: var(--studio-raised);
  color: var(--studio-text);
}

.catalog-footer {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--studio-line);
  color: var(--studio-muted);
  font-size: 0.75rem;
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
  color: var(--studio-accent);
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
    flex-direction: column;
    align-items: stretch;
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
    font-size: 0.75rem;
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
    font-size: 0.75rem;
  }

  .video-status .studio-icon {
    display: none;
  }

  .catalog-footer {
    padding-inline: 1rem;
  }
}
</style>
