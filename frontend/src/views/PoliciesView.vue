<script setup>
import PriceList from '@/components/PriceList.vue'
import PolicyList from '@/components/PolicyList.vue'
import { site, instagramProfileUrl } from '@/config/site'
</script>

<template>
  <main id="main" class="container-lg pt-3">
    <h1>Policies</h1>
    <p class="muted">Please read these before you book.</p>

    <!-- Pricing and terms stacked on phones, side by side from lg. -->
    <div class="row g-4">
      <section class="col-lg-5" aria-labelledby="pricing-title">
        <div class="panel">
          <h2 id="pricing-title">Pricing</h2>
          <PriceList />
        </div>
      </section>

      <section class="col-lg-7" aria-labelledby="terms-title">
        <div class="panel">
          <h2 id="terms-title" class="visually-hidden">Terms</h2>
          <PolicyList />
        </div>
      </section>
    </div>

    <!--
      Privacy notice (Singapore PDPA). Keep it true: visitors give nothing; the only personal
      data is what she notes on a booking in the admin, deleted 30 days after the appointment
      (backend: BOOKING_DETAILS_KEEP_DAYS). Change this text if that ever changes.
    -->
    <section id="privacy" class="panel mt-4" aria-labelledby="privacy-title">
      <h2 id="privacy-title">Privacy</h2>
      <p class="measure">
        Browsing this site and using the booking steps stores nothing about you: the site doesn't
        ask for your name, phone number or email. Your choices (time, service, design) are saved
        only in your own browser, and reach me only when you send the message yourself on Instagram,
        where Instagram's privacy policy applies.
      </p>
      <p class="measure">
        Once you book by DM, I may note your name or Instagram name and what you booked in my
        private booking calendar, so I can prepare for your appointment. Only I can see it, and it
        is deleted 30 days after your appointment.
      </p>
      <p class="measure">
        There are no ads or tracking cookies. Like any website, our hosting provider keeps short
        technical logs (such as IP addresses) to keep the site running and secure.
      </p>
      <p class="measure mb-0">
        To see, correct or delete what I noted, or with any question about your data: DM
        <a :href="instagramProfileUrl" target="_blank" rel="noopener noreferrer"
          >@{{ site.instagramHandle }}</a
        >
        on Instagram.
      </p>
    </section>

    <div class="row mt-4">
      <div class="col-md-8 col-lg-5 mx-auto">
        <RouterLink :to="{ name: 'book-slot' }" class="btn btn-primary btn-lg w-100">
          Book a slot
        </RouterLink>
      </div>
    </div>
  </main>
</template>
