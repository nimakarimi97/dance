import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveFeatures } from '../src/config/features.js'

test('feature flags accept true and false overrides', () => {
  const features = resolveFeatures({ VITE_FEATURE_PRACTICE: 'true', VITE_FEATURE_OFFLINE: 'false' })

  assert.equal(features.practice, true)
  assert.equal(features.offline, false)
})

test('invalid flag values fall back to the default', () => {
  const features = resolveFeatures({ VITE_FEATURE_FAVORITES: 'yes', VITE_FEATURE_THEME: '0' })

  assert.equal(features.favorites, false)
  assert.equal(features.theme, true)
})

test('dashboard stays off when authentication is disabled', () => {
  const features = resolveFeatures({ VITE_FEATURE_AUTH: 'false', VITE_FEATURE_DASHBOARD: 'true' })

  assert.equal(features.dashboard, false)
})
