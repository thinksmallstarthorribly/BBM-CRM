# Phase 0 — Independence

**Target:** `crm.bigbluemop.com.au` (VentraIP DNS)

## Done on branch `phase0-independence`

- Docker + Compose + `.env.example` + `GET /api/health`
- Standalone email/password auth (`localAuth.ts`, scrypt + JWT)
- Mobile login form (email + password)
- PostgreSQL schema (`pgTable` / enums / `passwordHash`)
- `pg` driver + `onConflictDoUpdate` upserts
- Manus OAuth only if env is set (optional)

## Still needed to use on your phone

1. Small always-on server (VPS) with Docker
2. Copy `.env.example` → `.env` and set a strong `JWT_SECRET` + `OWNER_PASSWORD`
3. `docker compose up -d --build`
4. In VentraIP: point `crm` to that server
5. Open `https://crm.bigbluemop.com.au` and log in

Owner login email defaults to: `thinksmallstarthorribly@gmail.com`
