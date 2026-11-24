<script setup>
import { computed, ref } from 'vue'
import { detectInstall } from '../lib/install.js'

const DISMISSED_KEY = 'install-guide-dismissed'

const info = detectInstall(navigator.userAgent, {
  touchPoints: navigator.maxTouchPoints,
  standalone: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
})

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

const visible = ref(info.mobile && !info.installed && !wasDismissed())

const guides = {
  'ios-safari': {
    title: 'iPhone o iPad con Safari',
    steps: [
      'Tocca il pulsante Condividi (il quadrato con la freccia verso l’alto) in basso.',
      'Scorri il menu e tocca "Aggiungi alla schermata Home".',
      'Tocca "Aggiungi" in alto a destra. L’icona comparirà sulla schermata Home.',
    ],
  },
  'ios-other': {
    title: 'iPhone o iPad',
    note: 'Su iPhone e iPad l’installazione funziona solo da Safari. Apri questo sito in Safari, poi segui i passi qui sotto.',
    steps: [
      'Tocca il pulsante Condividi (il quadrato con la freccia verso l’alto) in Safari.',
      'Scorri il menu e tocca "Aggiungi alla schermata Home".',
      'Tocca "Aggiungi" in alto a destra.',
    ],
  },
  'android-chrome': {
    title: 'Android con Chrome',
    steps: [
      'Tocca i tre puntini (⋮) in alto a destra.',
      'Tocca "Installa app" oppure "Aggiungi a schermata Home".',
      'Conferma con "Installa" o "Aggiungi".',
    ],
  },
  'android-samsung': {
    title: 'Android con Samsung Internet',
    steps: [
      'Tocca l’icona del menu (☰) in basso.',
      'Tocca "Aggiungi pagina a", poi "Schermata Home".',
      'Conferma con "Aggiungi".',
    ],
  },
  'android-other': {
    title: 'Android',
    note: 'Per un’installazione più semplice usa Chrome o Samsung Internet.',
    steps: [
      'Apri il menu del browser (di solito i tre puntini o le tre linee).',
      'Cerca "Installa app" oppure "Aggiungi a schermata Home".',
      'Conferma l’operazione.',
    ],
  },
}

const guide = computed(() => {
  if (info.platform === 'ios') return info.browser === 'safari' ? guides['ios-safari'] : guides['ios-other']
  if (info.browser === 'chrome') return guides['android-chrome']
  if (info.browser === 'samsung') return guides['android-samsung']
  return guides['android-other']
})

function dismiss() {
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // Storage can be unavailable in private modes; the guide just shows again next visit.
  }
  visible.value = false
}
</script>

<template>
  <section v-if="visible" class="install" aria-labelledby="install-title">
    <h2 id="install-title" class="install-title">
      Aggiungi l’app alla schermata Home
    </h2>
    <p class="install-intro">Così la trovi come una normale app, anche senza aprire il browser.</p>
    <p class="install-platform">
      Dispositivo rilevato: <strong>{{ guide.title }}</strong>
    </p>
    <p v-if="guide.note" class="install-note">
      {{ guide.note }}
    </p>
    <ol class="install-steps">
      <li v-for="(step, i) in guide.steps" :key="i">
        {{ step }}
      </li>
    </ol>
    <button type="button" class="install-dismiss" @click="dismiss">
      Ho capito, non mostrare più
    </button>
  </section>
</template>

<style scoped>
.install {
  margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
  padding: clamp(1.1rem, 3vw, 1.5rem);
  border-radius: var(--radius);
  background: var(--ink-2);
  border: 1px solid var(--line);
}

.install-title {
  font-family: 'Caveat', cursive;
  font-size: clamp(2.2rem, 8vw, 2.8rem);
  font-weight: 700;
  color: var(--gold);
}

.install-intro,
.install-platform,
.install-note {
  margin: 0.5rem 0 0;
  color: var(--muted);
}

.install-note {
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--warning) 12%, var(--ink-2));
  color: var(--text);
}

.install-steps {
  margin: 0.75rem 0 0;
  padding-left: 1.4rem;
  display: grid;
  gap: 0.5rem;
}

.install-dismiss {
  margin-top: 1rem;
  min-height: var(--touch);
  padding: 0.5rem 1.1rem;
  border: 0;
  border-radius: 999px;
  background: var(--text);
  color: var(--ink);
  font-weight: 700;
  cursor: pointer;
}
</style>
