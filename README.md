# MediCore API
[![CI](https://github.com/m0nds/medicore-api/actions/workflows/ci.yml/badge.svg)](https://github.com/m0nds/medicore-api/actions/workflows/ci.yml)

A production-grade healthcare clinic management API built with Node.js, Express, TypeScript, PostgreSQL, Prisma, Redis, and Docker. Designed with HIPAA-style compliance from the ground up: field-level AES-256 encryption, role-based access control, immutable audit logs enforced at the database level, real-time WebSocket notifications, and background job processing.

---

## Performance

Load tested with k6 — 100 concurrent users, 30 seconds:

```
p(95) response time:   9.01ms   (threshold: <500ms)
Requests per second:   937
Total requests:        28,641
Failure rate:          0.00%
Checks passed:         100%
```
<img width="1167" height="821" alt="doctors load test" src="https://github.com/user-attachments/assets/28aa9624-d743-4459-968b-f8d1bb1ccb01" />

Redis caching delivers 53x faster responses on repeated requests (53ms → 1ms).

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js 20 | Industry standard |
| Framework | Express 5 | Minimal, production-proven |
| Language | TypeScript | Type safety throughout |
| Database | PostgreSQL 15 | ACID compliant, production standard |
| ORM | Prisma 6 | Type-safe queries + migrations |
| Cache | Redis 7 | Token blacklisting, caching, pub/sub |
| Auth | JWT + bcrypt | Stateless identity, cost factor 12 |
| Validation | Zod | Runtime type safety |
| Email | Resend | Transactional email |
| Real-time | Socket.io | WebSocket notifications |
| Queue | Bull + Redis | Background job processing |
| Scheduler | node-cron | Appointment reminders |
| Logging | Pino | Structured JSON logging |
| Security | Helmet | 11 HTTP security headers |
| Rate Limiting | express-rate-limit | Brute force prevention |
| Testing | Jest + Supertest | Unit and integration tests |
| Load Testing | k6 | Performance under pressure |
| Containerisation | Docker + docker-compose | One-command setup |

---

## Architecture

### Feature-based folder structure

```
medicore-api/
├── prisma/
│   ├── schema.prisma           # 15 models — single source of truth
│   └── migrations/             # Versioned SQL history
├── src/
│   ├── config/
│   │   ├── env.ts              # Validated env vars — crashes if missing
│   │   ├── database.ts         # Prisma client + slow query logging
│   │   ├── redis.ts            # Redis client
│   │   └── logger.ts           # Pino — pretty dev, JSON prod
│   ├── modules/                # Feature-based architecture
│   │   ├── auth/               # Registration, login, tokens, password reset
│   │   ├── users/              # Profile management
│   │   ├── patients/           # Patient profiles, encrypted fields
│   │   ├── doctors/            # Doctor profiles, availability, specialisations
│   │   ├── departments/        # Department and specialisation management
│   │   ├── appointments/       # Booking, status flow, conflict prevention
│   │   ├── medical-records/    # Encrypted clinical records + audit logging
│   │   ├── prescriptions/      # Encrypted prescriptions
│   │   ├── lab-results/        # Lab orders, encrypted results
│   │   ├── notifications/      # Real-time + persistent notifications
│   │   └── audit-logs/         # Immutable audit trail viewer
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── authenticate.ts # JWT + Redis blacklist check
│   │   │   ├── authorize.ts    # RBAC — role-based access
│   │   │   ├── auditLog.ts     # Automatic audit trail
│   │   │   └── requestLogger.ts
│   │   └── utils/
│   │       ├── encryption.ts   # AES-256-GCM encrypt/decrypt
│   │       ├── cache.ts        # Redis cache helpers
│   │       ├── errors.ts       # Typed error classes
│   │       ├── apiResponse.ts  # Standardised response shape
│   │       └── pagination.ts   # Reusable pagination
│   ├── queues/                 # Bull job queues
│   ├── jobs/                   # Scheduled tasks (node-cron)
│   └── server.ts
├── tests/
│   ├── unit/                   # 24 unit tests
│   ├── integration/            # 12 integration + security tests
│   └── load/                   # k6 load test scripts
├── Dockerfile
└── docker-compose.yml
```

### Controller → Service pattern

Controllers handle HTTP. Services handle business logic. Services have no knowledge of HTTP — they are unit-testable without spinning up an HTTP server.

---

## User Roles

| Role | Access |
|---|---|
| `PATIENT` | Own profile, appointments, medical records, prescriptions, lab results |
| `DOCTOR` | Own schedule, assigned patients clinical data, create records |
| `RECEPTIONIST` | Appointment management, basic patient info — NO clinical data |
| `ADMIN` | Everything — system management, audit logs, all data |

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Local Setup

```bash
git clone https://github.com/m0nds/medicore-api.git
cd medicore-api
npm install
cp .env.example .env
psql postgres -c "CREATE DATABASE medicore;"
npx prisma migrate deploy
npm run dev
```

### Docker Setup

```bash
docker-compose up --build
docker-compose exec app npx prisma migrate deploy
```

Server runs on http://localhost:8080

---

## Environment Variables

```env
NODE_ENV=development
PORT=8080
LOG_LEVEL=info

DATABASE_URL=postgresql://username@localhost:5432/medicore
TEST_DATABASE_URL=postgresql://username@localhost:5432/medicore_test

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

REDIS_HOST=localhost
REDIS_PORT=6379

RESEND_API_KEY=
BASE_URL=http://localhost:8080

ENCRYPTION_KEY=
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## API Documentation

Interactive Swagger UI available at `/api/docs` when the server is running.

```bash
# Start server
npm run dev

# Open in browser
http://localhost:8080/api/docs
```

### Using Swagger UI

1. Open `http://localhost:8080/api/docs`
2. Click **Authorize** (top right)
3. Enter your access token: `Bearer <token>`
4. Get a token by calling `POST /api/auth/login` first
5. All authenticated endpoints will use the token automatically

The UI documents every endpoint with:
- Required request body schemas
- Query parameters
- Response codes
- Role requirements
- Which fields are encrypted at rest

<img width="1512" height="982" alt="Screenshot 2026-07-27 at 16 59 35" src="https://github.com/user-attachments/assets/ae1a2a23-a48f-4d85-a977-7e94d184e4d9" />


---


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

### Appointments — Status Flow
```
SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED
          ↘ CANCELLED               ↘ NO_SHOW
```

### Clinical Data
```
POST/GET/PATCH  /api/medical-records     Encrypted: diagnosis, symptoms, treatment, notes
POST/GET/PATCH  /api/prescriptions       Encrypted: medication, dosage, frequency, instructions
POST/GET        /api/lab-orders
POST/GET        /api/lab-results         Encrypted: resultData, interpretation
```

All clinical endpoints block RECEPTIONIST role.

---

## Response Format

```json
{ "success": true, "message": "...", "data": { ... } }
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 10, "total": 47, "totalPages": 5 } }
{ "success": false, "error": "...", "code": "ERROR_CODE" }
```

---

## Security Features

```
bcrypt cost factor 12
JWT 15min access tokens + 7day httpOnly refresh cookies
Refresh token rotation — old token invalidated on every use
Redis token blacklist — instant logout
AES-256-GCM field-level encryption on all sensitive medical data
PostgreSQL trigger — audit logs immutable even via direct DB access
RBAC on every endpoint — role + resource ownership
RECEPTIONIST blocked from all clinical data (HIPAA-style)
Rate limiting — 5 login/15min, 3 reset/hour, 10 register/hour
Helmet — 11 HTTP security headers
Email enumeration prevention
Zod runtime validation
Parameterised queries — SQL injection impossible
Zero hardcoded secrets
```

---

## Architecture Decisions

**Why field-level encryption?**
Full-database encryption protects against disk theft but not application breaches. Field-level AES-256-GCM means diagnosis, medication, and lab results are encrypted before hitting the database. A compromised database gives attackers meaningless ciphertext.

**Why immutable audit logs via PostgreSQL trigger?**
Application-level protection can be bypassed by anyone with direct database access. A PostgreSQL trigger prevents UPDATE and DELETE at the engine level. No application code, no matter how privileged, can circumvent it.

**Why 404 instead of 403 for other users resources?**
403 Forbidden confirms the resource exists — information an attacker can use to enumerate other users data. 404 reveals nothing.

**Why Redis for token blacklisting?**
Memory lookups take microseconds vs milliseconds for PostgreSQL. Redis TTL auto-deletes tokens when they expire. Zero maintenance.

**Why Bull for background jobs?**
Sending emails inside request handlers means users wait for Resend before getting a response. Bull processes jobs asynchronously — requests return immediately, jobs retry on failure automatically.

---

## Testing

```bash
npm test                          # all tests
npx jest tests/unit/              # 24 unit tests
npx jest tests/integration/       # 12 integration tests
k6 run tests/load/doctors.js      # load test
```

Results:
```
Unit tests:         24/24 passing
Integration tests:  12/12 passing
Security tests:     4/4 passing
Load test:          937 req/s, p95 9ms, 0% failure — 100 concurrent users
```

---

## Real-time Notifications

Socket.io with Redis pub/sub. Notifications delivered instantly when users are connected, persisted to database for retrieval after reconnect.

```javascript
const socket = io("http://localhost:8080", {
  auth: { token: accessToken }
})
socket.on("notification", (data) => console.log(data))
```

---

## License

MIT

