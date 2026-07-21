import { z } from "zod"

export const createLabOrderSchema = z.object({
  medicalRecordId: z.string().uuid("Invalid medical record ID"),
  testName: z.string().min(2, "Test name is required"),
  urgency: z.enum(["ROUTINE", "URGENT", "STAT"]).default("ROUTINE"),
  instructions: z.string().optional()
})

export const createLabResultSchema = z.object({
  resultData: z.string().min(1, "Result data is required"),
  normalRange: z.string().optional(),
  interpretation: z.string().optional(),
  performedAt: z.string().datetime().transform(val => new Date(val)),
  performedBy: z.string().optional()
})

export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>
export type CreateLabResultInput = z.infer<typeof createLabResultSchema>