import cron from "node-cron"
import { sendAppointmentReminders } from "./appointment-reminders"
import logger from "../config/logger"

export const startScheduler = () => {
    // runs every hour
    cron.schedule("0 * * * *", async () => {
        logger.info("Scheduler triggered — appointment reminders")
        try {
            await sendAppointmentReminders()
        } catch (error) {
            logger.error({ error }, "Appointment reminders job failed")
        }
    })

    logger.info("Scheduler started — appointment reminders every hour")
}