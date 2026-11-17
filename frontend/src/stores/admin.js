import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getSession, signOut as endSession } from '@/services/adminApi'

// Whether the owner is signed in to the admin pages. Only the admin pages use this store.
export const useAdminStore = defineStore('admin', () => {
  const checked = ref(false) // have we asked the server yet?
  const signedIn = ref(false)
  const email = ref('')

  // Asks the server whether this browser has a valid login session.
  async function checkSession() {
    const session = await getSession()
    signedIn.value = session.signedIn
    email.value = session.email ?? ''
    checked.value = true
  }

  function markSignedIn(newEmail) {
    signedIn.value = true
    email.value = newEmail
    checked.value = true
  }

  function markSignedOut() {
    signedIn.value = false
    email.value = ''
  }

  async function signOut() {
    try {
      await endSession()
    } finally {
      markSignedOut()
    }
  }

  return { checked, signedIn, email, checkSession, markSignedIn, markSignedOut, signOut }
})
