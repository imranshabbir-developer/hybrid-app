# Nexus ERP — How to Run (Desktop Demo)

## Prerequisites
- Node.js 20+
- **SQLite** is used for desktop/local (no Postgres install needed for clients)
  - DB file: `data/erp.sqlite` (auto-created)

## Database note (desktop + future online)

- **Runtime (desktop/exe path):** SQLite → `data/erp.sqlite`
- **Schema also synced to PostgreSQL** (`erp_db`) via `npm run db:push:all` for future online/SaaS
- Demo users and POs you create while developing live in **SQLite** by default

## First-time setup (once)

```powershell
cd C:\Users\imran.shabbir\Desktop\erp
npm install
npm run setup
```

`setup` creates/updates `data/erp.sqlite` and seeds demo users.

## Demo users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@erp.com | admin@123 |
| Company 1 | imran@erp.com | admin@123 |
| Company 2 | imranshabbir@erp.com | admin@123 |

## Run for demo

**Terminal 1 — start API + Web UI**

```powershell
cd C:\Users\imran.shabbir\Desktop\erp
npm run dev
```

- API: http://127.0.0.1:3001/api/health
- Web: http://127.0.0.1:5173

**Terminal 2 — open Desktop window (Electron)**

```powershell
cd C:\Users\imran.shabbir\Desktop\erp
npm run desktop
```

Or open the browser at http://127.0.0.1:5173 for the same login screen.

## Verify login quickly

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3001/api/auth/login -ContentType 'application/json' -Body '{"email":"admin@erp.com","password":"admin@123"}'
```
