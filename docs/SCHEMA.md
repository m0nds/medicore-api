# MediCore — Schema Explained

This document explains every model in the database schema, why it exists, what each field means, and how models relate to each other. Written for engineers who understand the product but are still building intuition for relational database design.

---

## How to Read This Document

A **model** = a table in PostgreSQL.  
A **field** = a column in that table.  
A **relation** = a link between two tables, expressed as a foreign key.

When you see `String @unique` — that column must be unique across all rows.  
When you see `String?` — the `?` means the field is optional (nullable).  
When you see `@default(value)` — if you don't provide the value, the database uses the default.  
When you see `onDelete: Cascade` — if the parent record is deleted, delete this record too.  
When you see `onDelete: Restrict` — you cannot delete the parent if this record exists.  
When you see `onDelete: SetNull` — if the parent is deleted, set this field to null.

---

## The Big Picture

Here's how all the models connect:

```
User
 ├── Patient (one to one)
 │    ├── Appointment (one to many)
 │    │    └── MedicalRecord (one to one)
 │    │         ├── Prescription (one to many)
 │    │         └── LabOrder (one to many)
 │    │              └── LabResult (one to one)
 │    │                   └── File (one to one)
 │    └── (also directly linked to Prescription, LabOrder for easy querying)
 │
 ├── Doctor (one to one)
 │    ├── Department (many to one)
 │    ├── Specialisation (many to many via DoctorSpecialisation)
 │    ├── Appointment (one to many)
 │    ├── MedicalRecord (one to many)
 │    ├── Prescription (one to many)
 │    └── LabOrder (one to many)
 │
 ├── Receptionist (one to one)
 ├── Notification (one to many)
 ├── AuditLog (one to many)
 └── File (one to many)
```

---

## Model 1 — User

**What it is:** The identity layer for everyone who logs into the system. Whether you're a patient, doctor, receptionist, or admin — you are a `User` first.

**Why it's separate from Patient/Doctor/Receptionist:** Because authentication (logging in) is the same for everyone. The `User` model only cares about email, password, and role. The role-specific data (blood type for patients, license number for doctors) lives in separate profile tables.

```
id                    Unique identifier — UUID generated automatically
email                 Login email — must be unique across all users
password              Bcrypt-hashed password — never stored as plain text
role                  PATIENT | DOCTOR | RECEPTIONIST | ADMIN
name                  Display name
isVerified            false until they click the verification email link
isActive              true by default — admin sets to false to deactivate
verificationToken     Random token sent in the verification email
verificationExpiry    Token expires after 24 hours
resetPasswordToken    Random token sent in the password reset email
resetPasswordExpiry   Token expires after 1 hour
```

**Relations:**
```
patient        → the Patient profile if this user is a patient
doctor         → the Doctor profile if this user is a doctor
receptionist   → the Receptionist profile if this user is a receptionist
notifications  → all notifications sent to this user
auditLogs      → all audit log entries where this user did something
files          → all files uploaded by this user
```

**Real-world analogy:** Think of `User` as your hospital ID card. It identifies you. The actual patient file (which contains your medical history) is separate — that's `Patient`.

---

## Model 2 — Patient

**What it is:** Medical and personal background information for users with the PATIENT role.

**Why it exists separately from User:** A `User` just knows your email and password. A `Patient` knows your blood type, allergies, emergency contact, and insurance. These are different concerns.

**The link to User:** `userId` field — one patient profile maps to exactly one user account.

```
id                      UUID
userId                  Links to User — @unique enforces one-to-one
dateOfBirth             Used to calculate age, eligibility for certain treatments
bloodType               A_POSITIVE | B_NEGATIVE | O_POSITIVE | etc.
allergies               ENCRYPTED — sensitive medical data
emergencyContactName    Who to call if patient is incapacitated
emergencyContactPhone   Emergency contact phone number
insuranceProvider       Insurance company name
insurancePolicyNumber   ENCRYPTED — sensitive financial/medical data
```

**Why are allergies encrypted?**
If someone breaches your database, they can't read allergies — they get scrambled ciphertext. This is the legal standard for medical data.

