import express from 'express'
import { rateLimit } from 'express-rate-limit'
import * as publicController from '../controllers/publicController.js'

// Routes anyone can call, mounted at /api. No login, read only.
// It is a function so each copy of the app gets its own rate limiter (the tests make several).
export function createPublicRouter() {
  const router = express.Router()

  // At most 120 requests a minute from one IP address. One customer going through the
  // booking steps makes well under 20, so this only stops floods (scrapers, broken scripts)
  // that would otherwise overload the free database.
  const publicLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a minute and try again.' },
  })

  // Health checks (from the host or an uptime monitor) are not limited.
  router.get('/health', publicController.health)

  router.get('/slots/months', publicLimiter, publicController.listOpenMonths)
  router.get('/slots', publicLimiter, publicController.listSlots)
  router.get('/designs', publicLimiter, publicController.listDesigns)

  return router
}
