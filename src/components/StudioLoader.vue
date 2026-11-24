<script setup>
defineProps({
  label: { type: String, default: 'Caricamento…' },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <div class="studio-loader" :class="{ compact }" role="status" aria-live="polite" aria-busy="true">
    <span class="studio-loader-bars" aria-hidden="true"><i /><i /><i /><i /><i /></span>
    <span class="studio-loader-label">{{ label }}</span>
  </div>
</template>

<style scoped>
.studio-loader {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  color: var(--studio-muted);
  font-size: 0.9rem;
}

.studio-loader.compact {
  padding: 0;
  font-size: 0.875rem;
}

.studio-loader-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 0.2rem;
  height: 1.25rem;
}

.studio-loader-bars i {
  width: 0.28rem;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(to top, var(--studio-accent), var(--studio-accent-2));
  transform-origin: bottom;
  animation: studio-loader-bounce 0.9s ease-in-out infinite;
}

.studio-loader-bars i:nth-child(2) {
  animation-delay: -0.15s;
}

.studio-loader-bars i:nth-child(3) {
  animation-delay: -0.3s;
}

.studio-loader-bars i:nth-child(4) {
  animation-delay: -0.45s;
}

.studio-loader-bars i:nth-child(5) {
  animation-delay: -0.6s;
}

.studio-loader-label {
  font-variant-numeric: tabular-nums;
}

@keyframes studio-loader-bounce {

  0%,
  100% {
    transform: scaleY(0.3);
    opacity: 0.5;
  }

  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}
</style>
