import prisma from "../../config/database"
import { NotFoundError, ForbiddenError, AppError } from "../../shared/utils/errors"
import { BookAppointmentInput, CancelAppointmentInput } from "./appointment.schemas"
import { getPagination } from "../../shared/utils/pagination"

// SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED
//           ↘ CANCELLED                ↘ NO_SHOW

const appointmentInclude = {
    patient: {
        include: {
            user: { select: { name: true, email: true } }
        }
    },
    doctor: {
        include: {
            user: { select: { name: true, email: true } }
        }
    }
}

// Status transition rules — what status can move to what
const VALID_TRANSITIONS: Record<string, string[]> = {
    SCHEDULED: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
    IN_PROGRESS: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: []
}

const canTransition = (current: string, next: string): boolean => {
    return VALID_TRANSITIONS[current]?.includes(next) ?? false
}

export const bookAppointment = async (patientUserId: string, data: BookAppointmentInput) => {
    const findPatient = await prisma.patient.findUnique({ where: { userId: patientUserId } })
    if (!findPatient) {
        throw new NotFoundError("patient")
    }
    const findDoctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } })
    if (!findDoctor) {
        throw new NotFoundError("doctor")
    }

    if (!findDoctor.isAvailable) {
        throw new AppError("Doctor is not available for appointments", 400)
    }

    const createAppointment = await prisma.appointment.create({
        data: { ...data, patientId: findPatient.id, status: "SCHEDULED", updatedAt: new Date() },
        include: appointmentInclude
    })

    return createAppointment
}


export const getMyAppointments = async (userId: string, role: string, query: Record<string, unknown>) => {
    const { limit, skip, page } = getPagination(query);

    let where = {}

    if (role === "PATIENT") {
        const patient = await prisma.patient.findUnique({ where: { userId } })
        if (!patient) throw new NotFoundError("patient")
        where = { patientId: patient.id }
    }

    if (role === "DOCTOR") {
        const doctor = await prisma.doctor.findUnique({ where: { userId } })
        if (!doctor) throw new NotFoundError("doctor")
        where = { doctorId: doctor.id }
    }
    const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
            where,
            skip,
            take: limit,
            include: appointmentInclude,
            orderBy: { scheduledAt: "asc" }
        }),
        prisma.appointment.count({ where })
    ])

    return { appointments, total, page, limit }
}

export const getAppointmentById = async (appointmentId: string, userId: string, role: string) => {
    const findAppointment = await prisma.appointment.findUnique({where: {id: appointmentId}, include: appointmentInclude} )

    if(!findAppointment) {
        throw new NotFoundError("appointment")
    }

    if(role === "PATIENT" && findAppointment.patient.userId !== userId) {
 throw new ForbiddenError()
    }
    if(role === "DOCTOR" && findAppointment.doctor.userId !== userId) {
    throw new ForbiddenError()
    }

return findAppointment
}

export const updateAppointmentStatus = async (
    appointmentId: string,
    newStatus: string,
    userId: string,
    role: string,
    cancellationReason?: string
  ) => {
    const findAppointment = await prisma.appointment.findUnique({where: {id: appointmentId}, include: appointmentInclude} )

    if(!findAppointment) {
        throw new NotFoundError("appointment")
    }

    const existingRecord = await prisma.medicalRecord.findUnique({
        where: { appointmentId: findAppointment.id }
      })
      if (existingRecord) {
        throw new AppError("Cannot modify appointment after medical record has been created", 400)
      }

    if (!canTransition(findAppointment.status, newStatus)) {
        throw new AppError(`Cannot move from ${findAppointment.status} to ${newStatus}`, 400) 
    }

   if(newStatus === "CONFIRMED" || newStatus === "NO_SHOW") {
    if(role !== "DOCTOR" && role !== "RECEPTIONIST") {
        throw new ForbiddenError("Only doctors and receptionists can perform this action")
    }
   }

   if(newStatus === "IN_PROGRESS" || newStatus === "COMPLETED") {
    if(role !== "DOCTOR") {
        throw new ForbiddenError("Only doctors can perform this action")
    }
   }

   if(newStatus === "CANCELLED") {
    if(role === "PATIENT" && findAppointment.patient.userId !== userId) {
        throw new ForbiddenError("You can only cancel your own appointments")
    }
    if(role === "DOCTOR" && findAppointment.doctor.userId !== userId) {
        throw new ForbiddenError("You can only cancel your own appointments")
    }
    if(!cancellationReason) {
        throw new AppError("Cancellation reason is required", 400) 
    }
   }
  

    const updatedData: Record<string, unknown> = {
     status: newStatus, updatedAt: new Date() 
    }

    if(newStatus === "CANCELLED") {
        updatedData.cancelledAt = new Date()
        updatedData.cancelledBy = userId
        updatedData.cancellationReason = cancellationReason
    }

    if(newStatus === "NO_SHOW") {
        updatedData.cancelledAt = new Date()
    }
  
    const updated = await prisma.appointment.update({
        where: {id: appointmentId},
        data: updatedData,
        include: appointmentInclude
    })

    return updated
  }