import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectInstall } from '../src/lib/install.js'

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1'
const IPAD_SAFARI_DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
const ANDROID_SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36'
const ANDROID_WEBVIEW = 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36'
const DESKTOP_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

test('detects iPhone Safari', () => {
  assert.deepEqual(detectInstall(IPHONE_SAFARI), { platform: 'ios', browser: 'safari', mobile: true, installed: false })
})

test('treats Chrome on iOS as a non-Safari iOS browser', () => {
  assert.equal(detectInstall(IPHONE_CHROME).browser, 'other')
})

test('detects iPadOS requesting the desktop site via touch points', () => {
  assert.equal(detectInstall(IPAD_SAFARI_DESKTOP_UA, { touchPoints: 5 }).platform, 'ios')
  assert.equal(detectInstall(IPAD_SAFARI_DESKTOP_UA, { touchPoints: 0 }).mobile, false)
})

test('detects Android Chrome, Samsung Internet and in-app webviews', () => {
  assert.equal(detectInstall(ANDROID_CHROME).browser, 'chrome')
  assert.equal(detectInstall(ANDROID_SAMSUNG).browser, 'samsung')
  assert.equal(detectInstall(ANDROID_WEBVIEW).browser, 'other')
})

test('desktop browsers are not mobile and an installed app is flagged', () => {
  assert.equal(detectInstall(DESKTOP_CHROME).mobile, false)
  assert.equal(detectInstall(ANDROID_CHROME, { standalone: true }).installed, true)
})
