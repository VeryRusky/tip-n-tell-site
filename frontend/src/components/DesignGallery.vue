<script setup>
import { onMounted } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import DesignArt from './DesignArt.vue'

// Read-only gallery of design references (home page), each in a rounded frame like the
// design boards on her posters.
//   phones: one swipeable row that snaps to each design (the next one peeks in)
//   md and up: a grid (3 per row, 4 from lg) where a design lifts gently on hover
const catalog = useCatalogStore()
onMounted(() => catalog.load())
</script>

<template>
  <p v-if="catalog.loading" role="status">Loading designs…</p>
  <!-- tabindex lets keyboard users scroll the row with the arrow keys on phones. -->
  <ul v-else class="gallery" tabindex="0" aria-label="Design references">
    <li v-for="design in catalog.designs" :key="design.id" class="gallery-item">
      <figure class="board">
        <DesignArt :design="design" />
        <figcaption>
          <span class="design-number">#{{ design.id }}</span> {{ design.name }}
        </figcaption>
      </figure>
    </li>
  </ul>
</template>

<style scoped>
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

/* ---- Phones: a swipeable row that snaps to each design ---- */
@media (max-width: 767.98px) {
  .gallery {
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    /* Run the row to the screen edges, but keep the first design lined up with the text. */
    margin: 0 -1rem;
    padding: 0.25rem 1rem 0.75rem;
    scroll-padding: 0 1rem;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .gallery::-webkit-scrollbar {
    display: none;
  }

  .gallery-item {
    flex: 0 0 68%;
    scroll-snap-align: start;
  }
}

/* ---- md and up: a grid ---- */
@media (min-width: 768px) {
  .gallery {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
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
