import { computed, shallowRef } from 'vue'

export const THEME_KEY = 'dance-theme'
const theme = shallowRef('light')
export const isDarkMode = computed(() => theme.value === 'dark')
export const themeError = shallowRef('')

export function resolveTheme(saved, prefersDark) {
  return saved === 'light' || saved === 'dark' ? saved : prefersDark ? 'dark' : 'light'
}

function applyTheme(browser, value) {
  theme.value = value
  browser.document.documentElement.dataset.theme = value
  browser.document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content', value === 'dark' ? '#121619' : '#f6f7f8',
  )
}

function storageError(cause) {
  themeError.value = 'Il tema è attivo, ma non è possibile ricordarlo su questo dispositivo.'
  console.error('Theme preference storage unavailable', cause)
}

export function initializeTheme(environment = window) {
  const browser = environment
  themeError.value = ''
  const preference = browser.matchMedia('(prefers-color-scheme: dark)')
  let saved = null
  try {
    saved = browser.localStorage.getItem(THEME_KEY)
  } catch (cause) {
    storageError(cause)
  }
  applyTheme(browser, resolveTheme(saved, preference.matches))
  function systemChanged(event) {
    if (saved !== 'light' && saved !== 'dark') applyTheme(browser, resolveTheme(null, event.matches))
  }
  function storageChanged(event) {
    if (event.key !== THEME_KEY && event.key !== null) return
    saved = event.newValue
    applyTheme(browser, resolveTheme(saved, preference.matches))
  }
  preference.addEventListener('change', systemChanged)
  browser.addEventListener('storage', storageChanged)
  return {
    setDarkMode(dark) {
      saved = dark ? 'dark' : 'light'
      applyTheme(browser, saved)
      themeError.value = ''
      try {
        browser.localStorage.setItem(THEME_KEY, saved)
      } catch (cause) {
        storageError(cause)
      }
    },
    dispose() {
      preference.removeEventListener('change', systemChanged)
      browser.removeEventListener('storage', storageChanged)
    },
  }
}
