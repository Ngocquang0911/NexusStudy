import http from 'node:http'
import { connectDatabase } from './config/db.js'
import { env } from './config/env.js'
import { createApp } from './app.js'
import { setupSocket } from './modules/chat/chat.socket.js'

const server = http.createServer(createApp())
setupSocket(server)

async function startServer() {
  await connectDatabase()
  server.listen(env.port, () => {
    console.log(`NEXUS STUDY API listening on http://localhost:${env.port}`)
  })
}

startServer().catch((error) => {
  console.error('Unable to start NEXUS STUDY API', error)
  process.exitCode = 1
})
