import { authorize } from "../../src/shared/middleware/authorize"
import { ForbiddenError } from "../../src/shared/utils/errors"

const mockRequest = (role: string) => ({
    user: { id: "user-123", email: "test@test.com", role }
} as any)

const mockResponse = () => ({} as any)

const mockNext = jest.fn()

describe("authorize middleware", () => {
    beforeEach(() => {
        mockNext.mockClear()
    })

    it("should call next() when role is allowed", () => {
        const middleware = authorize("ADMIN", "DOCTOR")
        const req = mockRequest("ADMIN")

        middleware(req, mockResponse(), mockNext)

        expect(mockNext).toHaveBeenCalledWith()
        expect(mockNext).toHaveBeenCalledTimes(1)
    })

    it("should throw ForbiddenError when role is not allowed", () => {
        const middleware = authorize("ADMIN")
        const req = mockRequest("PATIENT")

        expect(() => middleware(req, mockResponse(), mockNext)).toThrow(ForbiddenError)
    })

    it("should allow DOCTOR is in allowed roles", () => {
        const middleware = authorize("DOCTOR", "RECEPTIONIST")
        const req = mockRequest("DOCTOR")

        middleware(req, mockResponse(), mockNext)

        expect(mockNext).toHaveBeenCalledTimes(1)
    })

    it("should throw ForbiddenError for RECEPTIONIST on admin-only routes", () => {
        const middleware = authorize("ADMIN")
        const req = mockRequest("RECEPTIONIST")

        expect(() => middleware(req, mockResponse(), mockNext)).toThrow(ForbiddenError)
    })
})