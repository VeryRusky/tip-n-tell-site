<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
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
// Controls, as on Instagram stories (no button row):
// - tap the left third of the picture for the previous scene, the rest for the next
//   (real buttons, so they also work with a keyboard and screen readers)
// - press and hold the picture to pause; let go to carry on
// - a small pause / play / replay button at the right of the header row
// - the arrow keys, while anything in the card has focus
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
const direction = ref('next') // 'next' or 'back': the way the last change went
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
  // Which way the story is moving, so the new scene slides in from the matching side.
  if (i !== index.value) direction.value = i > index.value ? 'next' : 'back'
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

// There is nothing before the first scene or after the last: at the ends the matching tap
// zone is switched off and hidden, and the arrow key does nothing. (Replaying is the header
// button's job.)
const canGoBack = computed(() => index.value > 0)
const canGoOn = computed(() => index.value < STEPS.length - 1)

function next() {
  clearTimeout(startTimer)
  if (!canGoOn.value) return
  goTo(index.value + 1)
  announce()
}

function previous() {
  clearTimeout(startTimer)
  if (!canGoBack.value) return
  goTo(index.value - 1)
  announce()
}

// If keyboard focus is on a tap zone that is about to be switched off (the story just
// reached an end), move it to the other zone, or to the header button, so it isn't lost.
watch(
  index,
  () => {
    const focused = document.activeElement
    if (!focused?.classList?.contains('tap-zone')) return
    nextTick(() => {
      if (!focused.disabled) return
      const other = card.value?.querySelector('.tap-zone:not(:disabled)')
      const toggle = card.value?.querySelector('.story-toggle')
      ;(other ?? toggle ?? card.value)?.focus({ preventScroll: true })
    })
  },
  { flush: 'pre' },
)

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

// ---- Press and hold the picture to pause, as on Instagram ----
// A press that lasts longer than HOLD_MS pauses the story until the finger (or mouse
// button) lifts. The click that follows a hold is ignored, so a hold never also moves to
// the next or previous scene. A quick tap is an ordinary click and does move.
const HOLD_MS = 250
let holdTimer = 0
let holding = false
let pausedByHold = false
let ignoreNextClick = false

function pressStart(event) {
  if (event.button > 0) return // only the main mouse button, a finger or a pen
  clearTimeout(holdTimer)
  holding = false
  ignoreNextClick = false
  holdTimer = setTimeout(() => {
    holding = true
    if (status.value === 'playing') {
      timeline.pause()
      pausedByHold = true
    }
  }, HOLD_MS)
}

function pressEnd() {
  clearTimeout(holdTimer)
  if (!holding) return
  holding = false
  // Some browsers send no click after a long press; don't let the flag swallow a later tap.
  ignoreNextClick = true
  setTimeout(() => (ignoreNextClick = false), 400)
  if (pausedByHold) {
    pausedByHold = false
    if (status.value === 'playing') timeline.play()
  }
}

function tap(direction) {
  if (ignoreNextClick) {
    ignoreNextClick = false
    return
  }
  if (direction === 'next') next()
  else previous()
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
  if (status.value === 'playing') return 'Pause story'
  if (status.value === 'ended') return 'Replay story'
  return 'Play story'
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
      role="group"
      aria-label="How booking works, in three steps"
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

      <div class="story-head">
        <span class="story-avatar" aria-hidden="true"><IconHeart /></span>
        <span class="story-handle" aria-hidden="true">{{ site.instagramHandle }}</span>
        <span class="story-label" aria-hidden="true">How booking works</span>
        <!-- Pause / play, or replay at the end. Not shown with Reduce Motion: nothing plays. -->
        <button
          v-if="animated"
          type="button"
          class="story-toggle"
          :aria-label="playLabel"
          @click="togglePlay"
        >
          <svg v-if="status === 'playing'" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8.5 5.5v13M15.5 5.5v13" />
          </svg>
          <svg v-else-if="status === 'ended'" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4.2h4.2" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path class="solid" d="M8 5.5l10 6.5-10 6.5z" />
          </svg>
        </button>
      </div>

      <div class="story-scenes" :class="`going-${direction}`">
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

        <!--
          Tap zones over the picture, as on Instagram: the left third goes back, the rest goes
          on. They are real buttons (keyboard and screen readers can use them) with no visible
          chrome; on devices with a mouse a small chevron shows on hover or keyboard focus.
          At the ends the matching zone is disabled and hidden from screen readers: there is
          nowhere to go. (If it had keyboard focus, the watch above moves focus on.)
        -->
        <button
          type="button"
          class="tap-zone tap-back"
          aria-label="Previous scene"
          :disabled="!canGoBack"
          :aria-hidden="!canGoBack ? 'true' : null"
          @pointerdown="pressStart"
          @pointerup="pressEnd"
          @pointercancel="pressEnd"
          @pointerleave="pressEnd"
          @contextmenu.prevent
          @click="tap('previous')"
        >
          <span class="tap-hint" aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          class="tap-zone tap-next"
          aria-label="Next scene"
          :disabled="!canGoOn"
          :aria-hidden="!canGoOn ? 'true' : null"
          @pointerdown="pressStart"
          @pointerup="pressEnd"
          @pointercancel="pressEnd"
          @pointerleave="pressEnd"
          @contextmenu.prevent
          @click="tap('next')"
        >
          <span class="tap-hint" aria-hidden="true">›</span>
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
  padding: 0.75rem 0.9rem 0.9rem;
  background: linear-gradient(180deg, var(--tt-white), var(--tt-blush));
  border: 1px solid var(--tt-line);
  border-radius: 1.75rem;
  box-shadow: 0 24px 50px -32px rgba(158, 74, 85, 0.55);
  overflow: hidden;
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

/* Small icon button at the right end of the header: 32px to see, 44px to tap. */
.story-toggle {
  position: relative;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--tt-line);
  border-radius: 50%;
  background: var(--tt-white);
  color: var(--tt-deep-rose);
}

