<script setup>
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import StudioIcon from './StudioIcon.vue'

defineProps({
  items: { type: Array, required: true },
  active: { type: String, required: true },
  count: { type: Number, default: null },
})
const emit = defineEmits(['select'])
const expanded = shallowRef(false)
const desktop = shallowRef(false)
const toggle = useTemplateRef('toggle')
const media = window.matchMedia('(min-width: 1200px)')
function syncViewport() {
  desktop.value = media.matches
  expanded.value = false
}
onMounted(() => {
  syncViewport()
  media.addEventListener('change', syncViewport)
})
onBeforeUnmount(() => media.removeEventListener('change', syncViewport))
function select(id) {
  expanded.value = false
  emit('select', id)
}
function close() {
  if (!expanded.value) return
  expanded.value = false
  toggle.value?.focus()
}
</script>

<template>
  <aside class="dashboard-navigation" @keydown.esc="close">
    <button ref="toggle" class="navigation-toggle" type="button" :aria-expanded="expanded"
      aria-controls="dashboard-sections" @click="expanded = !expanded">
      <StudioIcon :name="expanded ? 'close' : 'menu'" />
      <span>Sezioni dashboard</span>
    </button>
    <p class="navigation-title">Il tuo studio</p>
    <nav v-show="expanded || desktop" id="dashboard-sections" aria-label="Navigazione dashboard">
      <button v-for="item in items" :key="item.id" type="button" :class="{ selected: active === item.id }"
        :aria-current="active === item.id ? 'page' : undefined" @click="select(item.id)">
        <StudioIcon :name="item.icon" /><span>{{ item.label }}</span>
        <span v-if="item.id === 'catalogo' && count !== null" class="nav-count">{{ count }}</span>
      </button>
    </nav>
  </aside>
</template>

<style scoped>
.dashboard-navigation {
  min-width: 0;
  align-self: start;
}

.navigation-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 48px;
  padding: 0.75rem 1rem;
  background: var(--studio-panel);
  color: var(--studio-text);
  border: 1px solid var(--studio-line);
  border-radius: 0.75rem;
  font-weight: 600;
}

.navigation-title {
  display: none;
}

nav {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--studio-line);
  border-radius: 0.75rem;
  background: var(--studio-panel);
}

nav button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 48px;
  padding: 0.75rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--studio-muted);
  text-align: left;
}

nav button:hover {
  background: var(--studio-hover);
  color: var(--studio-text);
}

nav button.selected {
  background: var(--studio-accent-soft);
  color: var(--brand-text);
  font-weight: 700;
}

.nav-count {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

@media (min-width: 1200px) {
  .dashboard-navigation {
    position: sticky;
    top: 6rem;
    padding-right: 1rem;
    border-right: 1px solid var(--studio-line);
  }

  .navigation-toggle {
    display: none;
  }

  .navigation-title {
    display: block;
    margin: 0 0 1.25rem;
    font-size: 1.25rem;
    font-weight: 700;
  }

  nav {
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
  }
}
</style>
