import request from "supertest"
import app from "../../src/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } }
})

const testUser = {
  name: "Test Patient",
  email: "test@test.com",
  role: "PATIENT",
  password: "Test@1234",
  confirmPassword: "Test@1234"
}

describe("Auth endpoints", () => {
  afterEach(async () => {
    await prisma.patient.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(testUser)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.email).toBe(testUser.email)
      expect(res.body.data.password).toBeFalsy()
      expect(res.body.data.verificationToken).toBeFalsy()
    })

    it("should return 422 for weak password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...testUser, password: "weak", confirmPassword: "weak" })

      expect(res.status).toBe(422)
      expect(res.body.success).toBe(false)
    })

    it("should return 422 for mismatched passwords", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...testUser, confirmPassword: "Different@1234" })

      expect(res.status).toBe(422)
    })

    it("should return 409 for duplicate email", async () => {
      await request(app).post("/api/auth/register").send(testUser)
      const res = await request(app).post("/api/auth/register").send(testUser)

      expect(res.status).toBe(409)
    })

    it("should never return password in response", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(testUser)

        expect(res.body.data.password).toBeFalsy()
        expect(res.body.data.verificationToken).toBeFalsy()
        expect(res.body.data.resetPasswordToken).toBeFalsy()
    })
  })

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send(testUser)
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isVerified: true }
      })
    })

    it("should login successfully with correct credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: testUser.email, password: testUser.password })

      expect(res.status).toBe(200)
      expect(res.body.data.accessToken).toBeDefined()
      expect(res.headers["set-cookie"]).toBeDefined()
    })

    it("should return 401 for wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: testUser.email, password: "Wrong@1234" })

      expect(res.status).toBe(401)
    })

    it("should return 401 for unverified account", async () => {
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isVerified: false }
      })

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: testUser.email, password: testUser.password })

      expect(res.status).toBe(401)
    })
  })
})