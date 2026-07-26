import { execSync } from "child_process"
import { PrismaClient } from "@prisma/client"
import { beforeAll, afterAll, afterEach } from "@jest/globals"

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.TEST_DATABASE_URL }
  }
})

beforeAll(async () => {
  // run migrations on test database
  execSync("npx prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL
    }
  })
})

afterEach(async () => {
  // clean all tables after each test
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.labResult.deleteMany()
  await prisma.labOrder.deleteMany()
  await prisma.prescription.deleteMany()
  await prisma.medicalRecord.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.doctorSpecialisation.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.doctor.deleteMany()
  await prisma.receptionist.deleteMany()
  await prisma.user.deleteMany()
  await prisma.specialisation.deleteMany()
  await prisma.department.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})