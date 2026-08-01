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

## Roles & Access Control
- **PATIENT** — Own profile, own appointments, medical records, prescriptions, lab results.
- **DOCTOR** — Own schedule, availability, assigned clinical data, medical records creation/updating, prescriptions, lab orders.
- **RECEPTIONIST** — Appointment booking & status management, basic patient list (NO clinical data access).
- **ADMIN** — System administration, department management, specialisation management, patient/doctor details, immutable audit logs.

## Data Security & Encryption
Sensitive clinical fields (e.g., diagnosis, symptoms, treatment, medication, lab result data, allergies, insurance numbers) are AES-256-GCM encrypted at rest in database storage.
The API decrypts these fields automatically prior to sending HTTP responses to authorized clients.
    `
  },
  servers: [
    { url: "http://localhost:8080", description: "Local development server" }
  ],
  tags: [
    { name: "Auth", description: "Registration, email verification, authentication, token refresh & password management" },
    { name: "Users", description: "User profile management and admin status toggles" },
    { name: "Departments", description: "Clinical department management (Cardiology, Neurology, etc.)" },
    { name: "Specialisations", description: "Doctor specialisation assignment and management" },
    { name: "Patients", description: "Patient profile, medical history metadata, and contact info" },
    { name: "Doctors", description: "Doctor profiles, availability status, and clinical assignments" },
    { name: "Appointments", description: "Appointment scheduling, status workflow, and cancellation" },
    { name: "Medical Records", description: "Encrypted clinical encounter records (DOCTOR created)" },
    { name: "Prescriptions", description: "Prescription issuance and active medication management" },
    { name: "Lab Orders", description: "Lab test ordering and result submission" },
    { name: "Lab Results", description: "Lab test result access" },
    { name: "Audit Logs", description: "Immutable access audit trail — ADMIN only" },
    { name: "System", description: "Health check and system status" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token obtained from POST /api/auth/login"
      }
    },
    schemas: {
      // ─── STANDARD RESPONSE ENVELOPES ───────────────────────
      ErrorResponse: {
        type: "object",
        required: ["success", "error", "code"],
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "Invalid credentials or unverified account" },
          code: { type: "string", example: "UNAUTHORIZED" }
        }
      },
      ApiResponse: {
        type: "object",
        required: ["success", "message", "data"],
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Success" },
          data: { type: "object", nullable: true }
        }
      },
      Pagination: {
        type: "object",
        required: ["page", "limit", "total", "totalPages"],
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 10 },
          total: { type: "integer", example: 47 },
          totalPages: { type: "integer", example: 5 }
        }
      },
      ApiPaginatedResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "array", items: { type: "object" } },
          pagination: { $ref: "#/components/schemas/Pagination" }
        }
      },

      // ─── CORE DOMAIN MODELS ───────────────────────────────
      User: {
        type: "object",
        required: ["id", "email", "name", "role", "isVerified", "isActive", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid", example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
          email: { type: "string", format: "email", example: "doctor.smith@medicore.com" },
          name: { type: "string", example: "Dr. Sarah Smith" },
          role: { type: "string", enum: ["PATIENT", "DOCTOR", "RECEPTIONIST", "ADMIN"], example: "DOCTOR" },
          isVerified: { type: "boolean", example: true },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" },
          updatedAt: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" }
        }
      },
      UserBasic: {
        type: "object",
        required: ["id", "name", "email", "role"],
        properties: {
          id: { type: "string", format: "uuid", example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
          name: { type: "string", example: "Dr. Sarah Smith" },
          email: { type: "string", format: "email", example: "doctor.smith@medicore.com" },
          role: { type: "string", enum: ["PATIENT", "DOCTOR", "RECEPTIONIST", "ADMIN"], example: "DOCTOR" }
        }
      },
      Department: {
        type: "object",
        required: ["id", "name", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid", example: "c4f6a1b2-3c4d-5e6f-7a8b-9c0d1e2f3a4b" },
          name: { type: "string", example: "Cardiology" },
          description: { type: "string", nullable: true, example: "Specialized in cardiovascular health and procedures." },
          headDoctorId: { type: "string", format: "uuid", nullable: true, example: "b1f7a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c" },
          createdAt: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" },
          updatedAt: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" },
          headDoctor: { $ref: "#/components/schemas/Doctor", nullable: true }
        }
      },
      Specialisation: {
        type: "object",
        required: ["id", "name", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid", example: "d5e6f7a8-9b0c-1d2e-3f4a-5b6c7d8e9f0a" },
          name: { type: "string", example: "Interventional Cardiology" },
          description: { type: "string", nullable: true, example: "Catheter-based treatment of structural heart diseases." },
          createdAt: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" },
          updatedAt: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" }
        }
      },
      DoctorSpecialisation: {
        type: "object",
        required: ["doctorId", "specialisationId", "assignedAt"],
        properties: {
          doctorId: { type: "string", format: "uuid", example: "b1f7a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c" },
          specialisationId: { type: "string", format: "uuid", example: "d5e6f7a8-9b0c-1d2e-3f4a-5b6c7d8e9f0a" },
          assignedAt: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" },
          specialisation: { $ref: "#/components/schemas/Specialisation" }
        }
      },
      Doctor: {
        type: "object",
        required: ["id", "userId", "licenseNumber", "yearsOfExperience", "isAvailable", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid", example: "b1f7a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c" },
          userId: { type: "string", format: "uuid", example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
          licenseNumber: { type: "string", example: "MD-987654" },
          departmentId: { type: "string", format: "uuid", nullable: true, example: "c4f6a1b2-3c4d-5e6f-7a8b-9c0d1e2f3a4b" },
          bio: { type: "string", nullable: true, example: "Board-certified cardiologist with over 10 years of clinical experience." },
          yearsOfExperience: { type: "integer", example: 12 },
          isAvailable: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" },
          updatedAt: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" },
          user: { $ref: "#/components/schemas/UserBasic" },
          department: { $ref: "#/components/schemas/Department", nullable: true },
          specialisations: {
            type: "array",
            items: { $ref: "#/components/schemas/DoctorSpecialisation" }
          }
        }
      },
      Patient: {
        type: "object",
        required: ["id", "userId", "dateOfBirth", "bloodType", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid", example: "e6f7a8b9-0c1d-2e3f-4a5b-6c7d8e9f0a1b" },
          userId: { type: "string", format: "uuid", example: "f7a8b9c0-1d2e-3f4a-5b6c-7d8e9f0a1b2c" },
          dateOfBirth: { type: "string", format: "date-time", example: "1990-05-15T00:00:00.000Z" },
          bloodType: {
            type: "string",
            enum: ["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE", "UNKNOWN"],
            example: "O_POSITIVE"
          },
          allergies: { type: "string", nullable: true, description: "Decrypted in response", example: "Penicillin, Peanuts" },
          emergencyContactName: { type: "string", nullable: true, example: "Jane Doe" },
          emergencyContactPhone: { type: "string", nullable: true, example: "+1-555-0199" },
          insuranceProvider: { type: "string", nullable: true, example: "BlueCross Health" },
          insurancePolicyNumber: { type: "string", nullable: true, description: "Decrypted in response", example: "BC-123456789" },
          createdAt: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" },
          updatedAt: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" },
          user: { $ref: "#/components/schemas/UserBasic" }
        }
      },
      Appointment: {
        type: "object",
        required: ["id", "patientId", "doctorId", "scheduledAt", "duration", "status", "reason", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid", example: "f8a9b0c1-2d3e-4f5a-6b7c-8d9e0f1a2b3c" },
          patientId: { type: "string", format: "uuid", example: "e6f7a8b9-0c1d-2e3f-4a5b-6c7d8e9f0a1b" },
          doctorId: { type: "string", format: "uuid", example: "b1f7a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c" },
          scheduledAt: { type: "string", format: "date-time", example: "2026-08-05T14:00:00.000Z" },
          duration: { type: "integer", example: 30, description: "Duration in minutes (15 to 120)" },
          status: {
            type: "string",
            enum: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"],
            example: "SCHEDULED"
          },
          reason: { type: "string", example: "Routine cardiovascular checkup and ECG evaluation." },
          notes: { type: "string", nullable: true, example: "Patient reports slight chest tightness on high exertion." },
          cancelledAt: { type: "string", format: "date-time", nullable: true, example: null },
          cancelledBy: { type: "string", format: "uuid", nullable: true, example: null },
          cancellationReason: { type: "string", nullable: true, example: null },
          createdAt: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" },
          updatedAt: { type: "string", format: "date-time", example: "2026-08-01T10:00:00.000Z" },
          patient: { $ref: "#/components/schemas/Patient" },
          doctor: { $ref: "#/components/schemas/Doctor" }
        }
      },
      MedicalRecord: {
        type: "object",
        required: ["id", "appointmentId", "patientId", "doctorId", "visitDate", "diagnosis", "symptoms", "treatment", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" },
          appointmentId: { type: "string", format: "uuid", example: "f8a9b0c1-2d3e-4f5a-6b7c-8d9e0f1a2b3c" },
          patientId: { type: "string", format: "uuid", example: "e6f7a8b9-0c1d-2e3f-4a5b-6c7d8e9f0a1b" },
          doctorId: { type: "string", format: "uuid", example: "b1f7a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c" },
          visitDate: { type: "string", format: "date-time", example: "2026-08-05T14:00:00.000Z" },
          diagnosis: { type: "string", description: "Encrypted at rest, decrypted in response", example: "Mild Essential Hypertension" },
          symptoms: { type: "string", description: "Encrypted at rest, decrypted in response", example: "Occasional headaches, slight fatigue" },
          treatment: { type: "string", description: "Encrypted at rest, decrypted in response", example: "Prescribed Lisinopril 10mg daily. Recommended low-sodium diet and exercise." },
          notes: { type: "string", nullable: true, description: "Encrypted at rest", example: "Patient advised to monitor blood pressure daily." },
          followUpDate: { type: "string", format: "date-time", nullable: true, example: "2026-09-05T14:00:00.000Z" },
          createdAt: { type: "string", format: "date-time", example: "2026-08-05T14:30:00.000Z" },
          updatedAt: { type: "string", format: "date-time", example: "2026-08-05T14:30:00.000Z" },
          patient: { $ref: "#/components/schemas/Patient" },
          doctor: { $ref: "#/components/schemas/Doctor" },
          appointment: { $ref: "#/components/schemas/Appointment" }
        }
      },
      Prescription: {
        type: "object",
        required: ["id", "medicalRecordId", "patientId", "doctorId", "medication", "dosage", "frequency", "duration", "startDate", "isActive", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid", example: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e" },
          medicalRecordId: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" },
          patientId: { type: "string", format: "uuid", example: "e6f7a8b9-0c1d-2e3f-4a5b-6c7d8e9f0a1b" },
          doctorId: { type: "string", format: "uuid", example: "b1f7a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c" },
          medication: { type: "string", description: "Encrypted at rest", example: "Lisinopril" },
          dosage: { type: "string", description: "Encrypted at rest", example: "10mg" },
          frequency: { type: "string", description: "Encrypted at rest", example: "Once daily in the morning" },
          duration: { type: "string", example: "30 days" },
          instructions: { type: "string", nullable: true, description: "Encrypted at rest", example: "Take with food or water." },
          startDate: { type: "string", format: "date-time", example: "2026-08-05T00:00:00.000Z" },
          endDate: { type: "string", format: "date-time", nullable: true, example: "2026-09-04T00:00:00.000Z" },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time", example: "2026-08-05T14:40:00.000Z" },
          updatedAt: { type: "string", format: "date-time", example: "2026-08-05T14:40:00.000Z" },
          patient: { $ref: "#/components/schemas/Patient" },
          doctor: { $ref: "#/components/schemas/Doctor" }
        }
      },
      LabOrder: {
        type: "object",
        required: ["id", "medicalRecordId", "patientId", "doctorId", "testName", "urgency", "status", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid", example: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f" },
          medicalRecordId: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" },
          patientId: { type: "string", format: "uuid", example: "e6f7a8b9-0c1d-2e3f-4a5b-6c7d8e9f0a1b" },
          doctorId: { type: "string", format: "uuid", example: "b1f7a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c" },
          testName: { type: "string", example: "Comprehensive Metabolic Panel (CMP)" },
          urgency: { type: "string", enum: ["ROUTINE", "URGENT", "STAT"], example: "ROUTINE" },
          instructions: { type: "string", nullable: true, example: "Fasting required for 8 hours prior to blood draw." },
          status: { type: "string", example: "PENDING" },
          createdAt: { type: "string", format: "date-time", example: "2026-08-05T14:45:00.000Z" },
          updatedAt: { type: "string", format: "date-time", example: "2026-08-05T14:45:00.000Z" },
          labResult: { $ref: "#/components/schemas/LabResult", nullable: true }
        }
      },
      LabResult: {
        type: "object",
        required: ["id", "labOrderId", "resultData", "performedAt", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid", example: "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a" },
          labOrderId: { type: "string", format: "uuid", example: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f" },
          resultData: { type: "string", description: "Encrypted at rest, decrypted in response", example: "Fasting Glucose: 95 mg/dL; Serum Creatinine: 0.9 mg/dL; Sodium: 140 mEq/L" },
          normalRange: { type: "string", nullable: true, example: "Glucose: 70-99 mg/dL; Creatinine: 0.7-1.3 mg/dL" },
          interpretation: { type: "string", nullable: true, description: "Encrypted at rest", example: "All metabolic values within normal limits." },
          performedAt: { type: "string", format: "date-time", example: "2026-08-06T09:00:00.000Z" },
          performedBy: { type: "string", nullable: true, example: "Central Pathology Lab Technician #42" },
          fileId: { type: "string", format: "uuid", nullable: true, example: null },
          createdAt: { type: "string", format: "date-time", example: "2026-08-06T10:00:00.000Z" },
          updatedAt: { type: "string", format: "date-time", example: "2026-08-06T10:00:00.000Z" }
        }
      },
      AuditLog: {
        type: "object",
        required: ["id", "actorId", "action", "resource", "resourceId", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid", example: "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b" },
          actorId: { type: "string", format: "uuid", example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
          action: { type: "string", enum: ["VIEW", "CREATE", "UPDATE", "DELETE"], example: "VIEW" },
          resource: { type: "string", example: "MedicalRecord" },
          resourceId: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" },
          details: { type: "string", nullable: true, example: "Decrypted medical record access" },
          ipAddress: { type: "string", nullable: true, example: "192.168.1.50" },
          userAgent: { type: "string", nullable: true, example: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
          createdAt: { type: "string", format: "date-time", example: "2026-08-05T15:00:00.000Z" },
          actor: { $ref: "#/components/schemas/UserBasic" }
        }
      },

      // ─── INPUT DTO SCHEMAS ───────────────────────────────
      RegisterInput: {
        type: "object",
        required: ["name", "email", "role", "password", "confirmPassword"],
        properties: {
          name: { type: "string", minLength: 2, example: "John Doe" },
          email: { type: "string", format: "email", example: "john.doe@example.com" },
          role: { type: "string", enum: ["PATIENT", "DOCTOR", "RECEPTIONIST"], example: "PATIENT" },
          password: { type: "string", format: "password", minLength: 8, example: "SecurePass@123", description: "Min 8 characters with at least 1 uppercase, 1 lowercase, 1 digit, 1 special character." },
          confirmPassword: { type: "string", format: "password", example: "SecurePass@123" }
        }
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "john.doe@example.com" },
          password: { type: "string", format: "password", example: "SecurePass@123" }
        }
      },
      ForgotPasswordInput: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", example: "john.doe@example.com" }
        }
      },
      ResetPasswordInput: {
        type: "object",
        required: ["token", "newPassword", "confirmPassword"],
        properties: {
          token: { type: "string", example: "e9a1b2c3d4e5f6..." },
          newPassword: { type: "string", format: "password", minLength: 8, example: "NewSecurePass@123" },
          confirmPassword: { type: "string", format: "password", example: "NewSecurePass@123" }
        }
      },
      UpdateProfileInput: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 2, example: "Johnathan Doe" }
        }
      },
      UpdateUserStatusInput: {
        type: "object",
        required: ["isActive"],
        properties: {
          isActive: { type: "boolean", example: false }
        }
      },
      CreateDepartmentInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 2, example: "Cardiology" },
          description: { type: "string", example: "Cardiovascular health and diagnostics department" },
          headDoctorId: { type: "string", format: "uuid", example: "b1f7a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c" }
        }
      },
      UpdateDepartmentInput: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 2, example: "Advanced Cardiology" },
          description: { type: "string", example: "Advanced cardiovascular interventions and surgery" },
          headDoctorId: { type: "string", format: "uuid", example: "b1f7a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c" }
        }
      },
      UpdateDoctorInput: {
        type: "object",
        properties: {
          bio: { type: "string", example: "Experienced specialist in clinical cardiology and electrophysiology." },
          yearsOfExperience: { type: "integer", minimum: 0, example: 15 },
          licenseNumber: { type: "string", example: "MD-987654" }
        }
      },
      UpdateAvailabilityInput: {
        type: "object",
        required: ["isAvailable"],
        properties: {
          isAvailable: { type: "boolean", example: false }
        }
      },
      AssignSpecialisationInput: {
        type: "object",
        required: ["specialisationId"],
        properties: {
          specialisationId: { type: "string", format: "uuid", example: "d5e6f7a8-9b0c-1d2e-3f4a-5b6c7d8e9f0a" }
        }
      },
      UpdatePatientInput: {
        type: "object",
        properties: {
          dateOfBirth: { type: "string", format: "date-time", example: "1990-05-15T00:00:00.000Z" },
          bloodType: {
            type: "string",
            enum: ["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE", "UNKNOWN"],
            example: "O_POSITIVE"
          },
          allergies: { type: "string", example: "Penicillin" },
          emergencyContactName: { type: "string", example: "Jane Doe" },
          emergencyContactPhone: { type: "string", example: "+1-555-0199" },
          insuranceProvider: { type: "string", example: "BlueCross Health" },
          insurancePolicyNumber: { type: "string", example: "BC-99887766" }
        }
      },
      BookAppointmentInput: {
        type: "object",
        required: ["doctorId", "scheduledAt", "reason"],
        properties: {
          doctorId: { type: "string", format: "uuid", example: "b1f7a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c" },
          scheduledAt: { type: "string", format: "date-time", example: "2026-08-10T10:00:00.000Z", description: "Must be in the future ISO 8601 format" },
          duration: { type: "integer", default: 30, minimum: 15, maximum: 120, example: 30 },
          reason: { type: "string", minLength: 5, example: "Annual wellness examination and blood pressure review." },
          notes: { type: "string", example: "Prefer morning slot if available." }
        }
      },
      UpdateAppointmentStatusInput: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "NO_SHOW"],
            example: "CONFIRMED"
          }
        }
      },
      CancelAppointmentInput: {
        type: "object",
        required: ["cancellationReason"],
        properties: {
          cancellationReason: { type: "string", minLength: 5, example: "Schedule conflict due to work commitment." }
        }
      },
      CreateMedicalRecordInput: {
        type: "object",
        required: ["appointmentId", "visitDate", "diagnosis", "symptoms", "treatment"],
        properties: {
          appointmentId: { type: "string", format: "uuid", example: "f8a9b0c1-2d3e-4f5a-6b7c-8d9e0f1a2b3c" },
          visitDate: { type: "string", format: "date-time", example: "2026-08-05T14:00:00.000Z" },
          diagnosis: { type: "string", minLength: 3, example: "Mild Hypertensive Heart Disease" },
          symptoms: { type: "string", minLength: 3, example: "Elevated BP (145/90), mild dizziness" },
          treatment: { type: "string", minLength: 3, example: "Prescribed antihypertensive medication and lifestyle modification." },
          notes: { type: "string", example: "Follow-up scheduled in 4 weeks." },
          followUpDate: { type: "string", format: "date-time", example: "2026-09-05T14:00:00.000Z" }
        }
      },
      UpdateMedicalRecordInput: {
        type: "object",
        properties: {
          visitDate: { type: "string", format: "date-time", example: "2026-08-05T14:00:00.000Z" },
          diagnosis: { type: "string", minLength: 3, example: "Stage 1 Essential Hypertension" },
          symptoms: { type: "string", minLength: 3, example: "Headaches resolved, BP now 130/85" },
          treatment: { type: "string", minLength: 3, example: "Continue Lisinopril 10mg daily" },
          notes: { type: "string", example: "Patient adhering to low sodium diet." },
          followUpDate: { type: "string", format: "date-time", example: "2026-10-05T14:00:00.000Z" }
        }
      },
      CreatePrescriptionInput: {
        type: "object",
        required: ["medicalRecordId", "medication", "dosage", "frequency", "duration", "startDate"],
        properties: {
          medicalRecordId: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" },
          medication: { type: "string", minLength: 2, example: "Lisinopril" },
          dosage: { type: "string", example: "10mg" },
          frequency: { type: "string", example: "Once daily" },
          duration: { type: "string", example: "30 days" },
          instructions: { type: "string", example: "Take in the morning with water." },
          startDate: { type: "string", format: "date-time", example: "2026-08-05T00:00:00.000Z" },
          endDate: { type: "string", format: "date-time", example: "2026-09-04T00:00:00.000Z" }
        }
      },
      CreateLabOrderInput: {
        type: "object",
        required: ["medicalRecordId", "testName"],
        properties: {
          medicalRecordId: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" },
          testName: { type: "string", minLength: 2, example: "Lipid Panel & Serum Electrolytes" },
          urgency: { type: "string", enum: ["ROUTINE", "URGENT", "STAT"], default: "ROUTINE", example: "ROUTINE" },
          instructions: { type: "string", example: "12-hour fasting required before test." }
        }
      },
      CreateLabResultInput: {
        type: "object",
        required: ["resultData", "performedAt"],
        properties: {
          resultData: { type: "string", minLength: 1, example: "Total Cholesterol: 185 mg/dL; HDL: 55 mg/dL; LDL: 110 mg/dL; Triglycerides: 100 mg/dL" },
          normalRange: { type: "string", example: "Total Cholesterol < 200 mg/dL; HDL > 40 mg/dL; LDL < 100 mg/dL" },
          interpretation: { type: "string", example: "Normal lipid distribution with desirable HDL levels." },
          performedAt: { type: "string", format: "date-time", example: "2026-08-06T08:30:00.000Z" },
          performedBy: { type: "string", example: "Lab Tech John Miller" }
        }
      }
    }
  },
  paths: {
    // ─── AUTH PATHS ──────────────────────────────────────────
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description: "Creates a new user profile (PATIENT, DOCTOR, or RECEPTIONIST) and dispatches a verification token via email. ADMIN accounts cannot be self-registered.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterInput" }
            }
          }
        },
        responses: {
          "201": {
            description: "Registration successful. Verification email sent.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Registration successful. Please check your email to verify your account." },
                    data: { $ref: "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          "409": {
            description: "Email already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { success: false, error: "User with this email already exists", code: "CONFLICT" }
              }
            }
          },
          "422": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { success: false, error: "Passwords do not match; Name must be at least 2 characters", code: "VALIDATION_ERROR" }
              }
            }
          }
        }
      }
    },
    "/api/auth/verify": {
      get: {
        tags: ["Auth"],
        summary: "Verify user email address",
        description: "Validates the verification token sent via email and activates the user account.",
        parameters: [
          {
            name: "token",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Verification token sent to user's email",
            example: "e9a1b2c3d4e5f6..."
          }
        ],
        responses: {
          "200": {
            description: "Email verified successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Email verified successfully" },
                    data: { $ref: "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          "400": {
            description: "Invalid or expired token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { success: false, error: "Invalid or expired verification token", code: "BAD_REQUEST" }
              }
            }
          }
        }
      }
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Authenticate user and get access token",
        description: "Returns a 15-minute JWT access token in the response body and sets a 7-day httpOnly refresh token cookie.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Login successful" },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                        user: { $ref: "#/components/schemas/User" }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            description: "Invalid credentials or unverified account",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { success: false, error: "Invalid email or password", code: "UNAUTHORIZED" }
              }
            }
          }
        }
      }
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        description: "Uses the httpOnly refresh token cookie to issue a new access token and rotates the refresh token cookie.",
        responses: {
          "200": {
            description: "Token refreshed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Token refreshed" },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            description: "Invalid or expired refresh token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { success: false, error: "Invalid or expired refresh token", code: "UNAUTHORIZED" }
              }
            }
          }
        }
      }
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout user",
        description: "Blacklists current Bearer access token in Redis and clears the httpOnly refresh token cookie.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Logged out successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Logged out successfully" },
                    data: { type: "object", nullable: true, example: null }
                  }
                }
              }
            }
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { success: false, error: "Authentication token required", code: "UNAUTHORIZED" }
              }
            }
          }
        }
      }
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset link",
        description: "Dispatches a password reset email if the user exists. Always returns success to prevent user enumeration.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ForgotPasswordInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Password reset link sent if account exists",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "If an account with that email exists, a password reset link has been sent." },
                    data: { type: "object", nullable: true, example: null }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset user password",
        description: "Resets user password using the token sent in the reset email.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResetPasswordInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Password reset successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Password reset successful" },
                    data: { type: "object", nullable: true, example: null }
                  }
                }
              }
            }
          },
          "400": {
            description: "Invalid or expired token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { success: false, error: "Invalid or expired reset token", code: "BAD_REQUEST" }
              }
            }
          }
        }
      }
    },

    // ─── USER PATHS ──────────────────────────────────────────
    "/api/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get current user profile",
        description: "Returns authenticated user account details along with nested role profile (Patient, Doctor, or Receptionist).",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "User profile payload",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Success" },
                    data: { $ref: "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      },
      patch: {
        tags: ["Users"],
        summary: "Update current user profile",
        description: "Updates basic profile attributes like display name for the authenticated user.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProfileInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Profile updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Profile updated successfully" },
                    data: { $ref: "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/users/{id}/status": {
      patch: {
        tags: ["Users"],
        summary: "Toggle user active status (ADMIN only)",
        description: "Activates or deactivates a user account. Admin access required.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Target User ID",
            example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateUserStatusInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Account status updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "User status updated successfully" },
                    data: { $ref: "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          "403": {
            description: "Forbidden — Admin access required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { success: false, error: "Access denied. Admin role required.", code: "FORBIDDEN" }
              }
            }
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { success: false, error: "User not found", code: "NOT_FOUND" }
              }
            }
          }
        }
      }
    },

    // ─── DEPARTMENT PATHS ─────────────────────────────────────
    "/api/departments": {
      get: {
        tags: ["Departments"],
        summary: "List all departments",
        description: "Returns paginated list of clinical departments including head doctor details.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, example: 1 },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 }, example: 10 }
        ],
        responses: {
          "200": {
            description: "Paginated departments list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Department" }
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" }
                  }
                }
              }
            }
          }
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
              schema: { $ref: "#/components/schemas/CreateDepartmentInput" }
            }
          }
        },
        responses: {
          "201": {
            description: "Department created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Department created successfully" },
                    data: { $ref: "#/components/schemas/Department" }
                  }
                }
              }
            }
          },
          "403": {
            description: "Forbidden",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "409": {
            description: "Department name already exists",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    },
    "/api/departments/{id}": {
      get: {
        tags: ["Departments"],
        summary: "Get department by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, example: "c4f6a1b2-3c4d-5e6f-7a8b-9c0d1e2f3a4b" }
        ],
        responses: {
          "200": {
            description: "Department details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Department" }
                  }
                }
              }
            }
          },
          "404": { description: "Department not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
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
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateDepartmentInput" } } }
        },
        responses: {
          "200": {
            description: "Department updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Department updated successfully" },
                    data: { $ref: "#/components/schemas/Department" }
                  }
                }
              }
            }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Department not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
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
          "200": {
            description: "Department deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Department deleted successfully" },
                    data: { type: "object", nullable: true }
                  }
                }
              }
            }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Department not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },

    // ─── DOCTOR PATHS ────────────────────────────────────────
    "/api/doctors": {
      get: {
        tags: ["Doctors"],
        summary: "List all doctors",
        description: "Returns paginated list of doctors with user profile, department, and specialisations. Results cached in Redis.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, example: 1 },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 }, example: 10 },
          { name: "available", in: "query", schema: { type: "boolean" }, description: "Filter by availability status" }
        ],
        responses: {
          "200": {
            description: "Paginated doctors list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "array", items: { $ref: "#/components/schemas/Doctor" } },
                    pagination: { $ref: "#/components/schemas/Pagination" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/doctors/me": {
      get: {
        tags: ["Doctors"],
        summary: "Get own doctor profile (DOCTOR only)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Doctor profile",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/Doctor" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      patch: {
        tags: ["Doctors"],
        summary: "Update own doctor profile (DOCTOR only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateDoctorInput" } } }
        },
        responses: {
          "200": {
            description: "Doctor profile updated",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/Doctor" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/api/doctors/me/availability": {
      patch: {
        tags: ["Doctors"],
        summary: "Toggle doctor availability (DOCTOR only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateAvailabilityInput" } } }
        },
        responses: {
          "200": {
            description: "Availability status updated",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/Doctor" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
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
          "200": {
            description: "Doctor details",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/Doctor" } } } } }
          },
          "404": { description: "Doctor not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
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
          content: { "application/json": { schema: { $ref: "#/components/schemas/AssignSpecialisationInput" } } }
        },
        responses: {
          "200": { description: "Specialisation assigned", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/Doctor" } } } } } },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Doctor or specialisation not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Already assigned", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
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
          "200": { description: "Specialisation removed", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/Doctor" } } } } } },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Assignment not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },

    // ─── PATIENT PATHS ───────────────────────────────────────
    "/api/patients/me": {
      get: {
        tags: ["Patients"],
        summary: "Get own patient profile (PATIENT only)",
        description: "Returns authenticated patient profile with decrypted allergies and insurance numbers.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Patient profile payload",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/Patient" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      patch: {
        tags: ["Patients"],
        summary: "Update own patient profile (PATIENT only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdatePatientInput" } } }
        },
        responses: {
          "200": {
            description: "Patient profile updated",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/Patient" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/api/patients": {
      get: {
        tags: ["Patients"],
        summary: "List all patients (ADMIN, DOCTOR)",
        description: "Returns paginated list of all patients. Restricted to Doctors and Admins.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": {
            description: "Paginated patients list",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "array", items: { $ref: "#/components/schemas/Patient" } }, pagination: { $ref: "#/components/schemas/Pagination" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
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
          "200": {
            description: "Patient details",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/Patient" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Patient not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },

    // ─── APPOINTMENT PATHS ───────────────────────────────────
    "/api/appointments": {
      post: {
        tags: ["Appointments"],
        summary: "Book an appointment (PATIENT, RECEPTIONIST)",
        description: "Schedules an appointment. Prevents double-booking via database unique constraint on (doctorId, scheduledAt). Dispatches real-time WebSocket notification to Doctor.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/BookAppointmentInput" } } }
        },
        responses: {
          "201": {
            description: "Appointment booked successfully",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/Appointment" } } } } }
          },
          "400": { description: "Doctor unavailable or scheduled in the past", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Doctor already booked at this time", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      get: {
        tags: ["Appointments"],
        summary: "Get own appointments",
        description: "Role-filtered: Patients see own bookings, Doctors see assigned appointments, Receptionists/Admins see all clinic appointments.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": {
            description: "Paginated appointments list",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "array", items: { $ref: "#/components/schemas/Appointment" } }, pagination: { $ref: "#/components/schemas/Pagination" } } } } }
          }
        }
      }
    },
    "/api/appointments/{id}": {
      get: {
        tags: ["Appointments"],
        summary: "Get appointment by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": {
            description: "Appointment details",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/Appointment" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Appointment not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/api/appointments/{id}/status": {
      patch: {
        tags: ["Appointments"],
        summary: "Update appointment status (DOCTOR, RECEPTIONIST, ADMIN)",
        description: "Status transition workflow: SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED. Statuses CANCELLED / NO_SHOW can be applied from applicable active states.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateAppointmentStatusInput" } } }
        },
        responses: {
          "200": {
            description: "Status updated successfully",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/Appointment" } } } } }
          },
          "400": { description: "Invalid status transition", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/api/appointments/{id}/cancel": {
      patch: {
        tags: ["Appointments"],
        summary: "Cancel appointment",
        description: "Allows involved patient, doctor, or staff to cancel an upcoming appointment. Completed appointments cannot be cancelled.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CancelAppointmentInput" } } }
        },
        responses: {
          "200": {
            description: "Appointment cancelled",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/Appointment" } } } } }
          },
          "400": { description: "Cannot cancel completed appointment", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },

    // ─── MEDICAL RECORD PATHS ────────────────────────────────
    "/api/medical-records": {
      post: {
        tags: ["Medical Records"],
        summary: "Create medical record (DOCTOR only)",
        description: "Creates clinical encounter record for IN_PROGRESS or COMPLETED appointments. One record per appointment. Diagnosis, symptoms, and treatment are encrypted at rest. Access automatically audit logged.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateMedicalRecordInput" } } }
        },
        responses: {
          "201": {
            description: "Medical record created with decrypted fields",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/MedicalRecord" } } } } }
          },
          "400": { description: "Appointment not in correct status", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Forbidden — Doctor only", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Record already exists for this appointment", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      get: {
        tags: ["Medical Records"],
        summary: "Get own medical records",
        description: "Patients view their own clinical records. Doctors view records created by them. Receptionists are strictly blocked. Every access is audit logged.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": {
            description: "Paginated medical records list",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "array", items: { $ref: "#/components/schemas/MedicalRecord" } }, pagination: { $ref: "#/components/schemas/Pagination" } } } } }
          },
          "403": { description: "Forbidden — Receptionist blocked", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/api/medical-records/{id}": {
      get: {
        tags: ["Medical Records"],
        summary: "Get medical record by ID",
        description: "Returns decrypted medical record details. Access is audit logged with client IP address and User-Agent header.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": {
            description: "Medical record payload",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/MedicalRecord" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Medical record not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      patch: {
        tags: ["Medical Records"],
        summary: "Update medical record (DOCTOR creator only)",
        description: "Allows the doctor who created the medical record to update clinical details.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateMedicalRecordInput" } } }
        },
        responses: {
          "200": {
            description: "Medical record updated",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/MedicalRecord" } } } } }
          },
          "403": { description: "Forbidden — Not record creator", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },

    // ─── PRESCRIPTION PATHS ──────────────────────────────────
    "/api/prescriptions": {
      post: {
        tags: ["Prescriptions"],
        summary: "Create prescription (DOCTOR only)",
        description: "Links prescription to a medical record. Patient ID and Doctor ID are derived server-side. Medication details are encrypted at rest.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreatePrescriptionInput" } } }
        },
        responses: {
          "201": {
            description: "Prescription created",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/Prescription" } } } } }
          },
          "403": { description: "Forbidden — Doctor only", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      get: {
        tags: ["Prescriptions"],
        summary: "Get own prescriptions",
        description: "Patients view their active/past prescriptions. Doctors view issued prescriptions. Receptionists are blocked.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": {
            description: "Paginated prescriptions list",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "array", items: { $ref: "#/components/schemas/Prescription" } }, pagination: { $ref: "#/components/schemas/Pagination" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/api/prescriptions/{id}": {
      get: {
        tags: ["Prescriptions"],
        summary: "Get prescription by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": {
            description: "Prescription payload",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/Prescription" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Prescription not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      patch: {
        tags: ["Prescriptions"],
        summary: "Deactivate prescription (DOCTOR only)",
        description: "Sets prescription status isActive to false.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": {
            description: "Prescription deactivated",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/Prescription" } } } } }
          },
          "403": { description: "Forbidden — Doctor only", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },

    // ─── LAB ORDER & RESULT PATHS ────────────────────────────
    "/api/lab-orders": {
      post: {
        tags: ["Lab Orders"],
        summary: "Order a lab test (DOCTOR only)",
        description: "Creates lab test order linked to a medical record.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateLabOrderInput" } } }
        },
        responses: {
          "201": {
            description: "Lab order created",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/LabOrder" } } } } }
          },
          "403": { description: "Forbidden — Doctor only", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      get: {
        tags: ["Lab Orders"],
        summary: "Get own lab orders",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": {
            description: "Paginated lab orders list",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "array", items: { $ref: "#/components/schemas/LabOrder" } }, pagination: { $ref: "#/components/schemas/Pagination" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
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
          "200": {
            description: "Lab order payload with optional lab result",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/LabOrder" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/api/lab-orders/{id}/result": {
      post: {
        tags: ["Lab Orders"],
        summary: "Upload lab result (ADMIN, DOCTOR)",
        description: "Creates result entry for specified lab order. Encrypts result data at rest and notifies patient via WebSocket.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Lab Order ID" }
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateLabResultInput" } } }
        },
        responses: {
          "201": {
            description: "Lab result submitted",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { $ref: "#/components/schemas/LabResult" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Result already exists for this lab order", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/api/lab-results/{id}": {
      get: {
        tags: ["Lab Results"],
        summary: "Get lab result by ID",
        description: "Returns decrypted lab test result data.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": {
            description: "Lab result payload",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/LabResult" } } } } }
          },
          "403": { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Lab result not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },

    // ─── AUDIT LOG PATHS ─────────────────────────────────────
    "/api/audit-logs": {
      get: {
        tags: ["Audit Logs"],
        summary: "Get audit logs (ADMIN only)",
        description: "Queries the immutable database audit trail. Filterable by actorId, resource type, action, or resourceId.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "resource", in: "query", schema: { type: "string" }, description: "Target resource type (e.g. MedicalRecord, Prescription, LabResult)", example: "MedicalRecord" },
          { name: "action", in: "query", schema: { type: "string", enum: ["VIEW", "CREATE", "UPDATE", "DELETE"] }, example: "VIEW" },
          { name: "actorId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "resourceId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": {
            description: "Paginated audit logs list",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "array", items: { $ref: "#/components/schemas/AuditLog" } }, pagination: { $ref: "#/components/schemas/Pagination" } } } } }
          },
          "403": { description: "Forbidden — Admin only", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },

    // ─── SYSTEM HEALTH PATH ──────────────────────────────────
    "/health": {
      get: {
        tags: ["System"],
        summary: "API Health Check",
        description: "Public health check endpoint returning server status and timestamp.",
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    environment: { type: "string", example: "development" },
                    timestamp: { type: "string", format: "date-time", example: "2026-08-01T12:50:00.000Z" }
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
    customSiteTitle: "MediCore API Documentation",
    swaggerOptions: {
      persistAuthorization: true
    }
  }))
}