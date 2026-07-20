import { z } from "zod"

export const createMedicalRecordSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointment ID"),
  visitDate: z.string().datetime().transform(val => new Date(val)),
  diagnosis: z.string().min(3, "Diagnosis is required"),
  symptoms: z.string().min(3, "Symptoms are required"),
  treatment: z.string().min(3, "Treatment plan is required"),
  notes: z.string().optional(),
  followUpDate: z.string().datetime().transform(val => new Date(val)).optional()
})

export const updateMedicalRecordSchema = createMedicalRecordSchema.partial().omit({ appointmentId: true })

export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>
export type UpdateMedicalRecordInput = z.infer<typeof updateMedicalRecordSchema>