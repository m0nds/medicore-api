import prisma from "../../config/database"
import { NotFoundError, ForbiddenError, AppError, ConflictError } from "../../shared/utils/errors"
import { encrypt, decryptIfExists } from "../../shared/utils/encryption"
import { createAuditLog } from "../../shared/middleware/auditLog"
import { CreateMedicalRecordInput, UpdateMedicalRecordInput } from "./record.schemas"
import { getPagination } from "../../shared/utils/pagination"

const recordInclude = {
    patient: { include: { user: { select: { name: true, email: true } } } },
    doctor: { include: { user: { select: { name: true, email: true } } } },
    appointment: { select: { scheduledAt: true, reason: true } }
}

// Decrypt sensitive fields after reading
const decryptRecord = (record: any) => ({
    ...record,
    diagnosis: decryptIfExists(record.diagnosis),
    symptoms: decryptIfExists(record.symptoms),
    treatment: decryptIfExists(record.treatment),
    notes: decryptIfExists(record.notes),
})

export const createMedicalRecord = async (doctorUserId: string, data: CreateMedicalRecordInput) => {
    const findDoctor = await prisma.doctor.findUnique({ where: { userId: doctorUserId } })
    if (!findDoctor) {
        throw new NotFoundError("doctor")
    }
    const findAppointment = await prisma.appointment.findUnique({ where: { id: data.appointmentId } })
    if (!findAppointment) {
        throw new NotFoundError("appointment")
    }

    if (findAppointment.doctorId !== findDoctor.id) {
        throw new ForbiddenError("you don't own this appointment")
    }
    if (findAppointment.status !== "IN_PROGRESS" && findAppointment.status !== "COMPLETED") {
        throw new AppError("Bad request", 400)
    }

    const existingRecords = await prisma.medicalRecord.findUnique({ where: { appointmentId: data.appointmentId } })

    if (existingRecords) {
        throw new ConflictError("Medical record already exists for this appointment")
    }

    const createRecords = await prisma.medicalRecord.create({
        data: {
            appointmentId: data.appointmentId,
            visitDate: data.visitDate,
            followUpDate: data.followUpDate ?? null,
            doctorId: findAppointment.doctorId,
            patientId: findAppointment.patientId,
            updatedAt: new Date(),
            diagnosis: encrypt(data.diagnosis),      // guaranteed by Zod
            symptoms: encrypt(data.symptoms),        // guaranteed by Zod
            treatment: encrypt(data.treatment),      // guaranteed by Zod
            notes: data.notes ? encrypt(data.notes) : null,
        },
        include: recordInclude
    })

    await createAuditLog(doctorUserId, "CREATE", "MedicalRecord", createRecords.id)
    return decryptRecord(createRecords)
}

export const getMyMedicalRecords = async (userId: string, role: string, query: Record<string, unknown>) => {
    const { limit, skip, page } = getPagination(query);
    let where = {}
    if (role === "PATIENT") {
        const patient = await prisma.patient.findUnique({
            where: { userId }
        })
        if (!patient) throw new NotFoundError("patient")
        where = { patientId: patient.id }
    }
    if (role === "DOCTOR") {
        const doctor = await prisma.doctor.findUnique({ where: { userId } })
        if (!doctor) throw new NotFoundError("doctor")
        where = { doctorId: doctor.id }
    }
    const [records, total] = await Promise.all([
        prisma.medicalRecord.findMany({
            where,
            skip,
            take: limit,
            include: recordInclude,
        }),
        prisma.medicalRecord.count({ where })
    ])

    await Promise.all(
        records.map(r => createAuditLog(userId, "VIEW", "MedicalRecord", r.id))
    )

    return { records: records.map(r => decryptRecord(r)), total, page, limit }
}

export const getMedicalRecordById = async (recordId: string, userId: string, role: string, ipAddress: string, userAgent: string) => {
    const records = await prisma.medicalRecord.findUnique({ where: { id: recordId }, include: recordInclude })
    if (!records) {
        throw new NotFoundError("records")
    }

    if (role === "RECEPTIONIST") {
        throw new ForbiddenError("Receptionists cannot access medical records")
      }

    if (role === "PATIENT" && records.patient.userId !== userId) {
        throw new ForbiddenError("You are not allowed to view this record")
    }

    if (role === "DOCTOR" && records.doctor.userId !== userId) {
        throw new ForbiddenError("You are not allowed to view this record")
    }

    await createAuditLog(userId, "VIEW", "MedicalRecord", records.id, undefined, ipAddress, userAgent)

    const decryptedRecord = decryptRecord(records)
    return decryptedRecord
}

export const updateMedicalRecord = async (recordId: string, doctorUserId: string, data: UpdateMedicalRecordInput) => {
    const records = await prisma.medicalRecord.findUnique({ where: { id: recordId }, include: recordInclude })
    if (!records) {
        throw new NotFoundError("records")
    }

    const doctor = await prisma.doctor.findUnique({ where: { userId: doctorUserId } })
    if (!doctor) {
        throw new NotFoundError("doctor")
    }

    if(records.doctorId !== doctor.id) {
        throw new ForbiddenError("you can't update this recordd")
    }

    const updateRecord = await prisma.medicalRecord.update({
        where: {id:recordId},
        data: {
            ...(data.diagnosis && { diagnosis: encrypt(data.diagnosis) }),
            ...(data.symptoms && { symptoms: encrypt(data.symptoms) }),
            ...(data.treatment && { treatment: encrypt(data.treatment) }),
            ...(data.notes !== undefined && { notes: data.notes ? encrypt(data.notes) : null }),
            ...(data.visitDate && { visitDate: data.visitDate }),
            ...(data.followUpDate !== undefined && { followUpDate: data.followUpDate ?? null }),
            updatedAt: new Date()
          },
        include: recordInclude
    })
    await createAuditLog(doctorUserId, "UPDATE", "MedicalRecord", records.id)
    return decryptRecord(updateRecord)
}