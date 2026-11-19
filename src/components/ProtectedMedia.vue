<script setup>
import { shallowRef, watch } from 'vue'
import { isLoggedIn } from '../lib/auth.js'
import { loadMedia } from '../lib/figures.js'

const props = defineProps({
  fileId: { type: String, required: true },
  kind: { type: String, required: true },
  title: { type: String, required: true },
})
const source = shallowRef('')
const error = shallowRef('')
const loading = shallowRef(false)
const attempt = shallowRef(0)

watch(
  [() => props.fileId, isLoggedIn, attempt],
  async ([fileId, loggedIn], _, onCleanup) => {
    let active = true
    let url = ''
    onCleanup(() => {
      active = false
      if (url) URL.revokeObjectURL(url)
    })
    source.value = ''
    error.value = ''
    loading.value = false
    if (!loggedIn || !fileId) return
    loading.value = true
    try {
      const blob = await loadMedia(fileId)
      if (active) {
        url = URL.createObjectURL(blob)
        source.value = url
      }
    } catch (cause) {
      if (active) error.value = cause.message || 'Impossibile caricare il file.'
    } finally {
      if (active) loading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="media">
    <p v-if="loading" class="message" role="status">
      Caricamento {{ kind === 'video' ? 'video' : 'immagine' }}…
    </p>
    <div v-if="error" class="message" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="btn" @click="attempt++">
        Riprova
      </button>
    </div>
    <video v-if="source && kind === 'video'" :src="source" :aria-label="title" controls playsinline preload="metadata"
      @error="error = 'Il browser non riesce a riprodurre questo video. Prova un file MP4 o WebM.'" />
    <img v-else-if="source" :src="source" :alt="title" @error="error = 'Impossibile visualizzare questa immagine.'" />
  </div>
</template>

<style scoped>
.media {
  width: 100%;
}

video,
img {
  display: block;
  width: 100%;
  max-height: 70dvh;
  object-fit: contain;
}

.message {
  padding: 1rem;
  color: var(--text);
}
</style>
