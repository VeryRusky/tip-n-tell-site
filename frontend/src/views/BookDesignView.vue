<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore, OWN_DESIGN } from '@/stores/booking'
import { useCatalogStore } from '@/stores/catalog'
import BookingLayout from '@/components/BookingLayout.vue'
import ChoiceCard from '@/components/ChoiceCard.vue'
import DesignArt from '@/components/DesignArt.vue'
import MidSessionNote from '@/components/MidSessionNote.vue'
import RequestSummary from '@/components/RequestSummary.vue'
import RequestTicket from '@/components/RequestTicket.vue'
import HandArt from '@/components/HandArt.vue'
import IconHeart from '@/components/icons/IconHeart.vue'

const router = useRouter()
const booking = useBookingStore()
const catalog = useCatalogStore()

onMounted(() => catalog.load())

// What the preview hand wears: the chosen design, or bare nails for "My own design".
const previewName = computed(() => {
  if (booking.isOwnDesign) return 'My own design'
  if (booking.design) return `#${booking.design.id} ${booking.design.name}`
  return 'No design chosen yet'
})

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

    <!--
      Live preview (phones and tablets): the hand repaints with each design you pick.
      On laptops the same preview sits at the top of the side card instead.
      It only repeats what the chosen option says, so screen readers skip the picture.
    -->
    <div v-if="!catalog.loading && !catalog.error" class="preview-strip d-lg-none">
      <div class="preview-hand">
        <HandArt :design="booking.design" :own-hint="booking.isOwnDesign" />
      </div>
      <p class="preview-text" aria-hidden="true">
        <span class="preview-label">Preview</span>
        <span class="preview-name">{{ previewName }}</span>
      </p>
    </div>

    <fieldset v-if="!catalog.loading && !catalog.error">
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

    <template #card>
      <div class="preview-card">
        <div class="preview-card-hand">
          <HandArt :design="booking.design" :own-hint="booking.isOwnDesign" />
        </div>
        <p class="preview-text" aria-hidden="true">
          <span class="preview-label">Preview</span>
          <span class="preview-name">{{ previewName }}</span>
        </p>
      </div>
      <RequestTicket />
    </template>
    <!-- Phones: a one-line summary in the bottom bar (laptops have the ticket instead). -->
    <template #summary><RequestSummary class="d-lg-none" /></template>
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
/* ---- Live preview ---- */
/* Phones: stays just under the header while you scroll the designs, so you always see it. */
.preview-strip {
  position: sticky;
  top: calc(var(--tt-header-h) + 0.5rem);
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.35rem 1rem 0.35rem 0.5rem;
  box-shadow: 0 8px 18px -14px rgba(158, 74, 85, 0.6);
  background: var(--tt-blush);
  border: 1px solid var(--tt-line);
  border-radius: var(--tt-radius);
}

.preview-hand {
  flex: 0 0 auto;
  width: 4.5rem;
  height: 5.6rem;
}

.preview-text {
  margin: 0;
  min-width: 0;
}

.preview-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--tt-muted);
}

.preview-name {
  display: block;
  font-family: var(--tt-font-heading);
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--tt-ink);
  line-height: 1.2;
}

.preview-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 0.5rem;
}

.preview-card-hand {
  flex: 0 0 auto;
  width: 5.25rem;
  height: 6.5rem;
}

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
