# Incognitrix Backend (MySQL)

This backend provides API support for:
- Authentication
- Experimental rooms
- Career paths (including modules/resources)
- Platform configuration

## 1. Configure environment

Copy `.env.example` to `.env` and keep your requested credentials:

- `DB_USER=CTF`
- `DB_PASSWORD=root`

Also set:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `JWT_SECRET`

## 2. Initialize database and seed defaults

```bash
npm run db:init
```

This creates schema + seeds default values already present in your app:
- users (`operator01`, `admin01`)
- rooms
- career paths
- platform config

## 3. Start backend

```bash
npm run dev
```

Backend runs on `http://localhost:4000` by default.

## API Summary

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/rooms`
- `GET /api/rooms/:id`
- `POST /api/rooms` (admin)
- `PUT /api/rooms/:id` (admin)
- `DELETE /api/rooms/:id` (admin)
- `GET /api/career-paths`
- `GET /api/career-paths/:id`
- `POST /api/career-paths` (admin)
- `PUT /api/career-paths/:id` (admin)
- `DELETE /api/career-paths/:id` (admin)
- `GET /api/platform-config`
- `PUT /api/platform-config` (admin)

All non-login endpoints require `Authorization: Bearer <token>`.
