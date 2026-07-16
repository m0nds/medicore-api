import { getPagination } from "../../shared/utils/pagination"
import prisma from "../../config/database"
import { NotFoundError, ForbiddenError, ConflictError } from "../../shared/utils/errors"
import { UpdateDoctorInput } from "./doctor.schemas";


const doctorInclude = {
    user: { select: { name: true, email: true } },
    department: { select: { name: true } },
    specialisations: {
        include: {
            specialisation: { select: { name: true, description: true } }
        }
    }
}

export const getAllDoctors = async (query: Record<string, unknown>) => {
    const { limit, skip } = getPagination(query);

    const where = {
        ...(query.available === true && {
            isAvailable: true
        })
    }

    // Using Promise.all() runs both queries at the same time, which is more efficient than awaiting them one after the other.
    const [doctors, total] = await Promise.all([
        prisma.doctor.findMany({
            where,
            skip,
            take: limit,
            include: doctorInclude
        }),

        prisma.doctor.count({ where })
    ])

    return { doctors, total };
};

export const getDoctorById = async (id: string) => {
    const doctor = await prisma.doctor.findUnique({
        where: { id },
        include: doctorInclude
    })
    if (!doctor) {
        throw new NotFoundError('doctor')
    }

    return doctor
}

export const getMyDoctorProfile = async (userId: string) => {
    const doctor = await prisma.doctor.findUnique({
        where: { userId },
        include: doctorInclude
    })

    if (!doctor) {
        throw new NotFoundError('doctor')
    }

    return doctor
}

export const updateMyDoctorProfile = async (userId: string, data: UpdateDoctorInput) => {
    const findDoctor = await prisma.doctor.findUnique({ where: { userId } })

    if (!findDoctor) {
        throw new NotFoundError('doctor')
    }

    const updatedData = await prisma.doctor.update({
        where: { userId },
        data: {
            ...data,
            updatedAt: new Date()
        }
    })
    return updatedData
}

export const updateAvailability = async (userId: string, isAvailable: boolean) => {
    const findDoctor = await prisma.doctor.findUnique({ where: { userId } })
    if (!findDoctor) {
        throw new NotFoundError('doctor')
    }
    const updatedData = await prisma.doctor.update({
        where: { userId },
        data: {
            isAvailable
        }
    })
    return updatedData
}


export const assignSpecialisation = async (doctorId: string, specialisationId: string) => {
    const findDoctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
    const findSpecialization = await prisma.specialisation.findUnique({ where: { id: specialisationId } })

    if (!findDoctor) {
        throw new NotFoundError('doctor')
    }
    if (!findSpecialization) {
        throw new NotFoundError('specialization')
    }

    const existing = await prisma.doctorSpecialisation.findUnique({
        where: { doctorId_specialisationId: { doctorId, specialisationId } }
    })
    if (existing) throw new ConflictError(`${findSpecialization.name} department already assigned to this doctor`)

    await prisma.doctorSpecialisation.create({
        data: { doctorId, specialisationId }
    })

    return { message: `doctor assigned to a ${findSpecialization.name} department successfullly` }
}

export const removeSpecialisation = async (doctorId: string, specialisationId: string) => {
    const findDoctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
    const findSpecialization = await prisma.specialisation.findUnique({ where: { id: specialisationId } })

    if (!findDoctor) {
        throw new NotFoundError('doctor')
    }
    if (!findSpecialization) {
        throw new NotFoundError('specialization')
    }

      // check the ASSIGNMENT exists — this is what was missing
  const existing = await prisma.doctorSpecialisation.findUnique({
    where: { doctorId_specialisationId: { doctorId, specialisationId } }
  })
  if (!existing) throw new NotFoundError('specialisation assignment')

    await prisma.doctorSpecialisation.delete({
        where: { doctorId_specialisationId: { doctorId, specialisationId } }
    })


    return { message: `doctor removed from a ${findSpecialization.name} successfullly` }

}




