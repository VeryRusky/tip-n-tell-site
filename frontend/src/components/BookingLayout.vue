<script setup>
import BookingSteps from './BookingSteps.vue'

// Page layout shared by the four booking steps, built on Bootstrap's grid:
//
//   phone / tablet (< lg)              laptop / desktop (lg and up)
//   ┌──────────────────────┐           ┌──────────────────┬─────────┐
//   │ steps, title,        │           │ steps, title,    │ request │
//   │ step content         │           │ step content     │ card    │
//   ├──────────────────────┤           │                  │ (stays  │
//   │ bar stuck to bottom  │           │                  │ in view)│
//   └──────────────────────┘           └──────────────────┴─────────┘
//
// The same <aside> is the bottom bar on small screens and the side card on large ones.
// Slots:  default = the step's content,  #summary = running summary,
//         #actions = main button(s) next to Back,  #below = an extra full-width row,
//         #card = laptop-only content at the top of the side card (appointment ticket, preview).
//
// Only `.booking-content` (title and step content) slides when moving between steps
// (see the step transitions in main.css). The step indicator and the bar/card stay still.
defineProps({
  step: { type: Number, required: true },
  title: { type: String, required: true },
  backTo: { type: [Object, String], default: null },
  backLabel: { type: String, default: 'Back' },
  asideTitle: { type: String, default: 'Your request' },
})
</script>

<template>
  <main id="main" class="container-lg booking-page">
    <div class="row gx-0 gx-lg-5">
      <div class="col-lg-8">
        <BookingSteps :current="step" />
        <div class="booking-content">
          <h1>{{ title }}</h1>
          <slot />
        </div>
      </div>

      <aside class="col-lg-4 booking-aside" :aria-label="asideTitle">
        <div class="booking-actions">
          <!-- Laptops only: the appointment ticket (and the design preview) head the card. -->
          <div v-if="$slots.card" class="aside-card d-none d-lg-flex">
            <slot name="card" />
          </div>
          <slot name="summary" />
          <!--
            Back comes after the main button in the HTML, so keyboard users reach the
            main action first. On phones CSS shows Back on the left; in the card it is last.
          -->
          <div class="actions-row">
            <slot name="actions" />
            <RouterLink
              v-if="backTo"
              :to="backTo"
              class="btn btn-outline-primary btn-lg back-button"
            >
              <span aria-hidden="true">‹</span> {{ backLabel }}
            </RouterLink>
          </div>
          <slot name="below" />
        </div>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.booking-page {
  padding-top: 1rem;
  /* A step sliding in never makes the page scroll sideways (clip keeps sticky working). */
  overflow-x: clip;
}

.actions-row {
  display: flex;
  gap: 0.5rem;
}

/* The main button takes the rest of the row. */
.actions-row :deep(.btn:not(.back-button)) {
  flex: 1;
}

.back-button {
  order: -1; /* left of the main button in the phone bar */
  flex: 0 0 auto;
  padding-left: 1rem;
  padding-right: 1.1rem;
}

.booking-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.aside-card {
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

/*
  Phones and tablets: the aside sticks to the bottom of the screen.
  (Bootstrap's grid can place columns, but not make one stick, so this part is custom CSS.)
*/
@media (max-width: 991.98px) {
  .booking-aside {
    position: sticky;
    bottom: 0;
    z-index: 5;
    margin-top: 1.5rem;
    /* Stretch the bar to the screen edges, past the page padding. */
    margin-left: -1rem;
    width: calc(100% + 2rem);
    max-width: none;
    background: var(--tt-cream);
    border-top: 1px solid var(--tt-line);
    box-shadow: 0 -6px 16px rgba(158, 74, 85, 0.08);
    /* Leave room for the iPhone home bar. */
    padding-bottom: env(safe-area-inset-bottom);
  }

  .booking-actions {
    max-width: 600px;
    margin: 0 auto;
    padding: 0.6rem 1rem 0.75rem;
  }
}

/* Laptops and desktops: a card beside the content that stays in view while scrolling. */
@media (min-width: 992px) {
  .booking-actions {
    position: sticky;
    top: 5.5rem; /* just below the sticky header */
    margin-top: 1rem;
    padding: 1.25rem;
    background: var(--tt-blush);
    border: 1px solid var(--tt-line);
    border-radius: var(--tt-radius);
  }

  /* In the card every button gets its own full-width row, with Back always last. */
  .actions-row {
    display: contents;
  }

  .booking-actions :deep(.btn) {
    flex: none;
    width: 100%;
  }

  .back-button {
    order: 2; /* last; order 1 is free for a line that should sit under the main button */
  }
}

/*
  Short laptop screens: the card (ticket, preview and buttons) could be taller than the
  screen, which would hide its buttons while it is stuck. There it scrolls with the page.
*/
@media (min-width: 992px) and (max-height: 760px) {
  .booking-actions {
    position: static;
  }
}
</style>
