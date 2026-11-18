<script setup>
import { useAdminToastStore } from '@/stores/adminToast'
import IconCheck from '@/components/icons/IconCheck.vue'

// Shows the admin pages' one message near the bottom of the screen (see stores/adminToast.js).
// Screen readers hear every new message, because the region with aria-live is always there.
// It is placed at the end of <body> (Teleport), so it stays tappable above an open sheet,
// and it sits above a bar pinned to the bottom (that bar sets --admin-bar-height).
const toast = useAdminToastStore()
</script>

<template>
  <Teleport to="body">
    <div class="tt-admin toast-holder">
      <div class="toast-region" role="status" aria-live="polite" aria-atomic="true">
        <div
          v-if="toast.message"
          class="admin-toast"
          :class="`is-${toast.kind}`"
          @mouseenter="toast.pause"
          @mouseleave="toast.resume"
          @focusin="toast.pause"
          @focusout="toast.resume"
        >
          <span class="toast-text">
            <IconCheck v-if="toast.kind === 'saved'" />
            <span v-if="toast.kind === 'working'" class="toast-spinner" aria-hidden="true"></span>
            {{ toast.message }}
          </span>
          <button
            v-if="toast.action"
            type="button"
            class="toast-button"
            :disabled="toast.actionBusy"
            :aria-busy="toast.actionBusy"
            @click="toast.runAction"
          >
            {{
              toast.actionBusy && toast.action.label === 'Undo' ? 'Undoing…' : toast.action.label
            }}
          </button>
          <button
            v-else-if="toast.kind === 'error'"
            type="button"
            class="toast-button"
            aria-label="Close this message"
            @click="toast.clear"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-holder {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--admin-bar-height, 0px) + 0.75rem + env(safe-area-inset-bottom));
  z-index: 1100; /* above sheets (1080) and the bottom bar */
  display: flex;
  justify-content: center;
  padding: 0 1rem;
  pointer-events: none;
}

.toast-region {
  width: 100%;
  max-width: 30rem;
  display: flex;
  justify-content: center;
}

.admin-toast {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 100%;
  min-height: 48px;
  padding: 0.35rem 0.4rem 0.35rem 1.1rem;
  border-radius: 999px;
  font-weight: 700;
  box-shadow: 0 10px 24px -10px rgba(26, 26, 26, 0.55);
  pointer-events: auto;
}

.toast-text {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem 0.3rem 0;
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
  background: var(--tt-danger);
  color: #fff;
  border-radius: var(--tt-radius-small);
}

.toast-button {
  flex: 0 0 auto;
  min-width: 44px;
  min-height: 44px;
  padding: 0 1rem;
  border: 2px solid currentColor;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font-weight: 800;
}

.is-saved .toast-button {
  color: #ffd9de;
}

.toast-button:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 2px;
}

.toast-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--tt-line);
  border-top-color: var(--tt-deep-rose);
  border-radius: 50%;
  animation: toast-spin 0.8s linear infinite;
}

@keyframes toast-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
