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

export function loadConfig(env = process.env) {
  const isProduction = env.NODE_ENV === 'production'
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
    problems.push('ALLOW_DEV_LOGIN=true is not allowed when NODE_ENV=production.')
  }

  // ---- Who may sign in ----
  const adminEmail = (env.ADMIN_EMAIL ?? '').trim().toLowerCase()
  const googleClientId = (env.GOOGLE_CLIENT_ID ?? '').trim()

  // ---- Which websites may send changes to the admin API (the site's own address) ----
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

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
    isProduction,
    port: Number(env.PORT) || 8000,
    mongodbUri: env.MONGODB_URI ?? '',
    sessionSecret,
    sessionSecretWasGenerated: !env.SESSION_SECRET,
    // Dev login only ever exists outside production (checked above).
    devLogin: allowDevLogin && !isProduction,
    adminEmail,
    googleClientId,
    allowedOrigins:
      allowedOrigins.length > 0 || isProduction
        ? allowedOrigins
        : ['http://localhost:5173', 'http://localhost:5180'],
    trustProxy: readTrustProxy(env.TRUST_PROXY),
    storageDriver: env.STORAGE_DRIVER || 'local',
    uploadsDir: env.UPLOADS_DIR || '',
    // Login attempts allowed per IP address in 15 minutes.
    loginLimit: Number(env.LOGIN_RATE_LIMIT) || 10,
  }
}
