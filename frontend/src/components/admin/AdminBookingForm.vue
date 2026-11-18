<script setup>
import { ref, computed, useId } from 'vue'
import { parseRequestMessage } from '@/utils/message'
import { formatShortDate, formatTime } from '@/utils/format'
import DesignArt from '@/components/DesignArt.vue'

// "Details" for one booked or on-hold slot (shown in a sheet): who is coming and what for.
// Every field is optional. She can paste the customer's request message to fill in the
// service, design, add-ons and price, then change anything (the details are usually settled
// in the chat afterwards). Nothing is saved until she taps Save.
// The page does the saving; this component only says what she chose.
const props = defineProps({
  timeSlot: { type: Object, required: true }, // { id, date, time, status, special, booking? }
  // { services: [{ id, name, price }], addOns: [...], designs: [{ number, name, ... }], specialFee }
  catalog: { type: Object, required: true },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['save', 'clear'])

const id = useId()
const start = props.timeSlot.booking ?? {}

const pasted = ref('')
const pasteResult = ref(null) // { ok: true, text } or { ok: false, text }
const customer = ref(start.customer ?? '')
const serviceId = ref(start.service ?? '')
const design = ref(start.design ?? '') // a design number, 'own', or '' (not chosen)
const addOnIds = ref([...(start.addOns ?? [])])
// The price follows the choices until she types her own.
const priceTyped = ref(typeof start.price === 'number')
const typedPrice = ref(typeof start.price === 'number' ? String(start.price) : '')
const note = ref(start.note ?? '')
const problem = ref('')

const services = computed(() => props.catalog.services ?? [])
const addOns = computed(() => props.catalog.addOns ?? [])
const designs = computed(() => props.catalog.designs ?? [])
const designMissing = computed(
  () => typeof design.value === 'number' && !designs.value.some((d) => d.number === design.value),
)

// Service + add-ons + the special-slot fee, like the price customers see on the site.
const suggestedPrice = computed(() => {
  const service = services.value.find((s) => s.id === serviceId.value)
  if (!service) return null
  let total = service.price
  for (const addOn of addOns.value) if (addOnIds.value.includes(addOn.id)) total += addOn.price
  if (props.timeSlot.special) total += props.catalog.specialFee ?? 0
  return total
})

const priceText = computed({
  get: () =>
    priceTyped.value
      ? typedPrice.value
      : suggestedPrice.value === null
        ? ''
        : String(suggestedPrice.value),
  set: (value) => {
    priceTyped.value = true
    typedPrice.value = value
  },
})

function useSuggestedPrice() {
  priceTyped.value = false
  typedPrice.value = ''
}

// ---- Paste her message ----

function readPasted() {
  const text = pasted.value.trim()
  if (!text) {
    pasteResult.value = null
    return
  }
  const found = parseRequestMessage(text, { services: services.value, addOns: addOns.value })
  if (!found) {
    pasteResult.value = { ok: false, text: "Couldn't read that message; fill in the fields below." }
    return
  }
  if (found.serviceId) serviceId.value = found.serviceId
  if (found.design !== null) design.value = found.design
  addOnIds.value = found.addOnIds
  // Use the message's estimate as the price only when it differs from today's prices.
  if (found.estimate !== null && found.estimate !== suggestedPrice.value) {
    priceText.value = String(found.estimate)
  } else {
    useSuggestedPrice()
  }

  let feedback = 'Filled in from her message. Change anything you agreed differently.'
  const slotDate = formatShortDate(props.timeSlot.date)
  if (found.dateText !== slotDate || found.time !== props.timeSlot.time) {
    const asked = `${found.dateText}, ${found.time ? formatTime(found.time) : '?'}`
    feedback = `Note: her message asks for ${asked}, but this slot is ${slotDate}, ${formatTime(props.timeSlot.time)}. The rest is filled in.`
  }
  pasteResult.value = { ok: true, text: feedback }
}

// ---- Save ----

function save() {
  problem.value = ''
  const booking = {}
  const name = customer.value.trim()
  if (name) booking.customer = name
  if (serviceId.value) booking.service = serviceId.value
  if (design.value !== '') booking.design = design.value
  if (addOnIds.value.length > 0) booking.addOns = [...addOnIds.value]
  const priceValue = String(priceText.value ?? '').trim()
  if (priceValue !== '') {
    const price = Number(priceValue)
    if (!Number.isFinite(price) || price < 0 || price > 1000) {
      problem.value = 'The price must be a number from 0 to 1000.'
      return
    }
    booking.price = price
  }
  const noteText = note.value.trim()
  if (noteText) booking.note = noteText
  emit('save', Object.keys(booking).length > 0 ? booking : null)
}

const hasDetails = computed(() => Boolean(props.timeSlot.booking))
</script>

<template>
  <form class="booking-form" @submit.prevent="save">
    <!-- Paste her message -->
    <label :for="`${id}-paste`" class="field-label">Paste her message</label>
    <textarea
      :id="`${id}-paste`"
      v-model="pasted"
      class="form-control paste-box"
      rows="2"
      placeholder="Hi! I'd like to book…"
      :aria-describedby="`${id}-paste-help ${id}-paste-result`"
      @input="readPasted"
    ></textarea>
    <p :id="`${id}-paste-help`" class="small-print mt-1 mb-0">
      Copy her request from Instagram and paste it here to fill in the choices. It never fills in a
      name.
    </p>
    <p
      :id="`${id}-paste-result`"
      class="paste-result"
      :class="{ 'is-problem': pasteResult && !pasteResult.ok }"
      aria-live="polite"
    >
      {{ pasteResult?.text ?? '' }}
    </p>

    <!-- Customer -->
    <label :for="`${id}-customer`" class="field-label">Name or Instagram name</label>
    <input
      :id="`${id}-customer`"
      v-model="customer"
      class="form-control"
      maxlength="40"
      autocomplete="off"
      autocapitalize="words"
      enterkeyhint="next"
    />

    <!-- Service -->
    <fieldset class="field-group">
      <legend class="field-label">Service</legend>
      <div class="chips">
        <template v-for="option in [{ id: '', name: 'Not set' }, ...services]" :key="option.id">
          <input
            :id="`${id}-service-${option.id || 'none'}`"
            v-model="serviceId"
            type="radio"
            class="btn-check"
            :name="`${id}-service`"
            :value="option.id"
          />
          <label
            class="btn btn-outline-primary btn-sm chip"
            :for="`${id}-service-${option.id || 'none'}`"
          >
            {{ option.name }}
          </label>
        </template>
      </div>
    </fieldset>

    <!-- Design -->
    <fieldset class="field-group">
      <legend class="field-label">Design</legend>
      <div class="chips mb-2">
        <template
          v-for="option in [
            { value: '', name: 'Not set' },
            { value: 'own', name: 'Own design' },
          ]"
          :key="option.value"
        >
          <input
            :id="`${id}-design-${option.value || 'none'}`"
            v-model="design"
            type="radio"
            class="btn-check"
            :name="`${id}-design`"
            :value="option.value"
          />
          <label
            class="btn btn-outline-primary btn-sm chip"
            :for="`${id}-design-${option.value || 'none'}`"
          >
            {{ option.name }}
          </label>
        </template>
      </div>
      <div class="design-grid">
        <template v-for="d in designs" :key="d.number">
          <input
            :id="`${id}-design-${d.number}`"
            v-model="design"
            type="radio"
            class="btn-check"
            :name="`${id}-design`"
            :value="d.number"
          />
          <label class="design-tile" :for="`${id}-design-${d.number}`">
            <span class="design-thumb" aria-hidden="true">
              <DesignArt :design="{ ...d, id: d.number }" />
            </span>
            <span class="design-name"
              ><strong>#{{ d.number }}</strong> {{ d.name }}</span
            >
          </label>
        </template>
      </div>
      <p v-if="designMissing" class="small-print mt-1 mb-0">
        #{{ design }} is no longer in your designs.
      </p>
    </fieldset>

    <!-- Add-ons -->
    <fieldset v-if="addOns.length" class="field-group">
      <legend class="field-label">Add-ons</legend>
      <div class="chips">
        <template v-for="addOn in addOns" :key="addOn.id">
          <input
            :id="`${id}-addon-${addOn.id}`"
            v-model="addOnIds"
            type="checkbox"
            class="btn-check"
            :value="addOn.id"
          />
          <label class="btn btn-outline-primary btn-sm chip" :for="`${id}-addon-${addOn.id}`">
            {{ addOn.name }}
          </label>
        </template>
      </div>
    </fieldset>

    <!-- Price -->
    <label :for="`${id}-price`" class="field-label">Price ($)</label>
    <div class="price-row">
      <input
        :id="`${id}-price`"
        v-model="priceText"
        class="form-control price-input"
        type="number"
        inputmode="decimal"
        min="0"
        max="1000"
        step="any"
        :aria-describedby="`${id}-price-help`"
      />
      <button
        v-if="priceTyped && suggestedPrice !== null && Number(typedPrice) !== suggestedPrice"
        type="button"
        class="btn btn-link btn-sm"
        @click="useSuggestedPrice"
      >
        Use ${{ suggestedPrice }}
      </button>
    </div>
    <p :id="`${id}-price-help`" class="small-print mt-1 mb-0">
      <template v-if="design === 'own'">Add your quote for her own design.</template>
      <template v-else
        >Worked out from the choices. Change it if you agreed another price.</template
      >
    </p>

    <!-- Note -->
    <label :for="`${id}-note`" class="field-label">Note</label>
    <textarea
      :id="`${id}-note`"
      v-model="note"
      class="form-control"
      rows="2"
      maxlength="200"
      :aria-describedby="`${id}-note-help`"
    ></textarea>
    <p :id="`${id}-note-help`" class="small-print mt-1 mb-0">
      Design details only. Keep allergy or health information in your DMs.
    </p>

    <p v-if="problem" class="field-problem mt-2 mb-0" role="alert">{{ problem }}</p>

    <div class="save-row">
      <button type="submit" class="btn btn-primary w-100" :disabled="busy" :aria-busy="busy">
        {{ busy ? 'Saving…' : 'Save details' }}
      </button>
    </div>

    <div v-if="hasDetails" class="clear-zone">
      <button
        type="button"
        class="btn btn-outline-danger w-100"
        :disabled="busy"
        @click="emit('clear')"
      >
        Clear details
      </button>
    </div>
  </form>
