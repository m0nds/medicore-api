import { Router } from "express"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"
import * as patientController from "./patient.controller"

const router = Router()

router.get("/me", authenticate, authorize("PATIENT"), patientController.getMyPatientProfile)
router.patch("/me", authenticate, authorize("PATIENT"), patientController.updateMyPatientProfile)
router.get("/", authenticate, authorize("ADMIN", "DOCTOR"), patientController.getAllPatients)
router.get("/:id", authenticate, authorize("ADMIN", "DOCTOR"), patientController.getPatientById)

export default router