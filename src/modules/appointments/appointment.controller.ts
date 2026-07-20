import { sendSuccess, sendPaginated, sendCreated } from "../../shared/utils/apiResponse";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as appointmentService from './appointment.service'
import { getPagination, getTotalPages } from "../../shared/utils/pagination"
import { Request, Response } from "express"
import { ValidationError } from "../../shared/utils/errors";
import { bookAppointmentSchema } from './appointment.schemas'

export const bookAppointment = asyncHandler(async (req: Request, res: Response) => {
    const parsed = bookAppointmentSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const user = await appointmentService.bookAppointment(req.user!.id as string, parsed.data)
    sendSuccess(res, user, "Appointment booked successfully!")
})

export const getAppointmentById = asyncHandler(async (req: Request, res: Response) => {
    const user = await appointmentService.getAppointmentById(req.params.id as string, req.user!.id, req.user!.role)
    sendSuccess(res, user)
})


export const getMyAppointments = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req.query)
    const appointments = await appointmentService.getMyAppointments(req.user!.id, req.user!.role, req.query)
    const total = appointments.total
    const totalPages = getTotalPages(total, limit)
    sendPaginated(res, appointments.appointments, {
        page,
        limit,
        total,
        totalPages
    })
})

export const updateAppointmentStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body
    if (!status) throw new ValidationError("Status is required")
    const user = await appointmentService.updateAppointmentStatus(req.params.id as string, status, req.user!.id, req.user!.role)
    sendSuccess(res, user, "Appointment confirmed!")
})

export const cancelAppointment = asyncHandler(async (req: Request, res: Response) => {
    const user = await appointmentService.updateAppointmentStatus(req.params.id as string, "CANCELLED", req.user!.id, req.user!.role, req.body.cancellationReason)
    sendSuccess(res, user, "Appointment cancelled!")
})