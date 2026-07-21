import "dotenv/config"
import express from "express"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import { env } from "./config/env"
import logger from "./config/logger"
import { errorHandler } from "./shared/middleware/errorHandler"
import { requestLogger } from "./shared/middleware/requestLogger"
import authRouter from "./modules/auth/auth.routes"
import userRouter from "./modules/users/user.routes"
import departmentRouter from "./modules/departments/department.routes"
import patientRouter from "./modules/patients/patient.routes"
import doctorRouter from "./modules/doctors/doctor.routes"
import appointmentRouter from "./modules/appointments/appointment.routes"
import recordRouter from './modules/medical-records/record.routes'
import prescriptionRouter from "./modules/prescriptions/prescription.routes"
import labOrderRouter from "./modules/lab-results/lab.routes"
import labResultRouter from "./modules/lab-results/result.routes"

const app = express()

app.use(helmet())
app.disable("x-powered-by")
app.use(requestLogger) 
app.use(express.json())
app.use(cookieParser())

app.use("/api/auth", authRouter)
app.use("/api/users", userRouter)
app.use("/api/departments", departmentRouter)
app.use("/api/patients", patientRouter)
app.use("/api/doctors", doctorRouter)
app.use("/api/appointments", appointmentRouter)
app.use("/api/medical-records", recordRouter)
app.use("/api/prescriptions", prescriptionRouter)
app.use("/api/lab-orders", labOrderRouter)
app.use("/api/lab-results", labResultRouter)


app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
})

app.use(errorHandler)

app.listen(env.PORT, () => {
  logger.info(`MediCore API running on http://localhost:${env.PORT}`)
})

export default app