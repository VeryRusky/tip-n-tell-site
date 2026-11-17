// Lets the request through only when the owner is signed in.
export function requireAdmin(req, res, next) {
  if (req.session?.admin) return next()
  res.status(401).json({ error: 'Please sign in.' })
}
