<script setup>
import { RouterView } from 'vue-router'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import DemoBanner from '@/components/DemoBanner.vue'
</script>

<template>
  <a href="#main" class="skip-link">Skip to content</a>
  <SiteHeader />
  <DemoBanner />
  <RouterView />
  <SiteFooter />
</template>

<style scoped>
/* Hidden until a keyboard user tabs to it. */
.skip-link {
  position: absolute;
  left: 1rem;
  top: -100px;
  z-index: 1100;
  background: var(--tt-deep-rose);
  color: #fff;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  font-weight: 700;
}

.skip-link:focus {
  top: 0.5rem;
}
</style>
