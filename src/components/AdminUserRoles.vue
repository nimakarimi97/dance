<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { currentUser } from '../lib/auth.js'
import { figures } from '../data/danze.js'
import { listUserRoles, setUserRole } from '../lib/roles.js'

const users = shallowRef(null)
const error = shallowRef('')
const pending = shallowRef('')

const rows = computed(() => {
  if (!users.value) return []
  const counts = new Map()
  for (const figure of figures.value) {
    if (figure.createdBy) counts.set(figure.createdBy, (counts.get(figure.createdBy) ?? 0) + 1)
  }
  return users.value.map((user) => ({ ...user, figures: counts.get(user.userId) ?? 0 }))
})

async function load() {
  error.value = ''
  try {
    users.value = await listUserRoles()
  } catch (cause) {
    error.value = cause.message || 'Impossibile caricare gli utenti.'
  }
}

async function changeRole(user, role) {
  pending.value = user.$id
  error.value = ''
  try {
    await setUserRole(user.$id, role)
    user.role = role
  } catch (cause) {
    error.value = cause.message || 'Impossibile aggiornare il ruolo.'
  } finally {
    pending.value = ''
  }
}

onMounted(load)
</script>

<template>
  <section class="user-roles" aria-labelledby="user-roles-title">
    <header>
      <h2 id="user-roles-title">Utenti</h2>
      <p>Promuovi o retrocedi gli utenti e controlla quante figure hanno aggiunto.</p>
    </header>

    <p v-if="error" class="roles-error" role="alert">{{ error }}</p>
    <p v-if="!users && !error" aria-busy="true">Caricamento utenti…</p>
    <table v-else-if="users">
      <thead>
        <tr>
          <th scope="col">Nome</th>
          <th scope="col">Email</th>
          <th scope="col">Ruolo</th>
          <th scope="col">Figure aggiunte</th>
          <th scope="col"><span class="visually-hidden">Azioni</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in rows" :key="user.$id">
          <td>{{ user.name || '—' }}</td>
          <td>{{ user.email || '—' }}</td>
          <td>{{ user.role === 'superadmin' ? 'Super admin' : user.role === 'admin' ? 'Admin' : 'Utente' }}</td>
          <td>{{ user.figures }}</td>
          <td>
            <button
              v-if="user.role !== 'admin' && user.role !== 'superadmin'"
              type="button"
              :disabled="pending === user.$id"
              @click="changeRole(user, 'admin')"
            >Promuovi ad admin</button>
            <button
              v-else-if="user.$id !== currentUser?.$id && user.role === 'admin'"
              type="button"
              :disabled="pending === user.$id"
              @click="changeRole(user, 'user')"
            >Retrocedi a utente</button>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="5">Nessun utente registrato.</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.user-roles {
  padding: 1.6rem 0;
  border-bottom: 1px solid var(--studio-line);
}

.user-roles h2 {
  margin: 0;
  font-size: 1.25rem;
}

.user-roles header p,
.user-roles > p {
  margin: 0.25rem 0 0.75rem;
  color: var(--studio-muted);
}

.roles-error {
  color: var(--studio-warning);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.6rem 0.5rem;
  border-bottom: 1px solid var(--studio-line);
  text-align: left;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
