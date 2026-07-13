import { Request, Response, NextFunction } from "express"
import { ForbiddenError } from "../utils/errors"

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if(roles.includes(req.user?.role as string)) {
      next()
      return
    }
    throw new ForbiddenError("Access denied")
  }
}