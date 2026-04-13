import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'incognitrix_dev_secret',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'CTF',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'incognitrix_academy',
  },
}