**Relations:**
```
appointments   → all appointments this patient has booked
medicalRecords → all medical records created from their appointments
prescriptions  → all prescriptions issued to them (for easy querying)
labOrders      → all lab tests ordered for them (for easy querying)
```

---

## Model 3 — Doctor

**What it is:** Professional profile for users with the DOCTOR role.

```
id                UUID
userId            Links to User — one doctor profile per user
licenseNumber     Medical license number — must be unique, legally required
departmentId      Which department this doctor belongs to (optional)
bio               Professional description shown to patients
yearsOfExperience Self-reported years of practice
isAvailable       true = can accept appointments, false = not bookable
```

**Relations:**
```
department         → the department this doctor belongs to
headOfDepartment   → if this doctor is the head of a department
specialisations    → their medical specialisations (via join table)
appointments       → all their appointments
medicalRecords     → all records they've written
prescriptions      → all prescriptions they've issued
labOrders          → all lab tests they've ordered
```

---

## Model 4 — Receptionist

**What it is:** Profile for administrative staff with the RECEPTIONIST role.

```
id           UUID
userId       Links to User
employeeId   Internal employee ID — must be unique
isAvailable  Whether they're currently on duty
```

Simple model — receptionists don't have clinical data. Their power is in what routes they can access, not what fields they have.

---

## Model 5 — Department

**What it is:** A clinical division of the clinic (Cardiology, Neurology, General Practice, etc.)

```
id             UUID
name           Must be unique — "Cardiology" can only exist once
description    What this department covers
headDoctorId   Which doctor leads this department (optional, @unique)
```

**Relations:**
```
headDoctor   → the Doctor who is head of this department
doctors      → all Doctors in this department
```

**Why `headDoctorId` is `@unique`:** A doctor can only be head of one department at a time.

**Why `onDelete: SetNull` on headDoctor:** If the head doctor's account is deleted, we don't want to delete the whole department. We just clear the `headDoctorId` field and the department continues to exist without a head.

---

## Model 6 — Specialisation

**What it is:** A specific area of medical training (Interventional Cardiology, Paediatric Neurology, etc.) — more granular than a department.

```
id           UUID
name         Must be unique
description  What this specialisation covers
```

**Why is it separate from Department?**
A doctor can be in the Cardiology department but have specialisations in both Interventional Cardiology AND Cardiac Electrophysiology. Department is their home base. Specialisations are their expertise areas.

---

## Model 7 — DoctorSpecialisation (Join Table)

**What it is:** The bridge between Doctor and Specialisation. This is how many-to-many relationships work in relational databases.

**The problem it solves:** You can't store "a list of specialisations" in a single database column. Instead, you create a table where each row represents one Doctor+Specialisation pair.

```
doctorId          Which doctor
specialisationId  Which specialisation
assignedAt        When this specialisation was assigned
```

**Composite primary key `@@id([doctorId, specialisationId])`:** The combination of both IDs is unique — a doctor can't have the same specialisation assigned twice.

**Example data:**
```
doctorId: "dr-james-id"   specialisationId: "cardiology-id"
doctorId: "dr-james-id"   specialisationId: "electrophysiology-id"
doctorId: "dr-sarah-id"   specialisationId: "cardiology-id"
```

---

## Model 8 — Appointment

**What it is:** The core transaction. Every clinical interaction starts with an appointment.

```
id                  UUID
patientId           Which patient
doctorId            Which doctor
scheduledAt         When the appointment is (date + time)
duration            How long in minutes (default 30)
status              SCHEDULED | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW
reason              Why the patient is coming
notes               Receptionist notes during booking (not medical)
cancelledAt         When it was cancelled
cancelledBy         Who cancelled it (userId)
cancellationReason  Why it was cancelled
```

**Status flow:**
```
SCHEDULED   → patient books, awaiting confirmation
CONFIRMED   → receptionist/doctor confirms
IN_PROGRESS → doctor starts the appointment
COMPLETED   → doctor marks as done
CANCELLED   → anyone with permission cancels it
NO_SHOW     → patient didn't arrive
```

