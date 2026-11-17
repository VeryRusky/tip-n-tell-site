import mongoose from 'mongoose'
import { seedIfEmpty } from './seed/seedData.js'

let memoryServer = null

// Connects to MongoDB.
//   MONGODB_URI set -> that database (e.g. MongoDB Atlas).
//   not set, development -> a temporary in-memory database, filled with the sample data.
//   not set, production -> config.js has already refused to start.
export async function connectDatabase(config) {
  if (config.mongodbUri) {
    await mongoose.connect(config.mongodbUri)
    return { temporary: false }
  }

  // Loaded only when needed: it is a development tool, not installed on the live server.
  const { MongoMemoryServer } = await import('mongodb-memory-server')
  memoryServer = await MongoMemoryServer.create()
  await mongoose.connect(memoryServer.getUri('tipntell'))
  await seedIfEmpty()
  return { temporary: true }
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
  if (memoryServer) await memoryServer.stop()
  memoryServer = null
}
