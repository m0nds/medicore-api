import { z } from "zod"

export const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor ID"),
  scheduledAt: z.string()
    .datetime("Invalid date format")
    .transform(val => new Date(val))
    .refine(date => date > new Date(), "Appointment cannot be in the past"),
  duration: z.number().int().min(15).max(120).default(30),
  reason: z.string().min(5, "Please provide a reason for the appointment"),
  notes: z.string().optional()
})

export const cancelAppointmentSchema = z.object({
  cancellationReason: z.string().min(5, "Please provide a cancellation reason")
})

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>