<script setup>
defineProps({ name: { type: String, required: true } })

const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  library: 'M4 5h16v15H4z M8 5V3h8v2 M8 10h8 M8 14h5',
  video: 'M3 5h13v14H3z M16 10l5-3v10l-5-3',
  music: 'M9 18V5l11-2v13 M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3 M20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3',
  clock: 'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  plus: 'M12 5v14 M5 12h14',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  edit: 'M16 3l5 5 M4 15L16 3l5 5L9 20l-6 1z',
  close: 'M6 6l12 12 M18 6L6 18',
  logout: 'M9 4H4v16h5 M10 12h11 M17 8l4 4-4 4',
  user: 'M20 21v-2a7 7 0 0 0-14 0v2 M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  upload: 'M12 16V3 M7 8l5-5 5 5 M4 16v5h16v-5',
  image: 'M3 3h18v18H3z M3 16l5-5 5 5 3-3 5 5 M15 7h.01',
  check: 'M5 12l4 4L19 6',
  shield: 'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6',
}
</script>

<template>
  <svg class="studio-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="paths[name]" />
  </svg>
</template>

<style scoped>
.studio-icon { width: 1.25rem; height: 1.25rem; flex: 0 0 auto; }
</style>
