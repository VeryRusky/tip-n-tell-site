// Protects against "cross-site request forgery": another website making her browser
// send a change (e.g. delete a design) while she is signed in.
//
// Browsers add an Origin header (the address of the page that sent the request) to
// every POST, PATCH, PUT and DELETE. Changes are only accepted when it is the site's
// own address, from ALLOWED_ORIGINS in .env. Reading (GET) changes nothing, so it is not checked.
export function checkOrigin(allowedOrigins) {
  return function (req, res, next) {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
    const origin = req.get('Origin')
    if (origin && allowedOrigins.includes(origin)) return next()
    res.status(403).json({ error: 'This request is not allowed.' })
  }
}
