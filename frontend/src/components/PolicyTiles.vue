<script setup>
import { policies } from '@/config/site'
import IconHeart from './icons/IconHeart.vue'

// "Good to know" on the home page: one small tile per policy, using the short summary.
// The full wording is on the Policies page (PolicyList.vue).
const homePolicies = policies.filter((policy) => policy.onHome)
</script>

<template>
  <!-- Bootstrap grid: 1 per row on phones, 2 from md, 4 from lg. Tiles in a row are equal height. -->
  <ul class="policy-tiles row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
    <li v-for="policy in homePolicies" :key="policy.id" class="col">
      <div class="panel tile h-100">
        <IconHeart class="tile-icon" />
        <h3 class="tile-title">{{ policy.title }}</h3>
        <p class="mb-0">{{ policy.summary }}</p>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.policy-tiles {
  list-style: none;
  padding: 0;
}

.tile {
  padding: 1rem;
  font-size: 0.95rem; /* small tiles: keeps each line to one or two lines at laptop width */
}

.tile-icon {
  font-size: 1.25rem;
  color: var(--tt-rose);
  margin-bottom: 0.35rem;
}

.tile-title {
  font-family: var(--tt-font-body);
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--tt-deep-rose);
  margin-bottom: 0.25rem;
}
</style>
