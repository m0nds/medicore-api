import { Router } from "express"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"
import * as doctorController from "./doctor.controller"

const router = Router()

// always make /:id last
router.get("/me", authenticate, authorize("DOCTOR"), doctorController.getMyDoctorProfile)
router.patch("/me", authenticate, authorize("DOCTOR"), doctorController.updateMyDoctorProfile)
router.patch("/me/availability", authenticate, authorize("DOCTOR"), doctorController.updateAvailability)
router.get("/", authenticate, doctorController.getAllDoctors)
router.get("/:id", authenticate, doctorController.getDoctorById)
router.post("/:id/specialisations", authenticate, authorize("ADMIN"), doctorController.assignSpecialisation)
router.delete("/:id/specialisations/:specId", authenticate, authorize("ADMIN"), doctorController.removeSpecialisation)

export default router