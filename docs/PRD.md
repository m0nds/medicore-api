# MediCore — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** July 2026  
**Status:** In Development  
**Backend Engineer:** Raymond Elegbede  
**Intended Audience:** Engineering team, Frontend developer, Stakeholders

---

## 1. Product Overview

### What is MediCore?

MediCore is a clinic management platform that digitises the end-to-end operations of a small-to-medium private clinic. It handles everything from patient registration and appointment booking to medical records, prescriptions, lab orders, and real-time notifications.

Every piece of data in MediCore is treated as sensitive. The system is designed with HIPAA-style compliance in mind — meaning data is encrypted, every access is logged, and roles strictly control what each user can see and do.

### The Problem We're Solving

Small clinics still rely on paper records, phone-based appointment booking, and manual coordination between doctors, receptionists, and lab technicians. This leads to:

- Lost or inaccessible patient records
- Scheduling conflicts and double-bookings
- Delayed communication of lab results to patients
- No audit trail for medical data access
- Inefficient doctor-patient coordination

### The Solution

A secure, role-aware API backend (and frontend interface) that gives each user exactly what they need — nothing more, nothing less.

---

## 2. Users and Roles

MediCore has four user roles. Each role has a distinct set of permissions. This is the most important concept in the entire system.

### 2.1 Patient

A patient is someone receiving medical care at the clinic.

**What a patient can do:**
- Register and verify their email
- Complete their profile (date of birth, blood type, allergies, emergency contact, insurance)
- Book appointments with available doctors
- Cancel their own appointments
- View their own medical records, prescriptions, and lab results
- Upload a profile photo
- Receive notifications (appointment reminders, lab results ready)
- View their notification history

**What a patient cannot do:**
- See other patients' records
- See doctor-only notes on medical records
- Access billing information beyond their own
- Modify their medical records or prescriptions

---

### 2.2 Doctor

A doctor provides medical care and creates clinical records.

**What a doctor can do:**
- View their own schedule and upcoming appointments
- View profiles and medical history of their assigned patients
- Create medical records after appointments
- Write prescriptions for their patients
- Order lab tests for their patients
- View lab results for their patients
- Update appointment status (confirm, start, complete)
- Manage their own profile and availability

**What a doctor cannot do:**
- View patients assigned to other doctors
- See other doctors' appointment schedules
- Modify another doctor's medical records
- Access billing/payment data

---

### 2.3 Receptionist

A receptionist manages the administrative side — scheduling and basic patient coordination.

**What a receptionist can do:**
- View patient basic info (name, contact, appointment history)
- Book, reschedule, and cancel appointments on behalf of patients
- View all doctors' schedules and availability
- Process payments and generate receipts
- Send general notifications to patients

**What a receptionist cannot do:**
- View medical records, diagnoses, or treatment notes
- View prescriptions or lab results
- Create or modify clinical data of any kind

---

### 2.4 Admin

An admin manages the clinic system itself.

**What an admin can do:**
- Everything the other roles can do
- Create and manage departments and specialisations
- Assign doctors to departments
- Assign head doctors to departments
- Activate/deactivate user accounts
- View the full audit log (who accessed what, when)
- Generate system reports
- View system-wide statistics

---

## 3. Core Features

### 3.1 Authentication

| Feature | Description |
|---|---|
| Registration | Any user can register with name, email, password, and role |
| Email Verification | Account cannot login until email is verified via a link |
| Login | Returns a short-lived JWT access token (15 min) + httpOnly refresh token cookie |
| Token Refresh | Refresh token rotation — new token on every refresh, old one invalidated |
| Logout | Access token blacklisted in Redis, refresh token cookie cleared |
| Forgot Password | Request reset link via email — same response whether email exists or not |
| Reset Password | Reset via token from email — expires in 1 hour |

---

### 3.2 Departments and Specialisations

Departments represent clinical divisions (e.g. Cardiology, Neurology, General Practice).

Specialisations represent a doctor's area of training, which may span multiple departments.

| Feature | Who | Description |
|---|---|---|
| Create department | Admin | Name, description, optional head doctor |
| Update department | Admin | Change name, description, assign/change head doctor |
| List departments | All authenticated | See all departments and their doctors |
| Create specialisation | Admin | Name and description |
| Assign specialisation to doctor | Admin | Many-to-many relationship |

