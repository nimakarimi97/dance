import { ref } from 'vue'

export const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { isOnline.value = true })
  window.addEventListener('offline', () => { isOnline.value = false })
}
