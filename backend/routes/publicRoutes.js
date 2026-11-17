import express from 'express'
import * as publicController from '../controllers/publicController.js'

// Routes anyone can call, mounted at /api. No login, read only.
const router = express.Router()

router.get('/health', publicController.health)
router.get('/slots/months', publicController.listOpenMonths)
router.get('/slots', publicController.listSlots)
router.get('/designs', publicController.listDesigns)

export default router
