export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public code?: string
    ) {
        super(message)
        this.name = "AppError"
        Object.setPrototypeOf(this, AppError.prototype)
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} not found`, 404, "NOT_FOUND")
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Access denied") {
        super(message, 403, "FORBIDDEN")
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized") {
        super(message, 401, "UNAUTHORIZED")
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 422, "VALIDATION_ERROR")
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409, "CONFLICT")
    }
}