<script setup>
import { ref, computed, onMounted, useId } from 'vue'
import { site } from '@/config/site'
import { formatTime } from '@/utils/format'

// "Add another time" for one day: any of her usual times the day does not have yet
// (one tap each), or any other time. Only times that can still be added are shown.
const props = defineProps({
  existingTimes: { type: Array, default: () => [] }, // ['10:00', '14:00']
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['add', 'cancel'])

const id = useId()
const customTime = ref('')
const problem = ref('')
const timeInput = ref(null)

// Opening this box puts the cursor in the time field.
onMounted(() => timeInput.value?.focus())

const missingUsual = computed(() =>
  site.usualTimes.filter((time) => !props.existingTimes.includes(time)),
)

function addCustom() {
  problem.value = ''
  if (!/^\d{2}:\d{2}$/.test(customTime.value)) {
    problem.value = 'Choose a time first.'
    return
  }
  if (props.existingTimes.includes(customTime.value)) {
    problem.value = `${formatTime(customTime.value)} is already on this day.`
    return
  }
  emit('add', [customTime.value])
  customTime.value = ''
}
</script>

<template>
  <section class="add-times" :aria-labelledby="`${id}-title`">
    <h3 :id="`${id}-title`" class="add-title">Add another time</h3>
    <div v-if="missingUsual.length" class="d-flex flex-wrap gap-2 mb-3">
      <button
        v-for="time in missingUsual"
        :key="time"
        type="button"
        class="btn btn-outline-primary btn-sm time-chip"
        :disabled="busy"
        @click="emit('add', [time])"
      >
        + {{ formatTime(time) }}
      </button>
    </div>

    <form class="custom-row" @submit.prevent="addCustom">
      <label :for="`${id}-custom`" class="other-label">Other time</label>
      <input
        :id="`${id}-custom`"
        v-model="customTime"
        type="time"
        step="900"
        class="form-control custom-time"
        ref="timeInput"
        :aria-describedby="problem ? `${id}-problem` : undefined"
      />
      <button type="submit" class="btn btn-primary btn-sm" :disabled="busy">Add</button>
      <button type="button" class="btn btn-outline-primary btn-sm" @click="emit('cancel')">
        Cancel
      </button>
    </form>
    <p v-if="problem" :id="`${id}-problem`" class="field-problem mt-1 mb-0">{{ problem }}</p>
  </section>
</template>

<style scoped>
.add-times {
  background: var(--tt-white);
  border: 1.5px dashed var(--tt-line);
  border-radius: var(--tt-radius);
  padding: 0.75rem;
}

.add-title {
  font-family: var(--tt-font-body);
  font-size: 1rem;
  font-weight: 800;
  color: var(--tt-ink);
  margin-bottom: 0.5rem;
}

.time-chip {
  min-width: 5.5rem;
}

.custom-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.other-label {
  flex: 0 0 100%;
  font-weight: 700;
  font-size: 0.9rem;
}

.custom-time {
  flex: 1 1 8rem;
  max-width: 11rem;
}
</style>
