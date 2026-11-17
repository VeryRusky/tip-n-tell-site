import { rateLimit } from 'express-rate-limit'

// Limits how many requests one IP address can make, to slow down anyone guessing
// at the login or hammering the admin API. (Behind a host's proxy, set TRUST_PROXY
// so the real visitor IP is used.)
const FIFTEEN_MINUTES = 15 * 60 * 1000

export function createLoginLimiter(limit) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit, // about 10 sign-in attempts per 15 minutes
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' },
  })
}

export function createAdminLimiter() {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: 600, // plenty for one person tapping through the calendar
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a few minutes.' },
  })
}
