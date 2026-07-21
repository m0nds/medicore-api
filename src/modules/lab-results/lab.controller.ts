import { sendSuccess, sendPaginated, sendCreated } from "../../shared/utils/apiResponse";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as labService from './lab.service'
import { getPagination, getTotalPages } from "../../shared/utils/pagination"
import { Request, Response } from "express"
import { ValidationError } from "../../shared/utils/errors";
import { createLabOrderSchema, createLabResultSchema } from './lab.schemas'

export const createLabOrder = asyncHandler(async (req: Request, res: Response) => {
    const parsed = createLabOrderSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const user = await labService.createLabOrder(req.user!.id as string, parsed.data)
    sendSuccess(res, user, "Lab order created successfully!")
})


export const getMyLabOrders = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req.query)
    const labOrder = await labService.getMyLabOrders(req.user!.id, req.user!.role, req.query)
    const total = labOrder.total
    const totalPages = getTotalPages(total, limit)
    sendPaginated(res, labOrder.labOrders, {
        page,
        limit,
        total,
        totalPages
    })
})

export const getLabOrderById = asyncHandler(async (req: Request, res: Response) => {
    const user = await labService.getLabOrderById(req.params.id as string, req.user!.id, req.user!.role, req.ip as string, req.headers['user-agent'] as string)
    sendSuccess(res, user)
})

export const createLabResult = asyncHandler(async (req: Request, res: Response) => {
    const parsed = createLabResultSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const user = await labService.createLabResult(req.params.id as string, req.user!.id as string, req.user!.role, parsed.data)
    sendSuccess(res, user, "Lab result created successfully!")
})

export const getLabResultById = asyncHandler(async (req: Request, res: Response) => {
    const user = await labService.getLabResultById(req.params.id as string, req.user!.id, req.user!.role)
    sendSuccess(res, user)
})
