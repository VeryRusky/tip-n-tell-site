<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { site } from '@/config/site'

// Keep --tt-banner-h equal to this notice's height (0 when hidden), so the home page's
// opening can still fill exactly one screen below the header and this notice.
const banner = ref(null)
let observer = null

watch(
  banner,
  (element) => {
    observer?.disconnect()
    const root = document.documentElement.style
    if (!element) return root.setProperty('--tt-banner-h', '0px')
    observer = new ResizeObserver(() => {
      root.setProperty('--tt-banner-h', `${element.getBoundingClientRect().height}px`)
    })
    observer.observe(element)
  },
  { flush: 'post' },
)

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <!-- Shown while site.demoMode is true (src/config/site.js). -->
  <div v-if="site.demoMode" ref="banner" class="demo-banner" role="note">
    <div class="container-lg">
      <strong>Demo site:</strong> the slots are samples and bookings aren't open yet.
    </div>
  </div>
</template>

<style scoped>
.demo-banner {
  background: var(--tt-deep-rose);
  color: #fff;
  font-size: 0.9rem;
  padding: 0.45rem 0;
  text-align: center;
}
</style>
