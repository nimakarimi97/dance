<script>
import '@videojs/html/i18n'
import '@videojs/html/i18n/locales/it/register'
import { registerI18n } from '@videojs/html/i18n'

registerI18n('en', {
  dancePlayer: {
    heading: 'Step by step', hint: 'Your rhythm, your practice', loading: 'Loading...',
    retry: 'Retry video', mediaError: 'This video could not be played. Retry or check the video format.',
    youtubeError: 'This video could not be played. Retry or open it on YouTube.',
    rateError: 'Playback speed could not be changed. Please retry.',
    fullscreenError: 'Fullscreen could not be opened. Please retry.',
    reloadError: 'This video could not be reloaded. Please retry.',
  },
})
registerI18n('it', {
  dancePlayer: {
    heading: 'Passo dopo passo', hint: 'Il tuo ritmo, la tua pratica', loading: 'Caricamento...',
    retry: 'Riprova video', mediaError: 'Impossibile riprodurre il video. Riprova o verifica il formato del file.',
    youtubeError: 'Impossibile riprodurre il video. Riprova o aprilo su YouTube.',
    rateError: 'Impossibile cambiare velocità. Riprova.',
    fullscreenError: 'Impossibile aprire lo schermo intero. Riprova.',
    reloadError: 'Impossibile ricaricare il video. Riprova.',
  },
})
</script>

<script setup>
import '@videojs/html/video/player'
import '@videojs/html/ui/container'
import '@videojs/html/media/youtube-video'
import '@videojs/html/ui/play-button'
import '@videojs/html/ui/seek-button'
import '@videojs/html/ui/mute-button'
import '@videojs/html/ui/time-slider'
import '@videojs/html/ui/volume-slider'
import '@videojs/html/ui/slider-track'
import '@videojs/html/ui/slider-buffer'
import '@videojs/html/ui/slider-fill'
import '@videojs/html/ui/slider-thumb'
import '@videojs/html/ui/time'
import '@videojs/html/ui/time-group'
import '@videojs/html/ui/time-separator'
import '@videojs/html/ui/hotkey'
import '@videojs/html/ui/status-announcer'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId } from 'vue'
import StudioIcon from './StudioIcon.vue'

const props = defineProps({
  source: { type: String, default: '' },
  youtubeId: { type: String, default: '' },
  title: { type: String, required: true },
})

const player = ref(null)
const surface = ref(null)
const media = ref(null)
const state = shallowRef(null)
const error = ref('')
const aspectRatio = ref('16 / 9')
const windowFullscreen = ref(false)
const fullscreen = computed(() => state.value?.isFullscreen || windowFullscreen.value)
const id = useId()
const youtubeSource = computed(() => ({
  src: `https://www.youtube-nocookie.com/embed/${props.youtubeId}`,
  engine: { youtube: { hl: 'it', cc_lang_pref: 'it', rel: 0, referrerPolicy: 'strict-origin-when-cross-origin' } },
}))
let unsubscribe = null
let readyTimer = null
let previousOverflow = ''

function mediaReady(event) {
  clearTimeout(readyTimer)
  error.value = ''
  const { videoWidth, videoHeight } = event.target
  if (videoWidth && videoHeight) aspectRatio.value = `${videoWidth} / ${videoHeight}`
}

function mediaError() {
  clearTimeout(readyTimer)
  error.value = props.youtubeId ? 'dancePlayer.youtubeError' : 'dancePlayer.mediaError'
}

async function perform(action, message) {
  error.value = ''
  try {
    await action(player.value.store)
  } catch (cause) {
    console.error(message, cause)
    error.value = message
  }
}

function startReadyTimer() {
  clearTimeout(readyTimer)
  if (!props.youtubeId) return
  readyTimer = setTimeout(() => {
    if (!player.value.store.duration && !player.value.store.error) mediaError()
  }, 20000)
}

function retry() {
  return perform((store) => {
    store.dismissError()
    media.value.load()
    startReadyTimer()
  }, 'dancePlayer.reloadError')
}

function closeWindowFullscreen() {
  if (!windowFullscreen.value) return
  windowFullscreen.value = false
  document.body.style.overflow = previousOverflow
}

