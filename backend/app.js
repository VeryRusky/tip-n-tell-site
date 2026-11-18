import express from 'express'
import helmet from 'helmet'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import mongoose from 'mongoose'
import { createPublicRouter } from './routes/publicRoutes.js'
import { createAdminRouter } from './routes/adminRoutes.js'
import { createSiteRouter } from './routes/siteRoutes.js'
import { SESSION_COOKIE } from './controllers/sessionController.js'
import { createStorage } from './services/storage/index.js'
import { createPublicCache } from './services/publicCache.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

// Addresses the API itself answers: /api/... and /uploads/... (any capitals, like Express).
const BACKEND_PATH = /^\/(api|uploads)(\/|$)/i

// Builds the Express app. server.js starts it; the tests use it directly with supertest.
// The database must already be connected (the session store keeps logins in MongoDB).
export function createApp(config) {
  const app = express()
  // The built website (live site, or SERVE_FRONTEND=true). Made first, so a missing build
  // stops the server straight away with a clear message.
  const siteRouter = config.serveFrontend ? createSiteRouter(config) : null
  const storage = createStorage(config)

  // Shared with the controllers through req.app.locals.
  app.locals.config = config
  app.locals.storage = storage
  // Recent public answers (60 seconds); admin changes clear it.
  app.locals.publicCache = createPublicCache()

  // Behind a host's proxy, this lets Express see the visitor's real IP and HTTPS.
  app.set('trust proxy', config.trustProxy)
  // Don't announce "X-Powered-By: Express".
  app.disable('x-powered-by')

  // Safe default headers (e.g. stop other sites framing these pages, block MIME sniffing)
  // for API answers and photos. When this server also serves the website, its pages get
  // their own set instead (routes/siteRoutes.js), because helmet's strict defaults would
  // block Google sign-in.
  const strictHeaders = helmet()
  app.use((req, res, next) => {
    if (config.serveFrontend && !BACKEND_PATH.test(req.path)) return next()
    strictHeaders(req, res, next)
  })

  // JSON bodies only up to 10 kB: nothing in this API needs more.
  app.use(express.json({ limit: '10kb' }))

  // Uploaded photos. Random file names never change, so browsers may cache them for a year.
  if (config.storageDriver === 'local') {
    app.use(
      '/uploads',
      express.static(storage.folder, {
        index: false,
        dotfiles: 'deny',
        maxAge: '365d',
        immutable: true,
        setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff'),
      }),
    )
  }
  // A photo that doesn't exist (or any /uploads address with Cloudinary): a plain 404.
  app.use('/uploads', notFound)

  // Public routes: no session needed.
  app.use('/api', createPublicRouter())

  // Admin routes: the login session is only used here.
  // Sessions are kept in MongoDB (a "sessions" collection), so the cookie holds only a random id.
  const sessionMiddleware = session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false, // no cookie until she actually signs in
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
      collectionName: 'sessions',
      ttl: 7 * 24 * 60 * 60, // seconds
      touchAfter: 24 * 60 * 60,
    }),
    cookie: {
      httpOnly: true, // page scripts cannot read it
      sameSite: 'strict', // not sent when another site links or posts here
      secure: config.isProduction, // HTTPS only on the live site
      maxAge: 7 * 24 * 60 * 60 * 1000, // about a week, in milliseconds
      path: '/',
    },
  })
  app.use('/api/admin', sessionMiddleware, createAdminRouter(config))

  // Anything else under /api gets the JSON 404 (never the website's page).
  app.use('/api', notFound)

  // Every other address: the website's pages and files.
  if (siteRouter) app.use(siteRouter)

  app.use(errorHandler)

  return app
}
