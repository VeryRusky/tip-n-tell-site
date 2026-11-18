import express from 'express'
import helmet from 'helmet'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import mongoose from 'mongoose'
import { createPublicRouter } from './routes/publicRoutes.js'
import { createAdminRouter } from './routes/adminRoutes.js'
import { SESSION_COOKIE } from './controllers/sessionController.js'
import { createStorage } from './services/storage/index.js'
import { createPublicCache } from './services/publicCache.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

// Builds the Express app. server.js starts it; the tests use it directly with supertest.
// The database must already be connected (the session store keeps logins in MongoDB).
export function createApp(config) {
  const app = express()
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

  // Safe default headers (e.g. stop other sites framing these pages, block MIME sniffing).
  app.use(helmet())

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

  // Anything else under /api, and errors.
  app.use('/api', notFound)
  app.use(errorHandler)

  return app
}
