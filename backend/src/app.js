import cors from 'cors'
import express from 'express'
import authRoutes from './routes/auth.routes.js'
import careerPathRoutes from './routes/careerPaths.routes.js'
import platformRoutes from './routes/platform.routes.js'
import roomRoutes from './routes/rooms.routes.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/career-paths', careerPathRoutes)
app.use('/api/platform-config', platformRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
})

export default app
