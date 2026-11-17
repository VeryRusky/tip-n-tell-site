<script setup>
import { site } from '@/config/site'
import { formatTime } from '@/utils/format'
import IconHeart from './icons/IconHeart.vue'
</script>

<template>
  <div class="mid-session-note" role="note">
    <IconHeart class="note-icon" />
    <p class="mb-0">
      <strong>About {{ formatTime(site.midSessionTime) }}:</strong> {{ site.midSessionAdvice }}
    </p>
  </div>
</template>

<style scoped>
.mid-session-note {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  margin-top: 1rem;
  padding: 0.8rem 1rem;
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-left: 4px solid var(--tt-deep-rose);
  border-radius: var(--tt-radius-small);
  font-size: 0.95rem;
}

.note-icon {
  flex: 0 0 auto;
  margin-top: 0.15rem;
  color: var(--tt-deep-rose);
  font-size: 1.2rem;
}
</style>
