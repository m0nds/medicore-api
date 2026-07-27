import swaggerUi from "swagger-ui-express"
import { Express } from "express"

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "MediCore API",
    version: "1.0.0",
    description: `
Healthcare clinic management API with HIPAA-style compliance.

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
\`Authorization: Bearer <accessToken>\`

Get a token by calling POST /api/auth/login.

## Roles
- **PATIENT** — own profile, appointments, medical records, prescriptions, lab results
- **DOCTOR** — own schedule, assigned patients clinical data, create records
- **RECEPTIONIST** — appointment management, basic patient info — NO clinical data
- **ADMIN** — everything

## Encryption
Sensitive fields (diagnosis, medication, lab results) are AES-256-GCM encrypted at rest.
The API returns decrypted values automatically.
    `
  },
  servers: [
    { url: "http://localhost:8080", description: "Local development" }
  ],
  tags: [
    { name: "Auth", description: "Registration, login, password management" },
    { name: "Users", description: "User profile management" },
    { name: "Departments", description: "Clinical department management" },
    { name: "Specialisations", description: "Doctor specialisation assignment" },
    { name: "Patients", description: "Patient profile management" },
    { name: "Doctors", description: "Doctor profile and availability" },
    { name: "Appointments", description: "Appointment booking and status management" },
    { name: "Medical Records", description: "Clinical records — encrypted" },
    { name: "Prescriptions", description: "Prescription management — encrypted" },
    { name: "Lab Orders", description: "Lab test ordering and results" },
    { name: "Lab Results", description: "Lab result access" },
    { name: "Notifications", description: "In-app notification management" },
    { name: "Audit Logs", description: "Immutable access audit trail — ADMIN only" },
    { name: "System", description: "Health check" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token from POST /api/auth/login"
      }
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "Error message" },
          code: { type: "string", example: "ERROR_CODE" }
        }
      },
      Success: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: { type: "object" }
        }
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 10 },
          total: { type: "integer", example: 47 },
          totalPages: { type: "integer", example: 5 }
        }
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string" },
          name: { type: "string" },
          role: { type: "string", enum: ["PATIENT", "DOCTOR", "RECEPTIONIST", "ADMIN"] },
          isVerified: { type: "boolean" },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      Department: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: "string" },
          headDoctorId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      Doctor: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          licenseNumber: { type: "string" },
          bio: { type: "string", nullable: true },
          yearsOfExperience: { type: "integer" },
          isAvailable: { type: "boolean" },
          user: { $ref: "#/components/schemas/UserBasic" },
          department: { type: "object", nullable: true },
          specialisations: { type: "array", items: { type: "object" } }
        }
      },
      Patient: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          dateOfBirth: { type: "string", format: "date-time" },
          bloodType: { type: "string", enum: ["A_POSITIVE","A_NEGATIVE","B_POSITIVE","B_NEGATIVE","AB_POSITIVE","AB_NEGATIVE","O_POSITIVE","O_NEGATIVE","UNKNOWN"] },
          allergies: { type: "string", nullable: true, description: "Decrypted" },
          emergencyContactName: { type: "string", nullable: true },
          emergencyContactPhone: { type: "string", nullable: true },
          insuranceProvider: { type: "string", nullable: true },
          insurancePolicyNumber: { type: "string", nullable: true, description: "Decrypted" }
        }
      },
      Appointment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          scheduledAt: { type: "string", format: "date-time" },
          duration: { type: "integer", example: 30 },
          status: { type: "string", enum: ["SCHEDULED","CONFIRMED","IN_PROGRESS","COMPLETED","CANCELLED","NO_SHOW"] },
          reason: { type: "string" },
          notes: { type: "string", nullable: true },
          cancelledAt: { type: "string", nullable: true, format: "date-time" },
          cancellationReason: { type: "string", nullable: true },
          patient: { type: "object" },
          doctor: { type: "object" }
        }
      },
      MedicalRecord: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          appointmentId: { type: "string", format: "uuid" },
          visitDate: { type: "string", format: "date-time" },
          diagnosis: { type: "string", description: "Encrypted at rest, decrypted in response" },
          symptoms: { type: "string", description: "Encrypted at rest, decrypted in response" },
          treatment: { type: "string", description: "Encrypted at rest, decrypted in response" },
          notes: { type: "string", nullable: true, description: "Encrypted at rest" },
          followUpDate: { type: "string", nullable: true, format: "date-time" }
        }
      },
      Prescription: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          medication: { type: "string", description: "Encrypted at rest" },
          dosage: { type: "string", description: "Encrypted at rest" },
          frequency: { type: "string", description: "Encrypted at rest" },
          duration: { type: "string" },
          instructions: { type: "string", nullable: true, description: "Encrypted at rest" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", nullable: true, format: "date-time" },
          isActive: { type: "boolean" }
        }
      },
      LabOrder: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          testName: { type: "string" },
          urgency: { type: "string", enum: ["ROUTINE","URGENT","STAT"] },
          instructions: { type: "string", nullable: true },
          status: { type: "string", example: "PENDING" },
          labResult: { type: "object", nullable: true }
        }
      },
      LabResult: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          resultData: { type: "string", description: "Encrypted at rest" },
          normalRange: { type: "string", nullable: true },
          interpretation: { type: "string", nullable: true, description: "Encrypted at rest" },
          performedAt: { type: "string", format: "date-time" },
          performedBy: { type: "string", nullable: true }
        }
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          type: { type: "string", enum: ["APPOINTMENT_BOOKED","APPOINTMENT_CONFIRMED","APPOINTMENT_CANCELLED","APPOINTMENT_REMINDER","LAB_RESULT_READY","PRESCRIPTION_READY","GENERAL"] },
          title: { type: "string" },
          message: { type: "string" },
          isRead: { type: "boolean" },
          readAt: { type: "string", nullable: true, format: "date-time" },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          actorId: { type: "string" },
          action: { type: "string", enum: ["VIEW","CREATE","UPDATE","DELETE"] },
          resource: { type: "string", example: "MedicalRecord" },
          resourceId: { type: "string" },
          details: { type: "string", nullable: true },
          ipAddress: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          actor: { type: "object" }
        }
      },
      UserBasic: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" }
        }
      }
    }
  },
  paths: {
    // ─── AUTH ───────────────────────────────────────────────
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description: "Creates a user account and sends a verification email. ADMIN role cannot self-register.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name","email","role","password","confirmPassword"],
                properties: {
                  name: { type: "string", example: "John Doe" },
                  email: { type: "string", example: "john@example.com" },
                  role: { type: "string", enum: ["PATIENT","DOCTOR","RECEPTIONIST"] },
                  password: { type: "string", example: "SecurePass@123", description: "Min 8 chars, uppercase, number, special character" },
                  confirmPassword: { type: "string", example: "SecurePass@123" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Registration successful. Verification email sent." },
          "409": { description: "Email already exists" },
          "422": { description: "Validation error" }
        }
      }
    },
    "/api/auth/verify": {
      get: {
        tags: ["Auth"],
        summary: "Verify email address",
        description: "Verifies user email using the token sent to their email. Token expires after 24 hours.",
        parameters: [
          { name: "token", in: "query", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Email verified successfully" },
          "400": { description: "Invalid or expired token" }
        }
      }
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        description: "Returns a 15-minute access token and sets a 7-day httpOnly refresh token cookie.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email","password"],
                properties: {
                  email: { type: "string", example: "john@example.com" },
                  password: { type: "string", example: "SecurePass@123" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Login successful — returns accessToken in body, refreshToken in httpOnly cookie" },
          "401": { description: "Invalid credentials or unverified account" }
        }
      }
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        description: "Uses the httpOnly refresh token cookie to issue a new access token. Rotates the refresh token.",
        responses: {
          "200": { description: "New access token issued" },
          "401": { description: "Invalid or expired refresh token" }
        }
      }
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        description: "Blacklists the access token in Redis and clears the refresh token cookie.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Logged out successfully" },
          "401": { description: "Unauthorized" }
        }
      }
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset",
        description: "Sends a password reset email. Always returns the same response whether the email exists or not (prevents email enumeration).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", example: "john@example.com" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Reset link sent if account exists" }
        }
      }
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password",
        description: "Resets password using the token from the reset email. Token expires after 1 hour.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token","newPassword","confirmPassword"],
                properties: {
                  token: { type: "string" },
                  newPassword: { type: "string", example: "NewSecurePass@123" },
                  confirmPassword: { type: "string", example: "NewSecurePass@123" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Password reset successful" },
          "400": { description: "Invalid or expired token" }
        }
      }
    },

    // ─── USERS ───────────────────────────────────────────────
    "/api/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get own profile",
        description: "Returns the authenticated user's profile including their role-specific data (patient/doctor/receptionist profile).",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "User profile with nested role-specific data" },
          "401": { description: "Unauthorized" }
        }
      },
      patch: {
        tags: ["Users"],
        summary: "Update own profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 2 }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Profile updated" },
          "401": { description: "Unauthorized" }
        }
      }
    },
    "/api/users/{id}/status": {
      patch: {
        tags: ["Users"],
        summary: "Activate or deactivate user account (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["isActive"],
                properties: {
                  isActive: { type: "boolean" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Account status updated" },
          "403": { description: "Admin only" }
        }
      }
    },

    // ─── DEPARTMENTS ─────────────────────────────────────────
    "/api/departments": {
      get: {
        tags: ["Departments"],
        summary: "List all departments",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": { description: "Paginated list of departments with doctors" }
        }
      },
      post: {
        tags: ["Departments"],
        summary: "Create department (ADMIN only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Cardiology" },
                  description: { type: "string" },
                  headDoctorId: { type: "string", format: "uuid" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Department created" },
          "403": { description: "Admin only" },
          "409": { description: "Department name already exists" }
        }
      }
    },
    "/api/departments/{id}": {
      get: {
        tags: ["Departments"],
        summary: "Get department by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Department with doctors and head doctor" },
          "404": { description: "Department not found" }
        }
      },
      patch: {
        tags: ["Departments"],
        summary: "Update department (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  headDoctorId: { type: "string", format: "uuid" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Department updated" },
          "403": { description: "Admin only" },
          "404": { description: "Department not found" }
        }
      },
      delete: {
        tags: ["Departments"],
        summary: "Delete department (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Department deleted" },
          "403": { description: "Admin only" },
          "404": { description: "Department not found" }
        }
      }
    },

    // ─── DOCTORS ─────────────────────────────────────────────
    "/api/doctors": {
      get: {
        tags: ["Doctors"],
        summary: "List all doctors",
        description: "Returns paginated list of doctors. Results are Redis-cached for 5 minutes.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "available", in: "query", schema: { type: "boolean" }, description: "Filter by availability" }
        ],
        responses: {
          "200": { description: "Paginated list of doctors with specialisations and department" }
        }
      }
    },
    "/api/doctors/me": {
      get: {
        tags: ["Doctors"],
        summary: "Get own doctor profile (DOCTOR only)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Doctor profile" },
          "403": { description: "Doctor only" }
        }
      },
      patch: {
        tags: ["Doctors"],
        summary: "Update own doctor profile (DOCTOR only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  bio: { type: "string" },
                  yearsOfExperience: { type: "integer", minimum: 0 },
                  licenseNumber: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Doctor profile updated" },
          "403": { description: "Doctor only" }
        }
      }
    },
    "/api/doctors/me/availability": {
      patch: {
        tags: ["Doctors"],
        summary: "Toggle availability (DOCTOR only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["isAvailable"],
                properties: {
                  isAvailable: { type: "boolean" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Availability updated" },
          "403": { description: "Doctor only" }
        }
      }
    },
    "/api/doctors/{id}": {
      get: {
        tags: ["Doctors"],
        summary: "Get doctor by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Doctor profile" },
          "404": { description: "Doctor not found" }
        }
      }
    },
    "/api/doctors/{id}/specialisations": {
      post: {
        tags: ["Specialisations"],
        summary: "Assign specialisation to doctor (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Doctor ID" }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["specialisationId"],
                properties: {
                  specialisationId: { type: "string", format: "uuid" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Specialisation assigned" },
          "403": { description: "Admin only" },
          "404": { description: "Doctor or specialisation not found" },
          "409": { description: "Already assigned" }
        }
      }
    },
    "/api/doctors/{id}/specialisations/{specId}": {
      delete: {
        tags: ["Specialisations"],
        summary: "Remove specialisation from doctor (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Doctor ID" },
          { name: "specId", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Specialisation ID" }
        ],
        responses: {
          "200": { description: "Specialisation removed" },
          "403": { description: "Admin only" },
          "404": { description: "Assignment not found" }
        }
      }
    },

    // ─── PATIENTS ─────────────────────────────────────────────
    "/api/patients/me": {
      get: {
        tags: ["Patients"],
        summary: "Get own patient profile (PATIENT only)",
        description: "Returns patient profile with decrypted allergies and insurance data.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Patient profile" },
          "403": { description: "Patient only" }
        }
      },
      patch: {
        tags: ["Patients"],
        summary: "Update own patient profile (PATIENT only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  dateOfBirth: { type: "string", format: "date-time" },
                  bloodType: { type: "string", enum: ["A_POSITIVE","A_NEGATIVE","B_POSITIVE","B_NEGATIVE","AB_POSITIVE","AB_NEGATIVE","O_POSITIVE","O_NEGATIVE","UNKNOWN"] },
                  allergies: { type: "string", description: "Will be encrypted" },
                  emergencyContactName: { type: "string" },
                  emergencyContactPhone: { type: "string" },
                  insuranceProvider: { type: "string" },
                  insurancePolicyNumber: { type: "string", description: "Will be encrypted" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Patient profile updated" },
          "403": { description: "Patient only" }
        }
      }
    },
    "/api/patients": {
      get: {
        tags: ["Patients"],
        summary: "List all patients (ADMIN, DOCTOR)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": { description: "Paginated list of patients" },
          "403": { description: "Admin or Doctor only" }
        }
      }
    },
    "/api/patients/{id}": {
      get: {
        tags: ["Patients"],
        summary: "Get patient by ID (ADMIN, DOCTOR)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Patient profile" },
          "403": { description: "Admin or Doctor only" },
          "404": { description: "Patient not found" }
        }
      }
    },

    // ─── APPOINTMENTS ─────────────────────────────────────────
    "/api/appointments": {
      post: {
        tags: ["Appointments"],
        summary: "Book appointment (PATIENT, RECEPTIONIST)",
        description: "Prevents double-booking via database unique constraint on (doctorId, scheduledAt).",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["doctorId","scheduledAt","reason"],
                properties: {
                  doctorId: { type: "string", format: "uuid" },
                  scheduledAt: { type: "string", format: "date-time", description: "Must be in the future" },
                  duration: { type: "integer", default: 30, minimum: 15, maximum: 120 },
                  reason: { type: "string", minLength: 5 },
                  notes: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Appointment booked. Doctor notified via WebSocket." },
          "400": { description: "Doctor unavailable or past date" },
          "403": { description: "Patient or Receptionist only" },
          "409": { description: "Doctor already booked at this time" }
        }
      },
      get: {
        tags: ["Appointments"],
        summary: "Get own appointments",
        description: "Role-filtered: patients see own, doctors see own, receptionists and admins see all.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": { description: "Paginated appointments" }
        }
      }
    },
    "/api/appointments/{id}": {
      get: {
        tags: ["Appointments"],
        summary: "Get appointment by ID",
        description: "Patients and doctors can only access their own appointments.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Appointment details" },
          "403": { description: "Not your appointment" },
          "404": { description: "Appointment not found" }
        }
      }
    },
    "/api/appointments/{id}/status": {
      patch: {
        tags: ["Appointments"],
        summary: "Update appointment status (DOCTOR, RECEPTIONIST, ADMIN)",
        description: "Status flow: SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED. CANCELLED and NO_SHOW available from certain states.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["CONFIRMED","IN_PROGRESS","COMPLETED","NO_SHOW"] }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Status updated" },
          "400": { description: "Invalid status transition" },
          "403": { description: "Insufficient permissions for this transition" }
        }
      }
    },
    "/api/appointments/{id}/cancel": {
      patch: {
        tags: ["Appointments"],
        summary: "Cancel appointment",
        description: "Any involved party can cancel. Completed appointments cannot be cancelled.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["cancellationReason"],
                properties: {
                  cancellationReason: { type: "string", minLength: 5 }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Appointment cancelled" },
          "400": { description: "Cannot cancel a completed appointment" },
          "403": { description: "Not your appointment" }
        }
      }
    },

    // ─── MEDICAL RECORDS ─────────────────────────────────────
    "/api/medical-records": {
      post: {
        tags: ["Medical Records"],
        summary: "Create medical record (DOCTOR only)",
        description: "Can only be created for appointments in IN_PROGRESS or COMPLETED status. One record per appointment. Sensitive fields are AES-256-GCM encrypted. Access is audit logged.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["appointmentId","visitDate","diagnosis","symptoms","treatment"],
                properties: {
                  appointmentId: { type: "string", format: "uuid" },
                  visitDate: { type: "string", format: "date-time" },
                  diagnosis: { type: "string" },
                  symptoms: { type: "string" },
                  treatment: { type: "string" },
                  notes: { type: "string" },
                  followUpDate: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Medical record created with decrypted fields" },
          "400": { description: "Appointment not in correct status" },
          "403": { description: "Doctor only / not your appointment" },
          "409": { description: "Record already exists for this appointment" }
        }
      },
      get: {
        tags: ["Medical Records"],
        summary: "Get own medical records",
        description: "PATIENT sees own records. DOCTOR sees records they created. RECEPTIONIST is blocked. Every access is audit logged.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": { description: "Paginated medical records with decrypted fields" },
          "403": { description: "Receptionist blocked" }
        }
      }
    },
    "/api/medical-records/{id}": {
      get: {
        tags: ["Medical Records"],
        summary: "Get medical record by ID",
        description: "RECEPTIONIST blocked. Access is audit logged with IP and user agent.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Medical record with decrypted fields" },
          "403": { description: "Receptionist blocked or not your record" },
          "404": { description: "Record not found" }
        }
      },
      patch: {
        tags: ["Medical Records"],
        summary: "Update medical record (DOCTOR only — must be creator)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  diagnosis: { type: "string" },
                  symptoms: { type: "string" },
                  treatment: { type: "string" },
                  notes: { type: "string" },
                  followUpDate: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Record updated with decrypted fields" },
          "403": { description: "Not your record" }
        }
      }
    },

    // ─── PRESCRIPTIONS ────────────────────────────────────────
    "/api/prescriptions": {
      post: {
        tags: ["Prescriptions"],
        summary: "Create prescription (DOCTOR only)",
        description: "Linked to a medical record. patientId and doctorId are derived server-side. Sensitive fields encrypted.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["medicalRecordId","medication","dosage","frequency","duration","startDate"],
                properties: {
                  medicalRecordId: { type: "string", format: "uuid" },
                  medication: { type: "string" },
                  dosage: { type: "string", example: "500mg" },
                  frequency: { type: "string", example: "twice daily" },
                  duration: { type: "string", example: "7 days" },
                  instructions: { type: "string" },
                  startDate: { type: "string", format: "date-time" },
                  endDate: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Prescription created with decrypted fields" },
          "403": { description: "Doctor only / not your record" }
        }
      },
      get: {
        tags: ["Prescriptions"],
        summary: "Get own prescriptions",
        description: "PATIENT sees own. DOCTOR sees theirs. RECEPTIONIST blocked.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": { description: "Paginated prescriptions" },
          "403": { description: "Receptionist blocked" }
        }
      }
    },
    "/api/prescriptions/{id}": {
      get: {
        tags: ["Prescriptions"],
        summary: "Get prescription by ID",
        description: "RECEPTIONIST blocked.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Prescription with decrypted fields" },
          "403": { description: "Receptionist blocked" },
          "404": { description: "Prescription not found" }
        }
      },
      patch: {
        tags: ["Prescriptions"],
        summary: "Deactivate prescription (DOCTOR only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Prescription deactivated" },
          "403": { description: "Doctor only / not your prescription" }
        }
      }
    },

    // ─── LAB ORDERS ───────────────────────────────────────────
    "/api/lab-orders": {
      post: {
        tags: ["Lab Orders"],
        summary: "Order lab test (DOCTOR only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["medicalRecordId","testName"],
                properties: {
                  medicalRecordId: { type: "string", format: "uuid" },
                  testName: { type: "string", example: "Complete Blood Count" },
                  urgency: { type: "string", enum: ["ROUTINE","URGENT","STAT"], default: "ROUTINE" },
                  instructions: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Lab order created" },
          "403": { description: "Doctor only" }
        }
      },
      get: {
        tags: ["Lab Orders"],
        summary: "Get own lab orders",
        description: "RECEPTIONIST blocked.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": { description: "Paginated lab orders" },
          "403": { description: "Receptionist blocked" }
        }
      }
    },
    "/api/lab-orders/{id}": {
      get: {
        tags: ["Lab Orders"],
        summary: "Get lab order by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Lab order with result if available" },
          "403": { description: "Receptionist blocked" }
        }
      }
    },
    "/api/lab-orders/{id}/result": {
      post: {
        tags: ["Lab Orders"],
        summary: "Upload lab result (ADMIN, DOCTOR)",
        description: "Result data is AES-256-GCM encrypted. Patient is notified via WebSocket. One result per order.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Lab order ID" }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["resultData","performedAt"],
                properties: {
                  resultData: { type: "string", description: "Will be encrypted" },
                  normalRange: { type: "string" },
                  interpretation: { type: "string", description: "Will be encrypted" },
                  performedAt: { type: "string", format: "date-time" },
                  performedBy: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Lab result created" },
          "403": { description: "Admin or Doctor only" },
          "409": { description: "Result already exists for this order" }
        }
      }
    },

    // ─── LAB RESULTS ──────────────────────────────────────────
    "/api/lab-results/{id}": {
      get: {
        tags: ["Lab Results"],
        summary: "Get lab result by ID",
        description: "RECEPTIONIST blocked. Returns decrypted result data.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Lab result with decrypted fields" },
          "403": { description: "Receptionist blocked" },
          "404": { description: "Result not found" }
        }
      }
    },

    // ─── NOTIFICATIONS ────────────────────────────────────────
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get own notifications",
        description: "Returns all notifications for the authenticated user, newest first.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": { description: "Paginated notifications" }
        }
      }
    },
    "/api/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark notification as read",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Notification marked as read" }
        }
      }
    },
    "/api/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "All notifications marked as read" }
        }
      }
    },

    // ─── AUDIT LOGS ───────────────────────────────────────────
    "/api/audit-logs": {
      get: {
        tags: ["Audit Logs"],
        summary: "Get audit logs (ADMIN only)",
        description: "Immutable audit trail. PostgreSQL trigger prevents any modification or deletion. Every access to sensitive clinical data is logged here automatically.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "resource", in: "query", schema: { type: "string" }, description: "e.g. MedicalRecord, Prescription, LabResult" },
          { name: "action", in: "query", schema: { type: "string", enum: ["VIEW","CREATE","UPDATE","DELETE"] } },
          { name: "actorId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "resourceId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": { description: "Paginated audit logs with actor details" },
          "403": { description: "Admin only" }
        }
      }
    },

    // ─── SYSTEM ───────────────────────────────────────────────
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Server is running",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    environment: { type: "string", example: "development" },
                    timestamp: { type: "string", format: "date-time" }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

export const setupSwagger = (app: Express) => {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "MediCore API Docs",
    swaggerOptions: {
      persistAuthorization: true
    }
  }))
}