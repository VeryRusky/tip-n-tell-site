import { verifyGoogleToken } from '../services/googleVerifier.js'

// Signing the owner in and out. There is no sign-up and no password: the only way in
// is her own Google account (or, on a developer's computer only, the dev login).

export const SESSION_COOKIE = 'tt.sid'

// GET /api/admin/config -> what the login page should show. Public on purpose:
// a Google client ID is not a secret (it is visible on every Google sign-in page).
export function getConfig(req, res) {
  const config = req.app.locals.config
  res.json({ googleClientId: config.googleClientId, devLogin: config.devLogin })
}

// GET /api/admin/session -> { signedIn: true, email } or { signedIn: false }
export function getSession(req, res) {
  if (req.session.admin) {
    res.json({ signedIn: true, email: req.session.admin.email })
  } else {
    res.json({ signedIn: false })
  }
}

// Starts a fresh session for the owner. regenerate() gives a brand-new session id,
// so an id someone might have planted before login is useless afterwards.
function startSession(req, email) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error)
      req.session.admin = { email }
      req.session.save((saveError) => (saveError ? reject(saveError) : resolve()))
    })
  })
}

// POST /api/admin/session/google  body: { credential: '<Google ID token>' }
export async function signInWithGoogle(req, res) {
  const config = req.app.locals.config
  const credential = req.body?.credential
  if (typeof credential !== 'string' || credential.length === 0 || credential.length > 4096) {
    return res.status(400).json({ error: 'Missing Google sign-in.' })
  }
  if (!config.googleClientId) {
    return res.status(503).json({ error: 'Google sign-in is not set up yet.' })
  }

  let profile
  try {
    profile = await verifyGoogleToken(credential, config.googleClientId)
  } catch {
    return res.status(401).json({ error: 'Google sign-in failed. Please try again.' })
  }

  // Only her own Google account, and only once Google has confirmed the address.
  const email = String(profile?.email ?? '').toLowerCase()
  const isOwner = config.adminEmail !== '' && email === config.adminEmail
  if (profile?.email_verified !== true || !isOwner) {
    return res.status(403).json({
      error: 'This Google account is not allowed to manage the site.',
      code: 'not-owner',
    })
  }

  await startSession(req, email)
  res.json({ signedIn: true, email })
}

// POST /api/admin/session/dev  (only exists when ALLOW_DEV_LOGIN=true and not in production)
export async function devSignIn(req, res) {
  const email = req.app.locals.config.adminEmail || 'owner@localhost'
  await startSession(req, email)
  res.json({ signedIn: true, email })
}

// DELETE /api/admin/session -> signs out
export function signOut(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error)
    res.clearCookie(SESSION_COOKIE, { path: '/' })
    res.status(204).end()
  })
}
