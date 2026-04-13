import app from './app.js'
import { env } from './config/env.js'
import { testConnection } from './db/pool.js'

async function start() {
  try {
    await testConnection()
    const server = app.listen(env.port, () => {
      console.log(`Incognitrix backend listening on http://localhost:${env.port}`)
    })

    server.on('error', (error) => {
      if (error?.code === 'EADDRINUSE') {
        console.error(
          `Port ${env.port} is already in use. Stop the existing process or set a different PORT in backend/.env.`,
        )
      } else {
        console.error('Server listen error:', error)
      }
      process.exit(1)
    })
  } catch (error) {
    console.error('Failed to start backend')
    console.error({
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
      sqlState: error?.sqlState,
      sqlMessage: error?.sqlMessage,
      stack: error?.stack,
    })
    process.exit(1)
  }
}

start()
