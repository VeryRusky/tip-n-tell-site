<script setup>
import { onMounted } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import { formatPrice } from '@/utils/format'

// Prices come from the API (sample data for now), never typed into a page.
const catalog = useCatalogStore()
onMounted(() => catalog.load())
</script>

<template>
  <p v-if="catalog.loading" role="status">Loading prices…</p>
  <p v-else-if="catalog.error" role="alert">{{ catalog.error }}</p>
  <dl v-else class="price-list">
    <div v-for="service in catalog.services" :key="service.id" class="price-row">
      <dt>{{ service.name }}</dt>
      <dd>{{ formatPrice(service.price) }}</dd>
    </div>
    <div v-for="addOn in catalog.addOns" :key="addOn.id" class="price-row">
      <dt>
        {{ addOn.name }}
        <span class="price-note">{{ addOn.description }}</span>
      </dt>
      <dd>+{{ formatPrice(addOn.price) }}</dd>
    </div>
    <div class="price-row">
      <dt>
        Specially opened slot
        <span class="price-note">A time I open outside my usual days.</span>
      </dt>
      <dd>+{{ formatPrice(catalog.specialSlotFee) }}</dd>
    </div>
    <div class="price-row">
      <dt>
        Your own design
        <span class="price-note">Send me a picture and I'll quote it.</span>
      </dt>
      <dd>Quote in DM</dd>
    </div>
  </dl>
</template>

<style scoped>
.price-list {
  margin: 0;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px dashed var(--tt-line);
}

.price-row:last-child {
  border-bottom: 0;
}

dt {
  font-weight: 700;
}

dd {
  margin: 0;
  font-weight: 700;
  color: var(--tt-deep-rose);
  white-space: nowrap;
}

.price-note {
  display: block;
  font-weight: 400;
  font-size: 0.9rem;
  color: var(--tt-muted);
}
</style>
