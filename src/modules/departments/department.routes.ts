import { Router } from "express"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"
import * as departmentController from "./department.controller"

const router = Router()

router.get("/", authenticate, departmentController.getAllDepartments)
router.get("/:id", authenticate, departmentController.getDepartmentById)
router.post("/", authenticate, authorize("ADMIN"), departmentController.createDepartment)
router.patch("/:id", authenticate, authorize("ADMIN"), departmentController.updateDepartment)
router.delete("/:id", authenticate, authorize("ADMIN"), departmentController.deleteDepartment)

export default router