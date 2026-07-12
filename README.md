# MediCore API

A production-grade healthcare clinic management API — built with Node.js, Express, TypeScript, PostgreSQL, Prisma, Redis, and Docker. Designed with HIPAA-style compliance from the ground up: field-level encryption, role-based access control, immutable audit logs, and real-time notifications.

---

## What This Is

MediCore is the backend for a private clinic management platform. It handles:

- Multi-role authentication (patient, doctor, receptionist, admin)
- Appointment booking with double-booking prevention
- Medical records with AES-256 field-level encryption
- Prescriptions and lab orders/results
- Real-time notifications via WebSocket
- Background job processing for emails and reminders
- File uploads for lab results and profile photos (Cloudflare R2)
- Immutable audit logging enforced at the database level

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js 20 | Industry standard |
| Framework | Express 5 | Minimal, production-proven |
| Language | TypeScript | Type safety throughout |
| Database | PostgreSQL 15 | ACID compliant, production standard |
| ORM | Prisma 6 | Type-safe queries + migrations |
| Cache | Redis 7 | Token blacklisting, rate limiting, pub/sub |
| Auth | JWT + bcrypt | Stateless identity, secure hashing |
| Validation | Zod | Runtime type safety |
| Email | Resend | Transactional email |
| File Storage | Cloudflare R2 | S3-compatible, generous free tier |
| Real-time | Socket.io | WebSocket notifications |
| Queue | Bull + Redis | Background job processing |
| Scheduler | node-cron | Appointment reminders |
| Logging | Pino | Structured JSON logging |
| Security | Helmet | 11 HTTP security headers |
| Rate Limiting | express-rate-limit | Brute force prevention |
| Containerisation | Docker + docker-compose | One-command setup |

---

## Project Structure

```
medicore-api/
├── prisma/
│   ├── schema.prisma           # All 15 models — single source of truth
│   └── migrations/             # Versioned SQL history
├── src/
│   ├── config/
│   │   ├── env.ts              # Validated env vars — crashes if missing
│   │   ├── database.ts         # Prisma client
│   │   ├── redis.ts            # Redis client
│   │   └── logger.ts           # Pino logger
│   ├── modules/                # Feature-based architecture
│   │   ├── auth/               # Registration, login, tokens, password reset
│   │   ├── users/              # Profile management, photo upload
│   │   ├── patients/           # Patient profiles, medical history
│   │   ├── doctors/            # Doctor profiles, availability, slots
│   │   ├── departments/        # Department and specialisation management
│   │   ├── appointments/       # Booking, status flow, conflict prevention
│   │   ├── medical-records/    # Encrypted clinical records + audit logging
│   │   ├── prescriptions/      # Encrypted prescriptions
│   │   ├── lab-results/        # Lab orders, results, file attachments
│   │   ├── notifications/      # Real-time + persistent notifications
│   │   └── files/              # Upload handling, signed URLs
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── authenticate.ts # JWT verification + Redis blacklist
│   │   │   ├── authorize.ts    # RBAC — role + resource ownership
│   │   │   ├── auditLog.ts     # Automatic audit trail middleware
│   │   │   └── requestLogger.ts
│   │   └── utils/
│   │       ├── encryption.ts   # AES-256-GCM encrypt/decrypt
│   │       ├── errors.ts       # Typed error classes
│   │       ├── apiResponse.ts  # Standardised response shape
│   │       └── pagination.ts   # Reusable pagination helper
│   ├── queues/                 # Bull job queues
│   ├── jobs/                   # Scheduled tasks (cron)
│   └── server.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── load/                   # k6 load test scripts
├── docs/
│   └── api.yaml                # OpenAPI/Swagger spec
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Local Setup

```bash
git clone https://github.com/m0nds/medicore-api.git
cd medicore-api
npm install
cp .env.example .env
# Fill in .env values (see Environment Variables section)
psql postgres -c "CREATE DATABASE medicore;"
npx prisma migrate deploy
npm run dev
```

### Docker Setup

```bash
docker-compose up --build
docker-compose exec app npx prisma migrate deploy
```

Server runs on `http://localhost:8080`

---

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=8080
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://username@localhost:5432/medicore

