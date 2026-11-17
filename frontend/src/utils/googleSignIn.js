// "Sign in with Google" button, using Google Identity Services.
// https://developers.google.com/identity/gsi/web
//
// Google's script draws the button. When she signs in, Google gives the page an ID token
// (a signed note saying "this is <email>"); the page sends it to our server, which checks
// it with Google and starts a session. The page never sees a password.

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'
let loading = null

// Adds Google's script to the page once, and waits for it to load.
function loadScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_URL
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        loading = null
        reject(new Error('Google sign-in could not load.'))
      }
      document.head.appendChild(script)
    })
  }
  return loading
}

// Draws the button inside `element`. `onCredential(idToken)` runs after she signs in.
export async function showGoogleButton(element, clientId, onCredential) {
  await loadScript()
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => onCredential(response.credential),
    ux_mode: 'popup',
  })
  window.google.accounts.id.renderButton(element, {
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
    width: 280,
  })
}
