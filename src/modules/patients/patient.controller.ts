import { sendSuccess, sendPaginated } from "../../shared/utils/apiResponse";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as patientService from './patient.service'
import { getPagination, getTotalPages } from "../../shared/utils/pagination"
import { Request, Response } from "express"
import { ValidationError } from "../../shared/utils/errors";
import { updatePatientSchema } from "./patient.schemas";

export const getMyPatientProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await patientService.getMyPatientProfile(req.user!.id as string)
    sendSuccess(res, user)
})

export const updateMyPatientProfile = asyncHandler(async (req: Request, res: Response) => {
    const parsed = updatePatientSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const user = await patientService.updateMyPatientProfile(req.user!.id as string, parsed.data)
    sendSuccess(res, user, "Patient profile updated successfully")
})

export const getAllPatients = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req.query)
    const patient = await patientService.getAllPatients(req.query)
    const total = patient.total
    const totalPages = getTotalPages(total, limit)
    sendPaginated(res, patient.patients, {
        page,
        limit,
        total,
        totalPages
    })
})

export const getPatientById = asyncHandler(async (req: Request, res: Response) => {
    const user = await patientService.getPatientById(req.params.id as string, req.user!.id, req.user!.role)
    sendSuccess(res, user)
})
