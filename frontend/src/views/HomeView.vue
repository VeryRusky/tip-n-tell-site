<script setup>
import { ref } from 'vue'
import { site, instagramProfileUrl } from '@/config/site'
import { useMediaQuery, STORY_MOTION_QUERY } from '@/composables/useMediaQuery'
import { useStorySample } from '@/composables/useStorySample'
import { setVars } from '@/utils/motion'
import { vReveal } from '@/directives/reveal'
import StoryOpening from '@/components/story/StoryOpening.vue'
import StoryDesign from '@/components/story/StoryDesign.vue'
import StoryCalendar from '@/components/story/StoryCalendar.vue'
import StoryMessage from '@/components/story/StoryMessage.vue'
import PriceList from '@/components/PriceList.vue'
import DesignGallery from '@/components/DesignGallery.vue'
import PolicyTiles from '@/components/PolicyTiles.vue'
import IconPin from '@/components/icons/IconPin.vue'
import IconBow from '@/components/icons/IconBow.vue'

// The scroll story only animates when motion is welcome and the screen is tall enough.
// Otherwise the three scenes are ordinary sections showing their finished pictures.
const animated = useMediaQuery(STORY_MOTION_QUERY)

// Real calendar data for scenes 02 and 03.
const { month, slotsByDate, sampleSlot } = useStorySample()

// The three thin bars under the header fill as each scene plays, like Instagram stories.
const progressBars = ref(null)
// Scenes far from the screen stop measuring (to save work), so after one big jump a scene
// that was skipped over can still hold an old value. The bars therefore also follow from the
// scene being played: every scene before it is complete, every scene after it not started.
function showSceneProgress(scene, progress) {
  const bars = {}
  for (let n = 1; n <= 3; n++) {
    if (n === scene) bars[`--scene-${n}`] = progress
    else if (n < scene && progress > 0) bars[`--scene-${n}`] = 1
    else if (n > scene && progress < 1) bars[`--scene-${n}`] = 0
  }
  setVars(progressBars.value, bars)
}
</script>

<template>
  <main id="main" class="home">
    <StoryOpening />

    <div class="story" :class="{ 'is-animated': animated }">
      <!-- Decorative: each scene has its own heading, so screen readers don't need this. -->
      <div v-if="animated" ref="progressBars" class="story-progress" aria-hidden="true">
        <div class="container-lg story-progress-bars">
          <span v-for="n in 3" :key="n" :style="{ '--fill': `var(--scene-${n}, 0)` }"></span>
        </div>
      </div>

      <StoryDesign :animated="animated" @progress="(p) => showSceneProgress(1, p)" />
      <StoryCalendar
        :animated="animated"
        :month="month"
        :slots-by-date="slotsByDate"
        :sample-slot="sampleSlot"
        @progress="(p) => showSceneProgress(2, p)"
      />
      <StoryMessage
        :animated="animated"
        :sample-slot="sampleSlot"
        @progress="(p) => showSceneProgress(3, p)"
      />
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
        <section
          id="prices"
          v-reveal
          class="col-md-7 order-md-1"
          aria-labelledby="prices-title"
          tabindex="-1"
        >
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
/*
  `overflow-x: clip` stops anything that slides in from the side making the page scroll
  sideways. Unlike `overflow: hidden`, it does not break position: sticky inside it.
*/
.story {
  position: relative;
  overflow-x: clip;
}

/* ---- Story progress: three thin bars pinned under the header while the scenes play ---- */
.story-progress {
  position: sticky;
  top: var(--tt-header-h);
  z-index: 2;
  height: 0; /* takes no space; the bars hang below it */
}

.story-progress-bars {
  display: flex;
  gap: 0.35rem;
  padding-top: 0.6rem;
}

.story-progress-bars span {
  position: relative;
  flex: 1;
  height: 3px;
  border-radius: 3px;
  background: rgba(158, 74, 85, 0.16);
  overflow: hidden;
}

.story-progress-bars span::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--tt-deep-rose);
  transform-origin: left center;
  transform: scaleX(var(--fill));
}

@media (min-width: 992px) {
  .story-progress-bars {
    max-width: 32rem;
  }
}

/* ---- The rest of the page ---- */
.rest {
  padding-top: 2.5rem;
}

#prices {
  scroll-margin-top: calc(var(--tt-header-h) + 1rem);
}

#prices:focus {
  outline: none;
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
