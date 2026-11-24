<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { dances, figures } from '../data/danze.js'
import { buildEventTimeline, summarizeViews } from '../lib/analytics.js'
import { listAnalyticsEvents } from '../lib/figures.js'

const emit = defineEmits(['open-analytics'])
const events = shallowRef(null)
const loading = shallowRef(true)
const error = shallowRef('')
const now = shallowRef(Date.now())
const recentCutoff = computed(() => {
  const start = new Date(now.value)
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - 6)
  return start.getTime()
})
const recentEvents = computed(() => (events.value ?? []).filter((event) => {
  const timestamp = new Date(event.$createdAt).getTime()
  return timestamp >= recentCutoff.value && timestamp <= now.value
}))
const timeline = computed(() => events.value
  ? buildEventTimeline(recentEvents.value, 7, now.value)
  : { labels: [], views: [], pageViews: [], clicks: [], adminActions: [] })
const stats = computed(() => events.value
  ? summarizeViews(recentEvents.value, figures.value, dances, now.value)
  : null)
const daily = computed(() => timeline.value.labels.map((label, index) => ({
  label,
  pageViews: timeline.value.pageViews[index],
  clicks: timeline.value.clicks[index],
  adminActions: timeline.value.adminActions[index],
  total: timeline.value.pageViews[index] + timeline.value.clicks[index] + timeline.value.adminActions[index],
})))
const maxActivity = computed(() => Math.max(1, ...daily.value.map((day) => day.total)))