# JWT
JWT_ACCESS_SECRET=         # generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_REFRESH_SECRET=        # generate separately

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email
RESEND_API_KEY=

# File Storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Encryption
ENCRYPTION_KEY=            # generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

BASE_URL=http://localhost:8080
```

---

## User Roles

| Role | Access |
|---|---|
| `PATIENT` | Own profile, appointments, medical records, prescriptions, lab results |
| `DOCTOR` | Own schedule, assigned patients' clinical data, create records |
| `RECEPTIONIST` | Appointment management, basic patient info (no clinical data) |
| `ADMIN` | Everything — system management, audit logs, reports |

---

## API Overview

### Authentication
```
POST   /api/auth/register
GET    /api/auth/verify?token=
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Clinical
```
GET/POST/PATCH   /api/appointments
GET/POST/PATCH   /api/medical-records
GET/POST         /api/prescriptions
GET/POST         /api/lab-orders
GET              /api/lab-results/:id
```

### Management
```
GET/POST/PATCH   /api/departments
GET/POST         /api/specialisations
GET/PATCH        /api/patients
GET/PATCH        /api/doctors
```

### System
```
GET/PATCH        /api/notifications
GET              /api/audit-logs        (admin only)
POST             /api/files/upload
GET              /api/files/:id/url
GET              /health
```

Full API documentation available at `/api/docs` (Swagger UI) when running.

---

## Security Features

```
✓  bcrypt password hashing (cost factor 12)
✓  JWT access tokens — 15 minute expiry
✓  Refresh token rotation — invalidated on every use
✓  Redis token blacklist — instant logout
✓  httpOnly cookies — refresh tokens inaccessible to JavaScript
✓  AES-256-GCM field-level encryption on all sensitive medical data
✓  Immutable audit logs — PostgreSQL trigger prevents modification
✓  Role-based access control on every endpoint
✓  Resource ownership checks — users cannot access others' data
✓  Rate limiting on auth endpoints
✓  Helmet — 11 HTTP security headers
✓  Email enumeration prevention
✓  Zod runtime validation on all inputs
✓  Parameterised queries via Prisma — SQL injection impossible
✓  Signed URLs for sensitive file access (1-hour expiry)
✓  Zero hardcoded secrets
```

---

## Database Schema

15 models across three layers:

**Identity layer:**
`User` → `Patient` | `Doctor` | `Receptionist`

**Operational layer:**
`Department` → `Specialisation` → `DoctorSpecialisation`
`Appointment`

**Clinical layer:**
`MedicalRecord` → `Prescription`
`MedicalRecord` → `LabOrder` → `LabResult` → `File`

**System layer:**
`Notification` | `AuditLog` | `File`

See `SCHEMA_EXPLAINED.md` for a full breakdown of every model, field, and relationship.

---

## Architecture Decisions

**Why field-level encryption instead of full-database encryption?**
Full-database encryption protects against disk theft but not application-level breaches. Field-level encryption means specific sensitive fields (diagnosis, medication, lab results) are encrypted in the application before hitting the database. A compromised database gives attackers meaningless ciphertext for medical content while structural data (who saw whom, when) remains queryable.

**Why immutable audit logs via database trigger?**
Application-level protection can be bypassed — a rogue admin or compromised account could delete audit entries via direct database access. A PostgreSQL trigger prevents UPDATE and DELETE at the database engine level. No application code, no matter how privileged, can circumvent it.

**Why feature-based folder structure?**
MediCore uses `src/modules/` — each clinical domain owns its controller, service, routes, and types. When a new developer joins and needs to modify appointment logic, they go to `src/modules/appointments/` — everything is there. This is how real engineering teams structure production codebases.

**Why separate controller and service layers?**
Controllers handle HTTP — request parsing, validation, sending responses. Services handle business logic — database queries, encryption, authorisation checks. Services have no knowledge of HTTP. This makes business logic unit-testable without spinning up an HTTP server.

**Why Bull + Redis for background jobs instead of inline processing?**
Sending an email inside a request handler means the user waits for the email to send before getting a response. If the email server is slow or down, the request times out. Bull processes jobs asynchronously — the request returns immediately, the email is queued and sent in the background. Failed jobs retry automatically.

---

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Load tests (requires k6)
k6 run tests/load/appointments.js
```

---

## License

MIT