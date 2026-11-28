<script setup>
import { shallowRef, watch } from 'vue'
import { currentUser } from '../lib/auth.js'
import { loadMedia } from '../lib/figures.js'
import VideoPlayer from './VideoPlayer.vue'

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
  [() => props.fileId, () => currentUser.value?.$id, attempt],
  async ([fileId, userId], _, onCleanup) => {
    let active = true
    let url = ''
    onCleanup(() => {
      active = false
      if (url) URL.revokeObjectURL(url)
    })
    source.value = ''
    error.value = ''
    loading.value = false
    if (!userId || !fileId) return
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
  { immediate: true, flush: 'sync' },
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
    <VideoPlayer v-if="source && kind === 'video'" :key="source" :source="source" :title="title" />
    <img v-else-if="source" :src="source" :alt="title" @error="error = 'Impossibile visualizzare questa immagine.'" />
  </div>
</template>

<style scoped>
.media {
  width: 100%;
}

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
