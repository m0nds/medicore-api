import { getPagination } from "../../shared/utils/pagination"
import prisma from "../../config/database"
import { NotFoundError, ConflictError } from "../../shared/utils/errors"
import { UpdateDoctorInput } from "./doctor.schemas";
import { getCache, setCache, deleteCache, deleteCachePattern } from "../../shared/utils/cache"


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
    const { limit, skip, page } = getPagination(query)

    // cache key includes pagination so page 1 and page 2 are separate caches
    const cacheKey = `doctors:list:page${page}:limit${limit}`

    // check cache first
    const cached = await getCache(cacheKey)
    if (cached) return cached

    // cache miss — hit database
    const [doctors, total] = await Promise.all([
        prisma.doctor.findMany({
            skip,
            take: limit,
            include: doctorInclude
        }),
        prisma.doctor.count()
    ])

    const result = { doctors, total, page, limit }

    // store in cache for 5 minutes
    await setCache(cacheKey, result, 300)

    return result
}

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
    await deleteCachePattern("doctors:list:*")

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
    await deleteCachePattern("doctors:list:*")

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




