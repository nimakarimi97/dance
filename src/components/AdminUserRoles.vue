<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { currentUser, isSuperAdmin } from '../lib/auth.js'
import { figures } from '../data/danze.js'
import { ANALYTICS_EVENTS } from '../lib/analytics.js'
import { recordAnalyticsEvent } from '../lib/figures.js'
import { listUsers, setUserRole } from '../lib/roles.js'

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
    users.value = await listUsers()
  } catch (cause) {
    error.value = cause.message || 'Impossibile caricare gli utenti.'
  }
}

async function changeRole(user, role) {
  if (!isSuperAdmin.value) {
    error.value = 'Solo un super admin può modificare i ruoli.'
    return
  }
  pending.value = user.$id
  error.value = ''
  try {
    await setUserRole(user.$id, role)
    users.value = users.value.map((entry) =>
      entry.$id === user.$id ? { ...entry, role } : entry,
    )
    recordAnalyticsEvent({
      eventType: role === 'admin'
        ? ANALYTICS_EVENTS.ADMIN_ROLE_PROMOTE
        : ANALYTICS_EVENTS.ADMIN_ROLE_DEMOTE,
      eventTarget: user.$id,
      userId: currentUser.value?.$id,
    })
  } catch (cause) {
    const message = cause.message || 'Impossibile aggiornare il ruolo.'
    try {
      users.value = await listUsers()
      error.value = `${message} Elenco aggiornato dal server.`
    } catch (refreshError) {
      error.value = `${message} Verifica dello stato attuale non riuscita: ${refreshError.message}`
    }
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
          <td>
            <strong class="user-name">{{ user.name || '—' }}</strong>
            <span class="user-email">{{ user.email || '—' }}</span>
          </td>
          <td>{{ user.email || '—' }}</td>
          <td><span class="role-badge" :class="`role-${user.role}`">{{ user.role === 'superadmin' ? 'Super admin' : user.role === 'admin' ? 'Admin' : 'Utente' }}</span></td>
          <td>{{ user.figures }}</td>
          <td>
            <button
              v-if="isSuperAdmin && user.role !== 'admin' && user.role !== 'superadmin'"
              type="button"
              class="role-action"
              :disabled="pending === user.$id"
              @click="changeRole(user, 'admin')"
            >Promuovi ad admin</button>
            <button
              v-else-if="isSuperAdmin && user.$id !== currentUser?.$id && user.role === 'admin'"
              type="button"
              class="role-action"
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
  min-width: 0;
  padding: 1.25rem;
  border: 1px solid var(--studio-line);
  border-radius: 1rem;
  background: linear-gradient(180deg, var(--studio-panel), var(--studio-panel-soft));
}

.user-roles h2 {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.3;
}

.user-roles header p,
.user-roles > p {
  margin: 0.4rem 0 1rem;
  color: var(--studio-muted);
  font-size: 0.88rem;
}

.roles-error {
  color: var(--studio-warning);
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

th,
td {
  padding: 0.75rem 0.65rem;
  border-bottom: 1px solid var(--studio-line);
  text-align: left;
  vertical-align: middle;
  font-size: 0.84rem;
}

th {
  color: var(--studio-muted);
  font-size: 0.75rem;
  font-weight: 500;
}

tbody tr:hover {
  background: var(--studio-hover);
}

.user-name,
.user-email {
  display: block;
}

.user-email {
  display: none;
  margin-top: 0.2rem;
  color: var(--studio-muted);
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  min-height: 1.65rem;
  padding: 0.15rem 0.55rem;
  border: 1px solid var(--studio-line);
  border-radius: 999px;
  color: var(--studio-muted);
  font-size: 0.73rem;
  white-space: nowrap;
}

.role-admin,
.role-superadmin {
  border-color: rgba(124, 58, 237, 0.4);
  background: var(--studio-accent-soft);
  color: #ddd6fe;
}

.role-action {
  min-height: 2.5rem;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--studio-line);
  border-radius: 0.65rem;
  background: var(--studio-raised);
  color: var(--studio-text);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}

.role-action:hover:not(:disabled) {
  border-color: rgba(124, 58, 237, 0.5);
}

.role-action:disabled {
  opacity: 0.6;
  cursor: wait;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (max-width: 640px) {
  .user-roles {
    padding: 1rem;
  }

  th,
  td {
    padding: 0.65rem 0.35rem;
    font-size: 0.78rem;
  }

  th:nth-child(2),
  td:nth-child(2) {
    display: none;
  }

  .user-email {
    display: block;
  }

  .role-action {
    min-height: 2.75rem;
    padding-inline: 0.45rem;
    font-size: 0.7rem;
  }
}
</style>
