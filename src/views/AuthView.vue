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
const showPassword = ref(false)
const showConfirmPassword = ref(false)
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
      await registerWithEmail({
        name: name.value.trim(),
        email: email.value.trim(),
        password: password.value,
        confirmPassword: confirmPassword.value,
      })
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

function toggleMode() {
  mode.value = isRegistration.value ? 'login' : 'register'
  error.value = ''
  confirmPassword.value = ''
  showPassword.value = false
  showConfirmPassword.value = false
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
      <p class="sub">Ritrova le tue figure, i preferiti e le liste di pratica.</p>

      <button type="button" class="btn google" :disabled="isLoading" @click="handleGoogleSignIn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true">
          <path fill-rule="evenodd" clip-rule="evenodd"
            d="M15.7034 7.91133C14.7554 7.02509 13.4903 6.54228 12.1813 6.56212C9.78605 6.56212 7.75176 8.14611 7.02642 10.279V10.2791C6.64183 11.3968 6.64183 12.6071 7.02642 13.7249H7.02979C7.75849 15.8545 9.78941 17.4385 12.1847 17.4385C13.4211 17.4385 14.4826 17.1285 15.3053 16.5809V16.5787C16.2735 15.9504 16.9348 14.9616 17.1406 13.8439H12.1813V10.3783H20.8414C20.9494 10.9802 21 11.5952 21 12.207C21 14.9443 20.002 17.2586 18.2655 18.826L18.2673 18.8274C16.7458 20.203 14.6576 21 12.1813 21C8.70985 21 5.53527 19.082 3.97666 16.043V16.043C2.67445 13.5 2.67445 10.5039 3.97666 7.96096H3.97668L3.97666 7.96094C5.53527 4.9186 8.70985 3.00061 12.1813 3.00061C14.4619 2.97415 16.6649 3.8141 18.3247 5.34188L15.7034 7.91133Z"
            fill="currentColor" />
        </svg>
        Continua con Google
      </button>

      <div class="divider"><span>oppure</span></div>

      <form class="form" @submit.prevent="submitAuth">
        <label v-if="isRegistration">
          Nome
          <input v-model="name" type="text" name="name" autocomplete="name" placeholder="Il tuo nome" required />
        </label>
        <label>
          Email
          <input v-model="email" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="none"
            :spellcheck="false" placeholder="nome@esempio.com" required />
        </label>
        <label>
          Password
          <span class="password-input">
            <input v-model="password" :type="showPassword ? 'text' : 'password'" name="password"
              :autocomplete="isRegistration ? 'new-password' : 'current-password'" placeholder="Almeno 8 caratteri"
              minlength="8" required />
            <button type="button" class="password-toggle" :aria-pressed="showPassword"
              :aria-label="showPassword ? 'Nascondi password' : 'Mostra password'"
              @click="showPassword = !showPassword">
              <svg v-if="showPassword" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1 0 1.9-.2 2.8-.5" />
              </svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </span>
        </label>
        <label v-if="isRegistration">
          Conferma password
          <span class="password-input">
            <input v-model="confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" name="confirmPassword"
              autocomplete="new-password" placeholder="Ripeti la password" minlength="8"
              :aria-invalid="confirmPassword.length > 0 && password !== confirmPassword"
              :aria-describedby="confirmPassword.length > 0 && password !== confirmPassword ? 'password-mismatch' : undefined"
              required />
            <button type="button" class="password-toggle" :aria-pressed="showConfirmPassword"
              :aria-label="showConfirmPassword ? 'Nascondi conferma password' : 'Mostra conferma password'"
              @click="showConfirmPassword = !showConfirmPassword">
              <svg v-if="showConfirmPassword" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1 0 1.9-.2 2.8-.5" />
              </svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </span>
          <span v-if="confirmPassword.length > 0 && password !== confirmPassword" id="password-mismatch" class="hint warning">
            Le password non coincidono.
          </span>
        </label>

        <p v-if="error || authError" class="errore" role="alert">
          {{ error || authError }}
        </p>
        <p v-if="isRegistration" class="hint">
          La password deve avere almeno 8 caratteri.
        </p>

        <button type="submit" class="btn btn-primary submit" :disabled="isLoading">
          {{
            isLoading ? (isRegistration ? 'Registrazione…' : 'Accesso…') : isRegistration ? 'Crea account' : 'Accedi'
          }}
        </button>
      </form>

      <button type="button" class="toggle" :disabled="isLoading" @click="toggleMode">
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
  border-radius: 1rem;
  background: var(--ink-2);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
}

h1 {
  font-size: 3.2rem;
  line-height: 1;
}

.sub {
  margin: 0.25rem 0 1.5rem;
  color: var(--muted);
}

.google {
  width: 100%;
}

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.5rem 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--line);
}

.form {
  display: grid;
  gap: 1rem;
}

label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.95rem;
  font-weight: 600;
}

input {
  min-height: 3rem;
  padding: 0.7rem 0.9rem;
  border-radius: 0.7rem;
  border: 1px solid var(--input-line);
  background: var(--input-bg);
  color: var(--text);
  font-size: 1rem;
  /* 16px avoids iOS zoom on focus */
}

.password-input {
  position: relative;
  display: block;
}

.password-input input {
  width: 100%;
  padding-right: 3.25rem;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 0.35rem;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 0;
  border-radius: 0.55rem;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transform: translateY(-50%);
}

.password-toggle:hover {
  color: var(--text);
}

.password-toggle svg {
  width: 1.25rem;
  height: 1.25rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

input:focus {
  border-color: var(--focus);
}

.errore {
  margin: 0;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  background: rgba(225, 29, 72, 0.18);
  border: 1px solid var(--salsa);
}

.hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.warning {
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--warning);
  border-radius: 0.55rem;
  background: rgba(245, 158, 11, 0.12);
  color: var(--warning);
}

.submit {
  width: 100%;
}

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

.toggle:hover:not(:disabled) {
  color: var(--brand-text);
}

@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: none;
  }
}
</style>
