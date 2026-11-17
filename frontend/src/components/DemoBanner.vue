<script setup>
import { site } from '@/config/site'
</script>

<template>
  <!-- Shown while site.demoMode is true (src/config/site.js). -->
  <div v-if="site.demoMode" class="demo-banner" role="note">
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
