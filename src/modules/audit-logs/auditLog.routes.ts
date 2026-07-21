import { Router } from "express"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"
import { getAuditLogs } from "./auditLog.controller"

const router = Router()

router.get("/", authenticate, authorize("ADMIN"), getAuditLogs)

export default router