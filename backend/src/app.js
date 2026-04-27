import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import authRoutes from './routes/auth.routes.js'
import careerPathRoutes from './routes/careerPaths.routes.js'
import platformRoutes from './routes/platform.routes.js'
import roomRoutes from './routes/rooms.routes.js'
import notificationsRoutes from './routes/notifications.routes.js'
import ctfEventsRoutes from './routes/ctfEvents.routes.js'
import usersRoutes from './routes/users.routes.js'
import cvesRoutes from './routes/cves.routes.js'
import chatbotRoutes from './routes/chatbot.routes.js'
import adminAiRoutes from './routes/adminAi.routes.js'

const app = express()

const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '50mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/career-paths', careerPathRoutes)
app.use('/api/platform-config', platformRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/ctf-events', ctfEventsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/cves', cvesRoutes)
app.use('/api/chatbot', chatbotRoutes)
app.use('/api/admin-ai', adminAiRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
})

export default app
