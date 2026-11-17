<script setup>
import { policies } from '@/config/site'
import IconHeart from './icons/IconHeart.vue'

// Her terms in full, for the Policies page. (The home page uses PolicyTiles.vue.)
</script>

<template>
  <ul class="policy-list">
    <li v-for="policy in policies" :key="policy.id">
      <IconHeart class="policy-icon" />
      <div>
        <h3 class="policy-title">{{ policy.title }}</h3>
        <p class="mb-0">{{ policy.text }}</p>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.policy-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.policy-list li {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px dashed var(--tt-line);
}

.policy-list li:last-child {
  border-bottom: 0;
}

.policy-icon {
  flex: 0 0 auto;
  margin-top: 0.2rem;
  font-size: 1.25rem;
  color: var(--tt-rose);
}

.policy-title {
  font-family: var(--tt-font-body);
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--tt-deep-rose);
  margin-bottom: 0.2rem;
}
</style>
