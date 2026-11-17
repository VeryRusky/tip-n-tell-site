import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getServices, getAddOns, getSpecialSlotFee, getDesigns } from '@/services/api'

// Things the customer picks from: services, add-ons and designs, plus the special slot fee.
export const useCatalogStore = defineStore('catalog', () => {
  const services = ref([])
  const addOns = ref([])
  const designs = ref([])
  const specialSlotFee = ref(0)
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref(null)

  // Loads everything once. Pages can call this freely.
  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    error.value = null
    try {
      const results = await Promise.all([
        getServices(),
        getAddOns(),
        getDesigns(),
        getSpecialSlotFee(),
      ])
      services.value = results[0]
      addOns.value = results[1]
      designs.value = results[2]
      specialSlotFee.value = results[3]
      loaded.value = true
    } catch (e) {
      error.value = 'Prices and designs could not be loaded. Please refresh the page.'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  // The cheapest service, for "from $25" on the home page.
  function lowestPrice() {
    if (services.value.length === 0) return null
    return Math.min(...services.value.map((service) => service.price))
  }

  return { services, addOns, designs, specialSlotFee, loaded, loading, error, load, lowestPrice }
})
