import prisma from "../../config/database"
import { NotFoundError, ForbiddenError, ConflictError } from "../../shared/utils/errors"
import { encrypt, decryptIfExists } from "../../shared/utils/encryption"
import { createAuditLog } from "../../shared/middleware/auditLog"
import { CreateLabOrderInput, CreateLabResultInput } from "./lab.schemas"
import { getPagination } from "../../shared/utils/pagination"

const labOrderInclude = {
    patient: { include: { user: { select: { name: true, email: true } } } },
    doctor: { include: { user: { select: { name: true, email: true } } } },
    labResult: true
}

const decryptLabResult = (result: any) => ({
    ...result,
    resultData: decryptIfExists(result.resultData),
    interpretation: decryptIfExists(result.interpretation),
})

export const createLabOrder = async (doctorUserId: string, data: CreateLabOrderInput) => {
    const doctor = await prisma.doctor.findUnique({ where: { userId: doctorUserId } })
    if (!doctor) {
        throw new NotFoundError("doctor")
    }
    const medicalRecord = await prisma.medicalRecord.findUnique({ where: { id: data.medicalRecordId } })
    if (!medicalRecord) {
        throw new NotFoundError("Medical record")
    }

    if (medicalRecord.doctorId !== doctor.id) {
        throw new ForbiddenError("You aren't assigned to this lab order")
    }

    const labOrder = await prisma.labOrder.create({
        data: {
            medicalRecordId: data.medicalRecordId,
            patientId: medicalRecord.patientId,
            doctorId: medicalRecord.doctorId,
            testName: data.testName,
            urgency: data.urgency,
            instructions: data.instructions,
            updatedAt: new Date()
        },
        include: labOrderInclude
    })

    await createAuditLog(doctorUserId, "CREATE", "LabOrder", labOrder.id)
    return decryptLabResult(labOrder)
}

export const getMyLabOrders = async (userId: string, role: string, query: Record<string, unknown>) => {
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
        throw new ForbiddenError("Receptionists cannot access lab orders")
    }

    const [labOrder, total] = await Promise.all([
        prisma.labOrder.findMany({
            where,
            skip,
            take: limit,
            include: labOrderInclude,
        }),
        prisma.labOrder.count({ where })
    ])
    await Promise.all(
        labOrder.map(l => createAuditLog(userId, "VIEW", "LabOrder", l.id))
    )
    return { 
        labOrders: labOrder.map(o => ({
          ...o,
          labResult: o.labResult ? decryptLabResult(o.labResult) : null
        })), 
        total, page, limit 
      }
}


export const getLabOrderById = async (labOrderId: string, userId: string, role: string, ipAddress: string, userAgent: string) => {
    const labOrder = await prisma.labOrder.findUnique({ where: { id: labOrderId }, include: labOrderInclude })
    if (!labOrder) {
        throw new NotFoundError("lab order")
    }

    if (role === "RECEPTIONIST") {
        throw new ForbiddenError("Receptionists cannot access lab order")
    }

    if (role === "PATIENT" && labOrder.patient.userId !== userId) {
        throw new ForbiddenError("You are not allowed to view this lab order")
    }

    if (role === "DOCTOR" && labOrder.doctor.userId !== userId) {
        throw new ForbiddenError("You are not allowed to view this lab order")
    }
    await createAuditLog(userId, "VIEW", "LabOrder", labOrder.id, undefined, ipAddress, userAgent)

    return labOrder
}

export const createLabResult = async (labOrderId: string, userId: string, role:string, data: CreateLabResultInput) => {
    const labOrder = await prisma.labOrder.findUnique({ where: { id: labOrderId }, include: labOrderInclude })
    if (!labOrder) {
        throw new NotFoundError("lab order")
    }

    const result = await prisma.labResult.findUnique({ where: { labOrderId } })
    if (result) {
        throw new ConflictError("Lab result already exists for this order")
    }

    if (role === "DOCTOR") {
        const doctor = await prisma.doctor.findUnique({ where: { userId } })
        if(!doctor) {
            throw new NotFoundError("doctor")
        }
        if (labOrder.doctorId !== doctor.id) {
          throw new ForbiddenError("You can only upload results for your own lab orders")
        }
      }

    const labResult = await prisma.labResult.create({
        data: {
            labOrderId,
            resultData: encrypt(data.resultData),
            interpretation: data.interpretation ? encrypt(data.interpretation) : null,
            normalRange: data.normalRange,
            performedAt: data.performedAt,
            performedBy: data.performedBy,
            updatedAt: new Date()
        }
    })

    await prisma.labOrder.update({
        where: { id: labOrderId },
        data: {
            status: "COMPLETED",
            updatedAt: new Date()
        }

    })
    await createAuditLog(userId, "UPDATE", "LabOrder", labOrderId)

    await createAuditLog(userId, "CREATE", "LabResult", labResult.id)
    const decryptedResult = decryptLabResult(labResult)
    return decryptedResult
}

export const getLabResultById = async (labResultId: string, userId: string, role: string) => {
    const result = await prisma.labResult.findUnique({ where: { id: labResultId } })
if(!result) {
    throw new NotFoundError("result")
}

const labOrder = await prisma.labOrder.findUnique({ 
    where: { id: result.labOrderId }, 
    include: labOrderInclude 
  })

if (!labOrder) {
    throw new NotFoundError("lab order")
}

    if (role === "RECEPTIONIST") {
        throw new ForbiddenError("Receptionists cannot access lab result")
    }
    if (role === "PATIENT" && labOrder.patient.userId !== userId) {
        throw new ForbiddenError("You are not allowed to view this lab result")
    }

    if (role === "DOCTOR" && labOrder.doctor.userId !== userId) {
        throw new ForbiddenError("You are not allowed to view this lab result")
    }

    await createAuditLog(userId, "VIEW", "LabResult", result.id)
    return decryptLabResult(result)
}
