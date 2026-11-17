<script setup>
import IconCheck from './icons/IconCheck.vue'

// A big tappable option card wrapped around a real radio button or checkbox,
// so keyboards and screen readers work as normal. Used for slots, services,
// designs and add-ons. Put the option's text in the default slot.
defineProps({
  type: { type: String, default: 'radio' }, // 'radio' (pick one) or 'checkbox' (optional extra)
  name: { type: String, required: true },
  value: { type: [String, Number], required: true },
  checked: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])
</script>

<template>
  <label class="choice-card" :class="{ checked, disabled }">
    <input
      :type="type"
      class="choice-input"
      :name="name"
      :value="value"
      :checked="checked"
      :disabled="disabled"
      @change="emit('select', value)"
    />
    <span class="choice-body"><slot /></span>
    <!-- Circle for "pick one", square for "optional"; ticked when chosen. -->
    <span class="choice-mark" :class="type" aria-hidden="true">
      <IconCheck v-if="checked" />
    </span>
  </label>
</template>

<style scoped>
.choice-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 56px;
  padding: 0.75rem 1rem;
  background: var(--tt-white);
  border: 1.5px solid var(--tt-line);
  border-radius: var(--tt-radius);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background-color 0.15s;
}

.choice-card:hover:not(.disabled) {
  border-color: var(--tt-deep-rose);
}

.choice-card.checked {
  background: var(--tt-pink);
  border: 2.5px solid var(--tt-deep-rose);
  /* Keep the size the same when the border gets thicker. */
  padding: calc(0.75rem - 1px) calc(1rem - 1px);
}

.choice-card.disabled {
  cursor: not-allowed;
  background: transparent;
  border-style: dashed;
}

/* The real input is invisible but still focusable and clickable through the label. */
.choice-input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

/* Show keyboard focus on the whole card. */
.choice-card:has(.choice-input:focus-visible) {
  outline: 3px solid var(--tt-deep-rose);
  outline-offset: 3px;
}

.choice-body {
  flex: 1;
  min-width: 0;
}

.choice-mark {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 2px solid var(--tt-deep-rose);
  background: var(--tt-white);
  color: #fff;
  font-size: 1rem;
}

.choice-mark.radio {
  border-radius: 50%;
}

.choice-mark.checkbox {
  border-radius: 6px;
}

.checked .choice-mark {
  background: var(--tt-deep-rose);
}

.disabled .choice-mark {
  border-color: var(--tt-line);
  background: transparent;
}

/* Tile layout for the design grid: picture on top, text under it. */
.choice-card.choice-tile {
  flex-direction: column;
  align-items: stretch;
  padding: 0.5rem;
  gap: 0.4rem;
}

.choice-card.choice-tile.checked {
  padding: calc(0.5rem - 1px);
}

.choice-tile .choice-mark {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
}
</style>
