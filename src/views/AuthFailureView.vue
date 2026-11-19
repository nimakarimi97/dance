<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="container callback">
    <p class="script">Accesso con Google non riuscito</p>
    <p class="sub">Hai annullato l'accesso oppure il provider ha restituito un errore. Riprova.</p>
    <RouterLink to="/auth" class="back">Torna al login</RouterLink>
  </main>
</template>

<style scoped>
.callback {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.75rem;
  min-height: 60dvh;
  text-align: center;
}
.script { font-family: 'Caveat', cursive; font-size: 2.2rem; color: #f8fafc; margin: 0; }
.sub { color: #94a3b8; margin: 0; }
.back { color: #a5b4fc; }
</style>
