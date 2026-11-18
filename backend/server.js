import 'dotenv/config' // reads backend/.env into process.env
import { loadConfig } from './config.js'
import { connectDatabase } from './db.js'
import { createApp } from './app.js'
import { startBookingCleanup } from './services/bookingCleanup.js'

// Starts the API: check settings, connect to the database, then listen on PORT.
async function start() {
  let config
  try {
    config = loadConfig()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }

  const database = await connectDatabase(config)
  if (database.temporary) {
    console.log(
      '[db] No MONGODB_URI set: using a TEMPORARY in-memory database with sample data. ' +
        'Changes are lost when the server stops. Set MONGODB_URI in backend/.env to keep data.',
    )
  }
  if (config.sessionSecretWasGenerated) {
    console.log('[session] No SESSION_SECRET set: using a random one, so restarting signs you out.')
  }
  if (config.devLogin) {
    console.log('[admin] Dev login is ON (ALLOW_DEV_LOGIN=true). Never use this on the live site.')
  }

  // Personal data is not kept forever: remove old booking details now and once a day.
  startBookingCleanup(config.bookingKeepDays)

  const app = createApp(config)
  app.listen(config.port, () => {
    console.log(`[api] Listening on http://localhost:${config.port}`)
  })
}

start().catch((error) => {
  console.error(`[api] Could not start: ${error.message}`)
  process.exit(1)
})