---

### 3.3 Patient Management

| Feature | Who | Description |
|---|---|---|
| Complete profile | Patient | Fill in medical background info |
| View own profile | Patient | Full profile including sensitive fields |
| View patient profile | Doctor, Receptionist, Admin | Doctors see full profile, receptionists see basic info only |
| List all patients | Admin | Paginated list with search |
| Deactivate patient | Admin | Soft delete — sets isActive to false |
| Upload profile photo | Patient | Stored in Cloudflare R2 |

---

### 3.4 Doctor Management

| Feature | Who | Description |
|---|---|---|
| Complete doctor profile | Doctor | License number, bio, years of experience |
| View doctor profile | All authenticated | Public-facing profile (no sensitive data) |
| Toggle availability | Doctor | Mark as available/unavailable for appointments |
| List available doctors | Patient, Receptionist | Filter by department, specialisation |
| Assign to department | Admin | Link doctor to a department |

---

### 3.5 Appointments

This is the core workflow of the system.

**Status Flow:**
```
SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED
          ↘ CANCELLED (from any state before COMPLETED)
          ↘ NO_SHOW (from CONFIRMED, if patient doesn't arrive)
```

| Feature | Who | Description |
|---|---|---|
| Book appointment | Patient, Receptionist | Select doctor, date/time, reason |
| View own appointments | Patient | Their upcoming and past appointments |
| View doctor's schedule | Doctor, Receptionist | All appointments for a specific doctor |
| Confirm appointment | Doctor, Receptionist | Move from SCHEDULED to CONFIRMED |
| Start appointment | Doctor | Move from CONFIRMED to IN_PROGRESS |
| Complete appointment | Doctor | Move from IN_PROGRESS to COMPLETED |
| Cancel appointment | Patient, Doctor, Receptionist, Admin | Sets status to CANCELLED with reason |
| Mark no-show | Doctor, Receptionist | Sets status to NO_SHOW |
| Double-booking prevention | System | Database constraint — doctor cannot have two appointments at same time |

**Business Rules:**
- Appointments cannot be booked in the past
- Appointments cannot be booked with unavailable doctors
- Only the patient or clinic staff can cancel an appointment
- Completed and no-show appointments cannot be cancelled
- Appointments are never deleted — the record is permanent

---

### 3.6 Medical Records

Created by a doctor after an appointment is completed.

| Feature | Who | Description |
|---|---|---|
| Create medical record | Doctor | Only after appointment is IN_PROGRESS or COMPLETED |
| View own medical records | Patient | Only their own records |
| View patient's records | Doctor | Only for their assigned/seen patients |
| View any record | Admin | Full access with audit logging |
| Update medical record | Doctor | Only the doctor who created it, within 24 hours |

**Encrypted Fields:**
- `diagnosis`
- `symptoms`
- `treatment`
- `notes`

These fields are encrypted with AES-256-GCM before being written to the database. A leaked database gives an attacker meaningless ciphertext for medical content.

**Audit Logging:**
Every time a medical record is viewed, created, or updated — an `AuditLog` entry is automatically created recording who did it, when, and from which IP address.

---

### 3.7 Prescriptions

Created by a doctor as part of a medical record.

| Feature | Who | Description |
|---|---|---|
| Create prescription | Doctor | Linked to a medical record |
| View own prescriptions | Patient | All their active and past prescriptions |
| View patient prescriptions | Doctor | For their patients only |
| Deactivate prescription | Doctor | Mark as no longer active |

**Encrypted Fields:**
- `medication`
- `dosage`
- `frequency`
- `instructions`

---

### 3.8 Lab Orders and Results

A doctor orders a lab test. The lab technician uploads the result.

| Feature | Who | Description |
|---|---|---|
| Order lab test | Doctor | Linked to a medical record, with urgency level |
| View lab orders | Doctor | Their own orders |
| Upload lab result | Admin, Lab staff | Upload PDF result file |
| View own lab results | Patient | Notified when result is ready |
| View patient lab results | Doctor | For their patients only |

**Urgency Levels:** `ROUTINE`, `URGENT`, `STAT`

**Encrypted Fields:**
- `resultData`
- `interpretation`

---

### 3.9 Notifications

Real-time and persistent notifications for users.

