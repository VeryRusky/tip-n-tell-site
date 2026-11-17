import 'dotenv/config'
import mongoose from 'mongoose'
import { seedIfEmpty } from './seedData.js'

// `pnpm seed`: puts the sample slots and designs into the database in MONGODB_URI,
// but only into collections that are empty. Existing data is never changed.
//
// (Without MONGODB_URI, `pnpm dev` already uses a temporary database that is seeded
// automatically, so there is nothing to do here.)
const uri = process.env.MONGODB_URI
if (!uri) {
  console.log('MONGODB_URI is not set in backend/.env, so there is no database to seed.')
  console.log(
    '(pnpm dev without MONGODB_URI uses a temporary database that is seeded automatically.)',
  )
  process.exit(0)
}

try {
  await mongoose.connect(uri)
  const added = await seedIfEmpty()
  console.log(
    `Seed finished: added ${added.slots} slots and ${added.designs} designs. ` +
      '(0 means that collection already had data and was left alone.)',
  )
} catch (error) {
  console.error(`Seed failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
