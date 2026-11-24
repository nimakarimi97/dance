import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initializeTheme, isDarkMode, resolveTheme, THEME_KEY, themeError } from '../src/lib/theme.js'

function environment(saved = null, dark = false) {
  const listeners = new Map()
  const systemListeners = new Map()
  const values = new Map(saved ? [[THEME_KEY, saved]] : [])
  const meta = { setAttribute: (key, value) => { meta[key] = value } }
  const preference = {
    matches: dark,
    addEventListener: (key, callback) => systemListeners.set(key, callback),
    removeEventListener: key => systemListeners.delete(key),
  }
  return {
    document: { documentElement: { dataset: {} }, querySelector: () => meta },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    matchMedia: () => preference,
    addEventListener: (key, callback) => listeners.set(key, callback),
    removeEventListener: key => listeners.delete(key),
    values, listeners, systemListeners, meta,
  }
}

test('theme follows the system unless a valid saved preference exists', () => {
  assert.equal(resolveTheme(null, true), 'dark')
  assert.equal(resolveTheme('invalid', false), 'light')
  assert.equal(resolveTheme('light', true), 'light')
  assert.equal(resolveTheme('dark', false), 'dark')
  const browser = environment(null, true)
  const controller = initializeTheme(browser)
  assert.equal(browser.document.documentElement.dataset.theme, 'dark')
  browser.systemListeners.get('change')({ matches: false })
  assert.equal(isDarkMode.value, false)
  controller.setDarkMode(true)
  assert.equal(browser.values.get(THEME_KEY), 'dark')
  assert.equal(browser.meta.content, '#121619')
  browser.systemListeners.get('change')({ matches: false })
  assert.equal(isDarkMode.value, true)
  controller.dispose()
  assert.equal(browser.listeners.size + browser.systemListeners.size, 0)
})

test('theme preference stays in sync between tabs and resets to the system when cleared', () => {
  const browser = environment('dark', false)
  const controller = initializeTheme(browser)
  browser.listeners.get('storage')({ key: 'unrelated', newValue: 'light' })
  assert.equal(isDarkMode.value, true)
  browser.listeners.get('storage')({ key: THEME_KEY, newValue: 'light' })
  assert.equal(isDarkMode.value, false)
  browser.listeners.get('storage')({ key: THEME_KEY, newValue: 'dark' })
  browser.listeners.get('storage')({ key: null, newValue: null })
  assert.equal(isDarkMode.value, false)
  controller.dispose()
})

test('unavailable storage reports the problem without blocking theme changes', (t) => {
  t.mock.method(console, 'error', () => {})
  const browser = environment()
  browser.localStorage.getItem = () => { throw new Error('Storage blocked') }
  browser.localStorage.setItem = () => { throw new Error('Storage blocked') }
  const controller = initializeTheme(browser)
  controller.setDarkMode(true)
  assert.equal(isDarkMode.value, true)
  assert.match(themeError.value, /non è possibile ricordarlo/)
  assert.equal(console.error.mock.calls.length, 2)
  controller.dispose()
})
