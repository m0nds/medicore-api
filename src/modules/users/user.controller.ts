import { Request, Response } from "express"
import { asyncHandler } from "../../shared/utils/asyncHandler"
import { sendSuccess } from "../../shared/utils/apiResponse"
import * as userService from "./user.service"
import { updateProfileSchema } from "./user.schemas"
import { ValidationError } from "../../shared/utils/errors"

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getMe(req.user!.id)
  sendSuccess(res, user)
})

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateProfileSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map(e => e.message).join("; "))
  }
  const user = await userService.updateMe(req.user!.id, parsed.data)
  sendSuccess(res, user, "Profile updated successfully")
})

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const { isActive } = req.body
    if (typeof isActive !== "boolean") {
      throw new ValidationError("isActive must be a boolean")
    }
    const user = await userService.updateUserStatus(req.params.id as string, isActive)
    sendSuccess(res, user, `Account ${isActive ? "activated" : "deactivated"} successfully`)
  })