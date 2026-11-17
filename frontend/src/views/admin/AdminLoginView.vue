<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import { getLoginOptions, signInWithGoogle, devSignIn, errorMessage } from '@/services/adminApi'
import { showGoogleButton } from '@/utils/googleSignIn'
import BrandWordmark from '@/components/BrandWordmark.vue'

// The owner's sign-in page (/admin/login). Only her Google account is accepted.
const route = useRoute()
const router = useRouter()
const admin = useAdminStore()

const loading = ref(true)
const options = ref({ googleClientId: '', devLogin: false })
const googleButton = ref(null)
const problem = ref('')
const notOwner = ref(false)
const working = ref(false)

// Where to go after signing in: back to the admin page she asked for, else the calendar.
// Only admin addresses are allowed, so a link can't send her somewhere else.
function nextPage() {
  const next = route.query.next
  if (typeof next === 'string' && next.startsWith('/admin') && !next.startsWith('/admin/login')) {
    return next
  }
  return { name: 'admin-calendar' }
}

function finish(email) {
  admin.markSignedIn(email)
  router.replace(nextPage())
}

async function onGoogleCredential(credential) {
  problem.value = ''
  notOwner.value = false
  working.value = true
  try {
    const session = await signInWithGoogle(credential)
    finish(session.email)
  } catch (error) {
    if (error.response?.data?.code === 'not-owner') notOwner.value = true
    else problem.value = errorMessage(error, 'Sign-in failed. Please try again.')
  } finally {
    working.value = false
  }
}

async function useDevLogin() {
  problem.value = ''
  working.value = true
  try {
    const session = await devSignIn()
    finish(session.email)
  } catch (error) {
    problem.value = errorMessage(error)
  } finally {
    working.value = false
  }
}

onMounted(async () => {
  if (route.query.expired) {
    admin.markSignedOut()
    problem.value = 'You were signed out. Please sign in again.'
  }
  try {
    // Already signed in (e.g. opened from a bookmark)? Go straight in.
    if (!route.query.expired) {
      await admin.checkSession()
      if (admin.signedIn) return router.replace(nextPage())
    }
    options.value = await getLoginOptions()
  } catch (error) {
    problem.value = errorMessage(error, 'The sign-in page could not load. Please refresh.')
  } finally {
    loading.value = false
  }

  if (options.value.googleClientId) {
    await nextTick()
    try {
      await showGoogleButton(googleButton.value, options.value.googleClientId, onGoogleCredential)
    } catch {
      problem.value = 'Google sign-in could not load. Check your connection and refresh.'
    }
  }
})
</script>

<template>
  <main id="main" class="login-page">
    <div class="login-card">
      <BrandWordmark size="large" />
      <h1 class="login-title">Sign in to manage your site</h1>
      <p class="muted">
        Update your calendar and designs. Only the owner's Google account can sign in.
      </p>

      <p v-if="loading" role="status">Loading…</p>

      <template v-else>
        <div v-if="notOwner" class="message message-error" role="alert">
          <strong>That Google account can't manage this site.</strong>
          Please sign in with the tip n tell owner's Google account. If you have several Google
          accounts on this phone, choose the right one in the Google window.
        </div>
        <p v-if="problem" class="message message-error" role="alert">{{ problem }}</p>

        <!-- Google draws its own button inside this box. -->
        <div v-if="options.googleClientId" ref="googleButton" class="google-button"></div>
        <p v-else class="message">
          Google sign-in is not set up yet. The site's developer needs to add a Google client ID to
          the server settings (GOOGLE_CLIENT_ID).
        </p>

        <div v-if="options.devLogin" class="dev-login">
          <p class="small-print mb-2">Developer computer only (ALLOW_DEV_LOGIN is on):</p>
          <button
            type="button"
            class="btn btn-outline-primary"
            :disabled="working"
            @click="useDevLogin"
          >
            Dev login (no Google)
          </button>
        </div>

        <p v-if="working" role="status" class="mt-3 mb-0">Signing in…</p>
      </template>
    </div>
  </main>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2.5rem 1rem 4rem;
}

.login-card {
  width: 100%;
  max-width: 26rem;
  background: var(--tt-white);
  border: 1px solid var(--tt-line);
  border-radius: var(--tt-radius);
  padding: 1.75rem 1.25rem;
  text-align: center;
}

.login-title {
  font-size: 1.35rem;
  margin: 1.25rem 0 0.5rem;
}

.google-button {
  display: flex;
  justify-content: center;
  min-height: 44px;
  margin: 1.25rem 0 0.5rem;
}

.message {
  text-align: left;
  background: var(--tt-blush);
  border-radius: var(--tt-radius-small);
  padding: 0.75rem 0.9rem;
  margin: 1rem 0 0;
}

.message-error {
  background: #fbe3e5;
  border: 1px solid #8a1c2b;
  color: #5e1220;
}

.dev-login {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--tt-line);
}
</style>
