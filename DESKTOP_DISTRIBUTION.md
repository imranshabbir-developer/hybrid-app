# Desktop Product Distribution (.exe) & Local Database

This guide matches your client case: **sell as offline desktop software**, companies run it on their own PCs **without internet**, and later you may add online/SaaS.

---

## 1. Can we make a `.exe` the client installs?

**Yes.** With Electron we can build a Windows installer (`.exe` / `.msi`) using `electron-builder`.

Typical deliverable for a client:

```text
NexusERP-Setup-1.0.0.exe
```

Client double-clicks → installs → gets a Start Menu shortcut → app opens like Tally / desktop accounting software.

What the installer should contain:

| Piece | Included? | Why |
|-------|-----------|-----|
| Electron UI (frontend) | Yes | The screens |
| NestJS API (backend) | Yes (bundled & auto-started) | Business logic + auth |
| Database engine | **Must be decided** (see below) | Data storage |
| Demo/seed users | Optional | First login |
| Node/Postgres separate installs | Prefer **No** | Client should not do IT setup |

**Important:** A plain UI `.exe` alone is not enough. The packaged app must start **UI + API + DB** together.

---

## 2. How does the database move to the client’s PC?

Your current setup uses **PostgreSQL on your machine** (`127.0.0.1`).  
If you only send an `.exe` that still expects Postgres on `127.0.0.1`, **the client’s PC will fail** unless Postgres is also installed and configured there.

So for selling offline desktop copies, choose one of these models:

### Option A — Recommended for offline desktop sales: **SQLite (embedded file DB)**

```text
C:\Users\<Client>\AppData\Roaming\NexusERP\data\erp.sqlite
```

- DB is just a **file** created on first launch
- No Postgres install for client
- Works fully offline
- Easy backup: copy that file
- Best UX for “install and start working”

**Tradeoff:** Multi-user on one LAN is weaker than Postgres (usually 1 PC / 1 user at a time is fine for v1).

### Option B — Keep PostgreSQL, but **bundle it in the installer**

Installer includes portable Postgres (or installs it silently).

- Stronger for multi-user / heavy reporting later
- Heavier installer, more support issues
- Still fully offline once installed

### Option C — Require client to install Postgres themselves

- Cheapest for you to build
- Bad for product sales / demos (clients hate setup pain)

### Option D — Future hybrid (online SaaS)

Same app → cloud Postgres when internet is available.  
Do this **after** offline desktop product is stable.

---

## 3. What “selling local desktop copies” means in practice

Each buying company gets:

1. Their own installer / license
2. Their own local database on their PC
3. Their own users (admin + company users)
4. No dependency on your laptop’s Postgres
5. No internet required for daily work

Data does **not** “shift” automatically from your PC.  
On the client machine, the app creates a **fresh empty database** (or imports a starter template).  
If you need to migrate sample data, you ship an export file and import on first run.

```text
Your development PC                     Client PC
-----------------                     ----------
Postgres erp_db  ──build installer──►  SQLite/Postgres local file/service
(seed users for demo)                  (own DB, own users, own POs)
```

---

## 4. Recommended architecture for your product path

**Phase now (offline product sales):**

```text
Electron .exe
  ├─ starts local API automatically
  ├─ uses local embedded DB (SQLite recommended)
  └─ stores data in AppData (per Windows user/machine)
```

**Phase later (SaaS / online):**

```text
Same UI + API
  └─ switch connection to cloud Postgres + login over HTTPS
```

This is why we built React + API separately: desktop shell can wrap it now; web hosting can reuse it later.

---

## 5. Backup / support factors clients will ask about

- **Backup:** copy DB file (SQLite) or run dump (Postgres)
- **Reinstall:** data survives if AppData is kept
- **Transfer PC:** copy DB file + reinstall app
- **License:** machine-bound or license key (add later)
- **Updates:** ship new installer; migrate DB schema on startup
- **Antivirus:** code-sign the `.exe` (important for trust)

---

## Current project status vs final product packaging

| Today (dev) | Final sellable product |
|-------------|-------------------------|
| You run `npm run dev` | Client runs installed `.exe` |
| **SQLite file** at `data/erp.sqlite` | Same engine; path becomes `%APPDATA%/NexusERP/erp.sqlite` |
| API started manually | API auto-starts inside Electron |
| Open browser/Electron to localhost | Single desktop window |

**Decision locked for offline sales:** SQLite embedded (no Postgres install for clients).  
Postgres remains optional for a future online/SaaS mode.

---

## Honest answer to “if I send .exe, will it just work?”

- **Yes**, if installer includes UI + API + SQLite + first-run setup.  
- **No**, if you only send a UI build with no local database.

For your client’s offline desktop sales model, we should aim for:  
**one installer → install → open → login → work offline.**

**Already done for this path:** local SQLite at `data/erp.sqlite` with demo users seeded and login verified.

---

## Packaging commands (when you are ready for `.exe`)

From repo root (after `npm install` in workspaces):

```powershell
# 1) Build API + web
npm run build -w apps/api
npm run build -w apps/web

# 2) Install desktop packaging deps (first time)
npm install -w apps/desktop

# 3) Create Windows installer
npm run dist -w apps/desktop
```

Installer output: `apps/desktop/release/NexusERP-Setup-*.exe`

**Runtime data path (packaged):** `%APPDATA%\Nexus ERP\data\erp.sqlite` via `ERP_DATA_DIR`  
**Dev data path:** `data/erp.sqlite`

Electron `main.js` starts the bundled API in packaged mode and waits for `/api/health` before opening the window. Dev mode (`npm run desktop`) still uses Vite at `http://127.0.0.1:5173` with API from `npm run dev`.

