<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { site } from '@/config/site'
import { useCatalogStore } from '@/stores/catalog'
import { formatPrice } from '@/utils/format'
import IconPin from '@/components/icons/IconPin.vue'

// The top of the home page, like the top of one of her posters: the wordmark, tagline,
// area, "Book a slot" and a short note, inside a thin frame with notched corners.
// When `playing` is true (the first visit in a browser session, see utils/opening.js) it
// plays once, in about 1.6 seconds: the letters rise in, the heart over the "n" draws and
// fills, the frame draws itself, sparkles twinkle, then the text and button fade up.
// Otherwise it simply shows the finished picture.
defineProps({
  playing: { type: Boolean, default: false },
})

const catalog = useCatalogStore()
onMounted(() => catalog.load())

const fromPrice = computed(() => {
  const lowest = catalog.lowestPrice()
  return lowest === null ? '' : `from ${formatPrice(lowest)}`
})

// ---- The wordmark, split into letters so each one can rise in on its own ----
const words = site.brandName.split(' ') // ['tip', 'n', 'tell']
let letterIndex = 0
const wordLetters = words.map((word) =>
  [...word].map((letter) => ({ letter, index: letterIndex++ })),
)

// ---- The frame: drawn as an SVG path the size of the box, redrawn when the box resizes ----
const frameBox = ref(null)
const frameSize = ref({ width: 0, height: 0 })
let resizeObserver = null

// A rectangle whose corners are cut in with a small inward curve (like her poster frames).
function notchedFrame(inset, notch) {
  const { width, height } = frameSize.value
  const left = inset
  const top = inset
  const right = width - inset
  const bottom = height - inset
  const r = notch
  return [
    `M ${left + r} ${top}`,
    `H ${right - r}`,
    `A ${r} ${r} 0 0 0 ${right} ${top + r}`,
    `V ${bottom - r}`,
    `A ${r} ${r} 0 0 0 ${right - r} ${bottom}`,
    `H ${left + r}`,
    `A ${r} ${r} 0 0 0 ${left} ${bottom - r}`,
    `V ${top + r}`,
    `A ${r} ${r} 0 0 0 ${left + r} ${top}`,
    'Z',
  ].join(' ')
}

const outerFrame = computed(() => (frameSize.value.width ? notchedFrame(1, 22) : ''))
const innerFrame = computed(() => (frameSize.value.width ? notchedFrame(8, 15) : ''))

