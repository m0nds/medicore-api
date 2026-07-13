import prisma from "../../config/database"
import { CreateDepartmentInput, UpdateDepartmentInput } from "./department.schemas"
import { ConflictError, NotFoundError } from "../../shared/utils/errors"

export const getAllDepartments = async () => {
    const allDepartments = await prisma.department.findMany({
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

    return allDepartments
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