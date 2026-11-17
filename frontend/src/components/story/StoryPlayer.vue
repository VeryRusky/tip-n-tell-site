<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { site } from '@/config/site'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useTimeline } from '@/composables/useTimeline'
import { setVars } from '@/utils/motion'
import IconHeart from '@/components/icons/IconHeart.vue'
import StoryDesign from './StoryDesign.vue'
import StoryCalendar from './StoryCalendar.vue'
import StoryMessage from './StoryMessage.vue'

// "How booking works" as an Instagram-style story: one card that plays three short scenes
// by itself (about 4 seconds each), with bars at the top that fill as each scene plays.
// It ends on the last scene and offers Replay; it never loops.
//
// Polite behaviour:
// - it starts only when most of the card is on screen, and pauses when the card scrolls
//   away or the tab is hidden (and carries on when it comes back)
// - it never moves the page or takes keyboard focus
// - with Reduce Motion it never plays: each scene shows its finished picture, and the
//   Previous / Next buttons step through them
//
// Each scene component has an `update(t)` function that draws it at time t (0 to 1).
// useTimeline turns real time into that t.
const props = defineProps({
  month: { type: String, default: '' },
  slotsByDate: { type: Object, required: true },
  sampleSlot: { type: Object, default: null },
  startDelay: { type: Number, default: 0 }, // wait (ms) before the first play, e.g. for the opening
})

const STEPS = ['Pick a design', 'Pick a time', 'Send it']
const DURATIONS = [4200, 4200, 4500] // milliseconds per scene: under 13 seconds in all

const animated = useMediaQuery('(prefers-reduced-motion: no-preference)')

const scenes = ref([]) // the three scene components (filled by the template refs)
const index = ref(0) // which scene is showing
const status = ref('waiting') // 'waiting' (not started), 'playing', 'paused', 'ended'
const card = ref(null)
const bars = ref(null)
const announcement = ref('') // read out by screen readers, only after the visitor acts

let onScreen = false // most of the card is visible
let autoPaused = false // paused by us (off screen or tab hidden), not by the visitor
let startTimer = 0

// ---- Drawing ----
// The bars: scenes before the current one are full, later ones empty.
function showBars(t) {
  const fills = {}
  STEPS.forEach((_, i) => {
    fills[`--fill-${i}`] = i < index.value ? 1 : i === index.value ? t : 0
  })
  setVars(bars.value, fills)
}

function draw(t) {
  scenes.value[index.value]?.update(t)
  showBars(t)
}

const timeline = useTimeline({
  duration: () => DURATIONS[index.value],
  onUpdate: draw,
  onEnd: () => {
    if (index.value < STEPS.length - 1) {
      goTo(index.value + 1)
    } else {
      status.value = 'ended'
    }
  },
})

// Show scene i from its start, and play it (or, with Reduce Motion, show it finished).
function goTo(i) {
  index.value = i
  if (!animated.value) {
    draw(1)
    status.value = 'paused'
    return
  }
  timeline.seek(0)
  status.value = 'playing'
  autoPaused = false
  timeline.play()
}

// ---- Controls ----
function announce() {
  announcement.value = `Step ${index.value + 1} of ${STEPS.length}: ${STEPS[index.value]}`
}

function next() {
  clearTimeout(startTimer)
  if (index.value < STEPS.length - 1) goTo(index.value + 1)
  else if (animated.value)
    goTo(index.value) // last scene: play it again
  else return // Reduce Motion: already at the last step
  announce()
}

function previous() {
  clearTimeout(startTimer)
  if (index.value === 0 && !animated.value) return // Reduce Motion: already at the first step
  goTo(Math.max(0, index.value - 1))
  announce()
}

function togglePlay() {
  clearTimeout(startTimer)
  if (status.value === 'ended') {
    goTo(0)
    announce()
  } else if (status.value === 'playing') {
    timeline.pause()
    status.value = 'paused'
    autoPaused = false
  } else if (status.value === 'waiting') {
    goTo(0)
  } else {
    status.value = 'playing'
    timeline.play()
  }
}

