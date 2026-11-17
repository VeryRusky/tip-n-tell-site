<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { site, instagramProfileUrl } from '@/config/site'
import { instagramLink } from '@/utils/device'
import { useBookingStore } from '@/stores/booking'
import { useCatalogStore } from '@/stores/catalog'
import { useSlotsStore } from '@/stores/slots'
import { formatLongDate, formatTime, formatPrice } from '@/utils/format'
import BookingLayout from '@/components/BookingLayout.vue'
import MidSessionNote from '@/components/MidSessionNote.vue'
import CopyToast from '@/components/CopyToast.vue'
import IconCheck from '@/components/icons/IconCheck.vue'
import IconSend from '@/components/icons/IconSend.vue'

const router = useRouter()
const booking = useBookingStore()
const catalog = useCatalogStore()
const slotsStore = useSlotsStore()

onMounted(() => catalog.load())

// Phones open her chat in the Instagram app; laptops open her profile (see utils/device.js).
const instagram = instagramLink()

const messageBox = ref(null)
const copyState = ref('') // '', 'copied' or 'failed'
const toastTrigger = ref(0) // tells the pop-up note to show again on every tap

function finishCopy(copied) {
  copyState.value = copied ? 'copied' : 'failed'
  toastTrigger.value++
}

// Runs when the "Copy and open Instagram" link is tapped. The link itself then opens
// Instagram in a new tab, so Instagram opens even if copying fails.
function copyMessage() {
  copyState.value = ''
  if (navigator.clipboard && window.isSecureContext) {
    // The modern clipboard API (needs https or localhost).
    navigator.clipboard
      .writeText(booking.message)
      .then(() => {
        finishCopy(true)
      })
      .catch(() => {
        finishCopy(copyWithOldCommand())
      })
  } else {
    finishCopy(copyWithOldCommand())
  }
}

// Fallback for older browsers: select the text in the message box and use the old copy
// command. The text stays selected, which also helps if the customer has to copy it by hand.
function copyWithOldCommand() {
  const box = messageBox.value
  box.focus()
  box.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  }
}

async function startOver() {
  // Leave this page first, because it needs a chosen slot to show.
  await router.push({ name: 'book-slot' })
  booking.reset()
  slotsStore.selectDate('')
}
</script>

<template>
  <BookingLayout
    :step="4"
    title="Send your request"
    :back-to="{ name: 'book-design' }"
    aside-title="Send it"
  >
    <!-- The most important thing to understand on this page. -->
    <div class="not-booked" role="note">
      <p class="not-booked-title">Not booked yet</p>
      <p class="mb-0">
        Your slot is only booked once I reply on Instagram to confirm. If someone else is confirmed
        first, I'll suggest another time.
      </p>
    </div>

    <!-- Summary and message side by side on large screens, stacked on smaller ones. -->
    <div class="row g-4 mt-0">
      <div class="col-xl-6">
        <section class="panel h-100" aria-labelledby="request-title">
          <h2 id="request-title">Your request</h2>
          <dl class="request-list">
            <div class="request-row">
              <dt>Time</dt>
              <dd>
                {{ formatLongDate(booking.slot.date) }}, {{ formatTime(booking.slot.time) }}
                <span v-if="booking.slot.special" class="d-block small-print">
                  Specially opened slot (+{{ formatPrice(catalog.specialSlotFee) }})
                </span>
              </dd>
              <RouterLink :to="{ name: 'book-slot' }" class="change-link">
                Change<span class="visually-hidden"> time</span>
              </RouterLink>
            </div>
            <div class="request-row">
              <dt>Service</dt>
              <dd>
                {{ booking.service?.name }}
                <template v-for="addOn in booking.addOns" :key="addOn.id">
                  <span class="d-block">+ {{ addOn.name }}</span>
                </template>
              </dd>
              <RouterLink :to="{ name: 'book-service' }" class="change-link">
                Change<span class="visually-hidden"> service</span>
              </RouterLink>
            </div>
            <div class="request-row">
              <dt>Design</dt>
              <dd v-if="booking.isOwnDesign">
                My own design <span class="d-block small-print">I'll send a picture in the DM</span>
              </dd>
              <dd v-else>#{{ booking.design?.id }} {{ booking.design?.name }}</dd>
              <RouterLink :to="{ name: 'book-design' }" class="change-link">
                Change<span class="visually-hidden"> design</span>
              </RouterLink>
            </div>
            <div class="request-row total-row">
              <dt>Estimate</dt>
              <dd>
                {{ booking.estimateText }}
                <span v-if="booking.isOwnDesign" class="d-block small-print">
                  I'll quote the design price in DM.
                </span>
              </dd>
            </div>
          </dl>
          <MidSessionNote v-if="booking.isMidSession" />
        </section>
      </div>

      <div class="col-xl-6">
        <section class="panel h-100" aria-labelledby="message-title">
          <h2 id="message-title">Your message</h2>
          <!-- The steps match where the button goes on this device. -->
          <ol v-if="instagram.opensChat" class="send-steps">
            <li>Tap <strong>Copy and open Instagram</strong>.</li>
            <li>
              My chat (@{{ site.instagramHandle }}) opens in Instagram: paste the message and send.
            </li>
          </ol>
          <ol v-else class="send-steps">
            <li>
              Click <strong>Copy and open Instagram</strong>. My profile (@{{
                site.instagramHandle
              }}) opens.
            </li>
            <li>Choose <strong>Message</strong> on my profile.</li>
            <li>Paste the message and send.</li>
          </ol>
          <label for="request-message" class="form-label fw-bold">Message to send</label>
          <textarea
            id="request-message"
            ref="messageBox"
            class="message-box"
            rows="5"
            readonly
            :value="booking.message"
          ></textarea>

          <p class="small-print mb-0">
            Tip: mention any allergies, sensitivities or preferences in the same DM.
          </p>
        </section>
      </div>
    </div>

    <p class="text-center mt-4">
      <button type="button" class="btn btn-link start-over" @click="startOver">
        Start a new request
      </button>
    </p>

    <!-- Feedback after tapping the button, next to it and read out by screen readers. -->
    <template #summary>
      <!-- Pop-up note: just above the bar on phones, top right on laptops (see styles). -->
      <div class="toast-anchor">
        <!-- Same container as the header, so on laptops the toast lines up with its right edge. -->
        <div class="container-lg d-flex justify-content-center justify-content-lg-end">
          <CopyToast
            :state="copyState"
            :trigger="toastTrigger"
            :hint="instagram.opensChat ? 'Paste it in the chat.' : 'Choose Message, then paste.'"
          />
        </div>
      </div>
      <!-- The same news as a line next to the button (the toast is what screen readers hear). -->
      <p class="copy-status">
        <template v-if="copyState === 'copied'">
          <IconCheck /> Message copied.
          {{
            instagram.opensChat
              ? 'Paste it in the chat and send.'
              : 'Choose Message on my profile, then paste and send.'
          }}
        </template>
        <template v-else-if="copyState === 'failed'">
          Instagram opened, but copying didn't work. Press and hold the message to copy it, then
          paste it.
        </template>
      </p>
    </template>
    <template #actions>
      <!--
        One button: it is a real link to Instagram (opens in a new tab), and tapping it
        also copies the message. Never add ?text= to the link: Instagram ignores it.
      -->
      <a
        :href="instagram.url"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary btn-lg send-button"
        @click="copyMessage"
      >
        <IconSend class="d-none d-sm-inline" /> Copy and open Instagram
      </a>
    </template>
    <template v-if="instagram.opensChat" #below>
      <!-- For when the chat does not open, e.g. no Instagram app. Not needed on laptops. -->
      <a :href="instagramProfileUrl" target="_blank" rel="noopener noreferrer" class="profile-link">
        Chat didn't open? View my profile
      </a>
    </template>
  </BookingLayout>
