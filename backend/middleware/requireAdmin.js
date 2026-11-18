import { isOwnerSession, endSession } from '../services/adminSession.js'

// Lets the request through only when the owner is signed in with a session that is
// still valid (see services/adminSession.js). An out-of-date session is deleted.
export function requireAdmin(req, res, next) {
  const admin = req.session?.admin
  if (isOwnerSession(admin, req.app.locals.config)) return next()
  if (!admin) return res.status(401).json({ error: 'Please sign in.' })
  endSession(req, () => res.status(401).json({ error: 'Please sign in.' }))
}
