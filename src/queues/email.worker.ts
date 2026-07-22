import { emailQueue, EmailJobData } from "./queue"
import { sendVerificationEmail, sendResetEmail } from "../modules/auth/auth.email"
import logger from "../config/logger"

emailQueue.process(async (job) => {
    const {type, to, name, data} = job.data as EmailJobData

    logger.info({type, to}, 'Processing email job')
    switch (type) {
        case "VERIFICATION":
          await sendVerificationEmail(to, name, data.token)
          break
        case "RESET_PASSWORD":
          await sendResetEmail(to, name, data.token)
          break
        case "APPOINTMENT_REMINDER":
          // we'll add this in Exercise 22
          break
        default:
          logger.warn({ type }, "Unknown email job type")
      }

      logger.info({type, to}, "Email job completed")
})

emailQueue.on("failed", (job, err) => {
    logger.error({jobId: job.id, err}, "Email job failed")
})

emailQueue.on("completed", (job) => {
    logger.info({jobId: job.id}, "Email job completed successfully")
})