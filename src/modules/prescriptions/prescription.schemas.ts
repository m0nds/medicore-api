import { z } from "zod"

export const createPrescriptionSchema = z.object({
  medicalRecordId: z.string().uuid("Invalid medical record ID"),
  medication: z.string().min(2, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  instructions: z.string().optional(),
  startDate: z.string().datetime().transform(val => new Date(val)),
  endDate: z.string().datetime().transform(val => new Date(val)).optional()
})

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>