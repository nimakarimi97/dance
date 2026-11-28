import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const playerElements = new Set([
  'video-player', 'media-container', 'youtube-video', 'media-i18n', 'media-text',
  'media-play-button', 'media-seek-button', 'media-mute-button', 'media-time-slider',
  'media-volume-slider', 'media-slider-track', 'media-slider-buffer', 'media-slider-fill',
  'media-slider-thumb', 'media-time-group', 'media-time', 'media-time-separator',
  'media-hotkey', 'media-status-announcer',
])

export default defineConfig({
  base: '/',
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => playerElements.has(tag),
        },
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Salsa & Bachata · Figure',
        short_name: 'Figure',
        description: 'Le figure di salsa e bachata, con video e filtri per stile.',
        lang: 'it',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        categories: ['education', 'lifestyle'],
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        cleanupOutdatedCaches: true,
        // Fonts are served by Google, so cache them at runtime after the first visit.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
