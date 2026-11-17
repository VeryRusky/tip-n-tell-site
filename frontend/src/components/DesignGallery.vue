<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import { prefersReducedMotion } from '@/utils/motion'
import { useSlowNotice } from '@/composables/useSlowNotice'
import DesignArt from './DesignArt.vue'

// Read-only gallery of design references (home page), each in a rounded frame like the
// design boards on her posters.
//
//   below md: a carousel. One design is centred and in focus; the ones either side peek in.
//             It is an ordinary sideways-scrolling row with CSS scroll snapping, so it swipes
//             with the phone's own momentum. Dots below show where you are (and jump to a
//             design); arrow buttons at the sides help mouse and keyboard users.
//   md and up: a grid (3 per row, 4 from lg) where a design lifts gently on hover.
const catalog = useCatalogStore()
onMounted(() => catalog.load())
const slow = useSlowNotice(() => catalog.loading)

const row = ref(null)
const current = ref(0) // the design in focus in the carousel
let observer = null

// Which card is in the middle of the row? An IntersectionObserver watches a thin strip
// down the centre of the row (rootMargin cuts 45% off each side); the card crossing that
// strip is the current one.
function watchCards() {
  observer?.disconnect()
  if (!row.value) return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) current.value = Number(entry.target.dataset.index)
      }
    },
    { root: row.value, rootMargin: '0px -45% 0px -45%', threshold: 0 },
  )
  for (const card of row.value.children) observer.observe(card)
}

