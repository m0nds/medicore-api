import { sendSuccess, sendPaginated, sendCreated } from "../../shared/utils/apiResponse";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as departmentService from './department.service'
import { getPagination, getTotalPages } from "../../shared/utils/pagination"
import { Request, Response } from "express"
import { createDepartmentSchema, updateDepartmentSchema } from "./department.schemas";
import { ValidationError } from "../../shared/utils/errors";

export const getAllDepartments = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req.query)
    const result = await departmentService.getAllDepartments(req.query)
    sendPaginated(res, result.departments, {
        page, limit,
        total: result.total,
        totalPages: getTotalPages(result.total, limit)
    })
})

export const getDepartmentById = asyncHandler(async (req: Request, res: Response) => {
    const user = await departmentService.getDepartmentById(req.params.id as string)
    sendSuccess(res, user)
})

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
    const parsed = createDepartmentSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const user = await departmentService.createDepartment(parsed.data)
    sendCreated(res, user, "Department created successfully")
})

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateDepartmentSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const user = await departmentService.updateDepartment(req.params.id as string, parsed.data)
    sendSuccess(res, user, "Department updated successfully")
})

export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
    const result = await departmentService.deleteDepartment(req.params.id as string)
    sendSuccess(res, result, "Department deleted successfully")
})