**The double-booking constraint `@@unique([doctorId, scheduledAt])`:**
The database rejects any attempt to book the same doctor at the same time. This is enforced at the database level — no application code needed.

**Why are appointments never deleted?**
They're a medical record. Even a cancelled appointment is historical data — who tried to see whom, when, and why it didn't happen. Deleting this would be a compliance violation.

**Indexes:**
```
@@index([patientId])   → fast lookup of all appointments for a patient
@@index([doctorId])    → fast lookup of all appointments for a doctor
@@index([scheduledAt]) → fast lookup by date (calendar view)
@@index([status])      → fast lookup by status (filter active appointments)
```

---

## Model 9 — MedicalRecord

**What it is:** The clinical record created by a doctor after seeing a patient. This is the most sensitive model in the system.

```
id              UUID
appointmentId   @unique — one record per appointment
patientId       Which patient (denormalised for easy querying)
doctorId        Which doctor wrote this (denormalised for easy querying)
visitDate       When the visit happened
diagnosis       ENCRYPTED — the medical diagnosis
symptoms        ENCRYPTED — what the patient reported
treatment       ENCRYPTED — what treatment was prescribed/performed
notes           ENCRYPTED — doctor's private notes
followUpDate    When the patient should return
```

**Why store `patientId` and `doctorId` here when they're already on `Appointment`?**
When someone wants to fetch a medical record, the most common questions are "which patient is this?" and "which doctor wrote this?" If we didn't store those IDs directly on `MedicalRecord`, we'd have to go find the linked `Appointment` first, then read the IDs from there — two steps instead of one. Storing them directly here means we can answer those questions in one step. The trade-off is that we're storing the same IDs in two places — but the speed benefit is worth it. You'll feel why this matters when we write the actual queries.

**Why is everything encrypted?**
A medical diagnosis is some of the most sensitive personal data that exists. If a database is breached, the attacker should get meaningless ciphertext — not "Patient has HIV" or "Patient has depression."

**Audit Logging:**
Every time any user views a medical record, the system automatically writes an `AuditLog` entry. This is a legal requirement in healthcare — you must be able to prove who accessed sensitive records and when.

---

## Model 10 — Prescription

**What it is:** A medication order created by a doctor, linked to a medical record.

```
medicalRecordId  Which visit this prescription came from
patientId        Which patient (denormalised)
doctorId         Which doctor prescribed it (denormalised)
medication       ENCRYPTED — drug name
dosage           ENCRYPTED — how much (e.g. "500mg")
frequency        ENCRYPTED — how often (e.g. "twice daily")
duration         How long to take it (e.g. "7 days")
instructions     ENCRYPTED — special instructions
startDate        When to start taking it
endDate          When to stop (optional)
isActive         true = currently prescribed, false = discontinued
```

---

## Model 11 — LabOrder

**What it is:** A request from a doctor for a laboratory test.

```
medicalRecordId  Which visit triggered this order
patientId        Which patient
doctorId         Which doctor ordered it
testName         What test to run (e.g. "Complete Blood Count")
urgency          ROUTINE | URGENT | STAT
instructions     Special instructions for the lab
status           "PENDING" | "IN_PROGRESS" | "COMPLETED"
```

**Urgency levels:**
- `ROUTINE` — normal, process in standard queue
- `URGENT` — process within hours
- `STAT` — process immediately, life may be at risk

---

## Model 12 — LabResult

**What it is:** The result of a lab order, uploaded by lab staff.

```
labOrderId      @unique — one result per order
resultData      ENCRYPTED — the actual test results
normalRange     What the normal values should be
interpretation  ENCRYPTED — what the results mean
performedAt     When the test was performed
performedBy     Lab technician name
fileId          Optional link to an uploaded PDF result
```

---

## Model 13 — Notification

**What it is:** An in-app notification sent to a user.

```
userId         Who this notification is for
type           APPOINTMENT_BOOKED | LAB_RESULT_READY | etc.
title          Short headline
message        Full notification text
isRead         false until the user reads it
readAt         When they read it
appointmentId  Optional link to an appointment (for context)
```

