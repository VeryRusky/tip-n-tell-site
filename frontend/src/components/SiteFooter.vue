<script setup>
import { site, instagramProfileUrl } from '@/config/site'
import BrandWordmark from './BrandWordmark.vue'
import IconInstagram from './icons/IconInstagram.vue'
import IconPin from './icons/IconPin.vue'

const year = new Date().getFullYear()
</script>

<template>
  <!-- Three columns from md up (brand, explore, contact), stacked on phones. -->
  <footer class="site-footer">
    <div class="container-lg">
      <div class="row gy-4">
        <div class="col-md-5">
          <RouterLink to="/" class="footer-brand">
            <BrandWordmark size="small" />
          </RouterLink>
          <p class="footer-text mt-2 mb-0">
            Home-based nails in {{ site.area }}, at nail model prices.
          </p>
        </div>

        <nav class="col-6 col-md-3 offset-md-1" aria-label="Footer">
          <h2 id="footer-explore" class="footer-heading">Explore</h2>
          <ul class="footer-links" aria-labelledby="footer-explore">
            <li><RouterLink :to="{ name: 'book-slot' }">Book a slot</RouterLink></li>
            <li><RouterLink :to="{ name: 'home', hash: '#prices' }">Prices</RouterLink></li>
            <li><RouterLink :to="{ name: 'home', hash: '#gallery' }">Gallery</RouterLink></li>
            <li><RouterLink :to="{ name: 'policies' }">Policies</RouterLink></li>
          </ul>
        </nav>

        <div class="col-6 col-md-3">
          <h2 id="footer-contact" class="footer-heading">Contact</h2>
          <ul class="footer-links" aria-labelledby="footer-contact">
            <li>
              <a :href="instagramProfileUrl" target="_blank" rel="noopener noreferrer">
                <IconInstagram /> @{{ site.instagramHandle }}
              </a>
            </li>
            <!-- Area only: never her address, phone number or WhatsApp. -->
            <li class="footer-area"><IconPin /> {{ site.area }}</li>
          </ul>
        </div>
      </div>

      <!-- Stacked on phones, one row with the two ends apart from md up. -->
      <div class="footer-bottom d-flex flex-column flex-md-row justify-content-md-between gap-1">
        <p class="mb-0">© {{ year }} {{ site.brandName }}</p>
        <p class="mb-0">
          The site never asks for your details. Bookings are made by DM on Instagram.
          <RouterLink :to="{ name: 'policies', hash: '#privacy' }">Privacy</RouterLink>
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: 3rem;
  padding: 2rem 0 1.25rem;
  background: var(--tt-blush);
  border-top: 1px solid var(--tt-line);
  font-size: 0.95rem;
  color: var(--tt-muted);
}

.footer-brand {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding-top: 0.4rem;
  text-decoration: none;
}

.footer-text {
  max-width: 22rem;
}

/* Small, quiet group headings. */
.footer-heading {
  font-family: var(--tt-font-body);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tt-ink);
  margin-bottom: 0.25rem;
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* Normal weight, underline only on hover or keyboard focus. 44px tall for fingers. */
.footer-links a,
.footer-area {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
}

.footer-links a {
  color: var(--tt-deep-rose);
  text-decoration: none;
}

.footer-links a:hover,
.footer-links a:focus-visible {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* Laptops have a mouse, so the links can sit closer together. */
@media (min-width: 768px) {
  .footer-links a,
  .footer-area {
    min-height: 2rem;
  }
}

.footer-bottom {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--tt-line);
  font-size: 0.85rem;
}
</style>
