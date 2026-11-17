<script setup>
import IconCheck from '@/components/icons/IconCheck.vue'

// A small message pinned near the bottom of the screen: "Saving…", "Saved ✓", or an error.
// Screen readers announce it too (role="status", or role="alert" for errors).
defineProps({
  message: { type: String, default: '' },
  kind: { type: String, default: 'saved' }, // 'working' | 'saved' | 'error'
  raised: { type: Boolean, default: false }, // sit higher, above a bar pinned to the bottom
})
</script>

<template>
  <div class="status-holder" :class="{ raised }">
    <div role="status" aria-live="polite">
      <p v-if="message && kind !== 'error'" class="admin-status" :class="`is-${kind}`">
        <IconCheck v-if="kind === 'saved'" /> {{ message }}
      </p>
    </div>
    <div role="alert">
      <p v-if="message && kind === 'error'" class="admin-status is-error">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.status-holder {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(1rem + env(safe-area-inset-bottom));
  z-index: 1050;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  padding: 0 1rem;
}

.status-holder.raised {
  bottom: calc(14rem + env(safe-area-inset-bottom));
}

.admin-status {
  margin: 0;
  max-width: 30rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  font-weight: 700;
  box-shadow: 0 8px 20px -10px rgba(26, 26, 26, 0.45);
  pointer-events: auto;
}

.is-working {
  background: var(--tt-white);
  color: var(--tt-ink);
  border: 1px solid var(--tt-line);
}

.is-saved {
  background: var(--tt-ink);
  color: #fff;
}

.is-error {
  background: #8a1c2b;
  color: #fff;
  border-radius: var(--tt-radius-small);
}
</style>
