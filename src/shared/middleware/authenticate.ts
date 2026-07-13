import { Request, Response, NextFunction } from "express"
import { UnauthorizedError } from "../utils/errors"
import { verifyAccessToken } from "../../modules/auth/auth.jwt"
import redis from "../../config/redis"
import { asyncHandler } from "../utils/asyncHandler"

export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader) throw new UnauthorizedError("No token provided")

  const token = authHeader.split(" ")[1]
  if (!token) throw new UnauthorizedError("Invalid token format")

  const isBlacklisted = await redis.get(`blacklist:${token}`)
  if (isBlacklisted) throw new UnauthorizedError("Token has been invalidated")

  try {
    const decoded = verifyAccessToken(token)
    if (typeof decoded === "string") throw new UnauthorizedError("Invalid token")

    req.user = {
      id: decoded.sub as string,
      email: decoded.email as string,
      role: decoded.role as string,
    }
    next()
  } catch {
    throw new UnauthorizedError("Invalid or expired token")
  }
})