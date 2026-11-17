<script setup>
import { site } from '@/config/site'
import IconHeart from './icons/IconHeart.vue'

// The brand name as styled text (not her logo image): 'tip n tell' with a rose 'n'.
defineProps({
  size: { type: String, default: 'small' }, // 'small' for the header, 'large' for the home page
})

const words = site.brandName.split(' ')
</script>

<template>
  <span class="wordmark" :class="`wordmark-${size}`">
    <span class="visually-hidden">{{ site.brandName }}</span>
    <span aria-hidden="true" class="wordmark-letters">
      <template v-for="(word, index) in words" :key="index">
        <span v-if="index === 1" class="wordmark-middle">
          {{ word }}
          <IconHeart class="wordmark-heart" />
        </span>
        <span v-else>{{ word }}</span>
      </template>
    </span>
  </span>
</template>

<style scoped>
.wordmark {
  font-family: var(--tt-font-heading);
  color: var(--tt-ink);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.01em;
}

.wordmark-letters {
  display: inline-flex;
  align-items: baseline;
  gap: 0.18em;
}

.wordmark-middle {
  position: relative;
  color: var(--tt-rose);
  font-style: italic;
  font-weight: 700;
}

.wordmark-heart {
  position: absolute;
  top: -0.55em;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.45em;
  color: var(--tt-rose);
}

.wordmark-small {
  font-size: 1.5rem;
}

.wordmark-large {
  font-size: 3.4rem;
}
</style>
