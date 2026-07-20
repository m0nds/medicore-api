import { Router } from "express"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"
import * as recordController from "./record.controller"

const router = Router()

router.post("/", authenticate, authorize("DOCTOR",), recordController.createMedicalRecord)
router.get("/", authenticate, recordController.getMyMedicalRecords)  
router.get("/:id", authenticate, recordController.getMedicalRecordById)  
router.patch("/:id", authenticate, authorize("DOCTOR",), recordController.updateMedicalRecord)

export default router
