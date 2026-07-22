import Bull from "bull"
import { env } from "../config/env"

const redisConfig = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT)
}

// Email queue — handles all email sending
export const emailQueue = new Bull('email', {redis: redisConfig})

// Notification queue — handles in-app notifications
export const notificationQueue = new Bull("notification", {redis: redisConfig})

export type EmailJobData = {
    type: "VERIFICATION" | "RESET_PASSWORD" | "APPOINTMENT_REMINDER"
    to: string
    name: string
    data: Record<string, string>
  }