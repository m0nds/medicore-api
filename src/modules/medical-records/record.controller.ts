import { sendSuccess, sendPaginated, sendCreated } from "../../shared/utils/apiResponse";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as recordService from './record.service'
import { getPagination, getTotalPages } from "../../shared/utils/pagination"
import { Request, Response } from "express"
import { ValidationError } from "../../shared/utils/errors";
import { createMedicalRecordSchema, updateMedicalRecordSchema } from './record.schemas'

export const createMedicalRecord = asyncHandler(async (req: Request, res: Response) => {
    const parsed = createMedicalRecordSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const user = await recordService.createMedicalRecord(req.user!.id as string, parsed.data)
    sendSuccess(res, user, "medical record created successfully!")
})


export const getMyMedicalRecords = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req.query)
    const appointments = await recordService.getMyMedicalRecords(req.user!.id, req.user!.role, req.query)
    const total = appointments.total
    const totalPages = getTotalPages(total, limit)
    sendPaginated(res, appointments.records, {
        page,
        limit,
        total,
        totalPages
    })
})

export const getMedicalRecordById = asyncHandler(async (req: Request, res: Response) => {
    const user = await recordService.getMedicalRecordById(req.params.id as string, req.user!.id, req.user!.role, req.ip as string, req.headers['user-agent'] as string)
    sendSuccess(res, user)
})

export const updateMedicalRecord = asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateMedicalRecordSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const user = await recordService.updateMedicalRecord(req.params.id as string, req.user!.id, parsed.data)
    sendSuccess(res, user, "medical record updated successfully!")
})
