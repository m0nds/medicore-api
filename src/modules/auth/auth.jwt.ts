import jwt from "jsonwebtoken"
import { env } from "../../config/env"

export const generateAccessToken = (userId: string, email: string, role: string): string =>
  jwt.sign({ sub: userId, email, role }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" })

export const generateRefreshToken = (userId: string): string =>
  jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" })

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET)

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET)