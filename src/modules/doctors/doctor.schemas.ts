import { z } from "zod"

export const updateDoctorSchema = z.object({
  bio: z.string().optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  licenseNumber: z.string().optional(),
}).strict()

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean()
})

export const assignSpecialisationSchema = z.object({
  specialisationId: z.string().uuid("Invalid specialisation ID")
})

export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>
export type AssignSpecialisationInput = z.infer<typeof assignSpecialisationSchema>