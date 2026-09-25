import 'dotenv/config'

function requireEnvironment(name, fallback) {
  const value = process.env[name] || fallback
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret || jwtSecret === 'replace-this-in-local-development') {
  throw new Error('JWT_SECRET must be configured with a non-default value')
}

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: requireEnvironment('MONGODB_URI', 'mongodb://127.0.0.1:27017/nexus_study'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  aiApiKey: process.env.AI_API_KEY || '',
  aiBaseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
  aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
}
