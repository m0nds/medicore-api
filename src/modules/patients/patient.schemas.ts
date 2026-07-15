import { z } from "zod"

export const updatePatientSchema = z.object({
  dateOfBirth: z.string().optional(),
  bloodType: z.enum([
    "A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE",
    "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE", "UNKNOWN"
  ]).optional(),
  allergies: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
}).strict()

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>