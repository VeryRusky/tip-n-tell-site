<script setup>
import { useId } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { useCatalogStore } from '@/stores/catalog'
import { formatLongDate, formatTime, formatPrice } from '@/utils/format'
import BrandWordmark from './BrandWordmark.vue'
import IconBow from './icons/IconBow.vue'

// The request, shown as an appointment ticket: wordmark at the top, the date and time
// large, then rows for service, design and add-on, and the estimate.
// It fills in as choices are made. Used as the laptop side card on every step, and as
// the summary on the Send step on phones.
defineProps({
  editable: { type: Boolean, default: false }, // show "Change" links (Send step)
  arriving: { type: Boolean, default: false }, // slide in with a slight settle (Send step)
})

const booking = useBookingStore()
const catalog = useCatalogStore()
// A unique id for the heading (a page can hold two tickets: one for phones, one for laptops).
const titleId = useId()
</script>

<template>
  <section class="ticket" :class="{ 'is-arriving': arriving }" :aria-labelledby="titleId">
    <div class="ticket-top">
      <div class="ticket-brand">
        <BrandWordmark size="small" />
        <IconBow class="ticket-bow" />
      </div>
      <h2 :id="titleId" class="ticket-title">Your request</h2>

      <div class="ticket-when">
        <Transition name="fill-in" mode="out-in">
          <p v-if="booking.slot" :key="booking.slot.id" class="when-text">
            <span class="when-date">{{ formatLongDate(booking.slot.date) }}</span>
            <span class="when-time">{{ formatTime(booking.slot.time) }}</span>
            <span v-if="booking.slot.special" class="when-note small-print">
              Specially opened slot (+{{ formatPrice(catalog.specialSlotFee) }})
            </span>
          </p>
          <p v-else class="when-text empty">Choose a day, then a time</p>
        </Transition>
        <RouterLink v-if="editable" :to="{ name: 'book-slot' }" class="change-link">
          Change<span class="visually-hidden"> time</span>
        </RouterLink>
      </div>
    </div>

    <!-- The perforated tear line, with a notch cut into each side. -->
    <div class="ticket-perforation" aria-hidden="true"></div>

    <dl class="ticket-rows">
      <div class="ticket-row">
        <dt>Service</dt>
        <dd>
          <Transition name="fill-in" mode="out-in">
            <span :key="booking.service?.id ?? 'none'" :class="{ empty: !booking.service }">
              {{ booking.service ? booking.service.name : '—' }}
            </span>
          </Transition>
        </dd>
        <RouterLink v-if="editable" :to="{ name: 'book-service' }" class="change-link">
          Change<span class="visually-hidden"> service</span>
        </RouterLink>
      </div>

      <div class="ticket-row">
        <dt>Design</dt>
        <dd>
          <Transition name="fill-in" mode="out-in">
            <span v-if="booking.isOwnDesign" key="own">
              My own design
              <span class="d-block small-print">I'll send a picture in the DM</span>
            </span>
            <span v-else-if="booking.design" :key="booking.design.id">
              #{{ booking.design.id }} {{ booking.design.name }}
            </span>
            <span v-else key="none" class="empty">—</span>
          </Transition>
        </dd>
        <RouterLink v-if="editable" :to="{ name: 'book-design' }" class="change-link">
          Change<span class="visually-hidden"> design</span>
        </RouterLink>
      </div>

      <div class="ticket-row">
        <dt>Add-on</dt>
        <dd>
          <Transition name="fill-in" mode="out-in">
            <span
              :key="booking.addOnIds.join() || 'none'"
              :class="{ empty: !booking.addOns.length }"
            >
              <template v-if="booking.addOns.length">
                <span v-for="addOn in booking.addOns" :key="addOn.id" class="d-block">
                  {{ addOn.name }}
                </span>
              </template>
              <template v-else>None</template>
            </span>
          </Transition>
        </dd>
        <RouterLink v-if="editable" :to="{ name: 'book-service' }" class="change-link">
          Change<span class="visually-hidden"> add-on</span>
        </RouterLink>
      </div>

      <div class="ticket-row total-row">
        <dt>Estimate</dt>
        <dd aria-live="polite">
          <template v-if="booking.service">
            {{ booking.estimateText }}
            <span v-if="booking.isOwnDesign" class="d-block small-print">
              I'll quote the design price in DM.
            </span>
          </template>
          <span v-else class="empty">—</span>
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.ticket {
  /* The colour behind the ticket, used to "cut" the notches. Set by the page around it. */
  --cutout: var(--ticket-cutout, var(--tt-blush));
  position: relative;
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-radius: 1.1rem;
  box-shadow: 0 10px 24px -18px rgba(158, 74, 85, 0.55);
}

