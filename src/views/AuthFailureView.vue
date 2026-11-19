<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="container state">
    <h1 class="script">Accesso con Google non riuscito</h1>
    <p>Hai annullato l'accesso oppure il provider ha restituito un errore. Riprova.</p>
    <RouterLink to="/auth" class="btn btn-primary">Torna al login</RouterLink>
  </main>
</template>

<style scoped>
.state { min-height: 60dvh; align-content: center; }
.lead { margin: 0; font-size: 2.6rem; color: var(--text); }
</style>
