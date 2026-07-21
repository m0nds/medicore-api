import { Router } from "express"
import { authenticate } from "../../shared/middleware/authenticate"
import * as labController from "./lab.controller"

const router = Router()

router.get("/:id", authenticate, labController.getLabResultById)

export default router