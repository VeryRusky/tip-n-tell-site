<script setup>
import BrandWordmark from './BrandWordmark.vue'
</script>

<template>
  <!--
    Bootstrap navbar. "navbar-expand" keeps the links in one row at every size
    (there are only two, so no hamburger menu is needed), and "sticky-top" keeps
    the bar, with its "Book a slot" button, in view while scrolling.
  -->
  <header class="site-header sticky-top">
    <nav class="navbar navbar-expand" aria-label="Main">
      <div class="container-lg">
        <RouterLink to="/" class="navbar-brand home-link">
          <BrandWordmark size="small" />
        </RouterLink>
        <ul class="navbar-nav ms-auto align-items-center gap-1 gap-md-3">
          <li class="nav-item">
            <RouterLink :to="{ name: 'policies' }" class="nav-link policies-link">
              Policies
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink :to="{ name: 'book-slot' }" class="btn btn-primary book-button">
              Book a slot
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.site-header {
  background: var(--tt-cream);
  border-bottom: 1px solid var(--tt-line);
}

.navbar {
  padding-top: 0.35rem;
  padding-bottom: 0.35rem;
}

.home-link {
  display: inline-flex;
  align-items: center;
  min-height: 48px;
  padding-top: 0.5rem;
  margin-right: 0;
}

.policies-link {
  display: inline-flex;
  align-items: center;
  min-height: 48px;
  padding: 0 0.5rem;
  font-weight: 700;
  color: var(--tt-deep-rose);
}

.policies-link:hover,
.policies-link.router-link-active {
  color: var(--tt-deep-rose-dark);
  text-decoration: underline;
  text-underline-offset: 4px;
}

/* A slightly smaller button than the page's main actions. */
.book-button {
  min-height: 44px;
  padding-left: 1rem;
  padding-right: 1rem;
}
</style>
