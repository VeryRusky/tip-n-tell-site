<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, useId } from 'vue'

// The small account button in the phone header. Tapping it shows who is signed in and a
// Sign out button. Esc, tapping elsewhere, or tapping the button again closes it.
defineProps({
  email: { type: String, default: '' },
})

const emit = defineEmits(['sign-out'])

const id = useId()
const open = ref(false)
const holder = ref(null)
const toggle = ref(null)
const signOutButton = ref(null)

async function show() {
  open.value = true
  await nextTick()
  signOutButton.value?.focus()
}

function hide({ returnFocus = false } = {}) {
  open.value = false
  if (returnFocus) toggle.value?.focus()
}

function onKeydown(event) {
  if (event.key === 'Escape' && open.value) {
    event.stopPropagation()
    hide({ returnFocus: true })
  }
}

// A tap or click anywhere outside the menu closes it.
function onPointerDown(event) {
  if (open.value && !holder.value?.contains(event.target)) hide()
}

// Moving the keyboard focus out of the menu closes it too.
function onFocusOut(event) {
  if (open.value && !holder.value?.contains(event.relatedTarget)) hide()
}

onMounted(() => document.addEventListener('pointerdown', onPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))
</script>

<template>
  <div ref="holder" class="account-menu" @keydown="onKeydown" @focusout="onFocusOut">
    <button
      ref="toggle"
      type="button"
      class="account-button"
      aria-label="Account"
      :aria-expanded="open"
      :aria-controls="`${id}-panel`"
      @click="open ? hide() : show()"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <circle cx="12" cy="8.5" r="4" fill="none" stroke="currentColor" stroke-width="2" />
        <path
          d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>
    <div v-show="open" :id="`${id}-panel`" class="account-panel">
      <p class="account-label">Signed in as</p>
      <p class="account-email">{{ email }}</p>
      <button
        ref="signOutButton"
        type="button"
        class="btn btn-outline-primary btn-sm w-100"
        @click="emit('sign-out')"
      >
        Sign out
      </button>
    </div>
  </div>
</template>

<style scoped>
.account-menu {
  position: relative;
}

.account-button {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--tt-deep-rose);
  border-radius: 50%;
  background: var(--tt-white);
  color: var(--tt-deep-rose);
}

.account-button[aria-expanded='true'] {
  background: var(--tt-pink);
}

.account-panel {
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  z-index: 1060;
  width: min(16rem, calc(100vw - 2rem));
  padding: 0.75rem;
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-radius: var(--tt-radius-small);
  box-shadow: 0 12px 28px -14px rgba(26, 26, 26, 0.45);
}

.account-label {
  margin: 0;
  font-size: 0.8rem;
  color: var(--tt-muted);
}

.account-email {
  margin: 0 0 0.6rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}
</style>
