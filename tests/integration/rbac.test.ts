import request from "supertest"
import app from "../../src/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const registerAndLogin = async (role: string, email: string) => {
  const registerRes = await request(app).post("/api/auth/register").send({
    name: "Test User",
    email,
    role,
    password: "Test@1234",
    confirmPassword: "Test@1234"
  })
  if (registerRes.status !== 201) {
    throw new Error(
      `registerAndLogin: register failed for ${email} with status ${registerRes.status}: ${JSON.stringify(registerRes.body)}`
    )
  }
  await prisma.user.update({
    where: { email },
    data: { isVerified: true }
  })
  const res = await request(app).post("/api/auth/login").send({
    email,
    password: "Test@1234"
  })
  return res.body.data.accessToken
}

describe("RBAC security tests", () => {
  afterEach(async () => {
    await prisma.notification.deleteMany()
    await prisma.patient.deleteMany()
    await prisma.doctor.deleteMany()
    await prisma.receptionist.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("should return 401 when no token provided", async () => {
    const res = await request(app).get("/api/doctors")
    expect(res.status).toBe(401)
  })

  it("should return 403 when PATIENT tries to create department", async () => {
    const token = await registerAndLogin("PATIENT", "patient@test.com")
    const res = await request(app)
      .post("/api/departments")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Cardiology" })
    expect(res.status).toBe(403)
  })

  it("should return 403 when RECEPTIONIST tries to access medical records", async () => {
    const token = await registerAndLogin("RECEPTIONIST", "receptionist@test.com")
    const res = await request(app)
      .get("/api/medical-records")
      .set("Authorization", `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it("should return 401 when using blacklisted token", async () => {
    const token = await registerAndLogin("PATIENT", "patient2@test.com")
    
    // logout — blacklists the token
    await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`)

    // try to use the blacklisted token
    const res = await request(app)
      .get("/api/doctors")
      .set("Authorization", `Bearer ${token}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe("Token has been invalidated")
  })
})