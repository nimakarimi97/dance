<script setup>
import { Bar, Line } from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { computed, onMounted, shallowRef } from 'vue'
import { dances, figures } from '../data/danze.js'
import { buildViewTimeline, summarizeViews } from '../lib/analytics.js'
import { listFigureViews } from '../lib/figures.js'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, BarElement, Filler, Tooltip)

const ranges = [
  { value: 7, label: '7 giorni' },
  { value: 30, label: '30 giorni' },
  { value: 90, label: '90 giorni' },
  { value: 'all', label: 'Sempre' },
]

const views = shallowRef(null)
const loading = shallowRef(true)
const error = shallowRef('')
const range = shallowRef(30)
const now = shallowRef(Date.now())

const periodViews = computed(() => {
  if (!views.value) return []
  if (range.value === 'all') return views.value
  const since = new Date(now.value)
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - range.value + 1)
  return views.value.filter((view) => {
    const createdAt = new Date(view.$createdAt).getTime()
    return createdAt >= since.getTime() && createdAt <= now.value
  })
})

const stats = computed(() => views.value
  ? summarizeViews(periodViews.value, figures.value, dances, now.value)
  : null)
const lifetimeStats = computed(() => views.value
  ? summarizeViews(views.value, figures.value, dances, now.value)
  : null)
const timeline = computed(() => views.value
  ? buildViewTimeline(periodViews.value, range.value, now.value)
  : { labels: [], values: [] })
const chartSummary = computed(() => {
  const count = timeline.value.values.reduce((total, value) => total + value, 0)
  const activePeriods = timeline.value.values.filter((value) => value > 0).length
  const unit = range.value === 'all'
    ? activePeriods === 1 ? 'mese' : 'mesi'
    : activePeriods === 1 ? 'giorno' : 'giorni'
  const period = range.value === 'all' ? 'negli ultimi 12 mesi' : 'nel periodo selezionato'
  return `${count} aperture ${period}, distribuite su ${activePeriods} ${unit}.`
})
const topFigures = computed(() => stats.value?.top ?? [])
const danceChartData = computed(() => ({
  labels: stats.value?.byDance.map((item) => item.nome) ?? [],
  datasets: [{
    data: stats.value?.byDance.map((item) => item.views) ?? [],
    backgroundColor: ['#f27b9b', '#a69bff'],
    borderRadius: 4,
    barThickness: 14,
  }],
}))
const styleChartData = computed(() => ({
  labels: stats.value?.byStyle.slice(0, 6).map((item) => item.nome) ?? [],
  datasets: [{
    data: stats.value?.byStyle.slice(0, 6).map((item) => item.views) ?? [],
    backgroundColor: '#93dfc2',
    borderRadius: 4,
    barThickness: 12,
  }],
}))
const trendChartData = computed(() => ({
  labels: timeline.value.labels,
  datasets: [{
    data: timeline.value.values,
    borderColor: '#c4b5fd',
    backgroundColor: 'rgba(196, 181, 253, 0.13)',
    borderWidth: 2,
    fill: true,
    tension: 0.32,
    pointRadius: timeline.value.values.length > 30 ? 0 : 2,
    pointHoverRadius: 5,
    pointBackgroundColor: '#f3f6fc',
  }],
}))

const trendOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { intersect: false, mode: 'index' },
  plugins: {
    legend: { display: false },
    tooltip: {
      displayColors: false,
      callbacks: {
        label: (context) => `${context.parsed.y} ${context.parsed.y === 1 ? 'apertura' : 'aperture'}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#a9b8cf', maxTicksLimit: 8, maxRotation: 0 },
    },
    y: {
      beginAtZero: true,
      border: { display: false, dash: [3, 5] },
      grid: { color: 'rgba(169, 184, 207, 0.12)' },
      ticks: { color: '#a9b8cf', precision: 0, maxTicksLimit: 5 },
    },
  },
}

function barOptions(maxTicksLimit) {
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        callbacks: {
          label: (context) => `${context.parsed.x} ${context.parsed.x === 1 ? 'apertura' : 'aperture'}`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: 'rgba(169, 184, 207, 0.12)' },
        ticks: { color: '#a9b8cf', precision: 0, maxTicksLimit },
      },
      y: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: '#f3f6fc' },
      },
    },
  }
}

const danceOptions = barOptions(4)
const styleOptions = barOptions(4)

function number(value) {
  return new Intl.NumberFormat('it-IT').format(value)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    views.value = await listFigureViews()
    now.value = Date.now()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Impossibile caricare le statistiche.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="analytics" aria-labelledby="analytics-title">
    <header class="analytics-header">
      <div>
        <p class="analytics-kicker">Il ritmo del tuo studio</p>
        <h2 id="analytics-title">La pista, in numeri</h2>
        <p class="analytics-intro">Scopri quali figure fanno tornare le persone a ballare.</p>
      </div>
      <div class="live-note"><span aria-hidden="true"></span>Dati aggiornati</div>
    </header>

    <p v-if="error" class="analytics-error" role="alert">
      {{ error }}
      <button type="button" class="retry-button" @click="load">Riprova</button>
    </p>
    <p v-else-if="loading" class="analytics-state" role="status" aria-busy="true">
      Caricamento delle visualizzazioni…
    </p>
    <template v-else>
      <div class="period-control" role="group" aria-label="Periodo delle statistiche">
        <span class="period-label">Periodo</span>
        <div class="period-options">
          <button
            v-for="option in ranges"
            :key="option.value"
            type="button"
            :class="{ active: range === option.value }"
            :aria-pressed="range === option.value"
            @click="range = option.value"
          >{{ option.label }}</button>
        </div>
      </div>

      <div class="kpis" aria-label="Indicatori principali">
        <article class="kpi-card kpi-primary">
          <span class="kpi-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>
          </span>
          <p>Aperture nel periodo</p>
          <strong>{{ number(stats.totalViews) }}</strong>
          <span class="kpi-foot">Attività registrata</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon kpi-icon-rose" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.2a3 3 0 0 1 0 5.6M18 14a5 5 0 0 1 3 4.6v1" /></svg>
          </span>
          <p>Persone raggiunte</p>
          <strong>{{ number(stats.uniqueViewers) }}</strong>
          <span class="kpi-foot">Utenti distinti nel periodo</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon kpi-icon-mint" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 19V5m0 14h16M8 15l4-4 3 2 5-6" /></svg>
          </span>
          <p>Ultimi 7 giorni</p>
          <strong>{{ number(lifetimeStats.last7Days) }}</strong>
          <span class="kpi-foot">Aperture recenti</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon kpi-icon-gold" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 3v18m6-14H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6" /></svg>
          </span>
          <p>Figure mai aperte</p>
          <strong>{{ number(lifetimeStats.neverViewed) }}</strong>
          <span class="kpi-foot">Da far scoprire alla community</span>
        </article>
      </div>

      <div class="analytics-grid">
        <section class="panel trend-panel" aria-labelledby="trend-title">
          <div class="panel-heading">
            <div>
              <h3 id="trend-title">Come si muove la pista</h3>
              <p>{{ chartSummary }}</p>
            </div>
            <span class="panel-total">{{ number(stats.totalViews) }} <small>aperture</small></span>
          </div>
          <div class="trend-chart" role="img" :aria-label="`Andamento delle aperture. ${chartSummary}`">
            <Line :data="trendChartData" :options="trendOptions" />
          </div>
          <table class="visually-hidden">
            <caption>Visualizzazioni per {{ range === 'all' ? 'mese' : 'giorno' }}</caption>
            <thead><tr><th scope="col">Periodo</th><th scope="col">Aperture</th></tr></thead>
            <tbody>
              <tr v-for="(label, index) in timeline.labels" :key="label">
                <th scope="row">{{ label }}</th><td>{{ timeline.values[index] }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel ranking-panel" aria-labelledby="ranking-title">
          <div class="panel-heading">
            <div>
              <h3 id="ranking-title">Figure più amate</h3>
              <p>Quelle che attirano più curiosità.</p>
            </div>
            <span class="ranking-mark" aria-hidden="true">Top 5</span>
          </div>
          <ol v-if="topFigures.length" class="ranking-list">
            <li v-for="(figure, index) in topFigures" :key="figure.id">
              <span class="rank-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="rank-name">{{ figure.nome }}</span>
              <strong>{{ number(figure.views) }}</strong>
            </li>
          </ol>
          <p v-else class="empty-note">Non ci sono ancora aperture in questo periodo.</p>
          <p class="ranking-foot">{{ number(figures.length) }} figure nel catalogo</p>
        </section>

        <section class="panel breakdown-panel" aria-labelledby="dance-title">
          <div class="panel-heading">
            <div><h3 id="dance-title">Le danze più cercate</h3><p>Confronto delle aperture nel periodo.</p></div>
          </div>
          <div class="breakdown-chart" role="img" :aria-label="`Aperture per danza: ${stats.byDance.map((item) => `${item.nome}, ${item.views}`).join('; ')}`">
            <Bar :data="danceChartData" :options="danceOptions" />
          </div>
          <table class="visually-hidden">
            <caption>Aperture per danza</caption>
            <thead><tr><th scope="col">Danza</th><th scope="col">Aperture</th></tr></thead>
            <tbody><tr v-for="item in stats.byDance" :key="item.id"><th scope="row">{{ item.nome }}</th><td>{{ item.views }}</td></tr></tbody>
          </table>
        </section>

        <section class="panel breakdown-panel" aria-labelledby="style-title">
          <div class="panel-heading">
            <div><h3 id="style-title">Stili in evidenza</h3><p>Le preferenze che prendono forma.</p></div>
          </div>
          <template v-if="stats.byStyle.length">
            <div class="breakdown-chart" role="img" :aria-label="`Aperture per stile: ${stats.byStyle.slice(0, 6).map((item) => `${item.nome}, ${item.views}`).join('; ')}`">
              <Bar :data="styleChartData" :options="styleOptions" />
            </div>
            <table class="visually-hidden">
              <caption>Aperture per stile</caption>
              <thead><tr><th scope="col">Stile</th><th scope="col">Aperture</th></tr></thead>
              <tbody><tr v-for="item in stats.byStyle.slice(0, 6)" :key="item.id"><th scope="row">{{ item.nome }}</th><td>{{ item.views }}</td></tr></tbody>
            </table>
          </template>
          <p v-else class="empty-note">I dati sugli stili appariranno con le prime aperture.</p>
        </section>
      </div>
    </template>
  </section>
</template>

<style scoped>
.analytics {
  --analytics-panel: #172338;
  --analytics-raised: #1d2b42;
  --analytics-line: #33425a;
  --analytics-text: #f3f6fc;
  --analytics-muted: #a9b8cf;
  min-width: 0;
  padding: clamp(1.25rem, 3vw, 2rem);
  border: 1px solid var(--analytics-line);
  border-radius: 22px;
  background: #131f32;
  color: var(--analytics-text);
}

.analytics-header,
.panel-heading,
.period-control,
.kpi-card {
  display: flex;
  align-items: center;
}

.analytics-header,
.panel-heading {
  justify-content: space-between;
  gap: 1rem;
}

.analytics-kicker {
  margin: 0 0 0.35rem;
  color: #c4b5fd;
  font-size: 0.9rem;
  font-weight: 700;
}

.analytics-header h2 {
  margin: 0;
  font-size: clamp(1.65rem, 4vw, 2.2rem);
  letter-spacing: -0.035em;
}

.analytics-intro,
.panel-heading p {
  margin: 0.35rem 0 0;
  color: var(--analytics-muted);
}

.live-note {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  flex: 0 0 auto;
  color: var(--analytics-muted);
  font-size: 0.85rem;
}

.live-note span {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: #93dfc2;
  box-shadow: 0 0 0 4px rgba(147, 223, 194, 0.12);
}

.period-control {
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.6rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--analytics-line);
}

.period-label {
  color: var(--analytics-muted);
  font-size: 0.9rem;
  font-weight: 600;
}

.period-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.period-options button,
.retry-button {
  min-height: 2.75rem;
  padding: 0.45rem 0.9rem;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--analytics-muted);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 160ms ease, color 160ms ease;
}

.period-options button:hover {
  background: var(--analytics-raised);
  color: var(--analytics-text);
}

.period-options button.active {
  background: #c4b5fd;
  color: #211b3c;
  font-weight: 700;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
  margin-top: 1rem;
}

.kpi-card {
  position: relative;
  display: block;
  min-width: 0;
  padding: 1.1rem;
  border: 1px solid var(--analytics-line);
  border-radius: 14px;
  background: var(--analytics-panel);
}

.kpi-primary {
  background: linear-gradient(145deg, #332e55, #20243f 78%);
  border-color: #514777;
}

.kpi-icon {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border-radius: 10px;
  background: rgba(196, 181, 253, 0.14);
  color: #c4b5fd;
}

.kpi-icon svg {
  width: 1.3rem;
  height: 1.3rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.kpi-icon-rose { background: rgba(242, 123, 155, 0.13); color: #f27b9b; }
.kpi-icon-mint { background: rgba(147, 223, 194, 0.13); color: #93dfc2; }
.kpi-icon-gold { background: rgba(245, 205, 138, 0.13); color: #f5cd8a; }

.kpi-card p {
  margin: 1rem 0 0.15rem;
  color: var(--analytics-muted);
  font-size: 0.9rem;
}

.kpi-card strong {
  display: block;
  font-size: clamp(1.7rem, 3vw, 2.2rem);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.kpi-foot {
  display: block;
  margin-top: 0.25rem;
  color: var(--analytics-muted);
  font-size: 0.8rem;
}

.analytics-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(250px, 1fr);
  gap: 0.85rem;
  margin-top: 0.9rem;
}

.panel {
  min-width: 0;
  padding: 1.2rem;
  border: 1px solid var(--analytics-line);
  border-radius: 14px;
  background: var(--analytics-panel);
}

.panel-heading {
  align-items: flex-start;
}

.panel-heading h3 {
  margin: 0;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}

.panel-heading p {
  font-size: 0.85rem;
}

.panel-total {
  flex: 0 0 auto;
  color: var(--analytics-text);
  font-size: 1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.panel-total small {
  color: var(--analytics-muted);
  font-size: 0.75rem;
  font-weight: 500;
}

.trend-chart {
  height: 230px;
  margin: 1rem -0.25rem 0;
}

.breakdown-chart {
  height: 150px;
  margin-top: 1rem;
}

.ranking-mark {
  flex: 0 0 auto;
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--analytics-line);
  border-radius: 999px;
  color: var(--analytics-muted);
  font-size: 0.75rem;
}

.ranking-list {
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.ranking-list li {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.6rem;
  min-height: 2.8rem;
  border-bottom: 1px solid rgba(169, 184, 207, 0.12);
}

.ranking-list li:last-child {
  border-bottom: 0;
}

.rank-number {
  color: #c4b5fd;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.rank-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-list strong {
  font-variant-numeric: tabular-nums;
}

.ranking-foot {
  margin: 0.8rem 0 0;
  padding-top: 0.7rem;
  border-top: 1px solid var(--analytics-line);
  color: var(--analytics-muted);
  font-size: 0.8rem;
}

.empty-note,
.analytics-state,
.analytics-error {
  margin: 1.2rem 0 0;
  color: var(--analytics-muted);
}

.analytics-error {
  color: #ffb6c4;
}

.retry-button {
  margin-left: 0.5rem;
  border-color: var(--analytics-line);
  color: var(--analytics-text);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@media (max-width: 900px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .analytics-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 520px) {
  .analytics {
    padding: 1rem;
    border-radius: 16px;
  }

  .analytics-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .period-control {
    align-items: flex-start;
    flex-direction: column;
  }

  .period-options {
    width: 100%;
  }

  .period-options button {
    flex: 1;
    padding-inline: 0.55rem;
  }

  .kpis {
    gap: 0.55rem;
  }

  .kpi-card {
    padding: 0.85rem;
  }

  .kpi-card p {
    margin-top: 0.75rem;
    font-size: 0.82rem;
  }

  .kpi-foot {
    font-size: 0.75rem;
  }

  .panel {
    padding: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .period-options button,
  .retry-button {
    transition: none;
  }
}
</style>
