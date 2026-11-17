<script setup>
import { site, instagramProfileUrl } from '@/config/site'
import { useStorySample } from '@/composables/useStorySample'
import { claimOpening } from '@/utils/opening'
import { vReveal } from '@/directives/reveal'
import StoryOpening from '@/components/story/StoryOpening.vue'
import StoryPlayer from '@/components/story/StoryPlayer.vue'
import PriceList from '@/components/PriceList.vue'
import DesignGallery from '@/components/DesignGallery.vue'
import PolicyTiles from '@/components/PolicyTiles.vue'
import IconPin from '@/components/icons/IconPin.vue'
import IconBow from '@/components/icons/IconBow.vue'

// Does the opening animation play this time? (First visit in a browser session only.)
// If it does, the story waits a moment so the two don't compete for attention.
const openingPlays = claimOpening()

// Real calendar data for the story's "Pick a time" and "Send it" scenes.
const { month, slotsByDate, sampleSlot } = useStorySample()
</script>

<template>
  <main id="main" class="home">
    <!--
      The hero.
        phones:  the opening (wordmark, tagline, Book a slot), then the story card just under
                 it, so the top of the card shows on the first screen; Book a slot under it.
        laptops: one screen, two columns: the opening on the left, the story card on the right.
    -->
    <div class="container-lg hero">
      <StoryOpening class="hero-opening" :playing="openingPlays" />
      <div class="hero-story">
        <StoryPlayer
          :month="month"
          :slots-by-date="slotsByDate"
          :sample-slot="sampleSlot"
          :start-delay="openingPlays ? 1300 : 300"
        />
        <RouterLink :to="{ name: 'book-slot' }" class="btn btn-primary btn-lg w-100 d-lg-none">
          Book a slot
        </RouterLink>
      </div>
    </div>

    <!--
      The rest of the page (version A's content). On phones the sections stack in the order
      written here (Prices, Designs, Good to know, Where). From md up, the order-md-* classes
      rearrange them by how much each one holds:
        row 1: Prices (7 columns) and Where (5 columns), side by side
        row 2: Good to know, full width, as four small tiles
        row 3: the design gallery
      Each section rises in once as it scrolls into view (v-reveal).
    -->
    <div class="container-lg rest">
      <div class="row g-4">
        <section id="prices" v-reveal class="col-md-7 order-md-1" aria-labelledby="prices-title">
          <div class="panel h-100">
            <h2 id="prices-title">Prices</h2>
            <PriceList />
          </div>
        </section>

        <section id="gallery" v-reveal class="col-12 order-md-4" aria-labelledby="designs-title">
          <h2 id="designs-title" class="mt-2">Designs</h2>
          <p class="muted measure">
            Pick one of these when you book, or bring your own. More than one person can choose the
            same design.
          </p>
          <DesignGallery />
        </section>

        <section v-reveal class="col-12 order-md-3" aria-labelledby="good-to-know-title">
          <h2 id="good-to-know-title" class="mt-2">Good to know</h2>
          <PolicyTiles />
          <p class="text-center mt-3 mb-0">
            <RouterLink :to="{ name: 'policies' }" class="btn btn-outline-primary">
              Read all policies
            </RouterLink>
          </p>
        </section>

        <section v-reveal="1" class="col-md-5 order-md-2" aria-labelledby="where-title">
          <!-- d-flex flex-column + mt-auto keep the Instagram button at the bottom of the card. -->
          <div class="panel h-100 d-flex flex-column">
            <h2 id="where-title">Where</h2>
            <p class="where-area"><IconPin /> {{ site.area }}</p>
            <p class="small-print">I'll share the exact location when I confirm your booking.</p>
            <h3 class="find-me">Find me on Instagram</h3>
            <p class="small-print">See my latest sets, and DM me there to book.</p>
            <a
              :href="instagramProfileUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-outline-primary w-100 mt-auto"
            >
              @{{ site.instagramHandle }}
            </a>
          </div>
        </section>
      </div>

      <!-- An ordinary button to end the page. -->
      <div v-reveal class="row mt-4">
        <div class="col-md-8 col-lg-5 mx-auto text-center">
          <IconBow class="closing-bow" />
          <RouterLink :to="{ name: 'book-slot' }" class="btn btn-primary btn-lg w-100 mt-3">
            Book a slot
          </RouterLink>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* ---- Hero ---- */
.hero {
  display: grid;
  gap: 1rem;
  padding-top: 1rem;
}

.hero-story {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Tablets: keep the card story-shaped and centred rather than stretched across the page. */
@media (min-width: 576px) and (max-width: 991.98px) {
  .hero-story {
    align-items: center;
  }

  .hero-story > * {
    width: 100%;
    max-width: 28rem;
  }
}

/*
  Laptops: the hero fills one screen under the header (and the demo notice):
  the opening on the left, the story card on the right, shaped like a phone story.
*/
@media (min-width: 992px) {
  .hero {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: stretch;
    gap: 2.5rem;
    height: calc(100svh - var(--tt-header-h) - var(--tt-banner-h, 0px));
    min-height: 34rem;
    max-height: 52rem;
    padding-top: 1.25rem;
    padding-bottom: 1.25rem;
  }

  .hero-story {
    justify-content: center;
    /* The card's height follows the screen; its width keeps a story's shape. */
    --story-height: 100%;
    height: 100%;
  }

  .hero-story :deep(.story-card) {
    width: auto;
    aspect-ratio: 10 / 16;
  }
}

/* ---- The rest of the page ---- */
.rest {
  padding-top: 2.5rem;
}

#prices {
  scroll-margin-top: calc(var(--tt-header-h) + 1rem);
}

.where-area {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1.15rem;
  font-weight: 700;
}

.find-me {
  margin-top: 1.25rem;
  font-size: 1.1rem;
}

.closing-bow {
  font-size: 1.6rem;
  color: var(--tt-rose);
}
</style>
