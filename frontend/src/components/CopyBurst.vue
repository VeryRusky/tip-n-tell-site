<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { prefersReducedMotion } from '@/utils/motion'

// A small burst of sparkles and hearts, for when the message has been copied.
// Put it inside a positioned element (the button); it bursts from that element's centre.
// It is pure decoration: it never blocks clicks and is gone after 0.65 seconds.
const props = defineProps({
  trigger: { type: Number, default: 0 }, // goes up by one for each burst
})

// Ten pieces spread round a circle, alternating sparkle and heart, at two distances.
const pieces = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * 2 * Math.PI + 0.3
  const distance = i % 2 === 0 ? 80 : 60
  return {
    heart: i % 2 === 1,
    x: Math.round(Math.cos(angle) * distance * 1.9), // wider than tall, like the button
    y: Math.round(Math.sin(angle) * distance),
    delay: (i % 3) * 30,
  }
})

const burstKey = ref(0) // a new key starts the animation again
const showing = ref(false)
let timer = null

watch(
  () => props.trigger,
  () => {
    if (prefersReducedMotion()) return
    burstKey.value++
    showing.value = true
    clearTimeout(timer)
    timer = setTimeout(() => (showing.value = false), 700)
  },
)

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <span v-if="showing" :key="burstKey" class="burst" aria-hidden="true">
    <svg
      v-for="(piece, i) in pieces"
      :key="i"
      class="piece"
      :class="{ heart: piece.heart }"
      viewBox="0 0 24 24"
      :style="{ '--x': `${piece.x}px`, '--y': `${piece.y}px`, '--delay': `${piece.delay}ms` }"
    >
      <path
        v-if="piece.heart"
        d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.8a4.2 4.2 0 0 1 7.5 2.7c0 5.4-7.5 10-7.5 10z"
      />
      <path
        v-else
        d="M12 2c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
      />
    </svg>
  </span>
</template>

<style scoped>
.burst {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 2;
}

.piece {
  position: absolute;
  left: -0.5rem;
  top: -0.5rem;
  width: 1.25rem;
  height: 1.25rem;
  fill: var(--tt-rose);
  /* A white edge keeps each piece visible on the cream page and on the rose button. */
  stroke: #fff;
  stroke-width: 1.5;
  overflow: visible;
  animation: burst 0.6s var(--tt-ease-out) var(--delay) both;
}

.piece.heart {
  fill: var(--tt-deep-rose);
  width: 1rem;
  height: 1rem;
}

@keyframes burst {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.3);
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(var(--x), var(--y)) scale(1) rotate(25deg);
  }
}
</style>