// Arrow keys move between scenes while the card (or a button in it) has focus.
function onKey(event) {
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    next()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    previous()
  }
}

const playLabel = computed(() => {
  if (status.value === 'playing') return 'Pause'
  if (status.value === 'ended') return 'Replay'
  return 'Play'
})

// ---- Only play while it can be seen ----
function pauseForNow() {
  if (status.value !== 'playing') return
  timeline.pause()
  autoPaused = true
}

function carryOn() {
  if (!onScreen || document.visibilityState !== 'visible') return
  if (status.value === 'waiting') {
    clearTimeout(startTimer)
    startTimer = setTimeout(() => {
      if (onScreen && status.value === 'waiting') goTo(0)
    }, props.startDelay)
  } else if (status.value === 'playing' && autoPaused) {
    autoPaused = false
    timeline.play()
  }
}

let observer = null

function onVisibilityChange() {
  if (document.visibilityState === 'hidden') pauseForNow()
  else carryOn()
}

onMounted(() => {
  // Before it plays: the first scene at its start (or finished, with Reduce Motion).
  draw(animated.value ? 0 : 1)
  if (!animated.value) status.value = 'paused'

  // "Most of the card is on screen" = at least 60% of it; it pauses below 30%.
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.intersectionRatio >= 0.6) {
        onScreen = true
        if (animated.value) carryOn()
      } else if (entry.intersectionRatio < 0.3) {
        onScreen = false
        clearTimeout(startTimer)
        pauseForNow()
      }
    },
    { threshold: [0, 0.3, 0.6] },
  )
  observer.observe(card.value)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  clearTimeout(startTimer)
  observer?.disconnect()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <section class="story" aria-labelledby="story-title">
    <h2 id="story-title" class="visually-hidden">How booking works</h2>

    <div
      ref="card"
      class="story-card"
      :class="{ 'is-animated': animated }"
      tabindex="0"
      role="group"
      aria-label="How booking works, in three steps. Use the arrow keys or the buttons to move between steps."
      @keydown="onKey"
    >
      <!-- Progress bars, like Instagram stories. Decorative: the controls say where you are. -->
      <div ref="bars" class="story-bars" aria-hidden="true">
        <span
          v-for="(step, i) in STEPS"
          :key="step"
          :style="{ '--fill': `var(--fill-${i}, 0)` }"
        ></span>
      </div>

      <div class="story-head" aria-hidden="true">
        <span class="story-avatar"><IconHeart /></span>
        <span class="story-handle">{{ site.instagramHandle }}</span>
        <span class="story-label">How booking works</span>
      </div>

      <div class="story-scenes">
        <!-- All three scenes are on the page; only the current one shows (and can be read). -->
        <StoryDesign
          :ref="(el) => (scenes[0] = el)"
          :animated="animated"
          :class="{ 'is-current': index === 0 }"
          :inert="index !== 0"
          :aria-hidden="index !== 0"
        />
        <StoryCalendar
          :ref="(el) => (scenes[1] = el)"
          :animated="animated"
          :month="month"
          :slots-by-date="slotsByDate"
          :sample-slot="sampleSlot"
          :class="{ 'is-current': index === 1 }"
          :inert="index !== 1"
          :aria-hidden="index !== 1"
        />
        <StoryMessage
          :ref="(el) => (scenes[2] = el)"
          :animated="animated"
          :sample-slot="sampleSlot"
          :class="{ 'is-current': index === 2 }"
          :inert="index !== 2"
          :aria-hidden="index !== 2"
        />

        <!-- Tap the left or right of the picture to go back or on, as on Instagram.
             (Mouse and touch only; keyboard users have the buttons and arrow keys.) -->
        <div class="tap-zone tap-back" aria-hidden="true" @click="previous"></div>
        <div class="tap-zone tap-next" aria-hidden="true" @click="next"></div>
      </div>

      <div class="story-controls">
        <!--
          The ends use aria-disabled rather than disabled, so a keyboard user's focus is never
          dropped. While playing, Previous on the first scene simply starts it again.
        -->
        <button
          type="button"
          class="story-button"
          :aria-disabled="!animated && index === 0"
          @click="previous"
        >
          <span aria-hidden="true">‹</span> Previous
        </button>
        <button v-if="animated" type="button" class="story-button story-play" @click="togglePlay">
          <svg v-if="status === 'playing'" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14M16 5v14" />
          </svg>
          <svg v-else-if="status === 'ended'" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
          {{ playLabel }}
        </button>
        <button
          type="button"
          class="story-button"
          :aria-disabled="!animated && index === STEPS.length - 1"
          @click="next"
        >
          Next <span aria-hidden="true">›</span>
        </button>
      </div>

      <!-- Only changes when the visitor moves between steps, so it is never read out repeatedly. -->
      <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>
    </div>
  </section>
