<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useCatalogStore } from '@/stores/catalog'
import { formatPrice } from '@/utils/format'
import BookingLayout from '@/components/BookingLayout.vue'
import ChoiceCard from '@/components/ChoiceCard.vue'
import RequestSummary from '@/components/RequestSummary.vue'
import RequestTicket from '@/components/RequestTicket.vue'

const router = useRouter()
const booking = useBookingStore()
const catalog = useCatalogStore()

onMounted(() => catalog.load())

function goNext() {
  router.push({ name: 'book-design' })
}
</script>

<template>
  <BookingLayout :step="2" title="Choose a service" :back-to="{ name: 'book-slot' }">
    <p v-if="catalog.loading" role="status">Loading prices…</p>
    <p v-else-if="catalog.error" role="alert">{{ catalog.error }}</p>

    <!-- Service and add-on side by side from md up, stacked on phones. -->
    <div v-else class="row g-4">
      <div class="col-md-7">
        <fieldset class="panel h-100">
          <legend>Service</legend>
          <div class="options">
            <ChoiceCard
              v-for="service in catalog.services"
              :key="service.id"
              name="service"
              :value="service.id"
              :checked="booking.serviceId === service.id"
              @select="booking.chooseService"
            >
              <span class="option-row">
                <span>
                  <span class="option-name">{{ service.name }}</span>
                  <span class="option-note">{{ service.description }}</span>
                </span>
                <span class="option-price">{{ formatPrice(service.price) }}</span>
              </span>
            </ChoiceCard>
          </div>
        </fieldset>
      </div>
      <div class="col-md-5">
        <fieldset class="panel h-100">
          <legend>Add-on <span class="optional">(optional)</span></legend>
          <div class="options">
            <ChoiceCard
              v-for="addOn in catalog.addOns"
              :key="addOn.id"
              type="checkbox"
              name="add-on"
              :value="addOn.id"
              :checked="booking.addOnIds.includes(addOn.id)"
              @select="booking.toggleAddOn"
            >
              <span class="option-row">
                <span>
                  <span class="option-name">{{ addOn.name }}</span>
                  <span class="option-note">{{ addOn.description }}</span>
                </span>
                <span class="option-price">+{{ formatPrice(addOn.price) }}</span>
              </span>
            </ChoiceCard>
          </div>
        </fieldset>
      </div>
    </div>

    <template #card><RequestTicket /></template>
    <!-- Phones: a one-line summary in the bottom bar (laptops have the ticket instead). -->
    <template #summary><RequestSummary class="d-lg-none" /></template>
    <template #actions>
      <button
        type="button"
        class="btn btn-primary btn-lg"
        :disabled="!booking.serviceId"
        @click="goNext"
      >
        Next: design <span aria-hidden="true">›</span>
      </button>
    </template>
  </BookingLayout>
</template>

<style scoped>
.options {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.option-name {
  display: block;
  font-weight: 700;
  font-size: 1.1rem;
}

.option-note {
  display: block;
  font-size: 0.9rem;
  color: var(--tt-muted);
}

.option-price {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--tt-deep-rose);
  white-space: nowrap;
}

.optional {
  font-family: var(--tt-font-body);
  font-size: 0.95rem;
  font-weight: 400;
  color: var(--tt-muted);
}
</style>
