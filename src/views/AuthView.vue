<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authError, registerWithEmail, signInWithEmail, signInWithGoogle } from '../lib/auth.js'

const route = useRoute()
const router = useRouter()

const mode = ref('login')
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const isLoading = ref(false)

const isRegistration = computed(() => mode.value === 'register')
const redirectDestination = computed(() => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return redirect.startsWith('/') ? redirect : '/dashboard'
})

async function submitAuth() {
  error.value = ''
  if (isRegistration.value && password.value !== confirmPassword.value) {
    error.value = 'Le password non coincidono.'
    return
  }
  isLoading.value = true
  try {
    if (isRegistration.value) {
      await registerWithEmail({ name: name.value.trim(), email: email.value.trim(), password: password.value, confirmPassword: confirmPassword.value })
    } else {
      await signInWithEmail(email.value.trim(), password.value)
    }
    await router.replace(redirectDestination.value)
  } catch (e) {
    error.value = e.message || 'Accesso non riuscito. Controlla email e password e riprova.'
  } finally {
    isLoading.value = false
  }
}

async function handleGoogleSignIn() {
  error.value = ''
  try {
    await signInWithGoogle()
  } catch (e) {
    error.value = e.message || 'Accesso con Google non riuscito. Riprova tra poco.'
  }
}
</script>

<template>
  <main class="auth container">
    <section class="card">
      <h1 class="script">{{ isRegistration ? 'Crea account' : 'Accedi' }}</h1>
      <p class="sub">Entra per gestire le figure e i tuoi dati.</p>

      <button type="button" class="btn google" :disabled="isLoading" @click="handleGoogleSignIn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M15.7034 7.91133C14.7554 7.02509 13.4903 6.54228 12.1813 6.56212C9.78605 6.56212 7.75176 8.14611 7.02642 10.279V10.2791C6.64183 11.3968 6.64183 12.6071 7.02642 13.7249H7.02979C7.75849 15.8545 9.78941 17.4385 12.1847 17.4385C13.4211 17.4385 14.4826 17.1285 15.3053 16.5809V16.5787C16.2735 15.9504 16.9348 14.9616 17.1406 13.8439H12.1813V10.3783H20.8414C20.9494 10.9802 21 11.5952 21 12.207C21 14.9443 20.002 17.2586 18.2655 18.826L18.2673 18.8274C16.7458 20.203 14.6576 21 12.1813 21C8.70985 21 5.53527 19.082 3.97666 16.043V16.043C2.67445 13.5 2.67445 10.5039 3.97666 7.96096H3.97668L3.97666 7.96094C5.53527 4.9186 8.70985 3.00061 12.1813 3.00061C14.4619 2.97415 16.6649 3.8141 18.3247 5.34188L15.7034 7.91133Z" fill="currentColor" />
        </svg>
        Continua con Google
      </button>

      <div class="divider"><span>oppure</span></div>

      <form class="form" @submit.prevent="submitAuth">
        <label v-if="isRegistration">
          Nome
          <input v-model="name" type="text" name="name" autocomplete="name" required />
        </label>
        <label>
          Email
          <input v-model="email" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="none" :spellcheck="false" required />
        </label>
        <label>
          Password
          <input
            v-model="password"
            type="password"
            name="password"
            :autocomplete="isRegistration ? 'new-password' : 'current-password'"
            minlength="8"
            required
          />
        </label>
        <label v-if="isRegistration">
          Conferma password
          <input
            v-model="confirmPassword"
            type="password"
            name="confirmPassword"
            autocomplete="new-password"
            minlength="8"
            :aria-invalid="confirmPassword.length > 0 && password !== confirmPassword"
            :aria-describedby="confirmPassword.length > 0 && password !== confirmPassword ? 'password-mismatch' : undefined"
            required
          />
          <span v-if="confirmPassword.length > 0 && password !== confirmPassword" id="password-mismatch" class="hint">
            Le password non coincidono.
          </span>
        </label>

        <p v-if="error || authError" class="errore" role="alert">{{ error || authError }}</p>
        <p v-if="isRegistration" class="hint">La password deve avere almeno 8 caratteri.</p>

        <button type="submit" class="btn btn-primary submit" :disabled="isLoading">
          {{ isLoading ? (isRegistration ? 'Registrazione…' : 'Accesso…') : isRegistration ? 'Crea account' : 'Accedi' }}
        </button>
      </form>

      <button type="button" class="toggle" :disabled="isLoading" @click="mode = isRegistration ? 'login' : 'register'; error = ''; confirmPassword = ''">
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
  padding: 1.5rem 0;
}

.card {
  animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  width: min(100%, 440px);
  padding: clamp(1.25rem, 5vw, 2.25rem);
  border-radius: 28px;
  background: var(--ink-2);
  border: 1px solid var(--line);
}

h1 { font-size: 3.2rem; line-height: 1; }
.sub { margin: 0.25rem 0 1.5rem; color: var(--muted); }
.google { width: 100%; }

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.5rem 0;
  color: var(--muted);
  font-size: 0.9rem;
}
.divider::before,
.divider::after { content: ''; flex: 1; height: 1px; background: var(--line); }

.form { display: grid; gap: 1rem; }

label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.95rem;
  font-weight: 600;
}

input {
  min-height: 3rem;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--ink);
  color: var(--text);
  font-size: 1rem; /* 16px avoids iOS zoom on focus */
}
input:focus { border-color: var(--gold); }

.errore {
  margin: 0;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  background: rgba(225, 29, 72, 0.18);
  border: 1px solid var(--salsa);
}
.hint { margin: 0; color: var(--muted); font-size: 0.9rem; }

.submit { width: 100%; }

.toggle {
  display: block;
  min-height: var(--touch);
  margin-top: 0.75rem;
  width: 100%;
  border: 0;
  background: none;
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

@keyframes rise {
  from { opacity: 0; transform: translateY(24px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
</style>
