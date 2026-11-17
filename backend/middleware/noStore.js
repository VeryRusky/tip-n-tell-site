// Admin answers must never be kept by the browser or a shared cache,
// and search engines should not list them.
export function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store')
  res.set('X-Robots-Tag', 'noindex')
  next()
}
