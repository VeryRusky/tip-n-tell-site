// Reads the settings from environment variables (backend/.env in development)
// and checks them. If something is unsafe, it throws an error so the server
// refuses to start instead of running in a risky state.
//
// It takes `env` as an argument (process.env by default) so the tests can try
// different settings without changing the real environment.

import crypto from 'node:crypto'

// 'true' -> true, anything else -> false
function isTrue(value) {
  return String(value).toLowerCase() === 'true'
}

// TRUST_PROXY: how many proxies (e.g. the host's load balancer) sit in front of
// the server. Needed so rate limits see the visitor's real IP address and secure
// cookies work behind HTTPS. '' or 'false' means none (the default).
function readTrustProxy(value) {
  if (!value || value === 'false') return false
  if (value === 'true') return true
  if (/^\d+$/.test(value)) return Number(value)
  return value // e.g. 'loopback' or an IP range; Express understands these
}

// Which mode the server runs in. Production is the SAFE default: only the exact words
// 'development' or 'test' (any capitals, spaces around them ignored) switch it off.
// So a missing NODE_ENV, or a typo like 'prod', still gets every production check and
// no dev login. (Hosts such as Render do not set NODE_ENV for you.)
function readMode(value) {
  const mode = String(value ?? '')
    .trim()
    .toLowerCase()
  return mode === 'development' || mode === 'test' ? mode : 'production'
}

export function loadConfig(env = process.env) {
  const mode = readMode(env.NODE_ENV)
  const isProduction = mode === 'production'
  const problems = []

  // ---- Session secret: signs the login cookie ----
  let sessionSecret = env.SESSION_SECRET ?? ''
  if (sessionSecret && sessionSecret.length < 32) {
    problems.push('SESSION_SECRET must be at least 32 characters long.')
  }
  if (!sessionSecret) {
    if (isProduction) {
      problems.push('SESSION_SECRET is required in production.')
    } else {
      // Development only: a random secret for this run. Logins end when the server restarts.
      sessionSecret = crypto.randomBytes(32).toString('hex')
    }
  }

  // ---- Dev login: a button that signs in without Google, for local testing only ----
  const allowDevLogin = isTrue(env.ALLOW_DEV_LOGIN)
  if (allowDevLogin && isProduction) {
    problems.push(
      'ALLOW_DEV_LOGIN=true only works with NODE_ENV=development (or test). ' +
        `NODE_ENV is "${env.NODE_ENV ?? ''}", which counts as production. ` +
        'Remove ALLOW_DEV_LOGIN, or set NODE_ENV=development on your own computer.',
    )
  }
  // The dev login may only ever write to the temporary in-memory database, never to a
  // real one (such as the Atlas database the live site uses).
  if (allowDevLogin && env.MONGODB_URI) {
    problems.push(
      'ALLOW_DEV_LOGIN=true cannot be used with a real database (MONGODB_URI is set). ' +
        'Either sign in with Google (remove ALLOW_DEV_LOGIN), or remove MONGODB_URI ' +
        'to use the temporary database with the dev login.',
    )
  }

  // ---- Who may sign in ----
  const adminEmail = (env.ADMIN_EMAIL ?? '').trim().toLowerCase()
  const googleClientId = (env.GOOGLE_CLIENT_ID ?? '').trim()

  // ---- Which websites may send changes to the admin API (the site's own address) ----
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  // ---- Proxy: behind the host's HTTPS proxy, production needs an exact number ----
  const trustProxyText = String(env.TRUST_PROXY ?? '').trim()
  if (isProduction && !(/^\d+$/.test(trustProxyText) && Number(trustProxyText) >= 1)) {
    problems.push(
      'TRUST_PROXY must be a whole number of 1 or more in production: how many proxies ' +
        'sit in front of the server (1 on Render or Railway, 2 with Cloudflare in front). ' +
        '"true" is never allowed: it lets anyone fake their IP address past the rate limits.',
    )
  }

  // ---- How long booking details are kept after the appointment (personal data) ----
  const keepDaysText = String(env.BOOKING_DETAILS_KEEP_DAYS ?? '').trim()
  const bookingKeepDays = keepDaysText === '' ? 30 : Number(keepDaysText)
  if (!Number.isInteger(bookingKeepDays) || bookingKeepDays < 1 || bookingKeepDays > 365) {
    problems.push('BOOKING_DETAILS_KEEP_DAYS must be a whole number of days from 1 to 365.')
  }

  if (isProduction) {
    if (!env.MONGODB_URI) problems.push('MONGODB_URI is required in production.')
    if (!adminEmail) problems.push('ADMIN_EMAIL is required in production.')
    if (!googleClientId) problems.push('GOOGLE_CLIENT_ID is required in production.')
    if (allowedOrigins.length === 0) problems.push('ALLOWED_ORIGINS is required in production.')
  }

  if (problems.length > 0) {
    throw new Error(`The server cannot start:\n- ${problems.join('\n- ')}`)
  }

  return {
    mode,
    isProduction,
    port: Number(env.PORT) || 8000,
    mongodbUri: env.MONGODB_URI ?? '',
    sessionSecret,
    sessionSecretWasGenerated: !env.SESSION_SECRET,
    // Dev login only ever exists outside production with the temporary database (checked above).
    devLogin: allowDevLogin && !isProduction && !env.MONGODB_URI,
    adminEmail,
    // The email a dev-login session is given.
    devEmail: adminEmail || 'owner@localhost',
    googleClientId,
    allowedOrigins:
      allowedOrigins.length > 0 || isProduction
        ? allowedOrigins
        : ['http://localhost:5173', 'http://localhost:5180'],
    trustProxy: isProduction ? Number(trustProxyText) : readTrustProxy(trustProxyText),
    storageDriver: env.STORAGE_DRIVER || 'local',
    uploadsDir: env.UPLOADS_DIR || '',
    // Booking details are removed from slots dated more than this many days ago.
    bookingKeepDays,
    // Login attempts allowed per IP address in 15 minutes.
    loginLimit: Number(env.LOGIN_RATE_LIMIT) || 10,
  }
}