.story-toggle::before {
  content: '';
  position: absolute;
  inset: -6px; /* the 44px tap area */
}

.story-toggle:hover {
  border-color: var(--tt-deep-rose);
}

.story-toggle svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.story-toggle .solid {
  fill: currentColor;
}

/* ---- Scenes: stacked in one place, the current one fades in ---- */
.story-scenes {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}

/*
  Changing scene, like a story: the old scene goes first, then the new one comes in, so two
  headings are never readable at once.
    0 – 140ms    the outgoing scene fades out where it is (a transition)
    140 – 440ms  the incoming scene fades in and slides the last 1.25rem into place: from the
                 right when going on, from the left when going back (an animation, which
                 starts afresh each time a scene becomes the current one)
  With Reduce Motion, main.css turns transitions and animations off: an instant swap.
*/
.story-scenes > :deep(.card-scene) {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.14s ease-in,
    visibility 0s linear 0.14s;
}

.story-scenes > :deep(.card-scene.is-current) {
  opacity: 1;
  visibility: visible;
  transition: none;
  /* "backwards": hidden during the 140ms wait, then released when it ends, so the scene's own
     opacity applies again and the fade-out transition can run when it leaves. */
  animation: scene-in-next 0.3s var(--tt-ease-out) 0.14s backwards;
}

.story-scenes.going-back > :deep(.card-scene.is-current) {
  animation-name: scene-in-back;
}

@keyframes scene-in-next {
  from {
    opacity: 0;
    transform: translateX(1.25rem);
  }
}

@keyframes scene-in-back {
  from {
    opacity: 0;
    transform: translateX(-1.25rem);
  }
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

/* ---- Tap zones: invisible buttons over the scene (left third back, the rest on) ---- */
.tap-zone {
  position: absolute;
  top: 6.25rem; /* just below the scene's heading and line, so they cover the picture */
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  /* No grey flash, callout menu or text selection when a finger presses and holds. */
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  user-select: none;
  touch-action: manipulation;
}

.tap-back {
  left: 0;
  width: 33.333%;
  justify-content: flex-start;
}

.tap-next {
  right: 0;
  width: 66.667%;
  justify-content: flex-end;
}

.tap-zone:disabled {
  cursor: default;
}

/* Keyboard focus: a ring just inside the zone, so it is clear what Enter will do. */
.tap-zone:focus-visible {
  outline: 3px solid var(--tt-deep-rose);
  outline-offset: -3px;
  border-radius: 1rem;
}

/* The chevron hint: hidden at rest; fades in on hover (mouse) or keyboard focus. */
.tap-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  margin: 0 0.15rem;
  border-radius: 50%;
  background: rgba(255, 250, 246, 0.92);
  border: 1px solid var(--tt-line);
  color: var(--tt-deep-rose);
  font-size: 1.6rem;
  line-height: 1;
  padding-bottom: 0.2rem;
  opacity: 0;
  transition: opacity 0.2s ease-out;
}

.tap-zone:focus-visible .tap-hint {
  opacity: 1;
}

@media (hover: hover) and (pointer: fine) {
  .tap-zone:hover:not(:disabled) .tap-hint {
    opacity: 1;
  }
}

.story-toggle:focus-visible {
  outline-offset: 2px;
  border-radius: 50%;
}

@media (min-width: 992px) {
  .story-scenes :deep(.card-text h3) {
    font-size: 2.1rem;
  }
}
</style>
