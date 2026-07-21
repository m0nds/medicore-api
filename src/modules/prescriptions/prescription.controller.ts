import { sendSuccess, sendPaginated, sendCreated } from "../../shared/utils/apiResponse";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as prescriptionService from './prescription.service'
import { getPagination, getTotalPages } from "../../shared/utils/pagination"
import { Request, Response } from "express"
import { ValidationError } from "../../shared/utils/errors";
import { createPrescriptionSchema } from './prescription.schemas'

export const createPrescription = asyncHandler(async (req: Request, res: Response) => {
    const parsed = createPrescriptionSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const user = await prescriptionService.createPrescription(req.user!.id as string, parsed.data)
    sendSuccess(res, user, "Prescription created successfully!")
})


export const getMyPrescriptions = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req.query)
    const prescription = await prescriptionService.getMyPrescriptions(req.user!.id, req.user!.role, req.query)
    const total = prescription.total
    const totalPages = getTotalPages(total, limit)
    sendPaginated(res, prescription.prescription, {
        page,
        limit,
        total,
        totalPages
    })
})

export const getPrescriptionById = asyncHandler(async (req: Request, res: Response) => {
    const user = await prescriptionService.getPrescriptionById(req.params.id as string, req.user!.id, req.user!.role, req.ip as string, req.headers['user-agent'] as string)
    sendSuccess(res, user)
})

export const deactivatePrescription = asyncHandler(async (req: Request, res: Response) => {
    const user = await prescriptionService.deactivatePrescription(req.params.id as string, req.user!.id)
    sendSuccess(res, user, "Prescription updated successfully!")
})
