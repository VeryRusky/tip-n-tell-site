<script setup>
import { ref, watch, onBeforeUnmount, useId } from 'vue'

// A large "Take a photo or choose one" button with a square preview: the same square
// shape customers see on the site. On a phone the button offers the camera or the photo
// library. v-model is the chosen file (or null). Without any photo the preview shows the
// "empty" slot (e.g. the design's sample drawing), or "No photo yet".
const props = defineProps({
  modelValue: { type: Object, default: null }, // the chosen File
  currentImage: { type: String, default: '' }, // the photo the design has now, if any
  label: { type: String, default: 'Take a photo or choose one' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const id = useId()
const previewUrl = ref('') // a temporary local address for the chosen file

function forgetPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

// When the parent clears the file (e.g. after saving), clear the preview too.
watch(
  () => props.modelValue,
  (file) => {
    if (!file) forgetPreview()
  },
)

function choose(event) {
  const file = event.target.files?.[0]
  event.target.value = '' // so choosing the same file again still works
  if (!file) return
  forgetPreview()
  previewUrl.value = URL.createObjectURL(file)
  emit('update:modelValue', file)
}

onBeforeUnmount(forgetPreview)
</script>

<template>
  <div class="photo-picker">
    <div class="preview" :class="{ empty: !previewUrl && !currentImage && !$slots.empty }">
      <img v-if="previewUrl" :src="previewUrl" alt="Preview of the chosen photo" />
      <img v-else-if="currentImage" :src="currentImage" alt="The photo customers see now" />
      <slot v-else name="empty">
        <span aria-hidden="true" class="empty-text">No photo yet</span>
      </slot>
    </div>
    <input
      :id="`${id}-file`"
      type="file"
      accept="image/*"
      class="file-input"
      :disabled="disabled"
      @change="choose"
    />
    <label :for="`${id}-file`" class="btn btn-outline-primary pick-button" :class="{ disabled }">
      <span aria-hidden="true">📷</span>
      {{ previewUrl ? 'Choose a different photo' : label }}
    </label>
    <p v-if="previewUrl" class="small-print mb-0 mt-1">
      This is how it will look on the site (cropped to a square).
    </p>
  </div>
</template>

<style scoped>
.photo-picker {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.6rem;
}

.preview {
  width: min(100%, 15rem);
  align-self: center;
  aspect-ratio: 1 / 1;
  border-radius: var(--tt-radius-small);
  overflow: hidden;
  border: 1px solid var(--tt-line);
  background: var(--tt-white);
}

.preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--tt-line);
}

.empty-text {
  color: var(--tt-muted);
  font-size: 0.9rem;
}

/* The real file input stays in the page (keyboard and screen readers reach it through the
   label), but is invisible: the big label is the button she taps. */
.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.pick-button {
  min-height: 56px;
  border-width: 2px;
  border-style: dashed;
  font-size: 1.05rem;
  gap: 0.5rem;
}

.file-input:focus-visible + .pick-button {
  outline: 3px solid var(--tt-deep-rose);
  outline-offset: 3px;
}

.pick-button.disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>