function toggleFullscreen() {
  if (windowFullscreen.value) {
    closeWindowFullscreen()
  } else if (!surface.value.requestFullscreen) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    windowFullscreen.value = true
  } else {
    return perform((store) => store.isFullscreen ? store.exitFullscreen() : store.requestFullscreen(),
      'dancePlayer.fullscreenError')
  }
}

function onEscape(event) {
  if (event.key === 'Escape') closeWindowFullscreen()
}

function onKeydown(event) {
  if (event.key.toLowerCase() !== 'f' || event.ctrlKey || event.altKey || event.metaKey) return
  if (event.target.closest('input, select, textarea, [contenteditable]')) return
  event.preventDefault()
  if (!event.repeat) toggleFullscreen()
}

onMounted(() => {
  const store = player.value.store
  const sync = () => {
    state.value = {
      paused: store.paused,
      waiting: store.waiting,
      duration: store.duration,
      playbackRate: store.playbackRate,
      playbackRates: store.playbackRates,
      playbackRateAvailability: store.playbackRateAvailability,
      isFullscreen: store.isFullscreen,
    }
    if (store.error) mediaError()
  }
  sync()
  unsubscribe = store.subscribe(sync)
  document.addEventListener('keydown', onEscape)
  startReadyTimer()
})

onBeforeUnmount(() => {
  clearTimeout(readyTimer)
  unsubscribe?.()
  document.removeEventListener('keydown', onEscape)
  closeWindowFullscreen()
})
</script>

<template>
  <media-i18n>
  <video-player ref="player" class="video-player" default-playback-rates="0.25 0.5 0.75 1 1.25 1.5 1.75 2">
    <media-container ref="surface" class="player-surface" :class="{ 'window-fullscreen': windowFullscreen }"
      :aria-label="title" @keydown="onKeydown">
      <div class="player-heading">
        <media-text token="dancePlayer.heading">Step by step</media-text>
        <media-text class="player-hint" token="dancePlayer.hint">Your rhythm, your practice</media-text>
      </div>
      <div class="video-stage" :style="{ aspectRatio }">
        <youtube-video v-if="youtubeId" ref="media" :source.prop="youtubeSource" :aria-label="title" playsinline
          @loadedmetadata="mediaReady" @error="mediaError" />
        <video v-else ref="media" :src="source" :aria-label="title" playsinline preload="metadata"
          @loadedmetadata="mediaReady" @error="mediaError" />
        <media-play-button v-if="state?.paused" class="big-play">
          <StudioIcon name="play" />
        </media-play-button>
        <span v-if="state?.waiting && !error" class="loading-note" role="status">
          <media-text token="dancePlayer.loading">Loading...</media-text>
        </span>
      </div>
      <div class="player-controls">
        <div class="timeline">
          <media-time-slider class="slider" :disabled="!state?.duration" :step.prop="5">
            <media-slider-track>
              <media-slider-buffer />
              <media-slider-fill />
            </media-slider-track>
            <media-slider-thumb />
          </media-time-slider>
          <media-time-group class="time">
            <media-time type="current" />
            <media-time-separator> / </media-time-separator>
            <media-time type="duration" />
          </media-time-group>
        </div>
        <div class="toolbar">
          <media-play-button class="control play-control">
            <span class="icon-stack">
              <StudioIcon class="play-icon" name="play" />
              <StudioIcon class="pause-icon" name="pause" />
            </span>
          </media-play-button>
          <media-seek-button class="control skip" :seconds.prop="-5" :disabled="!state?.duration">
            <StudioIcon name="rewind" /><span aria-hidden="true">5s</span>
          </media-seek-button>
          <media-seek-button class="control skip" :seconds.prop="5" :disabled="!state?.duration">
            <StudioIcon name="forward" /><span aria-hidden="true">5s</span>
          </media-seek-button>
          <div class="volume">
            <media-mute-button class="control">
              <span class="icon-stack">
                <StudioIcon class="volume-icon" name="volume" />
                <StudioIcon class="muted-icon" name="muted" />
              </span>
            </media-mute-button>
            <media-volume-slider class="slider volume-slider">
              <media-slider-track><media-slider-fill /></media-slider-track>
              <media-slider-thumb />
            </media-volume-slider>
          </div>
          <label class="speed">
            <media-text :id="`${id}-speed`" token="menu.speed" class="speed-label">Speed</media-text>
            <select :aria-labelledby="`${id}-speed`" :value="state?.playbackRate || 1"
              :disabled="state?.playbackRateAvailability !== 'available'"
              @change="perform(store => store.setPlaybackRate(Number($event.target.value)), 'dancePlayer.rateError')">
              <option v-for="rate in state?.playbackRates || [1]" :key="rate" :value="rate">{{ rate }}x</option>
            </select>
          </label>
          <button type="button" class="control" :aria-labelledby="`${id}-fullscreen`"
            :aria-pressed="Boolean(fullscreen)" @click="toggleFullscreen">
            <media-text :id="`${id}-fullscreen`" class="visually-hidden"
              :token="fullscreen ? 'fullscreen.exit' : 'fullscreen.enter'">Fullscreen</media-text>
            <span class="icon-stack" :data-fullscreen="fullscreen ? '' : undefined">
              <StudioIcon class="expand-icon" name="fullscreen" />
              <StudioIcon class="minimize-icon" name="minimize" />
            </span>
          </button>
        </div>
      </div>
      <div v-if="error" class="player-error" role="alert">
        <p><media-text :token="error">This video could not be played. Please retry.</media-text></p>
        <button type="button" class="btn" @click="retry">
          <media-text token="dancePlayer.retry">Retry video</media-text>
        </button>
      </div>
      <media-hotkey keys="Space" action="togglePaused" />
      <media-hotkey keys="k" action="togglePaused" />
      <media-hotkey keys="m" action="toggleMuted" />
      <media-hotkey keys="ArrowLeft" action="seekStep" :value.prop="-5" />
      <media-hotkey keys="j" action="seekStep" :value.prop="-5" />
      <media-hotkey keys="ArrowRight" action="seekStep" :value.prop="5" />
      <media-hotkey keys="l" action="seekStep" :value.prop="5" />
      <media-status-announcer class="visually-hidden" />
    </media-container>
  </video-player>
  </media-i18n>
