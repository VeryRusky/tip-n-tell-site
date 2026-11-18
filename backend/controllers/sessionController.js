import { verifyGoogleToken } from '../services/googleVerifier.js'
import { isOwnerSession, endSession } from '../services/adminSession.js'

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
// An out-of-date session (see services/adminSession.js) is deleted and counts as signed out.
export function getSession(req, res) {
  const admin = req.session.admin
  if (isOwnerSession(admin, req.app.locals.config)) {
    return res.json({ signedIn: true, email: admin.email })
  }
  if (!admin) return res.json({ signedIn: false })
  endSession(req, () => res.json({ signedIn: false }))
}

// Starts a fresh session for the owner. regenerate() gives a brand-new session id,
// so an id someone might have planted before login is useless afterwards.
// `via` records how she signed in: 'google' or 'dev'.
function startSession(req, email, via) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error)
      req.session.admin = { email, via }
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

  await startSession(req, email, 'google')
  res.json({ signedIn: true, email })
}

// The addresses a request has when it comes from this same computer.
const THIS_COMPUTER = ['127.0.0.1', '::1', '::ffff:127.0.0.1']

// POST /api/admin/session/dev
// Only exists when ALLOW_DEV_LOGIN=true, not in production, with the temporary database
// (see config.js). As a last safety net it also answers 404 ("no such page") unless the
// request comes straight from this computer: Vite's dev server forwards from localhost,
// while anything that came through a proxy carries an X-Forwarded-For header.
export async function devSignIn(req, res) {
  const fromThisComputer =
    THIS_COMPUTER.includes(req.socket.remoteAddress) && !req.get('X-Forwarded-For')
  if (!fromThisComputer) return res.status(404).json({ error: 'Not found.' })

  const email = req.app.locals.config.devEmail
  await startSession(req, email, 'dev')
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