| Trigger | Recipient | Message |
|---|---|---|
| Appointment booked | Patient | "Your appointment with Dr. X has been booked" |
| Appointment confirmed | Patient | "Your appointment has been confirmed" |
| Appointment cancelled | Patient + Doctor | "Appointment on [date] has been cancelled" |
| Appointment reminder | Patient | "Reminder: appointment tomorrow at [time]" |
| Lab result ready | Patient | "Your lab result for [test] is ready" |
| Prescription ready | Patient | "A new prescription has been issued" |

**Delivery:**
- In-app via WebSocket (real-time)
- Persistent storage in database (readable after reconnect)
- Email for appointment reminders (sent via background job 24 hours before)

---

### 3.10 File Uploads

Files are stored in Cloudflare R2 (S3-compatible object storage). The database stores only metadata — never the file itself.

| Purpose | Who uploads | Access |
|---|---|---|
| Profile photo | Patient, Doctor | Public URL |
| Lab result PDF | Admin/Lab staff | Signed URL (expires in 1 hour) |
| Prescription document | Doctor | Signed URL (expires in 1 hour) |
| Medical document | Doctor | Signed URL (expires in 1 hour) |

**Security:** Sensitive files are never publicly accessible. Every access generates a time-limited signed URL.

---

### 3.11 Audit Logs

Every access to sensitive data generates an immutable audit log entry.

| Field | Description |
|---|---|
| actorId | Who performed the action |
| action | VIEW, CREATE, UPDATE, or DELETE |
| resource | Which model was accessed (e.g. "MedicalRecord") |
| resourceId | The specific record's ID |
| ipAddress | The request origin |
| userAgent | The client making the request |
| createdAt | When it happened |

**Immutability:** A PostgreSQL database trigger prevents any UPDATE or DELETE on the `AuditLog` table — even by a direct database connection. This cannot be bypassed at the application level.

---

## 4. API Endpoints Summary

### Auth
```
POST   /api/auth/register
GET    /api/auth/verify?token=
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Users
```
GET    /api/users/me
PATCH  /api/users/me
POST   /api/users/me/photo
GET    /api/users              (admin only)
PATCH  /api/users/:id/status   (admin only)
```

### Departments
```
GET    /api/departments
GET    /api/departments/:id
POST   /api/departments        (admin only)
PATCH  /api/departments/:id    (admin only)
DELETE /api/departments/:id    (admin only)
```

### Specialisations
```
GET    /api/specialisations
POST   /api/specialisations            (admin only)
POST   /api/doctors/:id/specialisations (admin only)
DELETE /api/doctors/:id/specialisations/:specId (admin only)
```

### Patients
```
GET    /api/patients/me
PATCH  /api/patients/me
GET    /api/patients           (admin, doctor)
GET    /api/patients/:id       (admin, doctor, receptionist)
```

### Doctors
```
GET    /api/doctors
GET    /api/doctors/:id
PATCH  /api/doctors/me
PATCH  /api/doctors/me/availability
GET    /api/doctors/:id/slots  (available time slots)
```

### Appointments
```
GET    /api/appointments              (own appointments)
POST   /api/appointments              (patient, receptionist)
GET    /api/appointments/:id
PATCH  /api/appointments/:id/confirm  (doctor, receptionist)
PATCH  /api/appointments/:id/start    (doctor)
PATCH  /api/appointments/:id/complete (doctor)
PATCH  /api/appointments/:id/cancel   (patient, doctor, receptionist, admin)
PATCH  /api/appointments/:id/no-show  (doctor, receptionist)
```

### Medical Records
```
GET    /api/medical-records            (own records — patient)
POST   /api/medical-records            (doctor only)
GET    /api/medical-records/:id
PATCH  /api/medical-records/:id        (creating doctor only)
GET    /api/patients/:id/medical-records (doctor, admin)
```

### Prescriptions
```
GET    /api/prescriptions              (own — patient)
POST   /api/prescriptions              (doctor only)
GET    /api/prescriptions/:id
PATCH  /api/prescriptions/:id/deactivate (doctor only)
```

### Lab Orders and Results
```
POST   /api/lab-orders                 (doctor only)
GET    /api/lab-orders/:id
POST   /api/lab-orders/:id/result      (admin/lab staff)
GET    /api/lab-results/:id
```

### Notifications
```
GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
```

### Audit Logs
```
GET    /api/audit-logs                 (admin only)
GET    /api/audit-logs?resource=MedicalRecord&actorId=...
```

### Files
```
POST   /api/files/upload
GET    /api/files/:id/url              (signed URL)
DELETE /api/files/:id
```

---

## 5. Response Format

Every API response follows this standard shape:

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Paginated:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 47,
    "totalPages": 5
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Descriptive error message",
  "code": "ERROR_CODE"
}
```

