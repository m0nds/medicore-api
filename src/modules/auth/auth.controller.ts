import { Request, Response } from "express"
import { asyncHandler } from "../../shared/utils/asyncHandler"
import { sendSuccess, sendCreated } from "../../shared/utils/apiResponse"
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.schemas"
import * as authService from "./auth.service"
import { UnauthorizedError, ValidationError } from "../../shared/utils/errors"
import redis from "../../config/redis"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "./auth.jwt"
import prisma from "@/config/database"

// auth.controller.ts — Every handler does three things 
// only: validate input, call the service, send the response.

export const register = asyncHandler(async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const result = await authService.register(parsed.data)
    sendCreated(res, result, "Registration successful. Please check your email to verify your account.")
})

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.query
    const result = await authService.verifyEmail(token as string)
    sendSuccess(res, result)
})

export const login = asyncHandler(async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const { accessToken, refreshToken, user } = await authService.login(parsed.data)

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    sendSuccess(res, { accessToken, user }, "Login successful")
})

export const logout = asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization
    const token = authHeader?.split(" ")[1]

    if (token) {
        await redis.set(`blacklist:${token}`, "1", "EX", 900)
    }

    res.clearCookie("refreshToken", { httpOnly: true, sameSite: "strict" })
    sendSuccess(res, null, "Logged out successfully")
})

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const parsed = forgotPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const result = await authService.forgotPassword(parsed.data)
    sendSuccess(res, result)
})

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const parsed = resetPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
    }
    const result = await authService.resetPassword(parsed.data)
    sendSuccess(res, result)
})

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken
    if (!token) {
        throw new Error("No refresh token")
    }
    try {
        const decoded = verifyRefreshToken(token)
        if (typeof decoded === "string") {
            throw new UnauthorizedError("Invalid refresh token")
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.sub as string } })
        if (!user) throw new UnauthorizedError("User not found")

        const newAccessToken = generateAccessToken(user.id, user.email, user.role)
        const newRefreshToken = generateRefreshToken(user.id)
        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        sendSuccess(res, { accessToken: newAccessToken }, "Token refreshed")
    } catch (error) {
        throw new UnauthorizedError("Invalid or expired refresh token")
    }
})