// Reads the settings from environment variables (backend/.env in development)
// and checks them. If something is unsafe, it throws an error so the server
// refuses to start instead of running in a risky state.
//
// It takes `env` as an argument (process.env by default) so the tests can try
// different settings without changing the real environment.

import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// This file's own folder (backend/). Paths below are worked out from here, so they are the
// same whichever folder the server is started from.
const backendFolder = path.dirname(fileURLToPath(import.meta.url))

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
  let allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  // On Render, if ALLOWED_ORIGINS is not set, use the service's own address, which Render
  // puts in RENDER_EXTERNAL_URL (e.g. https://tipntell.onrender.com). The address is only
  // known after the service is created, so this lets the first deploy start.
  const renderUrl = String(env.RENDER_EXTERNAL_URL ?? '')
    .trim()
    .replace(/\/+$/, '') // no slash at the end, to match the browser's Origin header
  if (allowedOrigins.length === 0 && renderUrl) allowedOrigins = [renderUrl]

  // ---- Proxy: behind the host's HTTPS proxy, production needs an exact number ----
  const trustProxyText = String(env.TRUST_PROXY ?? '').trim()
  if (isProduction && !(/^\d+$/.test(trustProxyText) && Number(trustProxyText) >= 1)) {
    problems.push(
      'TRUST_PROXY must be a whole number of 1 or more in production: how many proxies ' +
        "sit in front of the server, measured on the host (3 on Render's onrender.com " +
        'address in Nov 2026; see "Measuring TRUST_PROXY" in backend/README.md). ' +
        '"true" is never allowed: it lets anyone fake their IP address past the rate limits.',
    )
  }

  // ---- How long booking details are kept after the appointment (personal data) ----
  const keepDaysText = String(env.BOOKING_DETAILS_KEEP_DAYS ?? '').trim()
  const bookingKeepDays = keepDaysText === '' ? 30 : Number(keepDaysText)
  if (!Number.isInteger(bookingKeepDays) || bookingKeepDays < 1 || bookingKeepDays > 365) {
    problems.push('BOOKING_DETAILS_KEEP_DAYS must be a whole number of days from 1 to 365.')
  }

  // ---- Where design photos are stored ----
  // local: files in backend/uploads/. cloudinary: the Cloudinary service (the live site).
  const storageDriver = String(env.STORAGE_DRIVER ?? '').trim() || 'local'
  const cloudinaryUrl = String(env.CLOUDINARY_URL ?? '').trim()
  if (storageDriver !== 'local' && storageDriver !== 'cloudinary') {
    problems.push(`STORAGE_DRIVER must be "local" or "cloudinary", not "${storageDriver}".`)
  }
  if (
    storageDriver === 'cloudinary' &&
    !/^cloudinary:\/\/[^:@\s]+:[^@\s]+@[^\s/]+$/.test(cloudinaryUrl)
  ) {
    problems.push(
      'STORAGE_DRIVER=cloudinary needs CLOUDINARY_URL, copied from the Cloudinary dashboard: ' +
        'cloudinary://<api key>:<api secret>@<cloud name>',
    )
  }

  // Not wrong, but worth saying when the server starts (server.js prints these).
  const warnings = []
  if (isProduction && storageDriver === 'local') {
    warnings.push(
      'STORAGE_DRIVER is "local" in production. A free host wipes its disk on every deploy, ' +
        'restart and sleep, so uploaded design photos will disappear. ' +
        'Set STORAGE_DRIVER=cloudinary and CLOUDINARY_URL.',
    )
  }

  // ---- The built website (frontend/dist), served by this server on the live site ----
  // Production always serves it; SERVE_FRONTEND=true tries the same thing on your computer.
  const serveFrontend = isProduction || isTrue(env.SERVE_FRONTEND)
  const frontendDir = path.resolve(
    backendFolder,
    String(env.FRONTEND_DIR ?? '').trim() || path.join('..', 'frontend', 'dist'),
  )

  if (isProduction) {
    if (!env.MONGODB_URI) problems.push('MONGODB_URI is required in production.')
    if (!adminEmail) problems.push('ADMIN_EMAIL is required in production.')
    if (!googleClientId) problems.push('GOOGLE_CLIENT_ID is required in production.')
    if (allowedOrigins.length === 0) {
      problems.push(
        'ALLOWED_ORIGINS is required in production (or RENDER_EXTERNAL_URL, which Render sets).',
      )
    }
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
    storageDriver,
    cloudinaryUrl,
    uploadsDir: env.UPLOADS_DIR || '',
    serveFrontend,
    frontendDir,
    warnings,
    // Booking details are removed from slots dated more than this many days ago.
    bookingKeepDays,
    // Login attempts allowed per IP address in 15 minutes.
    loginLimit: Number(env.LOGIN_RATE_LIMIT) || 10,
  }
}
