# Environment Guide

This is the environment-variable reference for EZSpot.

## 1) Environment Model in This Project

EZSpot uses a root `.env` file for Docker Compose substitution.

- Compose reads values from `.env` and injects them into service containers through `docker-compose.yml`.
- Backend runtime reads environment variables from `process.env`.
- Backend Python utilities read shared DB variables with `os.getenv(...)`.
- Dockerized frontend Nginx proxies `/api` to the backend container.

## 2) Current Root Variables

### 2.1 Backend Runtime Variables

- `SESSION_SECRET`
  - Used in `backend/server/auth/authConfig.ts` and applied by `backend/server/server.ts` for session signing.
- `FRONTEND_URL`
  - Used by auth redirect logic in `backend/server/auth/authConfig.ts` and `backend/server/auth/authController.ts`.
- `CORS_ALLOWED_ORIGINS`
  - Used in `backend/server/server.ts` to build the backend CORS allowlist.
- `CAS_LOGOUT_URL`
- `LOCAL_DEV_USER`
- `CAS_SSO_BASE_URL`
- `CAS_SERVER_BASE_URL`
- `CAS_VALIDATE_URL`
  - Used by `backend/server/auth/authConfig.ts`, `backend/server/auth/authLogin.ts`, `backend/server/auth/authController.ts`, and `backend/server/auth/casStrategy.ts` for CAS/local-auth behavior.

### 2.2 Shared Database Variables

These values are shared by backend runtime and the MySQL container:

- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
  - Used by Node DB code in `backend/server/db/connection.ts`
  - Used by Python parser code in `backend/python/parser/extract_text.py`
  - Mapped to MySQL runtime variables in `docker-compose.yml`

### 2.3 MySQL-Only Variable

- `ROOT_PASSWORD`
  - Used only by the MySQL container as `MYSQL_ROOT_PASSWORD`

## 3) Where Variables Are Declared

Primary files:
- `.env`
  - Local values used by Docker Compose substitution.
- `.env.example`
  - Template of supported root env variables.
- `docker-compose.yml`
  - Service-level env injection and MySQL variable mapping.

## 4) How Container Injection Works

How to inject a variable into a runtime container:

1. Define the variable in `.env` and `.env.example` if it belongs in the shared root env model.
2. Reference it in `docker-compose.yml` under the correct service.
3. Read it from backend code or container runtime code.

Example:
```ts
return process.env.SESSION_SECRET || 'dev-session-secret';
```

## 5) Variable-to-Container Matrix

| Variable | backend | database | frontend | Notes |
|---|---|---|---|---|
| `SESSION_SECRET` | yes | no | no | Session signing secret |
| `FRONTEND_URL` | yes | no | no | Auth redirect base URL |
| `CORS_ALLOWED_ORIGINS` | yes | no | no | Comma-separated backend CORS allowlist |
| `CAS_LOGOUT_URL` | yes | no | no | CAS logout endpoint |
| `LOCAL_DEV_USER` | yes | no | no | Localhost auth bypass identity |
| `CAS_SSO_BASE_URL` | yes | no | no | CAS SSO base URL |
| `CAS_SERVER_BASE_URL` | yes | no | no | Public backend URL used by CAS callbacks |
| `CAS_VALIDATE_URL` | yes | no | no | CAS validation path |
| `DB_HOST` | yes | no | no | Backend and Python DB host |
| `DB_NAME` | yes | yes (as `MYSQL_DATABASE`) | no | Shared app DB name |
| `DB_USER` | yes | yes (as `MYSQL_USER`) | no | Shared app DB user |
| `DB_PASSWORD` | yes | yes (as `MYSQL_PASSWORD`) | no | Shared app DB password |
| `ROOT_PASSWORD` | no | yes (as `MYSQL_ROOT_PASSWORD`) | no | MySQL root password |