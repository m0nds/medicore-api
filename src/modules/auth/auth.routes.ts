import { Router } from "express"
import * as authController from "./auth.controller"

const router = Router()

router.post("/register", authController.register)
router.get("/verify", authController.verifyEmail)
router.post("/login", authController.login)
router.post("/logout", authController.logout)
router.post("/forgot-password", authController.forgotPassword)
router.post("/reset-password", authController.resetPassword)
router.post("/refresh", authController.refreshToken)

export default router