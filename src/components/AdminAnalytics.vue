<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { dances, figures } from '../data/danze.js'
import { summarizeViews } from '../lib/analytics.js'
import { listFigureViews } from '../lib/figures.js'

const DAY = 24 * 60 * 60 * 1000
const windows = [
  { value: 'all', label: 'Sempre' },
  { value: 7, label: 'Ultimi 7 giorni' },
  { value: 30, label: 'Ultimi 30 giorni' },
]

const views = shallowRef(null)
const error = shallowRef('')
const range = shallowRef('all')

const inRange = computed(() => {
  if (!views.value) return []
  if (range.value === 'all') return views.value
  const since = Date.now() - range.value * DAY
  return views.value.filter((view) => new Date(view.$createdAt).getTime() >= since)
})

const stats = computed(() => (views.value ? summarizeViews(inRange.value, figures.value, dances) : null))
const trend = computed(() => (views.value ? summarizeViews(views.value, figures.value, dances) : null))
const maxDance = computed(() => Math.max(1, ...(stats.value?.byDance.map((item) => item.views) ?? [])))
const maxStyle = computed(() => Math.max(1, ...(stats.value?.byStyle.map((item) => item.views) ?? [])))

async function load() {
  error.value = ''
  try {
    views.value = await listFigureViews()
  } catch (cause) {
    error.value = cause.message || 'Impossibile caricare le statistiche.'
  }
}

onMounted(load)
</script>

<template>
  <section class="analytics" aria-labelledby="analytics-title">
    <header>
      <h2 id="analytics-title">Visualizzazioni</h2>
      <p>Quante volte le figure vengono aperte.</p>
    </header>

    <p v-if="error" class="analytics-error" role="alert">{{ error }}</p>
    <p v-else-if="!stats" aria-busy="true">Caricamento statistiche…</p>
    <template v-else>
      <div class="range" role="group" aria-label="Periodo">
        <button
          v-for="option in windows"
          :key="option.value"
          type="button"
          :class="{ active: range === option.value }"
          :aria-pressed="range === option.value"
          @click="range = option.value"
        >{{ option.label }}</button>
      </div>

      <dl class="kpis">
        <div><dt>Aperture totali</dt><dd>{{ stats.totalViews }}</dd></div>
        <div><dt>Utenti unici</dt><dd>{{ stats.uniqueViewers }}</dd></div>
        <div><dt>Figure mai aperte</dt><dd>{{ stats.neverViewed }}</dd></div>
        <div><dt>Ultimi 7 giorni</dt><dd>{{ trend.last7Days }}</dd></div>
        <div><dt>Ultimi 30 giorni</dt><dd>{{ trend.last30Days }}</dd></div>
      </dl>

      <div class="breakdowns">
        <section>
          <h3>Per danza</h3>
          <ul class="bars">
            <li v-for="item in stats.byDance" :key="item.id">
              <span>{{ item.nome }}</span>
              <meter :value="item.views" :max="maxDance">{{ item.views }}</meter>
              <strong>{{ item.views }}</strong>
            </li>
          </ul>
        </section>
        <section>
          <h3>Per stile</h3>
          <ul v-if="stats.byStyle.length" class="bars">
            <li v-for="item in stats.byStyle" :key="item.id">
              <span>{{ item.nome }}</span>
              <meter :value="item.views" :max="maxStyle">{{ item.views }}</meter>
              <strong>{{ item.views }}</strong>
            </li>
          </ul>
          <p v-else>Nessuna apertura nel periodo.</p>
        </section>
      </div>

      <h3>Classifica figure</h3>
      <ol v-if="stats.ranking.length" class="top-list">
        <li v-for="figure in stats.ranking" :key="figure.id">
          <span>{{ figure.nome }}</span>
          <strong>{{ figure.views }}</strong>
        </li>
      </ol>
      <p v-else>Nessuna figura nel catalogo.</p>
    </template>
  </section>
</template>

<style scoped>
.analytics {
  padding: 1.6rem 0;
  border-bottom: 1px solid var(--studio-line);
}

.analytics h2 {
  margin: 0;
  font-size: 1.25rem;
}

.analytics header p,
.analytics h3,
.analytics-error {
  margin: 0.25rem 0 0.75rem;
  color: var(--studio-muted);
}

.analytics-error {
  color: var(--studio-warning);
}

.range {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0;
}

.range button {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--studio-line);
  border-radius: 999px;
  background: var(--studio-panel);
  cursor: pointer;
}

.range button.active {
  border-color: currentColor;
  font-weight: 700;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;
}

.kpis div {
  padding: 0.9rem 1rem;
  border: 1px solid var(--studio-line);
  border-radius: 8px;
  background: var(--studio-panel);
}

.kpis dt {
  color: var(--studio-muted);
  font-size: 0.85rem;
}

.kpis dd {
  margin: 0.2rem 0 0;
  font-size: 1.6rem;
  font-weight: 700;
}

.breakdowns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
}

.bars,
.top-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.bars li,
.top-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--studio-line);
}

.bars meter {
  flex: 1;
  max-width: 40%;
}

.top-list {
  max-height: 24rem;
  overflow-y: auto;
}

@media (max-width: 800px) {
  .kpis,
  .breakdowns {
    grid-template-columns: 1fr;
  }
}
</style>
