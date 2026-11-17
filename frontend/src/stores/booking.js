import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { useCatalogStore } from '@/stores/catalog'
import { site } from '@/config/site'
import { formatShortDate, formatTime, formatPrice } from '@/utils/format'

// The value of designId when the customer brings their own design.
export const OWN_DESIGN = 'own'

// Reads a saved, unfinished request from this browser (or null).
function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(site.storageKey))
    return saved && typeof saved === 'object' ? saved : null
  } catch {
    return null
  }
}

// The request the customer is building. Nothing here is personal data:
// only the slot, service, design and add-on choices are kept.
export const useBookingStore = defineStore('booking', () => {
  const catalog = useCatalogStore()
  const saved = loadSaved()

  const slot = ref(saved?.slot ?? null) // { id, date, time, special }
  const serviceId = ref(saved?.serviceId ?? null)
  const designId = ref(saved?.designId ?? null) // a design id, or OWN_DESIGN
  const addOnIds = ref(Array.isArray(saved?.addOnIds) ? saved.addOnIds : [])

  // Keep the choices across a page refresh.
  watch(
    [slot, serviceId, designId, addOnIds],
    () => {
      const choices = {
        slot: slot.value,
        serviceId: serviceId.value,
        designId: designId.value,
        addOnIds: addOnIds.value,
      }
      try {
        localStorage.setItem(site.storageKey, JSON.stringify(choices))
      } catch {
        // Storage can be blocked (e.g. private browsing). The flow still works without it.
      }
    },
    { deep: true },
  )

  // ---- Looking up the chosen items ----
  const service = computed(() => catalog.services.find((s) => s.id === serviceId.value) ?? null)
  const isOwnDesign = computed(() => designId.value === OWN_DESIGN)
  const design = computed(() => catalog.designs.find((d) => d.id === designId.value) ?? null)
  const addOns = computed(() => catalog.addOns.filter((a) => addOnIds.value.includes(a.id)))
  const isMidSession = computed(() => slot.value?.time === site.midSessionTime)

  // Highest step the customer may open: 1 time, 2 service, 3 design, 4 send.
  const furthestStep = computed(() => {
    if (!slot.value) return 1
    if (!serviceId.value) return 2
    if (!designId.value) return 3
    return 4
  })

  // ---- Price ----
  const estimate = computed(() => {
    let total = service.value ? service.value.price : 0
    for (const addOn of addOns.value) total += addOn.price
    if (slot.value?.special) total += catalog.specialSlotFee
    return total
  })

  // e.g. '$45', or '$35 + design quote' for own designs.
  const estimateText = computed(() => {
    const text = formatPrice(estimate.value)
    return isOwnDesign.value ? `${text} + design quote` : text
  })

  // ---- The message she receives on Instagram ----
  const message = computed(() => {
    if (!slot.value) return ''
    const special = slot.value.special ? ' (specially opened slot)' : ''
    const lines = [
      `Hi! I'd like to book ${formatShortDate(slot.value.date)}, ${formatTime(slot.value.time)}${special}.`,
    ]
    if (service.value) lines.push(`Service: ${service.value.name.toLowerCase()}.`)
    if (isOwnDesign.value) lines.push(`Design: my own design (I'll send a picture).`)
    else if (design.value) lines.push(`Design: #${design.value.id} ${design.value.name}.`)
    if (addOns.value.length > 0) {
      lines.push(`Add-on: ${addOns.value.map((a) => a.name.toLowerCase()).join(', ')}.`)
    }
    if (service.value) {
      lines.push(
        isOwnDesign.value
          ? `Estimated ${formatPrice(estimate.value)} plus your quote for the design.`
          : `Estimated ${formatPrice(estimate.value)}.`,
      )
    }
    return lines.join(' ')
  })

  // ---- Actions ----
  function chooseSlot(newSlot) {
    slot.value = {
      id: newSlot.id,
      date: newSlot.date,
      time: newSlot.time,
      special: newSlot.special,
    }
  }

  function clearSlot() {
    slot.value = null
  }

  function chooseService(id) {
    serviceId.value = id
  }

  function chooseDesign(id) {
    designId.value = id
  }

  function toggleAddOn(id) {
    if (addOnIds.value.includes(id)) {
      addOnIds.value = addOnIds.value.filter((existing) => existing !== id)
    } else {
      addOnIds.value = [...addOnIds.value, id]
    }
  }

  function reset() {
    slot.value = null
    serviceId.value = null
    designId.value = null
    addOnIds.value = []
  }

  return {
    slot,
    serviceId,
    designId,
    addOnIds,
    service,
    isOwnDesign,
    design,
    addOns,
    isMidSession,
    furthestStep,
    estimate,
    estimateText,
    message,
    chooseSlot,
    clearSlot,
    chooseService,
    chooseDesign,
    toggleAddOn,
    reset,
  }
})
