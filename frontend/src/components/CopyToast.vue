<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import IconCheck from './icons/IconCheck.vue'

// Pop-up note shown after "Copy and open Instagram".
// Uses Bootstrap's toast styles, but Vue decides when it shows (no Bootstrap JavaScript).
//
// The customer usually leaves for Instagram straight after tapping, so the 5-second
// auto-hide only counts down while this page is visible. When they come back, the
// toast is still there, and it hides 5 seconds later (or when they close it).
const props = defineProps({
  state: { type: String, default: '' }, // 'copied' or 'failed'
  trigger: { type: Number, default: 0 }, // goes up by one each time the button is used
  hint: { type: String, default: 'Paste it in the chat.' }, // what to do next, after a copy
})

const HIDE_AFTER_MS = 5000
const visible = ref(false)
let timer = null

function startCountdown() {
  clearTimeout(timer)
  if (document.visibilityState === 'visible') {
    timer = setTimeout(() => {
      visible.value = false
    }, HIDE_AFTER_MS)
  }
}

function close() {
  clearTimeout(timer)
  visible.value = false
}

// Pause while the page is hidden (customer is in Instagram); restart when they return.
function onVisibilityChange() {
  if (document.visibilityState === 'hidden') clearTimeout(timer)
  else if (visible.value) startCountdown()
}

watch(
  () => props.trigger,
  () => {
    if (!props.state) return
    visible.value = true
    startCountdown()
  },
)

onMounted(() => document.addEventListener('visibilitychange', onVisibilityChange))
onBeforeUnmount(() => {
  clearTimeout(timer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <!-- The live region is always on the page, so screen readers announce what appears in it. -->
  <div class="copy-toast-region" role="status" aria-live="polite" aria-atomic="true">
    <Transition name="toast-fade">
      <div
        v-if="visible"
        class="toast show copy-toast"
        :class="state === 'failed' ? 'is-failed' : 'is-copied'"
      >
        <div class="d-flex align-items-center">
          <div class="toast-body d-flex align-items-center gap-2">
            <!-- An icon as well as colour: a tick for success, "!" for failure. -->
            <span class="toast-icon" aria-hidden="true">
              <IconCheck v-if="state === 'copied'" />
              <template v-else>!</template>
            </span>
            <span v-if="state === 'copied'"> <strong>Message copied!</strong> {{ hint }} </span>
            <span v-else>
              <strong>Couldn't copy.</strong> Press and hold the message to copy it.
            </span>
          </div>
          <button
            type="button"
            class="btn-close toast-close"
            aria-label="Close"
            @click="close"
          ></button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Never wider than the space it is placed in, so long text wraps instead of overflowing. */
.copy-toast-region {
  max-width: 100%;
  min-width: 0;
}

.copy-toast {
  --bs-toast-bg: var(--tt-white);
  --bs-toast-border-color: var(--tt-deep-rose);
  --bs-toast-border-width: 2px;
  --bs-toast-color: var(--tt-ink);
  --bs-toast-font-size: 0.95rem;
  --bs-toast-max-width: 100%;
  width: max-content;
  max-width: 100%;
  box-shadow: 0 6px 20px rgba(26, 26, 26, 0.18);
}

.toast-body {
  padding: 0.6rem 0.25rem 0.6rem 0.85rem;
}

.toast-icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  font-weight: 700;
  color: #fff;
  background: var(--tt-deep-rose);
}

.is-failed .toast-icon {
  background: var(--tt-ink);
}

/* Bootstrap's close "x" is small; give it a 44px tap area. */
.toast-close {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  padding: 0;
  margin: 0 0.15rem 0 0;
  background-size: 0.75rem;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