</template>

<style scoped>
.not-booked {
  padding: 0.9rem 1rem;
  background: var(--tt-white);
  border: 2px solid var(--tt-deep-rose);
  border-radius: var(--tt-radius);
}

.not-booked-title {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--tt-deep-rose);
  margin-bottom: 0.25rem;
}

.request-list {
  margin: 0;
}

.request-row {
  display: grid;
  grid-template-columns: 5.5rem 1fr auto;
  gap: 0.5rem;
  align-items: baseline;
  padding: 0.6rem 0;
  border-bottom: 1px dashed var(--tt-line);
}

.request-row dt {
  font-weight: 700;
  color: var(--tt-muted);
  font-size: 0.95rem;
}

.request-row dd {
  margin: 0;
}

.change-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 0.25rem;
  font-weight: 700;
  font-size: 0.95rem;
}

.total-row {
  border-bottom: 0;
}

.total-row dd {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--tt-deep-rose);
}

.send-steps {
  padding-left: 1.25rem;
  margin-bottom: 0.75rem;
}

.message-box {
  margin-bottom: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  border: 1.5px solid var(--tt-line);
  border-radius: var(--tt-radius-small);
  background: var(--tt-white);
  color: var(--tt-ink);
  font-size: 1rem;
  resize: none;
}

.copy-status {
  margin: 0;
  font-weight: 700;
  color: var(--tt-deep-rose);
}

/*
  Laptops: show the "Message copied" line under the main button instead of above it,
  so pressing the button never pushes the button itself down.
*/
@media (min-width: 992px) {
  .copy-status {
    order: 1;
  }
}

.send-button {
  white-space: nowrap;
}

/* Small phones: slightly smaller text so the label fits on one line next to Back. */
@media (max-width: 575.98px) {
  .send-button {
    font-size: 1rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
}

.toast-anchor {
  left: 0;
  right: 0;
  z-index: 20;
  pointer-events: none;
}

.toast-anchor :deep(.toast) {
  pointer-events: auto;
}

/* Phones and tablets: centred just above the bottom bar, so it never covers the button. */
@media (max-width: 991.98px) {
  .toast-anchor {
    position: absolute;
    bottom: calc(100% + 0.75rem);
  }
}

/* Laptops: fixed just under the header, at the right edge of the page (above the card). */
@media (min-width: 992px) {
  .toast-anchor {
    position: fixed;
    top: 4.75rem;
  }

  .toast-anchor :deep(.copy-toast-region) {
    max-width: 24rem;
  }
}

.profile-link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  font-weight: 700;
}

.start-over {
  color: var(--tt-deep-rose);
  font-weight: 700;
}
</style>
