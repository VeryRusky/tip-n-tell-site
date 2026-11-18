<script setup>
import { onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import { useAdminToastStore } from '@/stores/adminToast'
import BrandWordmark from '@/components/BrandWordmark.vue'
import AdminToasts from './AdminToasts.vue'
import AdminAccountMenu from './AdminAccountMenu.vue'
import '@/assets/admin.css'

// The frame around the owner's admin pages: the brand, a link to the public site, who is
// signed in, Sign out, and the two pages (Calendar, Designs). Calm on purpose.
// On a phone it is one short row: who is signed in and Sign out sit behind the account
// button (AdminAccountMenu). On a laptop they are shown in the header itself.
// Pages put their main button next to the title with <template #actions>.
defineProps({
  title: { type: String, required: true },
})

const router = useRouter()
const admin = useAdminStore()
const toast = useAdminToastStore()
const siteHome = import.meta.env.BASE_URL // the public home page

async function signOut() {
  try {
    await admin.signOut()
  } catch {
    // Even if the server could not be reached, leave the admin pages.
  }
  router.push({ name: 'admin-login' })
}

// A message (and its Undo) belongs to the page it came from.
onBeforeUnmount(toast.clear)
</script>

<template>
  <div class="tt-admin admin-shell">
    <header class="admin-header">
      <div class="container-lg">
        <div class="header-row">
          <div class="d-flex align-items-center gap-2">
            <BrandWordmark size="small" />
            <span class="admin-badge">Admin</span>
          </div>
          <div class="header-links">
            <a class="view-site" :href="siteHome" target="_blank" rel="noopener">
              View site <span aria-hidden="true">↗</span>
              <span class="visually-hidden">(opens in a new tab)</span>
            </a>
            <AdminAccountMenu class="phone-only" :email="admin.email" @sign-out="signOut" />
          </div>
        </div>
        <div class="account-row laptop-only">
          <p class="account-email">
            <span class="visually-hidden">Signed in as </span>{{ admin.email }}
          </p>
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
      <div class="title-row">
        <h1 id="admin-title" class="admin-title" tabindex="-1">{{ title }}</h1>
        <div v-if="$slots.actions" class="title-actions">
          <slot name="actions" />
        </div>
      </div>
      <slot />
    </main>

    <AdminToasts />
  </div>
</template>

<style scoped>
.admin-shell {
  flex: 1 0 auto;
}

.admin-header {
  background: var(--tt-white);
  border-bottom: 1px solid var(--tt-line);
}

.header-row,
.account-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.header-row {
  padding-top: 0.4rem;
}

.header-links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Phone: no separate account row (it is in the account menu). */
.account-row.laptop-only {
  display: none;
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

.view-site {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 44px;
  font-weight: 700;
  text-underline-offset: 3px;
}

.account-email {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
  color: var(--tt-muted);
}

.admin-tabs {
  list-style: none;
  margin: 0.25rem 0 0;
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
  padding-bottom: 8rem; /* room for a bottom bar and messages */
}

.title-row {
  min-height: 48px; /* the same height with or without a button, so nothing jumps */
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-bottom: 0.75rem;
}

.admin-title {
  font-size: 1.6rem;
  margin: 0;
}

.admin-title:focus {
  outline: none;
}

.title-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

@media (min-width: 768px) {
  .admin-tabs {
    justify-content: flex-start;
  }

  .admin-tabs li {
    flex: 0 0 9rem;
  }

  /* One row on a laptop: brand, then email, Sign out and View site on the right. */
  .admin-header .container-lg {
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      'brand account site'
      'tabs tabs tabs';
    align-items: center;
    column-gap: 1rem;
  }

  .header-row {
    display: contents;
  }

  .header-row > :first-child {
    grid-area: brand;
    padding-top: 0.5rem;
  }

  .header-links {
    grid-area: site;
    padding-top: 0.5rem;
  }

  .phone-only {
    display: none;
  }

  .account-row.laptop-only {
    display: flex;
    grid-area: account;
    justify-content: flex-end;
    padding-top: 0.5rem;
  }

  nav {
    grid-area: tabs;
  }
}
</style>
