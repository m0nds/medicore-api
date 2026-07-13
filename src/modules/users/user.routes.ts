import { Router } from "express"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"
import * as userController from "./user.controller"

const router = Router()


router.get("/me", authenticate, userController.getMe)
router.patch("/me", authenticate, userController.updateMe)
router.patch("/:id/status", authenticate, authorize("ADMIN"), userController.updateUserStatus)

export default router