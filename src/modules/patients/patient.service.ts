import prisma from "../../config/database"
import { NotFoundError, ForbiddenError } from "../../shared/utils/errors"
import { encryptIfExists, decryptIfExists } from "../../shared/utils/encryption"
import { UpdatePatientInput } from "./patient.schemas"
import { getPagination } from "../../shared/utils/pagination"

// Helper — decrypts sensitive fields on a patient record
const decryptPatient = (patient: any) => {
    if (!patient) return null
    return {
        ...patient,
        allergies: decryptIfExists(patient.allergies),
        insurancePolicyNumber: decryptIfExists(patient.insurancePolicyNumber),
    }
}

export const getMyPatientProfile = async (userId: string) => {
    const findMyPatientProfile = await prisma.patient.findUnique({ where: { userId } })
    if (!findMyPatientProfile) {
        throw new NotFoundError('patient')
    }
    const decryptedPatient = decryptPatient(findMyPatientProfile)
    return decryptedPatient
}

export const updateMyPatientProfile = async(userId: string, data: UpdatePatientInput) => {
    const findMyPatientProfile = await prisma.patient.findUnique({ where: { userId } })
    if (!findMyPatientProfile) {
        throw new NotFoundError('patient')
    }
    const updated = await prisma.patient.update({
        where: { userId },
        data: {
          ...data,
          allergies: encryptIfExists(data.allergies),
          insurancePolicyNumber: encryptIfExists(data.insurancePolicyNumber),
          updatedAt: new Date()
        }
      })
      return decryptPatient(updated)
}

export const getAllPatients = async (query: Record<string, unknown>) => {
    const { limit, skip } = getPagination(query)

    const patients = await prisma.patient.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: { name: true, email: true, isActive: true }
          }
        }
      })
    const total = await prisma.patient.count()

    return {
        patients: patients.map(decryptPatient),
        total,
    }
}

export const getPatientById = async (patientId: string, requesterId: string, requesterRole: string) => {
    const findMyPatientProfileById = await prisma.patient.findUnique({ where: { id: patientId } })

    if(!findMyPatientProfileById) {
        throw new NotFoundError("patient")
    }

    if(requesterRole === "PATIENT" && findMyPatientProfileById.userId !== requesterId ) {
        throw new ForbiddenError("patient can't see another patient")
    }
    const decryptedPatient = decryptPatient(findMyPatientProfileById)
    return decryptedPatient
}
