import { Request, Response, NextFunction } from "express"
import { AppError } from "../utils/errors"
import logger from "../../config/logger"

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    })
  }

  logger.error({ err }, "Unexpected error")
  res.status(500).json({
    success: false,
    error: "An unexpected error occurred",
    code: "INTERNAL_ERROR",
  })
}