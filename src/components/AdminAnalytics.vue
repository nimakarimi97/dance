<script setup>
import { Bar, Doughnut, Line } from 'vue-chartjs'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { computed, onMounted, shallowRef } from 'vue'
import { dances, figures } from '../data/danze.js'
import { buildEventTimeline, summarizeViews } from '../lib/analytics.js'
import { listAnalyticsEvents } from '../lib/figures.js'
import { isDarkMode } from '../lib/theme.js'
import StudioLoader from './StudioLoader.vue'

ChartJS.register(
  CategoryScale, LinearScale, LineElement, PointElement, BarElement,
  DoughnutController, ArcElement, Filler, Legend, Tooltip,
)

const ranges = [
  { value: 7, label: '7 giorni' },
  { value: 30, label: '30 giorni' },
  { value: 90, label: '90 giorni' },
  { value: 'all', label: 'Sempre' },
]

const events = shallowRef(null)
const loading = shallowRef(true)
const error = shallowRef('')
const range = shallowRef(30)
const now = shallowRef(Date.now())
const chartColors = computed(() => isDarkMode.value
  ? { text: '#b0bac3', line: '#49545e', panel: '#1c2227', rose: '#ff9abb', mint: '#7ce0b3', cyan: '#83d9ed', gold: '#f1c56c' }
  : { text: '#56616b', line: '#cbd2d8', panel: '#ffffff', rose: '#b92350', mint: '#16724f', cyan: '#176d87', gold: '#875700' })

const periodEvents = computed(() => {
  if (!events.value) return []
  if (range.value === 'all') return events.value
  const since = new Date(now.value)
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - range.value + 1)
  return events.value.filter((event) => {
    const createdAt = new Date(event.$createdAt).getTime()
    return createdAt >= since.getTime() && createdAt <= now.value
  })
})

const stats = computed(() => events.value
  ? summarizeViews(periodEvents.value, figures.value, dances, now.value)
  : null)
const lifetimeStats = computed(() => events.value
  ? summarizeViews(events.value, figures.value, dances, now.value)
  : null)
const timeline = computed(() => events.value
  ? buildEventTimeline(periodEvents.value, range.value, now.value)
  : { labels: [], views: [], pageViews: [], clicks: [], adminActions: [] })
const chartSummary = computed(() => {
  return `${number(stats.value?.totalPageViews ?? 0)} visite di pagina, ${number(stats.value?.totalClicks ?? 0)} click e ${number(stats.value?.adminActions ?? 0)} azioni amministrative nel periodo.`
})
const topFigures = computed(() => stats.value?.top ?? [])
const danceChartData = computed(() => ({
  labels: stats.value?.byDance.map((item) => item.nome) ?? [],
  datasets: [{
    data: stats.value?.byDance.map((item) => item.views) ?? [],
    backgroundColor: [chartColors.value.rose, chartColors.value.cyan],
    borderRadius: 4,
    barThickness: 14,
  }],
}))
const styleChartData = computed(() => ({
  labels: stats.value?.byStyle.slice(0, 6).map((item) => item.nome) ?? [],
  datasets: [{
    data: stats.value?.byStyle.slice(0, 6).map((item) => item.views) ?? [],
    backgroundColor: chartColors.value.mint,
    borderRadius: 4,
    barThickness: 12,
  }],
}))
const trendChartData = computed(() => ({
  labels: timeline.value.labels,
  datasets: [
    {
      label: 'Visite pagina',
      data: timeline.value.pageViews,
      borderColor: chartColors.value.rose,
      backgroundColor: 'rgba(167, 139, 250, 0.13)',
      borderWidth: 2,
      fill: true,
      tension: 0.32,
      pointRadius: timeline.value.pageViews.length > 30 ? 0 : 2,
      pointHoverRadius: 5,
      pointBackgroundColor: chartColors.value.rose,
    },
    {
      label: 'Click',
      data: timeline.value.clicks,
      borderColor: chartColors.value.cyan,
      backgroundColor: 'transparent',
      borderWidth: 2,
      tension: 0.32,
      pointRadius: timeline.value.clicks.length > 30 ? 0 : 2,
      pointHoverRadius: 5,
    },
    {
      label: 'Azioni admin',
      data: timeline.value.adminActions,
      borderColor: chartColors.value.gold,
      backgroundColor: 'transparent',
      borderWidth: 2,
      tension: 0.32,
      pointRadius: timeline.value.adminActions.length > 30 ? 0 : 2,
      pointHoverRadius: 5,
    },
  ],
}))
const eventLabels = {
  figure_view: 'Aperture figura',
  figure_card_click: 'Click su figura',
  dance_card_click: 'Click su danza',
  dashboard_nav_click: 'Navigazione dashboard',
  app_nav_click: 'Navigazione app',
  admin_figure_create: 'Figure create',
  admin_figure_edit: 'Figure modificate',
  admin_role_promote: 'Ruoli promossi',
  admin_role_demote: 'Ruoli retrocessi',
}
const eventBreakdownData = computed(() => ({
  labels: stats.value?.byEventType.map((item) => eventLabels[item.eventType] || item.eventType) ?? [],
  datasets: [{
    data: stats.value?.byEventType.map((item) => item.count) ?? [],
    backgroundColor: ['#a78bfa', '#22d3ee', '#38bdf8', '#818cf8', '#64748b', '#34d399', '#fbbf24', '#fb7185', '#f97316'],
    borderColor: chartColors.value.panel,
    borderWidth: 3,
  }],
}))

const trendOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { intersect: false, mode: 'index' },
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { color: chartColors.value.text, usePointStyle: true, boxWidth: 7, padding: 18 },
    },
    tooltip: {
      displayColors: false,
      callbacks: {
        label: (context) => `${context.dataset.label}: ${context.parsed.y}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: chartColors.value.text, maxTicksLimit: 8, maxRotation: 0 },
    },
    y: {
      beginAtZero: true,
      border: { display: false, dash: [3, 5] },
      grid: { color: chartColors.value.line },
      ticks: { color: chartColors.value.text, precision: 0, maxTicksLimit: 5 },
    },
  },
}))

const eventBreakdownOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: chartColors.value.text, usePointStyle: true, boxWidth: 8, padding: 14 },
    },
    tooltip: { displayColors: false },
  },
}))

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
        grid: { color: chartColors.value.line },
        ticks: { color: chartColors.value.text, precision: 0, maxTicksLimit },
      },
      y: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: chartColors.value.text },
      },
    },
  }
}

const danceOptions = computed(() => barOptions(4))
const styleOptions = computed(() => barOptions(4))

function number(value) {
  return new Intl.NumberFormat('it-IT').format(value)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    events.value = await listAnalyticsEvents()
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
        <p class="analytics-intro">Visite, click e azioni nel repertorio.</p>
        <p class="analytics-note">Conteggi per utenti autenticati; gli avvii dei video YouTube esterni non sono inclusi.
        </p>
      </div>
      <div class="live-note"><span aria-hidden="true"></span>Dati caricati</div>
    </header>

    <p v-if="error" class="analytics-error" role="alert">
      {{ error }}
      <button type="button" class="retry-button" @click="load">Riprova</button>
    </p>
    <StudioLoader v-else-if="loading" label="Caricamento delle attività…" />
    <template v-else>
      <div class="period-control" role="group" aria-label="Periodo delle statistiche">
        <span class="period-label">Periodo</span>
        <div class="period-options">
          <button v-for="option in ranges" :key="option.value" type="button" :class="{ active: range === option.value }"
            :aria-pressed="range === option.value" @click="range = option.value">{{ option.label }}</button>
        </div>
      </div>

      <div class="kpis" aria-label="Indicatori principali">
        <article class="kpi-card kpi-primary">
          <span class="kpi-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M3 12h4l3-8 4 16 3-8h4" />
            </svg>
          </span>
          <p>Aperture figura</p>
          <strong>{{ number(stats.totalViews) }}</strong>
          <span class="kpi-foot">Pagine delle figure aperte</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon kpi-icon-mint" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 5h16v14H4zM8 9h8M8 13h5" />
            </svg>
          </span>
          <p>Visite di pagina</p>
          <strong>{{ number(stats.totalPageViews) }}</strong>
          <span class="kpi-foot">Home, danza, figura e account</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon kpi-icon-cyan" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
          <p>Click nel periodo</p>
          <strong>{{ number(stats.totalClicks) }}</strong>
          <span class="kpi-foot">Danze, figure e navigazione</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon kpi-icon-rose" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="9" cy="8" r="3" />
              <path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.2a3 3 0 0 1 0 5.6M18 14a5 5 0 0 1 3 4.6v1" />
            </svg>
          </span>
          <p>Persone raggiunte</p>
          <strong>{{ number(stats.uniqueViewers) }}</strong>
          <span class="kpi-foot">Utenti che hanno visitato</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon kpi-icon-gold" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3v18m6-14H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6" />
            </svg>
          </span>
          <p>Azioni amministrative</p>
          <strong>{{ number(stats.adminActions) }}</strong>
          <span class="kpi-foot">Nel periodo selezionato</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-icon kpi-icon-rose" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3v18m6-14H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6" />
            </svg>
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
              <h3 id="trend-title">Attività nel tempo</h3>
              <p>{{ chartSummary }}</p>
            </div>
            <span class="panel-total">{{ number(stats.totalPageViews + stats.totalClicks + stats.adminActions) }}
              <small>eventi</small></span>
          </div>
          <div class="trend-chart" role="img"
            :aria-label="`Andamento di aperture, click e azioni admin. ${chartSummary}`">
            <Line :data="trendChartData" :options="trendOptions" />
          </div>
          <table class="visually-hidden">
            <caption>Attività per {{ range === 'all' ? 'mese' : 'giorno' }}</caption>
            <thead>
              <tr>
                <th scope="col">Periodo</th>
                <th scope="col">Visite</th>
                <th scope="col">Click</th>
                <th scope="col">Azioni admin</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(label, index) in timeline.labels" :key="label">
                <th scope="row">{{ label }}</th>
                <td>{{ timeline.pageViews[index] }}</td>
                <td>{{ timeline.clicks[index] }}</td>
                <td>{{ timeline.adminActions[index] }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel ranking-panel" aria-labelledby="ranking-title">
          <div class="panel-heading">
            <div>
              <h3 id="ranking-title">Figure più viste</h3>
              <p>Aperture delle pagine figura nel periodo.</p>
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

        <section class="panel breakdown-panel" aria-labelledby="events-title">
          <div class="panel-heading">
            <div>
              <h3 id="events-title">Composizione eventi</h3>
              <p>Come si distribuisce l’attività.</p>
            </div>
          </div>
          <div v-if="stats.byEventType.length" class="event-chart" role="img"
            :aria-label="`Composizione degli eventi: ${stats.byEventType.map((item) => `${eventLabels[item.eventType] || item.eventType}, ${item.count}`).join('; ')}`">
            <Doughnut :data="eventBreakdownData" :options="eventBreakdownOptions" />
          </div>
          <p v-else class="empty-note">La composizione apparirà con le prime attività.</p>
          <table class="visually-hidden">
            <caption>Conteggio degli eventi per tipo</caption>
            <thead>
              <tr>
                <th scope="col">Evento</th>
                <th scope="col">Conteggio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in stats.byEventType" :key="item.eventType">
                <th scope="row">{{ eventLabels[item.eventType] || item.eventType }}</th>
                <td>{{ item.count }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel ranking-panel" aria-labelledby="click-ranking-title">
          <div class="panel-heading">
            <div>
              <h3 id="click-ranking-title">Figure più aperte dai cataloghi</h3>
              <p>Click sulle schede di Salsa e Bachata.</p>
            </div>
            <span class="ranking-mark" aria-hidden="true">Click</span>
          </div>
          <ol v-if="stats.topClickedFigures.length" class="ranking-list">
            <li v-for="(figure, index) in stats.topClickedFigures" :key="figure.id">
              <span class="rank-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="rank-name">{{ figure.nome }}</span>
              <strong>{{ number(figure.clicks) }}</strong>
            </li>
          </ol>
          <p v-else class="empty-note">Nessun click sulle schede nel periodo selezionato.</p>
        </section>

        <section class="panel breakdown-panel" aria-labelledby="dance-title">
          <div class="panel-heading">
            <div>
              <h3 id="dance-title">Le danze più cercate</h3>
              <p>Confronto delle aperture nel periodo.</p>
            </div>
          </div>
          <div class="breakdown-chart" role="img"
            :aria-label="`Aperture per danza: ${stats.byDance.map((item) => `${item.nome}, ${item.views}`).join('; ')}`">
            <Bar :data="danceChartData" :options="danceOptions" />
          </div>
          <table class="visually-hidden">
            <caption>Aperture per danza</caption>
            <thead>
              <tr>
                <th scope="col">Danza</th>
                <th scope="col">Aperture</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in stats.byDance" :key="item.id">
                <th scope="row">{{ item.nome }}</th>
                <td>{{ item.views }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel breakdown-panel" aria-labelledby="style-title">
          <div class="panel-heading">
            <div>
              <h3 id="style-title">Stili in evidenza</h3>
              <p>Le preferenze che prendono forma.</p>
            </div>
          </div>
          <template v-if="stats.byStyle.length">
            <div class="breakdown-chart" role="img"
              :aria-label="`Aperture per stile: ${stats.byStyle.slice(0, 6).map((item) => `${item.nome}, ${item.views}`).join('; ')}`">
              <Bar :data="styleChartData" :options="styleOptions" />
            </div>
            <table class="visually-hidden">
              <caption>Aperture per stile</caption>
              <thead>
                <tr>
                  <th scope="col">Stile</th>
                  <th scope="col">Aperture</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in stats.byStyle.slice(0, 6)" :key="item.id">
                  <th scope="row">{{ item.nome }}</th>
                  <td>{{ item.views }}</td>
                </tr>
              </tbody>
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
  --analytics-panel: var(--ink-2);
  --analytics-raised: var(--ink-3);
  --analytics-line: var(--line);
  --analytics-text: var(--text);
  --analytics-muted: var(--muted);
  min-width: 0;
  padding: clamp(1.25rem, 3vw, 2rem);
  border: 1px solid var(--analytics-line);
  border-radius: 1rem;
  background: var(--ink-2);
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
  color: var(--brand-text);
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

.analytics-note {
  margin: 0.3rem 0 0;
  color: var(--analytics-muted);
  font-size: 0.75rem;
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
  background: var(--success);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--success) 12%, var(--ink-2));
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
  background: var(--brand);
  color: #fff;
  font-weight: 700;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  margin-top: 1rem;
}

.kpi-card {
  position: relative;
  display: block;
  min-width: 0;
  padding: 1.1rem;
  border: 1px solid var(--analytics-line);
  border-radius: 0.9rem;
  background: var(--analytics-panel);
}

.kpi-primary {
  background: var(--brand-soft);
  border-color: var(--brand-text);
}

.kpi-icon {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border-radius: 10px;
  background: var(--brand-soft);
  color: var(--brand-text);
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

.kpi-icon-rose {
  background: var(--brand-soft);
  color: var(--brand-text);
}

.kpi-icon-mint {
  background: color-mix(in srgb, var(--success) 12%, var(--ink-2));
  color: var(--success);
}

.kpi-icon-gold {
  background: color-mix(in srgb, var(--warning) 12%, var(--ink-2));
  color: var(--warning);
}

.kpi-icon-cyan {
  background: color-mix(in srgb, var(--info) 12%, var(--ink-2));
  color: var(--info);
}

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
  border-radius: 0.9rem;
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

.event-chart {
  height: 210px;
  max-width: 360px;
  margin: 0.8rem auto 0;
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
  border-bottom: 1px solid var(--line);
}

.ranking-list li:last-child {
  border-bottom: 0;
}

.rank-number {
  color: var(--brand-text);
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
.analytics-error {
  margin: 1.2rem 0 0;
  color: var(--analytics-muted);
}

.analytics-error {
  color: var(--brand-text);
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
    border-radius: 0.9rem;
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
