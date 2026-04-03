# Finance Dashboard API

REST API for a finance dashboard: **JWT authentication**, **role-based access control (RBAC)**, **financial record CRUD** with soft delete, and **dashboard aggregations** backed by **SQLite** and **Prisma ORM**. Built for clarity, predictable JSON contracts, and a clean layered architecture.

---

## Contents

- [Assignment mapping](#assignment-mapping)
- [Assumptions](#assumptions)
- [Tech stack](#tech-stack--why)
- [Getting started](#getting-started)
- [Automated checks](#automated-checks)
- [Environment variables](#environment-variables)
- [API overview](#api-overview)
- [Authentication](#authentication)
- [Response formats](#response-formats)
- [HTTP status codes](#http-status-codes)
- [Endpoints reference](#endpoints-reference)
- [Role matrix](#role-matrix)
- [Example requests](#example-requests)
- [Architecture decisions](#architecture-decisions)
- [Trade-offs at scale](#trade-offs--what-id-do-differently-at-scale)
- [Test credentials](#test-credentials-after-seeding)

---

## Assignment mapping

How this repo maps to the **Finance Data Processing and Access Control Backend** brief:

1. **User and role management** — `POST /api/auth/register`, `POST /api/auth/login`; admin user APIs under `/api/users` (`src/routes/user.routes.js`, `src/services/user.service.js`, `src/controllers/user.controller.js`). Schema: `User`, `Role`, `isActive` in `prisma/schema.prisma`.
2. **Financial records** — `GET` / `POST` / `PATCH` / `DELETE` `/api/records` in `src/routes/record.routes.js`, `src/services/record.service.js`, `src/controllers/record.controller.js`; model `FinancialRecord` in Prisma.
3. **Dashboard summary APIs** — `GET /api/dashboard/summary`, `/by-category`, `/trends`, `/recent` in `src/routes/dashboard.routes.js`, `src/services/dashboard.service.js`, `src/controllers/dashboard.controller.js`.
4. **Access control** — JWT verification and user load in `src/middleware/authenticate.js`; role gates in `src/middleware/requireRole.js` and on the route files above.
5. **Validation and error handling** — Zod schemas in `src/validators/*.validator.js`; `src/middleware/errorHandler.js`; `src/utils/ApiError.js`.
6. **Data persistence** — SQLite via Prisma (`prisma/schema.prisma`, `prisma/migrations/`, `DATABASE_URL` in `.env`).

---

## Assumptions

- **How users are created:** Accounts are created with **`POST /api/auth/register`**, which assigns the **`VIEWER`** role by default. There is no separate admin-only “create user” endpoint; **`ADMIN`** users manage access with **`PATCH /api/users/:id/role`** and **`PATCH /api/users/:id/status`**.
- **VIEWER vs ANALYST (dashboard and records):** **`VIEWER`** may **`GET /api/dashboard/recent`** (own records only) but **not** **`summary`**, **`by-category`**, or **`trends`** (those require **`ANALYST`** or **`ADMIN`**). **`VIEWER`** and **`ANALYST`** may **list and read** their **own** rows via **`/api/records`**; **`ADMIN`** sees **all** records and is the only role that **creates, updates, or soft-deletes** records.

---

## Tech stack & why

| Technology | Rationale |
|------------|-----------|
| **Node.js** | Widely adopted runtime; fast iteration for demos and reviews. |
| **Express.js** | Thin HTTP layer; easy to reason about routes, middleware, and errors. |
| **SQLite + Prisma** | No separate database server; migrations and type-safe queries out of the box. |
| **JWT (jsonwebtoken)** | Stateless sessions; tokens carry claims, while **`authenticate`** still loads the user from the DB each request for authoritative **`role`** and **`isActive`**. |
| **bcryptjs** | Secure password hashing without native compilation requirements. |
| **Zod** | Request validation with structured, field-level errors for clients. |
| **JavaScript (CommonJS)** | Simple deployment—no transpiler required. |

---

## Getting started

From a terminal, **`cd` into this repository’s root folder** (the directory that contains `package.json`), then:

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   copy .env.example .env
   ```

   macOS / Linux: `cp .env.example .env`

3. **Database**

   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npm run db:seed
   ```

4. **Run the server**

   ```bash
   npm start
   ```

   Development with reload: `npm run dev`

**Base URL:** `http://localhost:8000` (or the host/port you set via `PORT` in `.env`).

If you see `EADDRINUSE` on port 8000, another process is already bound to that port—stop it or change `PORT` in `.env`.

---

## Automated checks

- **Unit-style tests** (no running server): `npm test` — runs Node’s built-in test runner on `tests/` (`ApiError`, `requireRole` middleware, record Zod schemas).
- **API smoke test** (start the server first; database migrated and seeded as in [Getting started](#getting-started)):

  ```bash
  node scripts/smoke-api-test.mjs
  ```

  Override the base URL if needed: `API_BASE=http://127.0.0.1:3000 node scripts/smoke-api-test.mjs`

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP listen port (defaults to `8000` in code if unset; set explicitly in `.env`). |
| `NODE_ENV` | `development` or `production`. Server errors never include stack traces in JSON responses. |
| `DATABASE_URL` | Prisma connection string. Example: `file:./dev.db` (path is relative to the `prisma` directory). |
| `JWT_SECRET` | Secret used to sign JWTs. Use a long, random value in any shared or production environment. |
| `JWT_EXPIRES_IN` | Token lifetime passed to `jsonwebtoken` (e.g. `7d`, `12h`). |

---

## API overview

| Area | Base path | Auth |
|------|-----------|------|
| Health | `/health` | None |
| Authentication | `/api/auth` | None (register/login) |
| Users | `/api/users` | JWT + `ADMIN` |
| Financial records | `/api/records` | JWT (mutations: `ADMIN` only) |
| Dashboard | `/api/dashboard` | JWT (summary/category/trends: `ANALYST` or `ADMIN`) |

All protected routes expect a JSON body where applicable (`Content-Type: application/json`).

---

## Authentication

1. Call **`POST /api/auth/login`** (or **`POST /api/auth/register`**) and read `data.token` from the response.
2. Send the token on subsequent requests:

   ```http
   Authorization: Bearer <your_jwt_here>
   ```

Tokens include `sub` (user id), `email`, and `role`. Inactive users cannot use the API even with a valid token.

---

## Response formats

### Success

Single resource or object:

```json
{
  "success": true,
  "data": { },
  "message": "Human-readable summary"
}
```

Paginated list (financial records):

```json
{
  "success": true,
  "data": [ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42
  },
  "message": "Records retrieved"
}
```

User list responses use `data` as an array without pagination (admin-only, typically small).

### Application errors

```json
{
  "success": false,
  "message": "Explanation for the client",
  "code": "STABLE_MACHINE_CODE"
}
```

Examples of `code`: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`.

### Validation errors (HTTP 400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "path": "email", "message": "Invalid email" }
  ]
}
```

---

## HTTP status codes

| Code | When |
|------|------|
| `200` | Success (GET, PATCH, DELETE with body, login). |
| `201` | Created (register, create record). |
| `400` | Validation failed or bad request (e.g. invalid target user). |
| `401` | Missing/invalid token or invalid login credentials. |
| `403` | Authenticated but not allowed (role, inactive account). |
| `404` | Resource not found. |
| `409` | Conflict (e.g. email already registered). |
| `500` | Unexpected server error (message is generic; details are logged server-side only). |

---

## Endpoints reference

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Liveness check. |

**Example response**

```json
{
  "success": true,
  "data": { "ok": true },
  "message": "Healthy"
}
```

---

### Authentication

#### Register

| | |
|--|--|
| **Method & path** | `POST /api/auth/register` |
| **Auth** | None |
| **Body** | See table below |

| Field | Type | Rules |
|-------|------|--------|
| `name` | string | Required, 1–120 characters. |
| `email` | string | Required, valid email format. |
| `password` | string | Required, minimum 8 characters. |

New accounts are created with role **`VIEWER`**.

**Example body**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass1"
}
```

**Success:** `201` — `data.user` (no password), `data.token`.

**Errors:** `409` if email already exists; `400` if validation fails.

---

#### Login

| | |
|--|--|
| **Method & path** | `POST /api/auth/login` |
| **Auth** | None |
| **Body** | `email` (string, email), `password` (string, required) |

**Success:** `200` — `data.user`, `data.token`.

**Errors:** `401` invalid credentials; `403` if account is inactive; `400` validation.

---

### Users (`ADMIN` only)

All routes require **`Authorization: Bearer …`** and role **`ADMIN`**.

#### List users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | Returns all users (id, name, email, role, isActive, createdAt). |

---

#### Get user by ID

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users/:id` | `:id` — UUID of the user. |

**Errors:** `404` if user does not exist.

---

#### Update user role

| | |
|--|--|
| **Method & path** | `PATCH /api/users/:id/role` |
| **Body** | `{ "role": "VIEWER" \| "ANALYST" \| "ADMIN" }` |

**Success:** `200` — updated user object in `data`.

---

#### Update user status

| | |
|--|--|
| **Method & path** | `PATCH /api/users/:id/status` |
| **Body** | `{ "isActive": true \| false }` |

Inactive users cannot authenticate or call protected routes.

---

### Financial records

All routes require a valid JWT.

**Data scope**

- **`ADMIN`:** sees and manages all non–soft-deleted records.
- **`VIEWER` / `ANALYST`:** see only their own non–soft-deleted records.

---

#### List records

| | |
|--|--|
| **Method & path** | `GET /api/records` |
| **Roles** | All authenticated |

**Query parameters** (all optional unless noted)

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | `INCOME` or `EXPENSE`. |
| `category` | string | Substring match on category (max 80 chars in validator). |
| `from` | date | Inclusive lower bound on `date` (coerced from query string). |
| `to` | date | Inclusive upper bound on `date`. |
| `page` | integer | Page number, default `1`, minimum `1`. |
| `limit` | integer | Page size, default `20`, range `1`–`100`. |

**Example**

`GET /api/records?type=INCOME&from=2026-01-01&to=2026-12-31&page=1&limit=10`

**Success:** `200` — `data` (array), `pagination` `{ page, limit, total }`.

**Errors:** `400` invalid query parameters.

---

#### Get record by ID

| Method | Path | Roles |
|--------|------|--------|
| `GET` | `/api/records/:id` | All authenticated |

**Errors:** `404` if not found or not visible to the caller.

---

#### Create record

| | |
|--|--|
| **Method & path** | `POST /api/records` |
| **Roles** | `ADMIN` only |

| Field | Type | Rules |
|-------|------|--------|
| `amount` | number | Required, must be positive. |
| `type` | string | Required, `INCOME` or `EXPENSE`. |
| `category` | string | Required, 1–80 characters. |
| `date` | string / date | Required, parsed as a date (ISO string recommended). |
| `notes` | string \| null | Optional, max 500 characters. |
| `userId` | string (UUID) | Optional. If set, assigns the record to that user; **only `ADMIN`** may supply this. If omitted, the record is owned by the authenticated admin. |

**Success:** `201` — created record in `data`.

**Errors:** `400` validation or unknown `userId`; `403` if non-admin sends `userId`.

---

#### Update record

| | |
|--|--|
| **Method & path** | `PATCH /api/records/:id` |
| **Roles** | `ADMIN` only |

**Body:** At least one of: `amount`, `type`, `category`, `date`, `notes` (same constraints as create where applicable). `amount` must be positive if provided.

**Success:** `200` — updated record in `data`.

**Errors:** `404` if record not found (or soft-deleted).

---

#### Delete record (soft delete)

| | |
|--|--|
| **Method & path** | `DELETE /api/records/:id` |
| **Roles** | `ADMIN` only |

Sets `deletedAt` to the current time. The row is not removed from the database.

**Success:** `200` — `data` includes `{ "id": "<uuid>" }`, message indicates soft delete.

**Errors:** `404` if already deleted or not found.

---

### Dashboard

All routes require a valid JWT.

---

#### Summary

| | |
|--|--|
| **Method & path** | `GET /api/dashboard/summary` |
| **Roles** | `ANALYST`, `ADMIN` |

**Success:** `200` — aggregates computed in the database, e.g. total income, total expense, net balance, counts.  
**Scope:** `ANALYST` — own records; `ADMIN` — all records.

**Errors:** `403` for `VIEWER`.

---

#### By category

| | |
|--|--|
| **Method & path** | `GET /api/dashboard/by-category` |
| **Roles** | `ANALYST`, `ADMIN` |

**Success:** `200` — `data` is an array of `{ category, type, totalAmount, count }` (DB `groupBy`).

---

#### Trends

| | |
|--|--|
| **Method & path** | `GET /api/dashboard/trends` |
| **Roles** | `ANALYST`, `ADMIN` |

**Query**

| Parameter | Values | Default |
|-----------|--------|---------|
| `period` | `monthly`, `weekly` | `monthly` |

**Success:** `200` — `data` array of `{ period, type, total, count }` (time buckets from SQL).

---

#### Recent activity

| | |
|--|--|
| **Method & path** | `GET /api/dashboard/recent` |
| **Roles** | All authenticated |

Returns up to **10** most recent non–soft-deleted records (by `date`, then `createdAt`).  
**Scope:** `ADMIN` — global; others — own records only.

---

## Role matrix

| Capability | VIEWER | ANALYST | ADMIN |
|------------|:------:|:-------:|:-----:|
| Register / login | ✓ | ✓ | ✓ |
| List / get financial records | ✓ (own) | ✓ (own) | ✓ (all) |
| Create / update / delete records | — | — | ✓ |
| User management | — | — | ✓ |
| Dashboard summary / by-category / trends | — | ✓ (own) | ✓ (all) |
| Dashboard recent | ✓ (own) | ✓ (own) | ✓ (all) |

---

## Example requests

Set `TOKEN` to the JWT returned from `POST /api/auth/login` (`data.token`). Adjust the host/port if your `.env` differs.

### cURL

```bash
BASE="http://localhost:8000"

curl -s "$BASE/health"

curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin@123"}'

# After copying token from login response:
TOKEN="<paste_jwt_here>"

curl -s "$BASE/api/users" -H "Authorization: Bearer $TOKEN"

curl -s "$BASE/api/records?page=1&limit=5&type=INCOME" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$BASE/api/dashboard/summary" -H "Authorization: Bearer $TOKEN"

curl -s "$BASE/api/dashboard/trends?period=monthly" \
  -H "Authorization: Bearer $TOKEN"
```

### PowerShell

```powershell
$BASE = "http://localhost:8000"

Invoke-RestMethod -Uri "$BASE/health"

$login = Invoke-RestMethod -Method POST -Uri "$BASE/api/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"admin@test.com","password":"Admin@123"}'
$token = $login.data.token
$h = @{ Authorization = "Bearer $token" }

Invoke-RestMethod -Uri "$BASE/api/users" -Headers $h
Invoke-RestMethod -Uri "$BASE/api/records?page=1&limit=10" -Headers $h
Invoke-RestMethod -Uri "$BASE/api/dashboard/summary" -Headers $h
```

---

## Architecture decisions

- **SQLite:** No separate DB process; ideal for local development and assessments. Limited concurrent writers compared to client/server databases.
- **JWT with role in payload:** Convenient for clients; `authenticate` still loads the user from the DB each request for authoritative `role`, `isActive`, and existence.
- **Soft delete:** `deletedAt` preserves history and auditability; all reads exclude soft-deleted rows.
- **Database aggregations:** Summary, category breakdown, and trends use Prisma `aggregate` / `groupBy` or SQL—avoiding full-table loads in application memory.

---

## Trade-offs & what I'd do differently at scale

1. **SQLite concurrency:** Under heavy parallel writes, consider **PostgreSQL** (or similar) and connection pooling.
2. **JWT lifecycle:** Add **refresh tokens**, shorter access-token TTL, and optional revocation for high-security finance deployments.
3. **RBAC complexity:** Replace flat roles with **policies** or **scopes** when many permission dimensions appear.
4. **Analytics load:** Move heavy reporting to **read replicas**, **warehouses**, or **materialized views** so OLTP stays responsive.

---

## Test credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| ADMIN | `admin@test.com` | `Admin@123` |
| ANALYST | `analyst@test.com` | `Analyst@123` |
| VIEWER | `viewer@test.com` | `Viewer@123` |

The seed creates **20** sample financial records across these users, with dates spread over roughly the **last six months**.

---

## owner
chandu pn @ chandupn.05@gmail.com

