<script setup>
import { ref, computed, nextTick, useId } from 'vue'
import DesignArt from '@/components/DesignArt.vue'

// One design in the owner's gallery, with its controls: rename, replace photo,
// hide / show, move earlier / later, and delete (asks first).
// The page does the saving; this component only says what she asked for.
const props = defineProps({
  design: { type: Object, required: true }, // { id, number, name, image, colors, hidden }
  isFirst: { type: Boolean, default: false },
  isLast: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  progress: { type: Number, default: null }, // upload progress 0-100 while replacing the photo
})

const emit = defineEmits(['rename', 'replace', 'toggle-hidden', 'move', 'remove'])

const id = useId()
const renaming = ref(false)
const draftName = ref('')
const nameProblem = ref('')
const confirmingDelete = ref(false)
const nameInput = ref(null)
const fileInput = ref(null)

// DesignArt shows the public number as the design's id (and picks the drawing by it).
const artDesign = computed(() => ({ ...props.design, id: props.design.number }))
const title = computed(() => `#${props.design.number} ${props.design.name}`)

async function startRename() {
  draftName.value = props.design.name
  nameProblem.value = ''
  renaming.value = true
  await nextTick()
  nameInput.value?.focus()
}

function saveName() {
  const name = draftName.value.trim()
  if (name.length < 1 || name.length > 60) {
    nameProblem.value = 'Use 1 to 60 characters.'
    return
  }
  renaming.value = false
  if (name !== props.design.name) emit('rename', name)
}

function confirmDelete() {
  confirmingDelete.value = false
  emit('remove')
}

function chooseFile(event) {
  const file = event.target.files?.[0]
  event.target.value = '' // so choosing the same file again still works
  if (file) emit('replace', file)
}
</script>

<template>
  <article class="design-card" :class="{ 'is-hidden': design.hidden }" :aria-label="title">
    <div class="card-top">
      <div class="card-art">
        <DesignArt :design="artDesign" />
        <div v-if="progress !== null" class="upload-progress">
          <progress max="100" :value="progress" :aria-label="`Uploading new photo for ${title}`">
            {{ progress }}%
          </progress>
        </div>
      </div>

      <div class="card-info">
        <form v-if="renaming" class="rename" @submit.prevent="saveName">
          <label :for="`${id}-name`" class="form-label mb-1">Name of #{{ design.number }}</label>
          <input
            :id="`${id}-name`"
            ref="nameInput"
            v-model="draftName"
            class="form-control"
            maxlength="60"
            :aria-describedby="nameProblem ? `${id}-problem` : undefined"
          />
          <p v-if="nameProblem" :id="`${id}-problem`" class="problem mb-0">{{ nameProblem }}</p>
          <div class="d-flex gap-2 mt-2">
            <button type="submit" class="btn btn-primary btn-sm">Save name</button>
            <button type="button" class="btn btn-outline-primary btn-sm" @click="renaming = false">
              Cancel
            </button>
          </div>
        </form>
        <template v-else>
          <p class="design-title mb-1">
            <span class="design-number">#{{ design.number }}</span> {{ design.name }}
          </p>
          <p v-if="design.hidden" class="hidden-note mb-1">Hidden from customers</p>
          <p v-if="!design.image" class="small-print mb-1">No photo yet (a drawing is shown)</p>
        </template>

        <div class="move-buttons">
          <button
            type="button"
            class="btn btn-outline-primary icon-button"
            :disabled="isFirst || busy"
            :aria-label="`Move ${title} earlier`"
            @click="emit('move', -1)"
          >
            <span aria-hidden="true">↑</span>
          </button>
          <button
            type="button"
            class="btn btn-outline-primary icon-button"
            :disabled="isLast || busy"
            :aria-label="`Move ${title} later`"
            @click="emit('move', 1)"
          >
            <span aria-hidden="true">↓</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="confirmingDelete" class="confirm" role="group" :aria-label="`Delete ${title}?`">
      <p class="mb-2">
        Delete {{ title }} and its photo? This cannot be undone. Number #{{ design.number }} will
        not be used again.
      </p>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-primary btn-sm" @click="confirmDelete">
          Yes, delete
        </button>
        <button
          type="button"
          class="btn btn-outline-primary btn-sm"
          @click="confirmingDelete = false"
        >
          Keep it
        </button>
      </div>
    </div>

    <div v-else class="card-actions">
      <button
        type="button"
        class="btn btn-outline-primary btn-sm"
        :disabled="busy"
        @click="startRename"
      >
        Rename <span class="visually-hidden">{{ title }}</span>
      </button>
      <button
        type="button"
        class="btn btn-outline-primary btn-sm"
        :disabled="busy"
        @click="fileInput.click()"
      >
        {{ design.image ? 'Replace photo' : 'Add photo' }}
        <span class="visually-hidden">for {{ title }}</span>
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="visually-hidden"
        tabindex="-1"
        aria-hidden="true"
        @change="chooseFile"
      />
      <button
        type="button"
        class="btn btn-outline-primary btn-sm"
        :disabled="busy"
        @click="emit('toggle-hidden')"
      >
        {{ design.hidden ? 'Show' : 'Hide' }} <span class="visually-hidden">{{ title }}</span>
      </button>
      <button
        type="button"
        class="btn btn-outline-primary btn-sm delete-button"
        :disabled="busy"
        @click="confirmingDelete = true"
      >
        Delete <span class="visually-hidden">{{ title }}</span>
      </button>
    </div>
  </article>
</template>

<style scoped>
.design-card {
  height: 100%;
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-radius: var(--tt-radius);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.design-card.is-hidden {
  border-style: dashed;
  background: transparent;
}

.design-card.is-hidden .card-art {
  opacity: 0.55;
}

.card-top {
  display: flex;
  gap: 0.75rem;
}

.card-art {
  position: relative;
  flex: 0 0 112px;
}

.upload-progress {
  position: absolute;
  inset: auto 6px 6px;
}

.upload-progress progress {
  width: 100%;
  accent-color: var(--tt-deep-rose);
}

.card-info {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.design-title {
  font-size: 1.05rem;
  overflow-wrap: anywhere;
}

.design-number {
  font-weight: 700;
  color: var(--tt-deep-rose);
}

.hidden-note {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--tt-muted);
}

.move-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.25rem;
}

.icon-button {
  width: 44px;
  min-height: 44px;
  padding: 0;
  font-size: 1.2rem;
}

.card-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.card-actions .btn {
  min-height: 44px;
}

.delete-button {
  --bs-btn-color: #8a1c2b;
  --bs-btn-border-color: #8a1c2b;
}

.confirm {
  background: var(--tt-pink);
  border-radius: var(--tt-radius-small);
  padding: 0.75rem;
}

.rename .form-control {
  min-height: 44px;
}

.problem {
  color: #8a1c2b;
  font-weight: 700;
  font-size: 0.9rem;
}
</style>
