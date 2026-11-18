<script setup>
import { ref, watch, nextTick, onBeforeUnmount, useId } from 'vue'
import { lockPage, unlockPage } from '@/utils/pageLock'

// A panel that opens over the page: a sheet sliding up from the bottom on a phone,
// a dialog in the middle of a laptop screen. Used for a day's times, choosing times to
// open, editing and adding designs. Accessible:
//   - it has a title that screen readers announce (aria-labelledby)
//   - focus moves into it, Tab stays inside it, and focus goes back afterwards
//   - Esc, the Close button and tapping the dimmed background all close it
//   - the page behind cannot be tapped or tabbed to while it is open (inert)
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
})

const emit = defineEmits(['close'])

const titleId = useId()
const panel = ref(null)
let returnFocusTo = null

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

async function whenOpened() {
  returnFocusTo = document.activeElement
  lockPage()
  await nextTick()
  // Focus a field marked data-autofocus if there is one, otherwise the panel itself.
  const first = panel.value?.querySelector('[data-autofocus]')
  ;(first ?? panel.value)?.focus()
}

function whenClosed() {
  unlockPage()
  // Back to where she was. If that button has gone (e.g. "Add details" became the summary),
  // to the sheet underneath, if there is one.
  if (returnFocusTo?.isConnected) returnFocusTo.focus()
  else
    [...document.querySelectorAll('.sheet-panel')].find((other) => other !== panel.value)?.focus()
  returnFocusTo = null
}

watch(
  () => props.open,
  (open, wasOpen) => {
    if (open) whenOpened()
    else if (wasOpen) whenClosed()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (props.open) whenClosed()
})

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('close')
    return
  }
  if (event.key !== 'Tab' || !panel.value) return
  // Keep Tab inside the panel: from the last control back to the first, and the other way.
  const items = [...panel.value.querySelectorAll(FOCUSABLE)]
  if (items.length === 0) return event.preventDefault()
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === panel.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="tt-admin sheet-layer" @keydown="onKeydown">
        <div class="sheet-backdrop" aria-hidden="true" @click="emit('close')"></div>
        <div
          ref="panel"
          class="sheet-panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
        >
          <div class="sheet-header">
            <h2 :id="titleId" class="sheet-title">{{ title }}</h2>
            <button type="button" class="sheet-close" @click="emit('close')">
              <span aria-hidden="true">✕</span> Close
            </button>
          </div>
          <div class="sheet-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="sheet-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-layer {
  position: fixed;
  inset: 0;
  z-index: 1080;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(26, 26, 26, 0.45);
}

.sheet-panel {
  position: relative;
  width: 100%;
  max-height: 88vh;
  max-height: 88dvh;
  display: flex;
  flex-direction: column;
  background: var(--tt-cream);
  border-radius: var(--tt-radius) var(--tt-radius) 0 0;
  box-shadow: 0 -12px 32px -12px rgba(26, 26, 26, 0.5);
  padding-bottom: env(safe-area-inset-bottom);
}

.sheet-panel:focus {
  outline: none;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem 0.5rem;
  border-bottom: 1px solid var(--tt-line);
}

.sheet-title {
  margin: 0;
  font-size: 1.25rem;
}

.sheet-close {
  flex: 0 0 auto;
  min-height: 44px;
  padding: 0 0.9rem;
  border: 1.5px solid var(--tt-line);
  border-radius: 999px;
  background: var(--tt-white);
  color: var(--tt-ink);
  font-weight: 700;
}

.sheet-body {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1rem;
}

.sheet-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--tt-line);
  background: var(--tt-white);
}

/* A laptop: a dialog in the middle of the screen. */
@media (min-width: 768px) {
  .sheet-layer {
    align-items: center;
    padding: 1.5rem;
  }

  .sheet-panel {
    max-width: 34rem;
    max-height: 85vh;
    border-radius: var(--tt-radius);
    box-shadow: 0 20px 48px -16px rgba(26, 26, 26, 0.55);
    padding-bottom: 0;
  }

  .sheet-footer {
    border-radius: 0 0 var(--tt-radius) var(--tt-radius);
  }
}

/* Slides up (phone) or fades in (laptop). Switched off by the reduced-motion rule in admin.css. */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease;
}

.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.25s var(--tt-ease-out);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(40px);
}
</style>