Notifications are delivered in real-time via WebSocket. They're also stored here so users can see their notification history after reconnecting.

---

## Model 14 — AuditLog

**What it is:** An immutable record of every sensitive action in the system.

```
actorId    Who did it (userId)
action     VIEW | CREATE | UPDATE | DELETE
resource   Which model ("MedicalRecord", "Prescription", etc.)
resourceId The specific record's ID
details    Extra context as a JSON string
ipAddress  Where the request came from
userAgent  What browser/client made the request
createdAt  When it happened — NO updatedAt (immutable)
```

**Why no `updatedAt`?**
Audit logs cannot be updated. The absence of `updatedAt` signals this intent in the schema. A PostgreSQL trigger enforces this — even direct database access cannot modify audit log entries.

**Why is this important?**
If a doctor accesses a patient's record without authorisation, that access is logged. If they then try to delete the log entry to cover their tracks — the database rejects it. This is the legal audit trail.

---

## Model 15 — File

**What it is:** Metadata for uploaded files. The actual file lives in Cloudflare R2 (cloud storage). The database only stores information about the file.

```
ownerId      Who uploaded it
filename     Generated safe filename
originalName What the user called it originally
mimeType     File type (image/jpeg, application/pdf, etc.)
size         File size in bytes
storageKey   @unique — the key in R2/S3 storage
url          The URL to access the file
purpose      PROFILE_PHOTO | LAB_RESULT | PRESCRIPTION | MEDICAL_DOCUMENT
```

**Why store files in cloud storage instead of the database?**
- Databases are not designed for binary data — it's slow and expensive
- Cloud storage (R2/S3) is optimised for files, has a CDN, scales infinitely
- Sensitive files get signed URLs — time-limited access links that expire

---

## Relationship Summary

| From | To | Type | How |
|---|---|---|---|
| User | Patient | One-to-One | `userId` on Patient |
| User | Doctor | One-to-One | `userId` on Doctor |
| User | Receptionist | One-to-One | `userId` on Receptionist |
| Doctor | Department | Many-to-One | `departmentId` on Doctor |
| Doctor | Specialisation | Many-to-Many | Via `DoctorSpecialisation` |
| Department | Doctor (head) | One-to-One | `headDoctorId` on Department |
| Patient | Appointment | One-to-Many | `patientId` on Appointment |
| Doctor | Appointment | One-to-Many | `doctorId` on Appointment |
| Appointment | MedicalRecord | One-to-One | `appointmentId` on MedicalRecord |
| MedicalRecord | Prescription | One-to-Many | `medicalRecordId` on Prescription |
| MedicalRecord | LabOrder | One-to-Many | `medicalRecordId` on LabOrder |
| LabOrder | LabResult | One-to-One | `labOrderId` on LabResult |
| LabResult | File | One-to-One | `fileId` on LabResult |
| User | Notification | One-to-Many | `userId` on Notification |
| User | AuditLog | One-to-Many | `actorId` on AuditLog |
| User | File | One-to-Many | `ownerId` on File |

---

## Encryption Reference

| Model | Field | Why Encrypted |
|---|---|---|
| Patient | `allergies` | Medical data — can affect treatment, insurance |
| Patient | `insurancePolicyNumber` | Financial identifier |
| MedicalRecord | `diagnosis` | Most sensitive medical data |
| MedicalRecord | `symptoms` | Personal health information |
| MedicalRecord | `treatment` | Clinical decision data |
| MedicalRecord | `notes` | Doctor's private observations |
| Prescription | `medication` | Can reveal diagnosis indirectly |
| Prescription | `dosage` | Can reveal condition severity |
| Prescription | `frequency` | Clinical data |
| Prescription | `instructions` | Clinical data |
| LabResult | `resultData` | Raw lab values — highly sensitive |
| LabResult | `interpretation` | Medical interpretation |

Encryption algorithm: AES-256-GCM  
Key storage: Environment variable (`ENCRYPTION_KEY`)  
Transparency: Frontend receives data already decrypted — encryption is invisible