import express from 'express'
import * as sessionController from '../controllers/sessionController.js'
import * as slotController from '../controllers/adminSlotController.js'
import * as designController from '../controllers/adminDesignController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { checkOrigin } from '../middleware/checkOrigin.js'
import { noStore } from '../middleware/noStore.js'
import { createLoginLimiter, createAdminLimiter } from '../middleware/rateLimits.js'
import { readOnePhoto } from '../middleware/upload.js'

// Routes for the owner's admin pages, mounted at /api/admin.
// It is a function because some parts depend on the settings (the dev login).
export function createAdminRouter(config) {
  const router = express.Router()
  const loginLimiter = createLoginLimiter(config.loginLimit)

  // For every admin request: never cache, limit the request rate,
  // and accept changes only from the site's own pages.
  router.use(noStore)
  router.use(createAdminLimiter())
  router.use(checkOrigin(config.allowedOrigins))

  // ---- Signing in and out (no login needed to reach these) ----
  router.get('/config', sessionController.getConfig)
  router.get('/session', sessionController.getSession)
  router.post('/session/google', loginLimiter, sessionController.signInWithGoogle)
  router.delete('/session', sessionController.signOut)

  // The dev login is only added when allowed. Otherwise the route does not exist at all
  // (a request to it gets 404, the same as any made-up address).
  if (config.devLogin) {
    router.post('/session/dev', loginLimiter, sessionController.devSignIn)
  }

  // ---- Slots and designs: the owner must be signed in (requireAdmin) ----
  const slots = express.Router()
  slots.get('/', slotController.listMonth)
  slots.post('/', slotController.createMany)
  slots.patch('/:id', slotController.update)
  slots.delete('/:id', slotController.remove)
  router.use('/slots', requireAdmin, slots)

  const designs = express.Router()
  designs.get('/', designController.list)
  designs.post('/', readOnePhoto, designController.create)
  designs.put('/order', designController.reorder)
  designs.patch('/:id', designController.update)
  designs.put('/:id/image', readOnePhoto, designController.replaceImage)
  designs.delete('/:id', designController.remove)
  router.use('/designs', requireAdmin, designs)

  return router
}
