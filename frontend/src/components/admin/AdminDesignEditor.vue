<script setup>
import { ref, computed, nextTick, useId } from 'vue'
import AdminPhotoPicker from './AdminPhotoPicker.vue'

// "Edit" for one design (shown in a sheet): its name, a new photo, show or hide, and at the
// bottom, set apart, "Delete design" (which asks first). Nothing is saved until she taps
// "Save changes"; the page does the saving.
const props = defineProps({
  design: { type: Object, required: true }, // { id, number, name, image, hidden }
  busy: { type: Boolean, default: false },
  progress: { type: Number, default: null }, // 0-100 while a new photo uploads
})

const emit = defineEmits(['save', 'delete', 'cancel'])

const id = useId()
const name = ref(props.design.name)
const shown = ref(!props.design.hidden)
const file = ref(null)
const problem = ref('')
const confirmingDelete = ref(false)

const title = computed(() => `#${props.design.number} ${props.design.name}`)
const changed = computed(
  () =>
    file.value !== null ||
    name.value.trim().replace(/\s+/g, ' ') !== props.design.name ||
    shown.value === props.design.hidden,
)

const question = ref(null)

// Show the delete question and move the focus to it (not to the Delete button itself).
async function askDelete() {
  confirmingDelete.value = true
  await nextTick()
  question.value?.focus()
}

function save() {
  const trimmed = name.value.trim().replace(/\s+/g, ' ')
  if (trimmed.length < 1 || trimmed.length > 60) {
    problem.value = 'Use 1 to 60 characters.'
    return
  }
  problem.value = ''
  if (!changed.value) return emit('cancel')
  emit('save', { name: trimmed, hidden: !shown.value, file: file.value })
}
</script>

<template>
  <div v-if="confirmingDelete" class="delete-confirm">
    <div
      ref="question"
      class="danger-note mb-3"
      role="group"
      tabindex="-1"
      :aria-labelledby="`${id}-ask`"
    >
      <p :id="`${id}-ask`" class="mb-2">
        <strong>Delete {{ title }}?</strong>
      </p>
      <p class="mb-0">
        Its photo is deleted too, and this cannot be undone. Number #{{ design.number }} will not be
        used again.
      </p>
    </div>
    <div class="d-flex flex-wrap gap-2">
      <button
        type="button"
        class="btn btn-danger flex-grow-1"
        :disabled="busy"
        :aria-busy="busy"
        @click="emit('delete')"
      >
        {{ busy ? 'Deleting…' : `Delete ${title}` }}
      </button>
      <button type="button" class="btn btn-outline-primary" @click="confirmingDelete = false">
        Keep it
      </button>
    </div>
  </div>

  <form v-else class="design-editor" @submit.prevent="save">
    <label :for="`${id}-name`" class="form-label mb-1 fw-bold">Name</label>
    <input
      :id="`${id}-name`"
      v-model="name"
      class="form-control"
      maxlength="60"
      autocomplete="off"
      enterkeyhint="done"
      :disabled="busy"
      :aria-describedby="problem ? `${id}-problem` : undefined"
    />
    <p v-if="problem" :id="`${id}-problem`" class="field-problem mt-1 mb-0">{{ problem }}</p>

    <h3 class="section-title">Photo</h3>
    <AdminPhotoPicker
      v-model="file"
      :current-image="design.image ?? ''"
      :label="design.image ? 'Replace photo' : 'Add a photo'"
      :disabled="busy"
    />
    <p v-if="!design.image && !file" class="small-print mt-1 mb-0">
      Until you add a photo, customers see a drawing in this design's colours.
    </p>

    <div v-if="progress !== null" class="mt-3">
      <label :for="`${id}-progress`" class="form-label mb-1">Uploading… {{ progress }}%</label>
      <progress :id="`${id}-progress`" class="w-100" max="100" :value="progress"></progress>
    </div>

    <h3 class="section-title">On the site</h3>
    <div class="form-check form-switch show-switch">
      <input
        :id="`${id}-shown`"
        v-model="shown"
        class="form-check-input"
        type="checkbox"
        role="switch"
        :disabled="busy"
        :aria-describedby="`${id}-shown-help`"
      />
      <label class="form-check-label" :for="`${id}-shown`">Show to customers</label>
    </div>
    <p :id="`${id}-shown-help`" class="small-print mb-0">
      Hiding takes it off the site but keeps it here. Anyone who saved the photo's link can still
      open it; delete the design to remove the photo for good.
    </p>

    <div class="save-row">
      <button type="submit" class="btn btn-primary w-100" :disabled="busy" :aria-busy="busy">
        {{ busy ? 'Saving…' : 'Save changes' }}
      </button>
    </div>

    <div class="danger-zone">
      <button
        type="button"
        class="btn btn-outline-danger w-100"
        :disabled="busy"
        @click="askDelete"
      >
        Delete design
      </button>
    </div>
  </form>
</template>

<style scoped>
.section-title {
  font-family: var(--tt-font-body);
  font-size: 1rem;
  font-weight: 800;
  color: var(--tt-ink);
  margin: 1.25rem 0 0.5rem;
}

.show-switch {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 44px;
}

.show-switch .form-check-input {
  width: 2.6em;
  height: 1.4em;
  margin-top: 0;
}

.show-switch .form-check-label {
  font-weight: 700;
}

/* Save stays in reach at the bottom of the sheet while she scrolls. */
.save-row {
  position: sticky;
  bottom: -1rem; /* the sheet's own padding */
  z-index: 1;
  margin: 1rem -1rem 0;
  padding: 0.75rem 1rem;
  background: var(--tt-cream);
  border-top: 1px solid var(--tt-line);
}

/* A smaller preview here, so the name, photo and switch fit on a phone screen. */
.design-editor :deep(.preview) {
  width: min(100%, 11rem);
}

/* Set apart from everything else, so it is never tapped by mistake. */
.danger-zone {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--tt-line);
}

progress {
  accent-color: var(--tt-deep-rose);
  height: 0.8rem;
}
</style>
