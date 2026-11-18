<script setup>
import { ref, useId } from 'vue'
import AdminPhotoPicker from './AdminPhotoPicker.vue'

// "Add a design" (shown in a sheet): a photo, a name, Save.
// The page uploads it and passes back `progress`.
defineProps({
  busy: { type: Boolean, default: false },
  progress: { type: Number, default: null }, // 0-100 while uploading
})

const emit = defineEmits(['save'])

const id = useId()
const file = ref(null)
const name = ref('')
const problem = ref('')

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
</script>

<template>
  <form class="design-form" @submit.prevent="save">
    <AdminPhotoPicker v-model="file" :disabled="busy" />

    <label :for="`${id}-name`" class="form-label mt-3 mb-1 fw-bold">Name</label>
    <input
      :id="`${id}-name`"
      v-model="name"
      class="form-control"
      maxlength="60"
      placeholder="e.g. Cherry bows"
      autocomplete="off"
      enterkeyhint="done"
      :disabled="busy"
      :aria-describedby="problem ? `${id}-problem` : `${id}-name-help`"
    />
    <p :id="`${id}-name-help`" class="small-print mt-1 mb-0">
      Customers see the name and its number, e.g. "#9 {{ name.trim() || 'Cherry bows' }}".
    </p>

    <p v-if="problem" :id="`${id}-problem`" class="field-problem mt-2 mb-0">{{ problem }}</p>

    <div v-if="progress !== null" class="mt-3">
      <label :for="`${id}-progress`" class="form-label mb-1">Uploading… {{ progress }}%</label>
      <progress :id="`${id}-progress`" class="w-100" max="100" :value="progress"></progress>
    </div>

    <button type="submit" class="btn btn-primary w-100 mt-3" :disabled="busy" :aria-busy="busy">
      {{ busy ? 'Saving…' : 'Add design' }}
    </button>
  </form>
</template>

<style scoped>
progress {
  accent-color: var(--tt-deep-rose);
  height: 0.8rem;
}
</style>