</template>

<style scoped>
.video-player {
  --media-accent-color: var(--accent);
  --media-accent-ink: #fff;
  --media-font-family: 'Archivo', system-ui, sans-serif;
  --player-surface: #10141c;
  --player-controls: #1c2432;
  --player-raised: #293449;
  --player-text: #f6f7fb;
  --player-muted: #c5ccda;
  --player-line: #718099;
  --player-slider: #ff9abb;
  --player-motion: 120ms;
  container-type: inline-size;
  display: block;
  min-width: 0;
}

.player-surface {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--player-text);
  background: var(--player-surface);
  font-family: var(--media-font-family);
  border-radius: 1.25rem;
  color-scheme: dark;
}

.player-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.9rem 1rem;
  color: var(--player-muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border-bottom: 1px solid rgb(255 255 255 / 10%);
}

.player-hint {
  font-size: 0.8rem;
  font-weight: 400;
  letter-spacing: 0;
}

.video-stage {
  position: relative;
  width: 100%;
  max-height: 65dvh;
  background: #000;
}

video,
youtube-video {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.big-play {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  padding: 0;
  transform: translate(-50%, -50%);
  border: 1px solid rgb(255 255 255 / 25%);
  border-radius: 50%;
  background: var(--media-accent-color);
  color: var(--media-accent-ink);
  box-shadow: 0 8px 32px rgb(0 0 0 / 35%);
}

.loading-note {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.3rem 0.75rem;
  border-radius: 1rem;
  background: var(--player-surface);
  font-size: 0.8rem;
}

.player-controls {
  padding: 0.65rem 0.75rem;
  background: var(--player-controls);
  border-top: 1px solid rgb(255 255 255 / 10%);
}

.timeline,
.toolbar,
.volume {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.timeline {
  margin-bottom: 0.5rem;
}

.slider {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 24px;
  height: 44px;
  touch-action: none;
  cursor: pointer;
  margin-inline: 8px;
}

.timeline .slider {
  flex: 1;
}

.slider media-slider-track {
  position: absolute;
  inset-inline: 0;
  height: 5px;
  border-radius: 999px;
  background: var(--player-line);
}

.slider media-slider-fill,
.slider media-slider-buffer {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  height: 100%;
  border-radius: inherit;
}

.slider media-slider-fill {
  width: var(--media-slider-fill);
  background: var(--player-slider);
}

.slider media-slider-buffer {
  width: var(--media-slider-buffer);
  background: #a7b2c5;
}

.slider media-slider-thumb {
  position: absolute;
  inset-inline-start: var(--media-slider-fill, 0%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--player-text);
  box-shadow: 0 0 0 3px var(--player-controls);
  transform: translateX(-50%);
}

.slider:dir(rtl) media-slider-thumb {
  transform: translateX(50%);
}

.time {
  display: inline-flex;
  gap: 0.25rem;
  color: var(--player-muted);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.control,
.speed select {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  flex: 0 0 auto;
  min-width: 44px;
  min-height: 44px;
  padding: 0.4rem;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--player-text);
  cursor: pointer;
  touch-action: manipulation;
  transition: background-color var(--player-motion), filter var(--player-motion);
}

.control[hidden],
.slider[hidden] {
  display: none;
}

.control:disabled,
.control[data-disabled],
.slider[data-disabled],
select:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.play-control {
  background: var(--media-accent-color);
  color: var(--media-accent-ink);
}

.skip {
  flex-direction: column;
  gap: 1px;
}

.skip span {
  font-size: 0.6rem;
  line-height: 1;
  font-weight: 700;
}

.volume-slider {
  width: 80px;
}

.volume,
.speed {
  flex: 0 0 auto;
}

.speed {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-inline-start: auto;
}

.speed-label {
  color: var(--player-muted);
  font-size: 0.75rem;
}

.speed select {
  min-width: 70px;
  border-color: var(--player-line);
  background: var(--player-raised);
  font-size: 0.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.player-error {
  margin: 0;
  padding: 1rem;
  color: #ffb8c5;
}

.player-surface:fullscreen,
.window-fullscreen {
  width: 100%;
  height: 100dvh;
  border-radius: 0;
}

.window-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.player-surface:fullscreen .video-stage,
.window-fullscreen .video-stage {
  flex: 1;
  min-height: 0;
  max-height: none;
  aspect-ratio: auto !important;
}

.player-surface:fullscreen .player-controls,
.window-fullscreen .player-controls {
  padding-bottom: max(0.65rem, env(safe-area-inset-bottom));
}

.icon-stack {
  display: grid;
  width: 24px;
  height: 24px;
}

.video-player :deep(.studio-icon) {
  width: 24px;
  height: 24px;
}

.icon-stack :deep(svg) {
  grid-area: 1 / 1;
  transition: opacity var(--player-motion);
}

.pause-icon,
.muted-icon,
.minimize-icon {
  opacity: 0;
}

media-play-button:defined:not([data-paused]) .play-icon,
media-mute-button[data-muted] .volume-icon,
.icon-stack[data-fullscreen] .expand-icon {
  opacity: 0;
}

media-play-button:defined:not([data-paused]) .pause-icon,
media-mute-button[data-muted] .muted-icon,
.icon-stack[data-fullscreen] .minimize-icon {
  opacity: 1;
}

.control:focus-visible,
.big-play:focus-visible,
.slider:focus-visible,
.slider:focus-within,
.speed select:focus-visible,
.player-error button:focus-visible {
  outline: 3px solid var(--player-slider);
  outline-offset: 2px;
}

.control:active:not([data-disabled]),
.big-play:active {
  filter: brightness(1.18);
}

@media (hover: hover) and (pointer: fine) {
  .control:hover:not([data-disabled]),
  .speed select:hover {
    background: var(--player-raised);
  }
}

@media (prefers-reduced-motion: reduce) {
  .video-player {
    --player-motion: 0ms;
  }
}

@media (forced-colors: active) {
  .slider media-slider-track {
    background: GrayText;
  }
  .slider media-slider-fill,
  .slider media-slider-thumb {
    background: Highlight;
  }
}

@container (max-width: 600px) {
  .player-hint,
  .volume-slider,
  .speed-label {
    display: none;
  }

  .player-controls {
    padding-inline: 0.5rem;
  }

  .toolbar {
    justify-content: space-between;
    gap: 0;
  }

  .speed {
    margin-inline-start: 0;
  }

  .speed select {
    min-width: 64px;
    padding-inline: 0.2rem;
    font-size: 0.75rem;
  }
}

@container (max-width: 340px) {
  .toolbar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.25rem;
  }

  .control,
  .speed select {
    width: 100%;
  }
}
</style>
