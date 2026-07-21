import { Router } from "express"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"
import * as prescriptionController from "./prescription.controller"

const router = Router()

router.post("/", authenticate, authorize("DOCTOR",), prescriptionController.createPrescription)
router.get("/", authenticate, prescriptionController.getMyPrescriptions)  
router.get("/:id", authenticate, prescriptionController.getPrescriptionById)  
router.patch("/:id", authenticate, authorize("DOCTOR",), prescriptionController.deactivatePrescription)

export default router
