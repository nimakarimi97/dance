<script setup>
import { gsap } from 'gsap'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser, isEditor, signOut } from '../lib/auth.js'

const router = useRouter()
const isSigningOut = ref(false)
const root = ref(null)

onMounted(() => {
  gsap.from(root.value.querySelectorAll('.reveal'), {
    opacity: 0,
    y: 24,
    duration: 0.7,
    stagger: 0.1,
    ease: 'power3.out',
  })
})

async function signOutUser() {
  isSigningOut.value = true
  try {
    await signOut()
    router.replace({ name: 'auth' })
  } finally {
    isSigningOut.value = false
  }
}
</script>

<template>
  <main ref="root" class="dashboard container">
    <header class="reveal">
      <h1 class="script">Ciao, {{ currentUser?.name || currentUser?.email }}</h1>
      <p class="sub">Benvenuto nella tua area personale.</p>
    </header>

    <section class="cards">
      <article class="card reveal">
        <h2>Profilo</h2>
        <dl>
          <dt>Email</dt>
          <dd>{{ currentUser?.email }}</dd>
          <dt>Ruolo</dt>
          <dd>
            <span class="badge" :class="{ editor: isEditor }">{{ isEditor ? 'Editor' : 'Utente' }}</span>
          </dd>
        </dl>
      </article>

      <article class="card reveal">
        <h2>Gestione figure</h2>
        <p v-if="isEditor" class="sub">Aggiungi figure e carica i video. Il pannello arriva nel prossimo step.</p>
        <p v-else class="sub">Solo gli editor possono aggiungere figure e caricare video.</p>
      </article>
    </section>

    <button type="button" class="logout reveal" :disabled="isSigningOut" @click="signOutUser">
      {{ isSigningOut ? 'Uscita…' : 'Esci' }}
    </button>
  </main>
</template>

<style scoped>
.dashboard {
  padding: 3rem 1rem 2rem;
  display: grid;
  gap: 2rem;
}

.script {
  font-family: 'Caveat', cursive;
  font-size: clamp(2.4rem, 6vw, 3.6rem);
  color: #f8fafc;
  margin: 0;
}
.sub { color: #94a3b8; margin: 0.25rem 0 0; }

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
}

.card {
  padding: 1.75rem;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.card h2 { margin: 0 0 0.75rem; font-size: 1.2rem; color: #f8fafc; }

dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  margin: 0;
  color: #cbd5e1;
}
dt { color: #64748b; }
dd { margin: 0; }

.badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: #1e293b;
  font-size: 0.85rem;
}
.badge.editor { background: linear-gradient(135deg, #e11d48, #2629e1); color: #fff; }

.logout {
  justify-self: start;
  padding: 0.7rem 1.4rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: #f8fafc;
  font: inherit;
  cursor: pointer;
}
.logout:hover:not(:disabled) { background: rgba(255, 255, 255, 0.06); }
</style>
