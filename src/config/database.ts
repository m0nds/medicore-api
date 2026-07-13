import { PrismaClient } from "@prisma/client"
import logger from "./logger"

const prisma = new PrismaClient({
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "stdout" },
    { level: "warn", emit: "stdout" },
  ],
})

// Log slow queries — anything over 100ms gets flagged
prisma.$on("query", (e) => {
  if (e.duration > 100) {
    logger.warn({
      query: e.query,
      duration: `${e.duration}ms`,
    }, "Slow query detected")
  }
})

export default prisma