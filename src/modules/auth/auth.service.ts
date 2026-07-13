import crypto from "crypto"
import bcrypt from "bcrypt"
import prisma from "../../config/database"
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from "./auth.schemas"
import { ConflictError, UnauthorizedError, NotFoundError, AppError } from "../../shared/utils/errors"
import { comparePassword, hashPassword } from "../../shared/utils/passwordUtils"
import { generateAccessToken, generateRefreshToken } from "./auth.jwt"
import { sendResetEmail, sendVerificationEmail } from "./auth.email"

export const register = async (input: RegisterInput) => {
    const { name, email, role, password } = input

    const prismaEmail = await prisma.user.findUnique({ where: { email } });

    if (prismaEmail) {
        throw new ConflictError(
            "Email Already exists",
        );
    }

    const hashedPassword = await hashPassword(password)

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                id: crypto.randomUUID(),
                name,
                email,
                role,
                password: hashedPassword,
                isVerified: false,
                isActive: true,
                verificationToken: token,
                verificationExpiry: expiry,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        if (role === "PATIENT") {
            await tx.patient.create({
                data: {
                    userId: user.id,
                    dateOfBirth: new Date("2000-01-01"), // placeholder
                    bloodType: "UNKNOWN"
                }
            })
        }
        if (role === "DOCTOR") {
            await tx.doctor.create({ data: { userId: user.id, licenseNumber: "PENDING" } })
        }
        if (role === "RECEPTIONIST") {
            await tx.receptionist.create({ data: { userId: user.id, employeeId: crypto.randomUUID() } })
        }

        const { password: _password, verificationToken, verificationExpiry, ...safeUser } = user

        return safeUser
    })
    await sendVerificationEmail(result.email, result.name, token)

    return result
}

export const verifyEmail = async (token: string) => {

    if (!token || typeof token !== "string") {
        throw new AppError("Verification token is required", 400);
    }

    const findUser = await prisma.user.findFirst({
        where: { verificationToken: token },
    });

    if (!findUser) {
        throw new AppError("Invalid or expired token", 400);
    }

    if (
        !findUser.verificationExpiry ||
        new Date() > findUser.verificationExpiry
    ) {
        throw new AppError("Token has expired, please register again", 400);
    }

    await prisma.user.update({
        where: { id: findUser.id }, // add this
        data: {
            isVerified: true,
            verificationToken: null,
            verificationExpiry: null,
            updatedAt: new Date(),
        },
    });

    return { message: "Email verified successfully, you can now login" }
}

export const login = async (input: LoginInput) => {

    const { email, password } = input


    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        throw new UnauthorizedError("Invalid credentials");
    }

    if (!user.isVerified) {
        throw new UnauthorizedError("Please verify your email before logging in");
    }

    if (!user.isActive) {
        throw new UnauthorizedError("Account deactivated");
    }

    const comparedPassword = await comparePassword(password, user.password);
    if (!comparedPassword) {
        throw new UnauthorizedError("Invalid credentials");
    }


    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    const {
        password: _p,
        verificationToken: _vt,
        verificationExpiry: _ve,
        resetPasswordToken: _rpt,
        resetPasswordExpiry: _rpe,
        ...safeUser
    } = user;

    return { accessToken, refreshToken, user: safeUser }
}

export const forgotPassword = async (input: ForgotPasswordInput) => {
    const { email } = input;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isVerified) {
        return { message: "If an account with that email exists, you will receive a reset link shortly", }
    }

    const resetPasswordToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
        where: { email },
        data: {
            resetPasswordToken,
            resetPasswordExpiry,
            updatedAt: new Date(),
        },
    });
    await sendResetEmail(email, user.name, resetPasswordToken)

    return { message: "If an account with that email exists, you will receive a reset link shortly" }

}

export const resetPassword = async (input: ResetPasswordInput) => {

    const { newPassword, token } = input;

    if (!token || typeof token !== "string") {
        throw new AppError("Verification token is required", 400);
    }

    const user = await prisma.user.findFirst({
        where: { resetPasswordToken: token },
    });
    if (!user) {
        throw new UnauthorizedError("Invalid or expired reset link");
    }

    if (!user.resetPasswordExpiry || new Date() > user.resetPasswordExpiry) {
        throw new UnauthorizedError(
            "Reset link has expired, please request a new one",
        );
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
        where: { email: user.email },
        data: {
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpiry: null,
            updatedAt: new Date(),
        },
    });

    return { message: "Password reset successful, please login with your new password" }
}