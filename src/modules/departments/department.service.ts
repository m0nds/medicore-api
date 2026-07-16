import prisma from "../../config/database"
import { CreateDepartmentInput, UpdateDepartmentInput } from "./department.schemas"
import { ConflictError, NotFoundError } from "../../shared/utils/errors"
import { getPagination } from "../../shared/utils/pagination"

export const getAllDepartments = async (query: Record<string, unknown>) => {
    const { limit, skip } = getPagination(query)
  
    const departments = await prisma.department.findMany({
      skip,
      take: limit,
      include: {
        headDoctor: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        doctors: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      }
    })
  
    const total = await prisma.department.count()
    return { departments, total }
  }

export const getDepartmentById = async (id: string) => {

    const departmentById = await prisma.department.findUnique({
        where: { id },
        include: {
            headDoctor: {
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            },
            doctors: {
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            }
        }
    })

    if (!departmentById) {
        throw new NotFoundError("department")
    }

    return departmentById

}

export const createDepartment = async (data: CreateDepartmentInput) => {
    const existing = await prisma.department.findUnique({ where: { name: data.name } })
    if (existing) throw new ConflictError("Department name already exists")
  
    return prisma.department.create({ data })
  }

  export const updateDepartment = async (id: string, data: UpdateDepartmentInput) => {
    const existing = await prisma.department.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError("Department")
  
    return prisma.department.update({
      where: { id },
      data: { ...data, updatedAt: new Date() }
    })
  }

  export const deleteDepartment = async (id: string) => {
    const existing = await prisma.department.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError("Department")
  
    await prisma.department.delete({ where: { id } })
    return { message: "Department deleted successfully" }
  }