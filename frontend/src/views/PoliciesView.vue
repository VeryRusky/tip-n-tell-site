<script setup>
import PriceList from '@/components/PriceList.vue'
import PolicyList from '@/components/PolicyList.vue'
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

    <div class="row mt-4">
      <div class="col-md-8 col-lg-5 mx-auto">
        <RouterLink :to="{ name: 'book-slot' }" class="btn btn-primary btn-lg w-100">
          Book a slot
        </RouterLink>
      </div>
    </div>
  </main>
</template>