</template>

<style scoped>
.field-label {
  display: block;
  margin: 1rem 0 0.35rem;
  padding: 0;
  font-family: var(--tt-font-body);
  font-size: 1rem;
  font-weight: 800;
  color: var(--tt-ink);
}

.booking-form > .field-label:first-child {
  margin-top: 0;
}

.field-group {
  margin: 0;
}

.paste-box {
  font-size: 0.9rem;
}

.paste-result {
  min-height: 1.2em;
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--tt-deep-rose);
}

.paste-result.is-problem {
  color: var(--tt-danger);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.btn-check:checked + .chip {
  background: var(--tt-deep-rose);
  border-color: var(--tt-deep-rose);
  color: #fff;
}

.btn-check:focus-visible + .chip,
.btn-check:focus-visible + .design-tile {
  outline: 3px solid var(--tt-ink);
  outline-offset: 2px;
}

/* Her designs as small tiles: picture, number and name. */
.design-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.4rem;
}

.design-tile {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.25rem;
  border: 2px solid var(--tt-line);
  border-radius: var(--tt-radius-small);
  background: var(--tt-white);
  cursor: pointer;
}

.btn-check:checked + .design-tile {
  border-color: var(--tt-deep-rose);
  background: var(--tt-pink);
  box-shadow: 0 0 0 2px var(--tt-deep-rose);
}

.design-thumb :deep(.design-art) {
  border-radius: 6px;
}

.design-thumb :deep(.placeholder-label) {
  display: none;
}

.design-name {
  font-size: 0.72rem;
  line-height: 1.2;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow-wrap: anywhere;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.price-input {
  max-width: 9rem;
}

/* Save stays in reach at the bottom of the sheet while she scrolls. */
.save-row {
  position: sticky;
  bottom: -1rem;
  z-index: 1;
  margin: 1.25rem -1rem 0;
  padding: 0.75rem 1rem;
  background: var(--tt-cream);
  border-top: 1px solid var(--tt-line);
}

/* Set apart, below Save. */
.clear-zone {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--tt-line);
}
</style>
