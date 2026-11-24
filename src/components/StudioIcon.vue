<script setup>
defineProps({ name: { type: String, required: true } })

const paths = {
  home: 'M3 10l9-7 9 7v11h-6v-7H9v7H3z',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  dance: 'M9 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M19 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M7 9l-3 3-2-2 M7 9l5 3 5-3 M17 9l3 3 2-2 M7 9v6l-3 6 M7 15l4 6 M17 9v6l-4 6 M17 15l3 6',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  youtube: 'M3 5h18v14H3z M10 9l5 3-5 3z',
  linkedin: 'M3 3h18v18H3z M8 11v6 M8 8v.01 M12 17v-6 M12 13a2.5 2.5 0 0 1 5 0v4',
  github: 'M9 21v-3c-4 1-4-2-6-2 M15 21v-4c0-1 .5-2 1-2 4-.5 5-2 5-5a5 5 0 0 0-1-3c.3-1 .3-2-.2-3-2 0-3 1-3 1a11 11 0 0 0-10 0S6 4 4 4c-.5 1-.5 2-.2 3A5 5 0 0 0 3 10c0 3 1 4.5 5 5 .5 0 1 1 1 2',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  library: 'M4 5h16v15H4z M8 5V3h8v2 M8 10h8 M8 14h5',
  video: 'M3 5h13v14H3z M16 10l5-3v10l-5-3',
  music: 'M9 18V5l11-2v13 M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3 M20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3',
  clock: 'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  plus: 'M12 5v14 M5 12h14',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  filters: 'M4 7h9 M17 7h3 M4 17h3 M11 17h9 M13 4v6 M7 14v6',
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
  <svg class="studio-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="paths[name]" />
  </svg>
</template>

<style scoped>
.studio-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 auto;
}
</style>