</template>

<style scoped>
/* A parent can set --story-height (the laptop hero does: the full height of its column). */
.story {
  height: var(--story-height, auto);
}

/* Phones: the card and the "Book a slot" button under it fit one screen under the header. */
.story-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: var(--story-height, clamp(30rem, calc(100svh - var(--tt-header-h) - 6rem), 46rem));
  margin: 0 auto;
  padding: 0.75rem 0.9rem 0.6rem;
  background: linear-gradient(180deg, var(--tt-white), var(--tt-blush));
  border: 1px solid var(--tt-line);
  border-radius: 1.75rem;
  box-shadow: 0 24px 50px -32px rgba(158, 74, 85, 0.55);
  overflow: hidden;
}

.story-card:focus-visible {
  outline-offset: 4px;
}

/* ---- Bars ---- */
.story-bars {
  display: flex;
  gap: 0.3rem;
}

.story-bars span {
  position: relative;
  flex: 1;
  height: 3px;
  border-radius: 3px;
  background: rgba(158, 74, 85, 0.18);
  overflow: hidden;
}

.story-bars span::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--tt-deep-rose);
  transform-origin: left center;
  transform: scaleX(var(--fill));
}

/* ---- Header row, like a story's ---- */
.story-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.6rem 0 0.25rem;
  font-size: 0.9rem;
}

.story-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 50%;
  background: var(--tt-pink);
  border: 1px solid var(--tt-line);
  color: var(--tt-deep-rose);
}

.story-handle {
  font-weight: 700;
}

.story-label {
  color: var(--tt-muted);
}

/* ---- Scenes: stacked in one place, the current one fades in ---- */
.story-scenes {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}

.story-scenes > :deep(.card-scene) {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.3s ease-out,
    visibility 0s linear 0.3s;
}

.story-scenes > :deep(.card-scene.is-current) {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.3s ease-out;
}

.story-scenes :deep(.card-text) {
  flex: 0 0 auto;
  padding: 0.35rem 0.15rem 0.5rem;
}

.story-scenes :deep(.card-text h3) {
  font-size: 1.85rem;
  line-height: 1.1;
  color: var(--tt-ink);
  margin: 0 0 0.25rem;
}

.story-scenes :deep(.card-text p) {
  margin: 0;
  font-size: 1rem;
  color: var(--tt-muted);
}

.story-scenes :deep(.card-picture) {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}

.tap-zone {
  position: absolute;
  top: 25%;
  bottom: 0;
  width: 35%;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.tap-back {
  left: 0;
}

.tap-next {
  right: 0;
}

/* ---- Controls ---- */
.story-controls {
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
  padding-top: 0.5rem;
}

.story-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 44px;
  min-width: 44px;
  padding: 0 0.9rem;
  border: 1.5px solid var(--tt-line);
  border-radius: 999px;
  background: var(--tt-white);
  color: var(--tt-deep-rose);
  font-weight: 700;
  font-size: 0.95rem;
}

.story-button:hover:not([aria-disabled='true']) {
  border-color: var(--tt-deep-rose);
}

.story-button[aria-disabled='true'] {
  cursor: default;
  color: #b9a2a5;
  background: transparent;
}

.story-play {
  min-width: 6.5rem;
}

.story-play svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.story-play svg path[d^='M8 5l'] {
  fill: currentColor;
}

@media (min-width: 992px) {
  .story-scenes :deep(.card-text h3) {
    font-size: 2.1rem;
  }
}
</style>
