<script setup>
import { ref, computed, onBeforeUnmount, useId } from 'vue'

// "Add a design": choose a photo (on a phone this offers the camera or the photo library),
// see a preview, give it a name, save. The page uploads it and passes back `progress`.
const props = defineProps({
  busy: { type: Boolean, default: false },
  progress: { type: Number, default: null }, // 0-100 while uploading
})

const emit = defineEmits(['save', 'cancel'])

const id = useId()
const file = ref(null)
const previewUrl = ref('')
const name = ref('')
const problem = ref('')

const canSave = computed(() => file.value && name.value.trim().length > 0 && !props.busy)

function choosePhoto(event) {
  const chosen = event.target.files?.[0]
  if (!chosen) return
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  file.value = chosen
  previewUrl.value = URL.createObjectURL(chosen) // a temporary local address for the preview
  problem.value = ''
}

function save() {
  const trimmed = name.value.trim()
  if (!file.value) problem.value = 'Choose a photo first.'
  else if (trimmed.length < 1 || trimmed.length > 60)
    problem.value = 'Give it a name (up to 60 characters).'
  else {
    problem.value = ''
    emit('save', { name: trimmed, file: file.value })
  }
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <form class="design-form" :aria-labelledby="`${id}-title`" @submit.prevent="save">
    <h2 :id="`${id}-title`" class="form-title">Add a design</h2>

    <div class="d-flex gap-3 align-items-start">
      <div class="preview" :class="{ empty: !previewUrl }">
        <img v-if="previewUrl" :src="previewUrl" alt="Preview of the chosen photo" />
        <span v-else aria-hidden="true">No photo yet</span>
      </div>
      <div class="flex-grow-1">
        <label :for="`${id}-photo`" class="form-label mb-1">Photo</label>
        <input
          :id="`${id}-photo`"
          type="file"
          accept="image/*"
          class="form-control photo-input"
          :disabled="busy"
          @change="choosePhoto"
        />
        <p class="small-print mt-1 mb-0">Take one now or choose from your photos.</p>
      </div>
    </div>

    <label :for="`${id}-name`" class="form-label mt-3 mb-1">Name</label>
    <input
      :id="`${id}-name`"
      v-model="name"
      class="form-control name-input"
      maxlength="60"
      placeholder="e.g. Cherry bows"
      autocomplete="off"
      :disabled="busy"
      :aria-describedby="problem ? `${id}-problem` : undefined"
    />

    <p v-if="problem" :id="`${id}-problem`" class="problem mt-2 mb-0">{{ problem }}</p>

    <div v-if="progress !== null" class="mt-3">
      <label :for="`${id}-progress`" class="form-label mb-1">Uploading… {{ progress }}%</label>
      <progress :id="`${id}-progress`" class="w-100" max="100" :value="progress"></progress>
    </div>

    <div class="d-flex gap-2 mt-3">
      <button type="submit" class="btn btn-primary flex-grow-1" :disabled="!canSave">
        {{ busy ? 'Saving…' : 'Save design' }}
      </button>
      <button
        type="button"
        class="btn btn-outline-primary"
        :disabled="busy"
        @click="emit('cancel')"
      >
        Cancel
      </button>
    </div>
  </form>
</template>

<style scoped>
.design-form {
  background: var(--tt-blush);
  border: 1px solid var(--tt-line);
  border-radius: var(--tt-radius);
  padding: 1rem;
}

.form-title {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}

.preview {
  flex: 0 0 96px;
  width: 96px;
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
  text-align: center;
  font-size: 0.8rem;
  color: var(--tt-muted);
  border-style: dashed;
}

.photo-input,
.name-input {
  min-height: 48px;
  border-color: var(--tt-line);
}

.photo-input {
  padding-top: 0.6rem;
}

progress {
  accent-color: var(--tt-deep-rose);
  height: 0.8rem;
}

.problem {
  color: #8a1c2b;
  font-weight: 700;
}
</style>
