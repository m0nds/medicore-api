import prisma from "../config/database"
import { emailQueue } from "../queues/queue"
import logger from "../config/logger"

export const sendAppointmentReminders = async () => {
    logger.info("Running appointment reminders job")

    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000)

    // find appointments scheduled between 23 and 24 hours from now
    // this prevents sending duplicate reminders on every run
    const appointments = await prisma.appointment.findMany({
        where: {
            scheduledAt: {
                gte: in23Hours,
                lte: in24Hours
            },
            status: {
                in: ["SCHEDULED", "CONFIRMED"]
            }
        },
        include: {
            patient: {
              include: {
                user: { select: { name: true, email: true } }
              }
            },
            doctor: {
              include: {
                user: { select: { name: true } }
              }
            }
          }
    })
    logger.info({ count: appointments.length }, "Appointments found for reminder")
     
    for (const appointment of appointments) {
        await emailQueue.add({
            type: "APPOINTMENT_REMINDER",
            to: appointment.patient.user.email,
            name: appointment.patient.user.name,
            data: {
                doctorName: appointment.doctor.user.name,
                scheduledAt: appointment.scheduledAt.toISOString(),
                reason: appointment.reason
            }
        })
    }
    logger.info("Appointment reminders job completed")

}