import { sendSuccess, sendPaginated, sendCreated } from "../../shared/utils/apiResponse";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as doctorService from './doctor.service'
import { getPagination, getTotalPages } from "../../shared/utils/pagination"
import { Request, Response } from "express"
import { ValidationError } from "../../shared/utils/errors";
import { updateDoctorSchema, updateAvailabilitySchema, assignSpecialisationSchema } from "./doctor.schemas";

export const getAllDoctors = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req.query)
    const doctor = await doctorService.getAllDoctors(req.query)
    const total = doctor.total
    const totalPages = getTotalPages(total, limit)
    sendPaginated(res, doctor.doctors , {
        page,
        limit,
        total,
        totalPages
    })
})

export const getDoctorById = asyncHandler(async (req: Request, res: Response) => {
    const user = await doctorService.getDoctorById(req.params.id as string)
    sendSuccess(res, user)
})

export const getMyDoctorProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await doctorService.getMyDoctorProfile(req.user!.id as string)
    sendSuccess(res, user)
})

export const updateMyDoctorProfile = asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateDoctorSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const user = await doctorService.updateMyDoctorProfile(req.user!.id as string, parsed.data)
    sendSuccess(res, user, "Doctor profile updated successfully")
})

export const updateAvailability = asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateAvailabilitySchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const user = await doctorService.updateAvailability(req.user!.id as string, parsed.data.isAvailable)
    sendSuccess(res, user, "Doctor availability updated successfully")
})

export const assignSpecialisation = asyncHandler(async (req: Request, res: Response) => {
    const parsed = assignSpecialisationSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const user = await doctorService.assignSpecialisation(req.params.id as string, parsed.data.specialisationId)
    sendSuccess(res, user)
})

export const removeSpecialisation = asyncHandler(async (req: Request, res: Response) => {
    const user = await doctorService.removeSpecialisation(req.params.id as string, req.params.specId as string)
    sendSuccess(res, user)
})