---

## 6. Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | BAD_REQUEST | Missing or malformed data |
| 401 | UNAUTHORIZED | Missing, invalid, or expired token |
| 403 | FORBIDDEN | Authenticated but not authorised |
| 404 | NOT_FOUND | Resource doesn't exist or not accessible |
| 409 | CONFLICT | Duplicate resource (e.g. email already exists) |
| 422 | VALIDATION_ERROR | Input failed validation rules |
| 429 | TOO_MANY_REQUESTS | Rate limit exceeded |
| 500 | INTERNAL_ERROR | Unexpected server error |

---

## 7. Security Requirements

| Requirement | Implementation |
|---|---|
| Password security | bcrypt cost factor 12 |
| Token security | JWT 15min access + 7day httpOnly refresh |
| Token invalidation | Redis blacklist on logout |
| Sensitive data at rest | AES-256-GCM field-level encryption |
| Audit immutability | PostgreSQL trigger prevents UPDATE/DELETE |
| Rate limiting | Auth endpoints rate limited per IP |
| HTTP headers | Helmet — 11 security headers |
| Input validation | Zod runtime validation on all inputs |
| SQL injection | Prisma parameterised queries |
| File access | Signed URLs with 1-hour expiry |
| Email enumeration | Identical responses on auth endpoints |

---

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| API response time (p95) | < 200ms for standard endpoints |
| File upload size limit | 10MB per file |
| Pagination default | 10 items per page, max 100 |
| Session duration | 7 days (refresh token) |
| Password reset expiry | 1 hour |
| Email verification expiry | 24 hours |
| Signed URL expiry | 1 hour |
| Appointment reminder | Sent 24 hours before scheduled time |

---

## 9. Frontend Integration Notes

For the frontend developer building against this API:

**Authentication flow:**
1. Register → user receives verification email
2. Click verification link → account activated
3. Login → receive `accessToken` in response body + `refreshToken` in httpOnly cookie
4. Store `accessToken` in memory (NOT localStorage)
5. Send `Authorization: Bearer <accessToken>` header on every protected request
6. When you get a `401`, call `POST /api/auth/refresh` — the cookie is sent automatically
7. The refresh response gives you a new `accessToken`
8. On logout, call `POST /api/auth/logout` — clears cookie and blacklists token

**Role-based UI:**
- The `role` field on the user object tells you which UI to show
- Always validate permissions server-side — never trust client-side role checks alone
- A 403 means the user is logged in but not allowed — show "Access Denied"
- A 401 means the token is invalid/expired — redirect to login

**Real-time notifications:**
- Connect to WebSocket at `ws://localhost:8080` after login
- Send the access token in the connection handshake
- Listen for `notification` events
- On disconnect, reconnect automatically

**File uploads:**
- For profile photos: `POST /api/files/upload` with `multipart/form-data`
- For viewing sensitive files: call `GET /api/files/:id/url` to get a signed URL
- Signed URLs expire in 1 hour — don't cache them permanently

**Pagination:**
- All list endpoints support `?page=1&limit=10`
- Response includes `pagination.total` and `pagination.totalPages`
- Use these to build pagination controls

---

## 10. Data Encryption Reference

The following fields are encrypted at rest. The frontend receives them already decrypted — encryption/decryption is transparent and handled entirely by the backend.

| Model | Encrypted Fields |
|---|---|
| Patient | `allergies`, `insurancePolicyNumber` |
| MedicalRecord | `diagnosis`, `symptoms`, `treatment`, `notes` |
| Prescription | `medication`, `dosage`, `frequency`, `instructions` |
| LabResult | `resultData`, `interpretation` |

---

## 11. Out of Scope (v1)

The following features are intentionally not included in version 1:

- Payment processing and billing
- Telemedicine / video consultations
- Multi-clinic / multi-branch support
- Patient portal mobile app
- Insurance claim processing
- Inventory management (medications, equipment)
- Doctor rating and review system