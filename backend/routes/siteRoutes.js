import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import helmet from 'helmet'

// Serves the built website (frontend/dist, made by `pnpm build` in frontend/) from this
// same server, so the pages, /api and /uploads share ONE address. That keeps the login
// cookie first-party (SameSite=Strict), which Safari on iPhone needs.
//
// Used on the live site (production) and when SERVE_FRONTEND=true. app.js mounts it after
// the /api and /uploads routes, so it never answers those addresses.

// The headers for the site's pages and files (security review, finding M4). helmet's
// defaults stay on /api answers; these differ only where Google sign-in needs it:
// Google's script, its button frame and its popup.
export function sitePageHeaders(config) {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", 'https://accounts.google.com/gsi/client'],
    'frame-src': ['https://accounts.google.com/gsi/'],
    'connect-src': ["'self'", 'https://accounts.google.com/gsi/'],
    // 'unsafe-inline' for STYLES only: Vue and Google's button set some inline styles.
    'style-src': ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style'],
    // data: Bootstrap's small built-in icons. blob: the admin's preview of a chosen photo.
    // res.cloudinary.com: design photos on the live site. ('self' covers /uploads.)
    'img-src': ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  }
  // Only on the live (HTTPS) site: on http://localhost it would turn every request into an
  // https:// one, which fails.
  if (config.isProduction) directives['upgrade-insecure-requests'] = []

  const headers = helmet({
    contentSecurityPolicy: { useDefaults: false, directives },
    // Lets the Google sign-in popup talk back to this page.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    // Google checks which site its button is on, so send the address (not the full path).
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Browsers remember for a year to only use HTTPS here.
    strictTransportSecurity: { maxAge: 31536000, includeSubDomains: false },
    // Never shown inside another site's frame (same as frame-ancestors 'none').
    xFrameOptions: { action: 'deny' },
  })

  return (req, res, next) => {
    // The site doesn't use these, so no page may ask for them.
    res.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()')
    headers(req, res, next)
  }
}

// /admin, /admin/login, /admin/designs ...: search engines should not list these pages.
// (Capitals too: Express treats /Admin the same as /admin.)
const ADMIN_PAGE = /^\/admin(\/|$)/i

export function createSiteRouter(config) {
  const folder = config.frontendDir
  const indexFile = path.join(folder, 'index.html')

  // Read the page once at start. If the site was not built, stop here with a clear message
  // instead of answering every visitor with an error.
  let indexHtml
  try {
    indexHtml = fs.readFileSync(indexFile, 'utf8')
  } catch {
    throw new Error(
      `The built website was not found at ${indexFile}. ` +
        'Build it first (in frontend/: VITE_API_URL=/api pnpm build), ' +
        'or set FRONTEND_DIR to the folder that holds index.html.',
    )
  }

  const router = express.Router()
  router.use(sitePageHeaders(config))

  router.use((req, res, next) => {
    if (ADMIN_PAGE.test(req.path)) res.set('X-Robots-Tag', 'noindex')
    next()
  })

  // Real files: the built JavaScript, CSS, fonts, favicon...
  router.use(
    express.static(folder, {
      index: false, // "/" is answered below, with the other pages
      dotfiles: 'ignore',
      cacheControl: false, // set just below instead
      setHeaders: (res, filePath) => {
        // Files in assets/ have a hash in their name (e.g. index-B2x9.js) that changes
        // whenever the file changes, so browsers may keep them for a year.
        // Anything else (e.g. favicon.svg) is checked again on each visit.
        const inAssets = path.relative(folder, filePath).split(path.sep)[0] === 'assets'
        res.set('Cache-Control', inAssets ? 'public, max-age=31536000, immutable' : 'no-cache')
      },
    }),
  )

  // A missing file in assets/ is a real 404, never the page (a browser asking for an
  // old script would otherwise get HTML back).
  router.use('/assets', (req, res) => res.status(404).type('text').send('Not found'))

  // Every other address (/, /policies, /book/time, /admin ...) gets index.html, and
  // Vue Router shows the right page. That is why reloading /book/time works.
  // index.html is never cached, so a new deploy shows at once.
  router.get('/{*path}', (req, res) => {
    res.set('Cache-Control', 'no-store')
    res.type('html').send(indexHtml)
  })

  return router
}
