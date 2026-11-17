<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore, OWN_DESIGN } from '@/stores/booking'
import { useCatalogStore } from '@/stores/catalog'
import BookingLayout from '@/components/BookingLayout.vue'
import ChoiceCard from '@/components/ChoiceCard.vue'
import DesignArt from '@/components/DesignArt.vue'
import MidSessionNote from '@/components/MidSessionNote.vue'
import RequestSummary from '@/components/RequestSummary.vue'
import IconHeart from '@/components/icons/IconHeart.vue'

const router = useRouter()
const booking = useBookingStore()
const catalog = useCatalogStore()

onMounted(() => catalog.load())

function goNext() {
  router.push({ name: 'book-send' })
}
</script>

<template>
  <BookingLayout :step="3" title="Choose a design" :back-to="{ name: 'book-service' }">
    <p class="muted">Pick a design reference, or bring your own.</p>

    <MidSessionNote v-if="booking.isMidSession" class="mb-3" />

    <p v-if="catalog.loading" role="status">Loading designs…</p>
    <p v-else-if="catalog.error" role="alert">{{ catalog.error }}</p>

    <fieldset v-else>
      <legend class="visually-hidden">Design</legend>

      <!-- "My own design" comes first so it is not missed below the gallery. -->
      <ChoiceCard
        class="own-design mb-3"
        name="design"
        :value="OWN_DESIGN"
        :checked="booking.isOwnDesign"
        @select="booking.chooseDesign"
      >
        <span class="own-row">
          <span class="own-art" aria-hidden="true"><IconHeart /></span>
          <span>
            <strong class="d-block">My own design</strong>
            <span class="own-note"> Send me a picture in the DM. Design price quoted in DM. </span>
          </span>
        </span>
      </ChoiceCard>

      <!-- 2 designs per row on phones, 3 from md, 4 from xl. -->
      <div class="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-3">
        <div v-for="design in catalog.designs" :key="design.id" class="col">
          <ChoiceCard
            class="choice-tile h-100"
            name="design"
            :value="design.id"
            :checked="booking.designId === design.id"
            @select="booking.chooseDesign"
          >
            <DesignArt :design="design" />
            <span class="design-name"
              ><strong>#{{ design.id }}</strong> {{ design.name }}</span
            >
          </ChoiceCard>
        </div>
      </div>
    </fieldset>

    <template #summary><RequestSummary /></template>
    <template #actions>
      <button
        type="button"
        class="btn btn-primary btn-lg"
        :disabled="!booking.designId"
        @click="goNext"
      >
        Next: review <span aria-hidden="true">›</span>
      </button>
    </template>
  </BookingLayout>
</template>

<style scoped>
.design-name {
  display: block;
  font-size: 0.95rem;
  line-height: 1.3;
  padding: 0 0.15rem 0.15rem;
}

.design-name strong {
  color: var(--tt-deep-rose);
}

.own-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.own-art {
  flex: 0 0 auto;
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--tt-radius-small);
  border: 1.5px dashed var(--tt-deep-rose);
  background: var(--tt-blush);
  color: var(--tt-rose);
  font-size: 1.6rem;
}

.own-note {
  display: block;
  color: var(--tt-muted);
  font-size: 0.9rem;
}
</style>
