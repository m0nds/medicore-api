import { Router } from "express"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"
import * as labController from "./lab.controller"

const router = Router()

router.post("/", authenticate, authorize("DOCTOR"), labController.createLabOrder)
router.get("/", authenticate, labController.getMyLabOrders)  
router.get("/:id", authenticate, labController.getLabOrderById)  
router.post("/:id/result", authenticate, authorize("ADMIN", "DOCTOR"), labController.createLabResult)

export default router
