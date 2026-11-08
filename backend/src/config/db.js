import mongoose from 'mongoose'
import dns from 'node:dns'
import { env } from './env.js'

export async function connectDatabase() {
  if (env.mongoDnsServers) dns.setServers(env.mongoDnsServers.split(',').map((server) => server.trim()).filter(Boolean))
  await mongoose.connect(env.mongoUri)
  console.log('MongoDB connected')
}
