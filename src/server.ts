import "dotenv/config"
import express from "express"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import { env } from "./config/env"
import logger from "./config/logger"
import { errorHandler } from "./shared/middleware/errorHandler"
import { requestLogger } from "./shared/middleware/requestLogger"


const app = express()

app.use(helmet())
app.disable("x-powered-by")
app.use(requestLogger) 
app.use(express.json())
app.use(cookieParser())

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
})

app.use(errorHandler)

app.listen(env.PORT, () => {
  logger.info(`MediCore API running on http://localhost:${env.PORT}`)
})

export default app