import { Router } from "express"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"
import * as appointmentController from "./appointment.controller"

const router = Router()

// book — patient and receptionist only
router.post("/", authenticate, authorize("PATIENT", "RECEPTIONIST"), appointmentController.bookAppointment)

// view own appointments
router.get("/", authenticate, appointmentController.getMyAppointments)  

// view specific appointment
router.get("/:id", authenticate, appointmentController.getAppointmentById)  

// update status — all clinical roles
router.patch("/:id/status", authenticate, authorize("DOCTOR", "RECEPTIONIST", "ADMIN"), appointmentController.updateAppointmentStatus)

// cancel — patient, doctor, receptionist, admin
router.patch("/:id/cancel", authenticate, appointmentController.cancelAppointment)

export default router

