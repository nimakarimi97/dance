<script setup>
import { gsap } from 'gsap'
import { onMounted, ref } from 'vue'
import { canAnimate } from '../lib/motion.js'
import { useRouter } from 'vue-router'
import { currentUser, isAdmin, signOut } from '../lib/auth.js'
import FigureEditor from '../components/FigureEditor.vue'

const router = useRouter()
const isSigningOut = ref(false)
const signOutError = ref('')
const root = ref(null)

onMounted(() => {
  if (!canAnimate()) return
  gsap.from(root.value.querySelectorAll('header, .card, .logout'), {
    opacity: 0, y: 24, duration: 0.7, stagger: 0.1, ease: 'power3.out', clearProps: 'transform,opacity',
  })
})

async function signOutUser() {
  isSigningOut.value = true
  signOutError.value = ''
  try {
    await signOut()
    router.replace({ name: 'auth' })
  } catch {
    signOutError.value = 'Non sono riuscito a farti uscire. Controlla la connessione e riprova.'
  } finally {
    isSigningOut.value = false
  }
}
</script>

<template>
  <main ref="root" class="dashboard container">
    <header>
      <h1 class="title script">Ciao, {{ currentUser?.name || currentUser?.email }}</h1>
      <p class="sub">Questa è la tua area personale.</p>
    </header>

    <section class="cards">
      <article class="card">
        <h2>Profilo</h2>
        <dl>
          <dt>Email</dt>
          <dd>{{ currentUser?.email }}</dd>
          <dt>Ruolo</dt>
          <dd>
            <span class="badge" :class="{ editor: isAdmin }">{{ isAdmin ? 'Admin' : 'Utente' }}</span>
          </dd>
        </dl>
      </article>

      <article v-if="!isAdmin" class="card">
        <h2>Le tue figure</h2>
        <p class="sub">Sfoglia salsa e bachata dal menu. Solo gli amministratori possono aggiungere figure e caricare video.</p>
      </article>
    </section>

    <FigureEditor v-if="isAdmin" />
    <p v-if="signOutError" class="errore" role="alert">{{ signOutError }}</p>
    <button type="button" class="btn logout" :disabled="isSigningOut" @click="signOutUser">
      {{ isSigningOut ? 'Uscita…' : 'Esci' }}
    </button>
  </main>
</template>

<style scoped>
.dashboard { padding: 1.5rem 0 1rem; display: grid; gap: 1.5rem; }

.title {
  font-size: clamp(3rem, 10vw, 4.5rem);
  line-height: 1;
  overflow-wrap: anywhere;
  background: linear-gradient(90deg, #fb7185, #a5b4fc);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  padding-bottom: 0.1em;
}
.sub { color: var(--muted); margin: 0.25rem 0 0; }

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 1rem;
}

.card {
  padding: 1.5rem;
  border-radius: 24px;
  background: var(--ink-2);
  border: 1px solid var(--line);
}
.card h2 { margin: 0 0 0.75rem; font-size: 1.25rem; }

dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  margin: 0;
}
dt { color: var(--muted); }
dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }

.badge {
  display: inline-block;
  padding: 0.15rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  font-size: 0.9rem;
}
.badge.editor { background: var(--grad); border-color: transparent; color: #fff; font-weight: 700; }

.errore {
  margin: 0;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  background: rgba(225, 29, 72, 0.18);
  border: 1px solid var(--salsa);
}
.logout { justify-self: start; }
</style>
