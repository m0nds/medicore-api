import prisma from "../../config/database"
import { NotFoundError, ForbiddenError, ConflictError } from "../../shared/utils/errors"
import { encrypt, decryptIfExists, } from "../../shared/utils/encryption"
import { createAuditLog } from "../../shared/middleware/auditLog"
import { CreatePrescriptionInput } from "./prescription.schemas"
import { getPagination } from "../../shared/utils/pagination"

const prescriptionInclude = {
    patient: { include: { user: { select: { name: true, email: true } } } },
    doctor: { include: { user: { select: { name: true, email: true } } } },
    medicalRecord: { select: { visitDate: true } }
}

const decryptPrescription = (prescription: any) => ({
    ...prescription,
    medication: decryptIfExists(prescription.medication),
    dosage: decryptIfExists(prescription.dosage),
    frequency: decryptIfExists(prescription.frequency),
    instructions: decryptIfExists(prescription.instructions),
})

export const createPrescription = async (doctorUserId: string, data: CreatePrescriptionInput) => {
    const doctor = await prisma.doctor.findUnique({ where: { userId: doctorUserId } })
    if (!doctor) {
        throw new NotFoundError("doctor")
    }
    const medicalRecord = await prisma.medicalRecord.findUnique({ where: { id: data.medicalRecordId } })
    if (!medicalRecord) {
        throw new NotFoundError("Medical record")
    }

    if (medicalRecord.doctorId !== doctor.id) {
        throw new ForbiddenError("You aren't assigned to this medical record")
    }

    const prescription = await prisma.prescription.create({
        data: {
            medicalRecordId: data.medicalRecordId,
            patientId: medicalRecord.patientId,
            doctorId: medicalRecord.doctorId,
            medication: encrypt(data.medication),
            dosage: encrypt(data.dosage),
            frequency: encrypt(data.frequency),
            duration: encrypt(data.duration),
            startDate: new Date(),
            instructions: data.instructions ? encrypt(data.instructions) : null,
            endDate: data.endDate ?? null,
            updatedAt: new Date()
        },
        include: prescriptionInclude
    })
    await createAuditLog(doctorUserId, "CREATE", "Prescription", prescription.id)
    return decryptPrescription(prescription)

}

export const getMyPrescriptions = async (userId: string, role: string, query: Record<string, unknown>) => {
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

    if (role === "RECEPTIONIST") {
        throw new ForbiddenError("Receptionists cannot access prescriptions")
      }

    const [prescription, total] = await Promise.all([
        prisma.prescription.findMany({
            where,
            skip,
            take: limit,
            include: prescriptionInclude,
        }),
        prisma.prescription.count({ where })
    ])

    await Promise.all(
        prescription.map(p => createAuditLog(userId, "VIEW", "Prescription", p.id))
      )


    return { prescription: prescription.map(p => decryptPrescription(p)), total, page, limit }
}

export const getPrescriptionById = async (prescriptionId: string, userId: string, role: string, ipAddress: string, userAgent: string) => {
    const prescription = await prisma.prescription.findUnique({ where: { id: prescriptionId }, include: prescriptionInclude })
    if (!prescription) {
        throw new NotFoundError("prescription")
    }

    if (role === "RECEPTIONIST") {
        throw new ForbiddenError("Receptionists cannot access prescription")
      }

    if (role === "PATIENT" && prescription.patient.userId !== userId) {
        throw new ForbiddenError("You are not allowed to view this prescription")
    }

    if (role === "DOCTOR" && prescription.doctor.userId !== userId) {
        throw new ForbiddenError("You are not allowed to view this prescription")
    }

    await createAuditLog(userId, "VIEW", "Prescription", prescription.id, undefined, ipAddress, userAgent)

    const decryptedRecord = decryptPrescription(prescription)
    return decryptedRecord
}

export const deactivatePrescription = async (prescriptionId: string, doctorUserId: string) => {
    const prescription = await prisma.prescription.findUnique({ where: { id: prescriptionId }, include: prescriptionInclude })
    if (!prescription) {
        throw new NotFoundError("prescription")
    }

    const doctor = await prisma.doctor.findUnique({ where: { userId: doctorUserId } })
    if (!doctor) {
        throw new NotFoundError("doctor")
    }

    if(prescription.doctorId !== doctor.id) {
        throw new ForbiddenError("you can't update this prescription")
    }

    const updatePrescription = await prisma.prescription.update({
        where: { id: prescriptionId },
        data: { isActive: false, updatedAt: new Date() },
        include: prescriptionInclude
    })
    
    await createAuditLog(doctorUserId, "UPDATE", "Prescription", prescription.id)
    return decryptPrescription(updatePrescription)
}