// Scroll the row (only the row, never the page) so card i is centred.
function showCard(i) {
  const list = row.value
  const card = list?.children[i]
  if (!card) return
  const left = card.offsetLeft - (list.clientWidth - card.offsetWidth) / 2
  list.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

function step(direction) {
  const count = catalog.designs.length
  showCard(Math.min(count - 1, Math.max(0, current.value + direction)))
}

watch(
  () => catalog.designs.length,
  async () => {
    await nextTick()
    watchCards()
  },
)
onMounted(watchCards)
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <p v-if="catalog.loading" role="status">
    {{ slow ? 'Waking up the gallery, one moment…' : 'Loading designs…' }}
  </p>
  <div v-else class="gallery-wrap">
    <!-- tabindex lets keyboard users scroll the carousel with the arrow keys. -->
    <ul ref="row" class="gallery" tabindex="0" aria-label="Design references">
      <li
        v-for="(design, i) in catalog.designs"
        :key="design.id"
        class="gallery-item"
        :class="{ 'is-current': i === current }"
        :data-index="i"
      >
        <figure class="board">
          <DesignArt :design="design" />
          <figcaption>
            <span class="design-number">#{{ design.id }}</span> {{ design.name }}
          </figcaption>
        </figure>
      </li>
    </ul>

    <!-- Carousel controls (below md only). -->
    <button
      type="button"
      class="carousel-arrow arrow-prev"
      aria-label="Previous design"
      :aria-disabled="current === 0"
      @click="step(-1)"
    >
      <span aria-hidden="true">‹</span>
    </button>
    <button
      type="button"
      class="carousel-arrow arrow-next"
      aria-label="Next design"
      :aria-disabled="current === catalog.designs.length - 1"
      @click="step(1)"
    >
      <span aria-hidden="true">›</span>
    </button>

    <div class="carousel-dots">
      <button
        v-for="(design, i) in catalog.designs"
        :key="design.id"
        type="button"
        class="dot"
        :aria-label="`Show design ${i + 1} of ${catalog.designs.length}`"
        :aria-current="i === current ? 'true' : null"
        @click="showCard(i)"
      >
        <span aria-hidden="true"></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/*
  The wrapper is a size container, so the carousel can be measured against it:
  the row runs 1rem past it on each side (to the screen edges), and the card in focus
  is 76% of the row's width. (cqw = 1% of the container's width.)
*/
.gallery-wrap {
  position: relative;
  container-type: inline-size;
  --row: calc(100cqw + 2rem);
  --card: calc(var(--row) * 0.76);
}

.gallery {
  list-style: none;
  margin: 0;
  padding: 0;
}

.board {
  margin: 0;
  padding: 0.6rem 0.6rem 0.55rem;
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-radius: 1.4rem;
}

.board :deep(.design-art) {
  border-radius: 1rem;
}

figcaption {
  margin-top: 0.5rem;
  padding: 0 0.2rem;
  font-size: 0.95rem;
}

.design-number {
  font-weight: 700;
  color: var(--tt-deep-rose);
}

.gallery:focus-visible {
  outline-offset: 4px;
}

/* ---- Below md: the carousel ---- */
@media (max-width: 767.98px) {
  .gallery {
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    /* Run the row to the screen edges, and pad it so the first and last cards can be centred. */
    margin: 0 -1rem;
    padding: 0.4rem calc((var(--row) - var(--card)) / 2) 0.6rem;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }

  .gallery::-webkit-scrollbar {
    display: none;
  }

  .gallery-item {
    flex: 0 0 var(--card);
    scroll-snap-align: center;
    /* Neighbours sit a touch smaller and softer than the design in focus. */
    transform: scale(0.94);
    opacity: 0.7;
    transition:
      transform 0.3s var(--tt-ease-out),
      opacity 0.3s ease-out;
  }

  .gallery-item.is-current {
    transform: none;
    opacity: 1;
  }

  /* Position dots: 8px dots inside 28px buttons, so they are easy to tap. */
  .carousel-dots {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 0.4rem;
  }

  .dot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    background: transparent;
  }

  .dot span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1.5px solid var(--tt-deep-rose);
    transition: background-color 0.2s;
  }

  .dot[aria-current='true'] span {
    background: var(--tt-deep-rose);
  }

  .dot:focus-visible {
    outline-offset: -2px;
    border-radius: 50%;
  }

  /* Arrow buttons at the sides, over the peeking cards, level with the pictures. */
  .carousel-arrow {
    position: absolute;
    /* Level with the middle of the picture: row padding + frame padding + half the picture. */
    top: calc(0.4rem + 0.6rem + (var(--card) - 1.2rem) / 2);
    z-index: 2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0 0 0.2rem;
    border: 1px solid var(--tt-line);
    border-radius: 50%;
    background: rgba(255, 250, 246, 0.94);
    color: var(--tt-deep-rose);
    font-size: 1.7rem;
    line-height: 1;
    box-shadow: 0 6px 14px -8px rgba(158, 74, 85, 0.5);
    transform: translateY(-50%);
  }

  .arrow-prev {
    left: -0.5rem;
  }

  .arrow-next {
    right: -0.5rem;
  }

  .carousel-arrow[aria-disabled='true'] {
    opacity: 0.4;
    cursor: default;
  }
}

/* Touch-only phones swipe; the arrows would only crowd the peeking cards. */
@media (max-width: 767.98px) and (hover: none) {
  .carousel-arrow {
    display: none;
  }
}

/* ---- md and up: a grid ---- */
@media (min-width: 768px) {
  .gallery {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
  }

  .carousel-arrow,
  .carousel-dots {
    display: none;
  }
}

@media (min-width: 992px) {
  .gallery {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Gentle lift on hover, only for devices that can hover. The shadow is a separate layer
   whose opacity changes, so only transform and opacity animate. */
@media (hover: hover) and (min-width: 768px) {
  .board {
    position: relative;
    transition: transform 0.3s var(--tt-ease-out);
  }

  .board::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: 0 16px 30px -16px rgba(158, 74, 85, 0.45);
    opacity: 0;
    transition: opacity 0.3s var(--tt-ease-out);
    pointer-events: none;
  }

  .board:hover {
    transform: translateY(-4px);
  }

  .board:hover::after {
    opacity: 1;
  }
}
</style>
