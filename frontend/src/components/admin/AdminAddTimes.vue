<script setup>
import { ref, useId } from 'vue'
import { site } from '@/config/site'
import { formatTime } from '@/utils/format'

// "Add times" for one day: her usual times as one-tap chips, plus any other time.
// Times the day already has are shown as added and cannot be tapped again.
const props = defineProps({
  existingTimes: { type: Array, default: () => [] }, // ['10:00', '14:00']
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['add'])

const id = useId()
const customTime = ref('')
const problem = ref('')

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
    <h3 :id="`${id}-title`" class="add-title">Add times</h3>
    <div class="d-flex flex-wrap gap-2 mb-3">
      <button
        v-for="time in site.usualTimes"
        :key="time"
        type="button"
        class="btn btn-outline-primary time-chip"
        :disabled="busy || existingTimes.includes(time)"
        @click="emit('add', [time])"
      >
        <template v-if="existingTimes.includes(time)">{{ formatTime(time) }} added</template>
        <template v-else>+ {{ formatTime(time) }}</template>
      </button>
    </div>

    <label :for="`${id}-custom`" class="form-label mb-1">Another time</label>
    <div class="d-flex gap-2">
      <input
        :id="`${id}-custom`"
        v-model="customTime"
        type="time"
        step="900"
        class="form-control custom-time"
        :aria-describedby="problem ? `${id}-problem` : undefined"
      />
      <button type="button" class="btn btn-primary" :disabled="busy" @click="addCustom">Add</button>
    </div>
    <p v-if="problem" :id="`${id}-problem`" class="problem mt-1 mb-0">{{ problem }}</p>
  </section>
</template>

<style scoped>
.add-times {
  border: 1.5px dashed var(--tt-line);
  border-radius: var(--tt-radius);
  padding: 0.85rem;
}

.add-title {
  font-size: 1.05rem;
  margin-bottom: 0.6rem;
}

.time-chip {
  min-width: 6rem;
}

.custom-time {
  min-height: 48px;
  max-width: 11rem;
  border-color: var(--tt-line);
}

.problem {
  color: #8a1c2b;
  font-weight: 700;
  font-size: 0.95rem;
}
</style>
