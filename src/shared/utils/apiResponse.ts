import { Response } from "express"

export const sendSuccess = (
  res: Response,
  data: unknown,
  message = "Success",
  statusCode = 200
) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  })
}

export const sendCreated = (res: Response, data: unknown, message = "Created successfully") => {
  sendSuccess(res, data, message, 201)
}

export const sendPaginated = (
  res: Response,
  data: unknown,
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
) => {
  res.status(200).json({
    success: true,
    data,
    pagination,
  })
}