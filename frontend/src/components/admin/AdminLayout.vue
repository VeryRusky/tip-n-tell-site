<script setup>
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import BrandWordmark from '@/components/BrandWordmark.vue'

// The frame around the owner's admin pages: a simple header with the brand,
// the two pages (Calendar, Designs) and Sign out. Calm on purpose: no animations.
defineProps({
  title: { type: String, required: true },
})

const router = useRouter()
const admin = useAdminStore()

async function signOut() {
  try {
    await admin.signOut()
  } catch {
    // Even if the server could not be reached, leave the admin pages.
  }
  router.push({ name: 'admin-login' })
}
</script>

<template>
  <header class="admin-header">
    <div class="container-lg">
      <div class="d-flex align-items-center justify-content-between gap-2 py-2">
        <div class="d-flex align-items-center gap-2">
          <BrandWordmark size="small" />
          <span class="admin-badge">Admin</span>
        </div>
        <button type="button" class="btn btn-outline-primary btn-sm" @click="signOut">
          Sign out
        </button>
      </div>
      <nav aria-label="Admin pages">
        <ul class="admin-tabs">
          <li>
            <RouterLink
              :to="{ name: 'admin-calendar' }"
              class="admin-tab"
              exact-active-class="active"
            >
              Calendar
            </RouterLink>
          </li>
          <li>
            <RouterLink
              :to="{ name: 'admin-designs' }"
              class="admin-tab"
              exact-active-class="active"
            >
              Designs
            </RouterLink>
          </li>
        </ul>
      </nav>
    </div>
  </header>

  <main id="main" class="container-lg admin-main">
    <h1 class="admin-title">{{ title }}</h1>
    <slot />
  </main>
</template>

<style scoped>
.admin-header {
  background: var(--tt-white);
  border-bottom: 1px solid var(--tt-line);
}

.admin-badge {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tt-deep-rose);
  background: var(--tt-pink);
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
}

.admin-tabs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 0.25rem;
}

.admin-tabs li {
  flex: 1 1 0;
}

/* Big, simple tabs: at least 44px tall, the current page underlined. */
.admin-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  font-weight: 700;
  color: var(--tt-muted);
  text-decoration: none;
  border-bottom: 3px solid transparent;
}

.admin-tab.active {
  color: var(--tt-deep-rose);
  border-bottom-color: var(--tt-deep-rose);
}

.admin-main {
  padding-top: 1rem;
  padding-bottom: 7rem; /* room for the bottom bar and messages */
}

.admin-title {
  font-size: 1.6rem;
  margin-bottom: 0.75rem;
}

@media (min-width: 768px) {
  .admin-tabs {
    justify-content: flex-start;
  }

  .admin-tabs li {
    flex: 0 0 9rem;
  }
}
</style>

<style>
/* Admin pages only: disabled outline buttons in the brand colours (Bootstrap's default is blue). */
.admin-main .btn-outline-primary {
  --bs-btn-disabled-color: #9d8588;
  --bs-btn-disabled-border-color: var(--tt-line);
  --bs-btn-disabled-bg: transparent;
}
</style>
