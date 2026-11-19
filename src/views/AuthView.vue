<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { registerWithEmail, signInWithEmail, signInWithGoogle } from '../lib/auth.js'

const route = useRoute()
const router = useRouter()

const mode = ref('login')
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

const isRegistration = computed(() => mode.value === 'register')
const redirectDestination = computed(() => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return redirect.startsWith('/') ? redirect : '/dashboard'
})

async function submitAuth() {
  error.value = ''
  isLoading.value = true
  try {
    if (isRegistration.value) {
      await registerWithEmail({ name: name.value.trim(), email: email.value.trim(), password: password.value })
    } else {
      await signInWithEmail(email.value.trim(), password.value)
    }
    router.replace(redirectDestination.value)
  } catch (e) {
    error.value = e.message || 'Accesso non riuscito'
  } finally {
    isLoading.value = false
  }
}

async function handleGoogleSignIn() {
  error.value = ''
  try {
    await signInWithGoogle()
  } catch (e) {
    error.value = e.message || 'Accesso con Google non riuscito'
  }
}
</script>

<template>
  <main class="auth container">
    <section class="card">
      <h1 class="script">{{ isRegistration ? 'Crea account' : 'Accedi' }}</h1>
      <p class="sub">Salva i tuoi preferiti e gestisci le figure.</p>

      <button type="button" class="google" @click="handleGoogleSignIn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M15.7034 7.91133C14.7554 7.02509 13.4903 6.54228 12.1813 6.56212C9.78605 6.56212 7.75176 8.14611 7.02642 10.279V10.2791C6.64183 11.3968 6.64183 12.6071 7.02642 13.7249H7.02979C7.75849 15.8545 9.78941 17.4385 12.1847 17.4385C13.4211 17.4385 14.4826 17.1285 15.3053 16.5809V16.5787C16.2735 15.9504 16.9348 14.9616 17.1406 13.8439H12.1813V10.3783H20.8414C20.9494 10.9802 21 11.5952 21 12.207C21 14.9443 20.002 17.2586 18.2655 18.826L18.2673 18.8274C16.7458 20.203 14.6576 21 12.1813 21C8.70985 21 5.53527 19.082 3.97666 16.043V16.043C2.67445 13.5 2.67445 10.5039 3.97666 7.96096H3.97668L3.97666 7.96094C5.53527 4.9186 8.70985 3.00061 12.1813 3.00061C14.4619 2.97415 16.6649 3.8141 18.3247 5.34188L15.7034 7.91133Z" fill="#C4C6D7" />
        </svg>
        Sign in with Google
      </button>

      <div class="divider"><span>oppure</span></div>

      <form class="form" @submit.prevent="submitAuth">
        <label v-if="isRegistration">
          Nome
          <input v-model="name" type="text" autocomplete="name" required />
        </label>
        <label>
          Email
          <input v-model="email" type="email" autocomplete="email" required />
        </label>
        <label>
          Password
          <input
            v-model="password"
            type="password"
            :autocomplete="isRegistration ? 'new-password' : 'current-password'"
            minlength="8"
            required
          />
        </label>

        <p v-if="error" class="errore" role="alert">{{ error }}</p>

        <button type="submit" class="submit" :disabled="isLoading">
          {{ isLoading ? 'Attendere…' : isRegistration ? 'Registrati' : 'Accedi' }}
        </button>
      </form>

      <button type="button" class="toggle" @click="mode = isRegistration ? 'login' : 'register'">
        {{ isRegistration ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati' }}
      </button>
    </section>
  </main>
</template>

<style scoped>
.auth {
  display: grid;
  place-items: center;
  min-height: 70dvh;
  padding: 2rem 1rem;
}

.card {
  width: min(100%, 420px);
  padding: 2.25rem;
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(14px);
  animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

h1 {
  margin: 0;
  font-size: 2.6rem;
  color: #f8fafc;
}

.sub {
  margin: 0.25rem 0 1.5rem;
  color: #94a3b8;
}

.google {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #1e293b;
  color: #f8fafc;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}
.google:hover { transform: translateY(-2px); background: #273449; }

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.5rem 0;
  color: #64748b;
  font-size: 0.85rem;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.form {
  display: grid;
  gap: 1rem;
}

label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #cbd5e1;
}

input {
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(2, 6, 23, 0.6);
  color: #f8fafc;
  font: inherit;
}
input:focus {
  outline: 2px solid #2629e1;
  outline-offset: 2px;
}

.errore {
  margin: 0;
  color: #fda4af;
  font-size: 0.9rem;
}

.submit {
  padding: 0.85rem 1rem;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #e11d48, #2629e1);
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.submit:hover:not(:disabled) { transform: translateY(-2px); }
.submit:disabled { opacity: 0.6; cursor: wait; }

.toggle {
  margin-top: 1.25rem;
  width: 100%;
  border: 0;
  background: none;
  color: #a5b4fc;
  font: inherit;
  cursor: pointer;
}

@keyframes rise {
  from { opacity: 0; transform: translateY(24px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
</style>