async function load() {
  loading.value = true
  error.value = ''
  try {
    events.value = await listAnalyticsEvents()
    now.value = Date.now()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Impossibile caricare le attività.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="activity-snapshot" aria-labelledby="snapshot-title">
    <header class="snapshot-heading">
      <div>
        <h2 id="snapshot-title">Attività degli ultimi 7 giorni</h2>
        <p>Visite alle figure, click e operazioni amministrative.</p>
      </div>
      <button type="button" class="snapshot-link" @click="emit('open-analytics')">
        Apri analytics
        <span aria-hidden="true">↗</span>
      </button>
    </header>

    <p v-if="error" class="snapshot-error" role="alert">
      {{ error }}
      <button type="button" class="snapshot-retry" @click="load">Riprova</button>
    </p>
    <p v-else-if="loading" class="snapshot-loading" role="status" aria-busy="true">
      Caricamento delle attività…
    </p>
    <div v-else class="snapshot-content">
      <div class="snapshot-stats" aria-label="Riepilogo attività">
        <article>
          <span>Visite pagina</span>
          <strong>{{ stats.totalPageViews }}</strong>
        </article>
        <article>
          <span>Aperture figura</span>
          <strong>{{ stats.totalViews }}</strong>
        </article>
        <article>
          <span>Click</span>
          <strong>{{ stats.totalClicks }}</strong>
        </article>
        <article>
          <span>Azioni admin</span>
          <strong>{{ stats.adminActions }}</strong>
        </article>
      </div>
      <div class="snapshot-chart-wrap">
        <div class="snapshot-legend" aria-hidden="true">
          <span class="legend-views">Visite</span>
          <span class="legend-clicks">Click</span>
          <span class="legend-admin">Azioni admin</span>
        </div>
        <div class="snapshot-chart" role="img" aria-label="Eventi giornalieri degli ultimi sette giorni">
          <div v-for="day in daily" :key="day.label" class="chart-day">
            <span class="day-total">{{ day.total }}</span>
            <div class="bar-track">
              <div class="bar-stack" :style="{ height: `${Math.max(3, day.total / maxActivity * 100)}%` }">
                <span class="bar-admin" :style="{ height: `${day.total ? day.adminActions / day.total * 100 : 0}%` }" />
                <span class="bar-clicks" :style="{ height: `${day.total ? day.clicks / day.total * 100 : 0}%` }" />
                <span class="bar-views" :style="{ height: `${day.total ? day.pageViews / day.total * 100 : 0}%` }" />
              </div>
            </div>
            <span class="day-label">{{ day.label }}</span>
          </div>
        </div>
        <table class="visually-hidden">
          <caption>Attività per giorno</caption>
          <thead>
            <tr><th scope="col">Giorno</th><th scope="col">Visite</th><th scope="col">Click</th><th scope="col">Azioni admin</th></tr>
          </thead>
          <tbody>
            <tr v-for="day in daily" :key="day.label">
              <th scope="row">{{ day.label }}</th>
              <td>{{ day.pageViews }}</td>
              <td>{{ day.clicks }}</td>
              <td>{{ day.adminActions }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.activity-snapshot {
  min-width: 0;
  padding: 1.25rem;
  border: 1px solid var(--studio-line);
  border-radius: 1rem;
  background: var(--studio-panel);
}

.snapshot-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.snapshot-heading h2 {
  font-size: 0.95rem;
  line-height: 1.4;
}

.snapshot-heading p {
  margin: 0.4rem 0 0;
  color: var(--studio-muted);
  font-size: 0.875rem;
}

.snapshot-link,
.snapshot-retry {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.75rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--studio-line);
  border-radius: 0.7rem;
  background: var(--studio-raised);
  color: var(--studio-text);
  font: inherit;
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
}

.snapshot-link:hover,
.snapshot-retry:hover {
  border-color: var(--brand-text);
}

.snapshot-content {
  display: grid;
  grid-template-columns: minmax(13rem, 0.7fr) minmax(0, 1.3fr);
  align-items: stretch;
  gap: 1.25rem;
  margin-top: 1.15rem;
}

.snapshot-stats {
  display: grid;
  align-content: center;
  gap: 0.55rem;
}

.snapshot-stats article {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 0.75rem;
  border-radius: 0.65rem;
  background: var(--studio-bg);
}

.snapshot-stats span {
  color: var(--studio-muted);
  font-size: 0.875rem;
}

.snapshot-stats strong {
  font-size: 1.15rem;
  font-variant-numeric: tabular-nums;
}

.snapshot-chart-wrap {
  min-width: 0;
  padding: 0.8rem 0.8rem 0.35rem;
  border: 1px solid var(--studio-line);
  border-radius: 0.75rem;
  background: var(--studio-bg);
}

.snapshot-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.8rem;
  color: var(--studio-muted);
  font-size: 0.875rem;
}

.snapshot-legend span::before {
  content: '';
  display: inline-block;
  width: 0.45rem;
  height: 0.45rem;
  margin-right: 0.35rem;
  border-radius: 50%;
  background: currentColor;
}

.legend-views { color: var(--brand-text); }
.legend-clicks { color: var(--info); }
.legend-admin { color: var(--warning); }

.snapshot-chart {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  align-items: end;
  gap: 0.4rem;
  height: 8.5rem;
  padding-top: 0.5rem;
}

.chart-day {
  display: grid;
  grid-template-rows: 1rem minmax(0, 1fr) 1rem;
  align-items: end;
  justify-items: center;
  gap: 0.2rem;
  min-width: 0;
  height: 100%;
}

.day-total,
.day-label {
  color: var(--studio-muted);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.bar-track {
  display: flex;
  align-items: end;
  width: min(100%, 2rem);
  height: 100%;
}

.bar-stack {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 3px;
  overflow: hidden;
  border-radius: 0.35rem 0.35rem 0 0;
  background: var(--line);
}

.bar-stack span {
  min-height: 0;
  flex: 0 0 auto;
}

.bar-admin { background: var(--warning); }
.bar-clicks { background: var(--info); }
.bar-views { background: var(--brand-text); }

.snapshot-error,
.snapshot-loading {
  margin: 1rem 0 0;
  color: var(--studio-muted);
  font-size: 0.875rem;
}

.snapshot-error {
  color: var(--warning);
}

.snapshot-retry {
  margin-left: 0.5rem;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 720px) {
  .snapshot-content {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.8rem;
  }
}

@media (max-width: 420px) {
  .activity-snapshot {
    padding: 1rem;
  }

  .snapshot-heading {
    flex-direction: column;
  }

  .snapshot-link {
    width: 100%;
  }

  .snapshot-chart-wrap {
    padding-inline: 0.45rem;
  }

  .snapshot-chart {
    gap: 0.2rem;
  }
}
</style>
