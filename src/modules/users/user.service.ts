import prisma from "../../config/database"
import { NotFoundError } from "../../shared/utils/errors"

export const getMe = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            patient: true,
            doctor: true,
            receptionist: true
        }
    })

    if (!user) {
        throw new NotFoundError("user")
    }

    const {
        password: _p,
        verificationToken: _vt,
        verificationExpiry: _ve,
        resetPasswordToken: _rpt,
        resetPasswordExpiry: _rpe,
        ...safeUser
    } = user;

    return safeUser
}

export const updateMe = async (userId: string, data: { name?: string }) => {

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.name && { name: data.name }),
          updatedAt: new Date()
        }
      })

    const {
        password: _p,
        verificationToken: _vt,
        verificationExpiry: _ve,
        resetPasswordToken: _rpt,
        resetPasswordExpiry: _rpe,
        ...safeUser
    } = updatedUser;

    return safeUser
}

export const updateUserStatus = async (userId: string, isActive: boolean) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError("User")
  
    return prisma.user.update({
      where: { id: userId },
      data: { isActive, updatedAt: new Date() }
    })
  }
