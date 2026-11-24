import { onBeforeUnmount, onMounted } from 'vue'

export function useUnsavedWarning(isDirty) {
  function warn(event) {
    if (!isDirty()) return
    event.preventDefault()
    event.returnValue = ''
  }
  onMounted(() => window.addEventListener('beforeunload', warn))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', warn))
}