.ticket-top {
  padding: 0.9rem 1.1rem 0.85rem;
}

.ticket-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ticket-brand :deep(.wordmark-small) {
  font-size: 1.15rem;
}

.ticket-bow {
  color: var(--tt-rose);
  font-size: 1rem;
}

.ticket-title {
  margin: 0.4rem 0 0.15rem;
  font-family: var(--tt-font-body);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--tt-muted);
}

.ticket-when {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.when-text {
  margin: 0;
  font-family: var(--tt-font-heading);
  color: var(--tt-ink);
  line-height: 1.15;
}

.when-date {
  display: block;
  font-size: 1.3rem;
  font-weight: 600;
}

.when-time {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: var(--tt-deep-rose);
}

.when-note {
  display: block;
  font-family: var(--tt-font-body);
  margin-top: 0.2rem;
}

.when-text.empty {
  font-family: var(--tt-font-body);
  font-size: 1rem;
  color: var(--tt-muted);
  padding: 0.3rem 0;
}

/* Dashed tear line, with half circles in the background colour making the side notches. */
.ticket-perforation {
  position: relative;
  height: 0;
  margin: 0 0.9rem;
  border-top: 2px dashed var(--tt-line);
}

.ticket-perforation::before,
.ticket-perforation::after {
  content: '';
  position: absolute;
  top: -0.7rem;
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 50%;
  background: var(--cutout);
  border: 1px solid var(--tt-line);
}

.ticket-perforation::before {
  left: calc(-0.9rem - 0.65rem - 1px);
  clip-path: inset(0 0 0 50%);
}

.ticket-perforation::after {
  right: calc(-0.9rem - 0.65rem - 1px);
  clip-path: inset(0 50% 0 0);
}

.ticket-rows {
  margin: 0;
  padding: 0.35rem 1.1rem 0.75rem;
}

.ticket-row {
  display: grid;
  grid-template-columns: 4.6rem 1fr auto;
  gap: 0.5rem;
  align-items: baseline;
  padding: 0.45rem 0;
  border-bottom: 1px dashed var(--tt-line);
}

.ticket-row dt {
  font-weight: 700;
  color: var(--tt-muted);
  font-size: 0.9rem;
}

.ticket-row dd {
  margin: 0;
}

.empty {
  color: var(--tt-muted);
}

.total-row {
  border-bottom: 0;
}

.total-row dd {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--tt-deep-rose);
}

.change-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin: -0.6rem 0;
  padding: 0 0.25rem;
  font-weight: 700;
  font-size: 0.95rem;
}

/* Laptops: the ticket sits in the narrow side card, so it is a little more compact. */
@media (min-width: 992px) {
  .ticket-top {
    padding: 0.75rem 0.95rem 0.7rem;
  }

  .when-date {
    font-size: 1.12rem;
  }

  .when-time {
    font-size: 1.7rem;
  }

  .ticket-perforation {
    margin: 0 0.75rem;
  }

  .ticket-perforation::before {
    left: calc(-0.75rem - 0.65rem - 1px);
  }

  .ticket-perforation::after {
    right: calc(-0.75rem - 0.65rem - 1px);
  }

  .ticket-rows {
    padding: 0.2rem 0.95rem 0.5rem;
  }

  .ticket-row {
    grid-template-columns: 3.9rem 1fr auto;
    padding: 0.35rem 0;
    font-size: 0.95rem;
  }

  .ticket-row dt {
    font-size: 0.85rem;
  }

  .total-row dd {
    font-size: 1.1rem;
  }

  .ticket-row .small-print,
  .when-note {
    font-size: 0.85rem;
  }
}

/* A choice that has just been made settles into its row. */
.fill-in-enter-active {
  transition:
    opacity 0.25s ease-out,
    transform 0.3s var(--tt-ease-out);
}

.fill-in-enter-from {
  opacity: 0;
  transform: translateY(0.35rem);
}

/* Send step: the ticket slides in and settles, like being handed over. */
.is-arriving {
  animation: ticket-arrive 0.6s var(--tt-ease-out) 0.12s both;
}

@keyframes ticket-arrive {
  0% {
    opacity: 0;
    transform: translateY(1.5rem) rotate(-1.5deg);
  }
  70% {
    opacity: 1;
    transform: translateY(-0.15rem) rotate(0.3deg);
  }
  100% {
    transform: none;
  }
}
</style>
