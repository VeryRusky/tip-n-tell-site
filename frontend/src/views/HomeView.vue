<script setup>
import { computed, onMounted } from 'vue'
import { site, instagramProfileUrl } from '@/config/site'
import { useCatalogStore } from '@/stores/catalog'
import { formatPrice } from '@/utils/format'
import BrandWordmark from '@/components/BrandWordmark.vue'
import HowItWorks from '@/components/HowItWorks.vue'
import PriceList from '@/components/PriceList.vue'
import DesignGallery from '@/components/DesignGallery.vue'
import PolicyList from '@/components/PolicyList.vue'
import IconPin from '@/components/icons/IconPin.vue'
import IconSparkle from '@/components/icons/IconSparkle.vue'
import IconBow from '@/components/icons/IconBow.vue'
import IconHeart from '@/components/icons/IconHeart.vue'

const catalog = useCatalogStore()
onMounted(() => catalog.load())

const fromPrice = computed(() => {
  const lowest = catalog.lowestPrice()
  return lowest === null ? '' : `from ${formatPrice(lowest)}`
})
</script>

<template>
  <main id="main" class="container-lg home">
    <!-- Hero: one column on phones, two columns (hero + how booking works) from lg. -->
    <div class="row g-4">
      <section class="col-lg-6" aria-label="Welcome">
        <div class="hero-frame h-100">
          <IconSparkle class="sparkle sparkle-1" />
          <IconSparkle class="sparkle sparkle-2" />
          <IconHeart class="sparkle sparkle-3" />
          <h1 class="hero-title"><BrandWordmark size="large" /></h1>
          <p class="hero-tagline">
            {{ site.tagline }}<template v-if="fromPrice">, {{ fromPrice }}</template>
          </p>
          <p class="hero-area"><IconPin /> {{ site.area }}</p>
          <RouterLink :to="{ name: 'book-slot' }" class="btn btn-primary btn-lg w-100">
            Book a slot
          </RouterLink>
          <p class="small-print mt-2 mb-0">
            Pick a time here, then send me a DM on Instagram. No sign-up, no payment online.
          </p>
        </div>
      </section>

      <section class="col-lg-6" aria-labelledby="how-title">
        <div class="panel h-100">
          <h2 id="how-title">How booking works</h2>
          <HowItWorks />
        </div>
      </section>
    </div>

    <!--
      The rest of the page. On phones the sections stack in the order written here.
      From md up, the order-md-* classes move the three small cards to the top
      (side by side at lg) and the design gallery below them.
    -->
    <div class="row g-4 mt-0">
      <section id="prices" class="col-md-6 col-lg-4 order-md-1" aria-labelledby="prices-title">
        <div class="panel h-100">
          <h2 id="prices-title">Prices</h2>
          <PriceList />
        </div>
      </section>

      <section id="gallery" class="col-12 order-md-4" aria-labelledby="designs-title">
        <h2 id="designs-title" class="mt-2">Designs</h2>
        <p class="muted measure">
          Pick one of these when you book, or bring your own. More than one person can choose the
          same design.
        </p>
        <DesignGallery />
      </section>

      <section class="col-md-6 col-lg-4 order-md-2" aria-labelledby="good-to-know-title">
        <div class="panel h-100">
          <h2 id="good-to-know-title">Good to know</h2>
          <PolicyList home-only />
          <RouterLink :to="{ name: 'policies' }" class="btn btn-outline-primary w-100 mt-2">
            Read all policies
          </RouterLink>
        </div>
      </section>

      <section class="col-lg-4 order-md-3" aria-labelledby="where-title">
        <div class="panel h-100">
          <h2 id="where-title">Where</h2>
          <p class="where-area"><IconPin /> {{ site.area }}</p>
          <p class="small-print">I'll share the exact location when I confirm your booking.</p>
          <h3 class="find-me">Find me on Instagram</h3>
          <p class="small-print">See my latest sets, and DM me there to book.</p>
          <a
            :href="instagramProfileUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline-primary w-100"
          >
            @{{ site.instagramHandle }}
          </a>
        </div>
      </section>
    </div>

    <!-- An ordinary button to end the page. -->
    <div class="row mt-4">
      <div class="col-md-8 col-lg-5 mx-auto text-center">
        <IconBow class="closing-bow" />
        <RouterLink :to="{ name: 'book-slot' }" class="btn btn-primary btn-lg w-100 mt-3">
          Book a slot
        </RouterLink>
      </div>
    </div>
  </main>
</template>

<style scoped>
.home {
  padding-top: 1rem;
}

/* Thin double line frame, like the borders on her posters. */
.hero-frame {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  padding: 2.25rem 1.25rem 1.5rem;
  border: 1px solid var(--tt-line);
  border-radius: 1.5rem;
  outline: 1px solid var(--tt-line);
  outline-offset: -7px;
  background: linear-gradient(180deg, var(--tt-blush), var(--tt-cream));
}

.hero-title {
  margin: 0.5rem 0 0.75rem;
}

.hero-tagline {
  font-family: var(--tt-font-heading);
  font-size: 1.2rem;
  margin-bottom: 0.25rem;
}

.hero-area {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tt-deep-rose);
  margin-bottom: 1.25rem;
}

.sparkle {
  position: absolute;
  color: var(--tt-rose);
}

.sparkle-1 {
  top: 1rem;
  left: 1.2rem;
  font-size: 1.4rem;
}

.sparkle-2 {
  top: 2.4rem;
  right: 1.6rem;
  font-size: 0.9rem;
}

.sparkle-3 {
  top: 1.1rem;
  right: 2.6rem;
  font-size: 1rem;
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