onMounted(() => {
  // Measure the whole box, padding included (the SVG covers all of it). contentRect would
  // leave the padding out, and the frame would then be drawn too small and shifted inwards.
  resizeObserver = new ResizeObserver(() => {
    const box = frameBox.value
    frameSize.value = { width: box.offsetWidth, height: box.offsetHeight }
  })
  resizeObserver.observe(frameBox.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <section class="opening" :class="{ 'is-playing': playing }" aria-labelledby="opening-title">
    <div ref="frameBox" class="opening-frame">
      <svg
        class="frame-lines"
        :viewBox="`0 0 ${frameSize.width} ${frameSize.height}`"
        aria-hidden="true"
        focusable="false"
      >
        <path class="frame-outer" :d="outerFrame" pathLength="1" />
        <path class="frame-inner" :d="innerFrame" pathLength="1" />
      </svg>

      <svg
        v-for="n in 3"
        :key="n"
        class="corner-sparkle"
        :class="`corner-sparkle-${n}`"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M12 2c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
        />
      </svg>

      <h1 id="opening-title" class="opening-title">
        <span class="visually-hidden">{{ site.brandName }}</span>
        <span class="letters" aria-hidden="true">
          <span
            v-for="(letters, w) in wordLetters"
            :key="w"
            class="mark-word"
            :class="{ 'mark-middle': w === 1 }"
          >
            <span
              v-for="item in letters"
              :key="item.index"
              class="mark-letter"
              :style="{ '--i': item.index }"
              >{{ item.letter }}</span
            >
            <svg v-if="w === 1" class="mark-heart" viewBox="0 0 24 24" focusable="false">
              <path
                pathLength="1"
                d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.8a4.2 4.2 0 0 1 7.5 2.7c0 5.4-7.5 10-7.5 10z"
              />
            </svg>
          </span>
        </span>
      </h1>

      <p class="opening-tagline rise" style="--d: 0">
        {{ site.tagline }}<template v-if="fromPrice">, {{ fromPrice }}</template>
      </p>
      <p class="opening-area rise" style="--d: 1"><IconPin /> {{ site.area }}</p>
      <RouterLink
        :to="{ name: 'book-slot' }"
        class="btn btn-primary btn-lg opening-button rise"
        style="--d: 2"
      >
        Book a slot
      </RouterLink>
      <p class="small-print opening-note rise" style="--d: 3">
        Pick a time here, then send me a DM on Instagram. No sign-up, no payment online.
      </p>
    </div>
  </section>
</template>

<style scoped>
.opening {
  display: flex;
}

.opening-frame {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2.6rem 1.5rem 2.2rem;
  background: radial-gradient(ellipse at 50% 35%, var(--tt-blush), transparent 70%);
  border-radius: 1.75rem;
}

.frame-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.frame-lines path {
  fill: none;
  stroke: var(--tt-line);
  stroke-width: 1.25;
}

.frame-inner {
  opacity: 0.8;
}

/* ---- Wordmark ---- */
.opening-title {
  /* Room above for the heart over the n, clear of the frame line. */
  margin: 0.34em 0 0.75rem;
  font-family: var(--tt-font-heading);
  font-weight: 600;
  color: var(--tt-ink);
  font-size: clamp(3.4rem, 16vw, 6.5rem);
  line-height: 1;
  letter-spacing: -0.02em;
}

/* (Not called .mark: Bootstrap gives that class a yellow highlight.) */
.letters {
  display: inline-flex;
  align-items: baseline;
  gap: 0.2em;
}

.mark-word {
  display: inline-flex;
}

.mark-letter {
  display: inline-block;
}

.mark-middle {
  position: relative;
  color: var(--tt-rose);
  font-style: italic;
  font-weight: 700;
}

.mark-heart {
  position: absolute;
  top: -0.42em;
  left: 50%;
  width: 0.42em;
  height: 0.42em;
  transform: translateX(-50%);
  overflow: visible;
}

.mark-heart path {
  fill: var(--tt-rose);
  stroke: var(--tt-rose);
  stroke-width: 1.6;
  stroke-linejoin: round;
}

/* ---- Text and button ---- */
.opening-tagline {
  font-family: var(--tt-font-heading);
  font-style: italic;
  font-size: clamp(1.25rem, 4.5vw, 1.7rem);
  margin-bottom: 0.4rem;
}

.opening-area {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tt-deep-rose);
  margin-bottom: 1.1rem;
}

.opening-button {
  width: 100%;
  max-width: 20rem;
}

.opening-note {
  margin: 0.75rem 0 0;
  max-width: 24rem;
}

/* ---- Sparkles at the corners: they twinkle very slowly, forever (the only loop on the site) ---- */
.corner-sparkle {
  position: absolute;
  fill: var(--tt-rose);
  width: 1.5rem;
  height: 1.5rem;
  animation: twinkle 5s ease-in-out infinite;
}

.corner-sparkle-1 {
  top: 1.4rem;
  left: 1.6rem;
}

.corner-sparkle-2 {
  top: 2.6rem;
  right: 1.8rem;
  width: 0.95rem;
  height: 0.95rem;
  animation-delay: -1.7s;
}

.corner-sparkle-3 {
  bottom: 1.6rem;
  right: 2.4rem;
  width: 1.1rem;
  height: 1.1rem;
  animation-delay: -3.3s;
}

@keyframes twinkle {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: scale(0.72) rotate(12deg);
    opacity: 0.6;
  }
}

/*
  ---- The opening, played once ----
  Without .is-playing everything above is already in its finished state.
  animation-fill-mode "both" holds each element at its first keyframe until its delay ends.
*/
.is-playing .mark-letter {
  animation: letter-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(80ms + var(--i) * 55ms);
}

@keyframes letter-rise {
  from {
    opacity: 0;
    transform: translateY(0.45em);
  }
}

.is-playing .mark-heart path {
  stroke-dasharray: 1 1;
  animation:
    heart-draw 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both,
    heart-fill 0.3s ease-out 0.95s both;
}

@keyframes heart-draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes heart-fill {
  from {
    fill-opacity: 0;
  }
}

.is-playing .frame-outer {
  stroke-dasharray: 1 1;
  animation: heart-draw 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
}

.is-playing .frame-inner {
  stroke-dasharray: 1 1;
  animation: heart-draw 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
}

.is-playing .corner-sparkle {
  animation:
    sparkle-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both,
    twinkle 5s ease-in-out 1.6s infinite;
}

.is-playing .corner-sparkle-1 {
  animation-delay: 0.95s, 1.6s;
}

.is-playing .corner-sparkle-2 {
  animation-delay: 1.05s, 2.2s;
}

.is-playing .corner-sparkle-3 {
  animation-delay: 1.15s, 2.8s;
}

@keyframes sparkle-pop {
  from {
    opacity: 0;
    transform: scale(0);
  }
}

.is-playing .rise {
  animation: fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(1s + var(--d) * 60ms);
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
}

/* Tablets and up: the wordmark is bigger, so leave more room above it for the heart. */
@media (min-width: 576px) {
  .opening-frame {
    padding-top: 3.6rem;
  }
}

@media (min-width: 992px) {
  .opening-frame {
    padding: 3rem 2rem;
  }
}
</style>
