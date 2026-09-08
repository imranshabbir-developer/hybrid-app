# Import / Supplier ERP — Full Implementation Plan

**Prepared from:** `Reports - SUPPLIER.xlsx` (File-A) + `Import Tracking Sheet.xlsx` (File-B)  
**Goal:** Offline-first desktop ERP that mirrors Excel workflows, with a clear path to online multi-user later.  
**Client preference:** Screens must look and feel like Excel (familiar field layout, grid entry, tabs).

---

## 1. Executive Summary

The client’s Excel workbooks already define a complete import–supplier operating model:

| Layer | Source | Role in ERP |
|-------|--------|-------------|
| Entry | File-A → **PURCHASE ORDER FORMAT** | First transactional entry (PO header + line items) |
| Enrichment | File-A → **Supplier Data Entry form (1)** | Supplier/product enrichment; fields that match PO auto-fill |
| Master | File-A → **Supplier Master Sheet** | Single consolidated row per PO / shipment key |
| Tracking | File-B → **Current Status 2020** | Live import pipeline (open shipments) |
| Closure | File-B → **Current Closed Files 2020** | Closed files + bank / insurance / logistics / QC / clearance |
| History | File-A history sheets | Derived views / portfolios from Master + ITS |
| Analytics | File-A → **SUPPLIERS** | ~100+ report & dashboard requirements |

**Recommended approach:** one normalized PostgreSQL database, one React “Excel-like” UI, packaged as a desktop app (Tauri/Electron) for offline use, same codebase deployable as a web app later.

---

## 2. Inventory of Both Excel Files

### 2.1 File-A — `Reports - SUPPLIER.xlsx` (8 sheets)

| # | Sheet name | Type | Purpose |
|---|------------|------|---------|
| 1 | **PURCHASE ORDER FORMAT** | Form / document | Primary entry: company, shipper, consignee, origin, ship via, HS, incoterms, tolerance, currency, line items (item#, description, qty, unit price, total), comments |
| 2 | **Supplier Data Entry form  (1)** | Form | Per-supplier / per-PO enrichment form; notes say entries reflect in Master + ITS |
| 3 | **Supplier Data Entry form (2)** | Grid template | Alternate tabular supplier entry (same concepts as form 1) |
| 4 | **Supplier Master Sheet** | Master grid (27 cols A–AA) | Combination of PO + Form (1); search by supplier/product/category |
| 5 | **SUPPLIER PURCHASE HISTORY** | History / portfolio | Purchase history; columns mapped from ITS; filters & dashboards |
| 6 | **SUPPLIER PAYMENT HISTORY** | History | Payments derived from purchase history |
| 7 | **SUPPLIER OPERATIONAL HISTORY** | History | Lead-time maturity, PP samples, delays (from ITS) |
| 8 | **SUPPLIERS** | Requirements catalog | Full list of required reports/dashboards by category (Fabrics, Accessories, Machinery, Chemicals, Payments, Lead Time, QC, Claims, Development, Division) |

### 2.2 File-B — `Import Tracking Sheet.xlsx` (2 sheets)

| # | Sheet name | Columns | Purpose |
|---|------------|---------|---------|
| 1 | **Current Status 2020** | ~46 used (A–AT), wide sheet to CB | Open / in-process import tracking |
| 2 | **Current Closed Files 2020** | ~86 (A–CH) | Closed shipments + QC, bank, insurance, logistics, clearance |

---

## 3. Field Catalogs (Must Not Lose Anything)

### 3.1 PURCHASE ORDER FORMAT (entry screen #1)

**Header / parties**
- Company name, street, city/ST/ZIP, phone, fax, website  
- DATE, PO #  
- Beneficiary: company, contact/dept, address, phone, fax  
- Shipper: company, contact/dept, address, phone, fax  
- Consignee: name, company, address, phone  

**Shipment / commercial**
- Origin of Goods  
- SHIP VIA (Air / Sea / Express)  
- HS Code  
- Incoterms (FOB, etc.)  
- Tolerance (e.g. 5% +/-)  
- Currency (USD, …)  

**Line items (repeatable rows)**
- ITEM #  
- DESCRIPTION  
- Qty/kg (or unit qty)  
- UNIT PRICE  
- TOTAL (= Qty × Unit Price)  
- Grand TOTAL (= SUM of line totals)  

**Footer**
- Comments / Special Instructions  
- Contact for questions  

### 3.2 Supplier Data Entry Form (1)

| Field | Notes from sheet |
|-------|------------------|
| Purchase Order No | Reflects in Master + ITS |
| Date | Reflects in Master + ITS |
| PPC Demand No. | Reflects in Master + ITS |
| PPC Demand Date | Reflects in Master + ITS |
| Shipper Name | Reflects in Master + ITS |
| Division | Reflects in Master + ITS |
| Supplier Category | Manufacturer / Trader / Customer Source (dropdown) |
| Product Category | Fabrics / Accessories / Machinery and spares / Dyes and chemicals |
| Tolerance | 5%, 7%, 10% |
| Product Item Code | Company internal code → Master |
| Shipper Address | → Master |
| Country | → Master |
| Shipper Email | → Master |
| Contact No | → Master |
| Website Name | → Master |
| Product Description | → Master + ITS |
| Country of Origin | Searchable → Master |
| Product HS Code | Searchable → Master |
| Unit Value | → Master + ITS |
| Total Quantity | → Master + ITS |
| Total Value | → Master + ITS |
| Lead Time | → Master + ITS |
| Port of loading | → Master + ITS |
| Oekotex Certification | Yes / No / Under process |
| ISO Certification | Yes / No / Under process |
| Reach Certification | Yes / No / Under process |

### 3.3 Supplier Master Sheet (columns A–AA)

| Col | Field | Source intent |
|-----|-------|---------------|
| A | Sr.No | Auto |
| B | Purchase Order No | PO / Form → also ITS |
| C | Date | PO / Form → ITS |
| D | PPC Demand No | Form |
| E | PPC Demand Date | Form |
| F | Department category | Form (Division) |
| G | Shipper Name | Form → ITS |
| H | Supplier Category | Manual / Form |
| I | Product Category | Form |
| J | Product Item Code | Form |
| K | Supplier Address | Form |
| L | Country | Form |
| M | Supplier Email | Form |
| N | Contact No. | Form |
| O | Website Name | Form |
| P | Product Description | Form → ITS |
| Q | Country of Origin | Form |
| R | Product HS Code | Form |
| S | Unit Value | Form → ITS |
| T | Total Quantity | Form → ITS |
| U | Total Value | Form → ITS |
| V | Lead Time | Form → ITS |
| W | Port of Loading | Form → ITS |
| X | Oekotex Certification | Form |
| Y | ISO Certification | Form |
| Z | Reach Certification | Form |
| AA | Remarks | Manual; PO completion when goods received in ITS |

### 3.4 Current Status 2020 (open ITS)

| Col | Field | Type / formula notes |
|-----|-------|----------------------|
| A | Sr.No | Manual / auto |
| B | Division | Lookup / dropdown |
| C | Merchandiser | Dropdown |
| D | Month | Derived from dates |
| E | PPC Demand No | From Master/Form |
| F | PPC Demand date | From Master/Form |
| G | Elapsed Lead Time | `TODAY − PPC Demand date` |
| H | Remaining Lead Time | `Standard Lead Time − Elapsed` |
| I | Purchase Order | From Master/PO |
| J | PO Date | From Master/PO |
| K | PO TAT | `PO Date − PPC Demand date` |
| L | P.O Quantity | From Master |
| M | Shipper | From Master |
| N | Product Description | From Master |
| O | Quantity shipped | Manual (shipment) |
| P | Unit Value | From Master |
| Q | Total Amount | `Qty shipped × Unit Value` (or equivalent) |
| R | Bank | Manual |
| S | Payment Term | LC / ADV / O/A / DA / DP |
| T | Mode of Shipment | SEA / AIR / COURIER |
| U | Incoterm | CNF / FOB / EXW |
| V | Supplier Delivery time (days) | From Master Lead Time |
| W | Standard Lead Time | Config / manual |
| X | Supplier Delivery Date | `PO Date + Supplier Delivery time` |
| Y | PP Sample Readiness Date | Manual |
| Z | Actual Shipment Ready Date | Manual |
| AA | Delay against supplier Lead Time | `Supplier Delivery Date − Actual Ready` |
| AB | Delay 1–10 days | Bucket calc |
| AC | Delay 10–20 days | Bucket calc |
| AD | On Board | Manual |
| AE | ETA At port | Manual |
| AF | B/L / AWB # | Manual |
| AG | Date (BL date) | Manual |
| AH | POL | From Master Port of Loading |
| AI | Destination port | Manual |
| AJ | Mode of Clearance | EOU / SEXP-… |
| AK | EOU LIMIT UTILIZED | Manual |
| AL–AP | FACTORY ARRIVAL: FETA, 1st/2nd/3rd Revision, Delay | FETA = `Standard LT + PPC Demand date` |
| AQ | Forwarder | Manual |
| AR | C/A (Clearing Agent) | Manual |
| AS | Doc to Agent | Manual |
| AT | Remarks | Manual |

### 3.5 Current Closed Files 2020 (extra vs Status)

All Status-like fields **plus**:
- Delay against standard lead time buckets + Delay Cause  
- **QC:** Report Received Date, Order Qty, Rejected Qty, Less Qty, Claim Date, report timing buckets, Material financial loss  
- **PO Closed From ERP** flag  
- **Bank:** Bank Name, TT/LC Number, Date, R.O.E, bank charges (advance / LC opening / retirement), Total, docs payment, docs from bank, OA/Advance settlement  
- **Insurance:** company, Bill No, Date, Amount  
- **Logistics:** Forwarder, Bill No, Date, Weight/CBM, Amount, Bill to Finance  
- **Clearance:** Clearing Agent, G.D No, Date, Shipment Clearance Date, Bill No, Date, Amount  

### 3.6 History sheets (derived)

**Purchase History:** Sr.No, Category, HS Code, Month, Product Item Code, PO, PO Date, Supplier, Description, COO, Qty, Unit Price, Amount, Payment/Bank Ref, Mode of Shipment, Price Term, R.O.E, Value in PKR  

**Payment History:** subset focused on payments (PO, supplier, amount, bank ref, ROE, PKR)  

**Operational History:** PO, dates, supplier, qty, lead time, delivery vs actual ready, 1st/2nd PP sample dates, delay buckets, lifting by air due to delay  

### 3.7 Report catalog (SUPPLIERS sheet) — must be in backlog

Categories covered (do not drop):
1. Supplier counts & item-code comparisons (Fabrics / Accessories / Machinery / Chemicals)  
2. Orders by supplier, by country, by date range, unit-value trends  
3. Certifications (Oekotex, Reach, ISO)  
4. Supplier status (Manufacturer / Trader / Customer sourced) per category  
5. HS Codes list, Port of loading & shipments per POL  
6. PO issued / under process / completed / short / over / cancelled  
7. Division reports (all / each / by month / value)  
8. Payment reports by category & payment mode (Advance, LC sight/usance, DA, OA, DP) + days from GD to payment  
9. Lead time maturity, PP sample approvals, delay buckets  
10. QC (FID) rejections, short shipment, rejection loss  
11. Claims lifecycle (launched / accepted / received / rejected / expenses)  
12. Development counts & expenses / logistics by air & courier  
13. Supplier dashboard (quarterly / half-yearly / fiscal)  

---

## 4. Business Data Flow (Client-Instructed Path)

```text
┌─────────────────────────────┐
│ 1. PURCHASE ORDER FORMAT    │  ← FIRST ENTRY
│    PO header + line items   │
└──────────────┬──────────────┘
               │ auto-map matching fields
               ▼
┌─────────────────────────────┐
│ 2. Supplier Data Entry (1)  │  ← enrich / confirm
│    + manual fields not on PO│
└──────────────┬──────────────┘
               │ merge / upsert
               ▼
┌─────────────────────────────┐
│ 3. Supplier Master Sheet    │  ← system of record for PO+supplier
│    combo of (1)+(2); fill   │
│    missing cols manually    │
└──────────────┬──────────────┘
               │ post matched columns
               ▼
┌─────────────────────────────┐
│ 4. Import Tracking          │
│    Current Status (open)    │
│    → Closed Files (done)    │
└──────────────┬──────────────┘
               │ derive
               ▼
┌─────────────────────────────┐
│ 5. History + Reports        │
│    Purchase / Payment / Ops │
│    + SUPPLIERS dashboards   │
└─────────────────────────────┘
```

### 4.1 Field mapping — PO → Form (1) → Master → ITS

| Concept | PO Format | Form (1) | Master | ITS Status |
|---------|-----------|----------|--------|------------|
| PO No | PO # | Purchase Order No | Purchase Order No | Purchase Order |
| PO Date | DATE | Date | Date | PO Date |
| Shipper name | Shipper company | Shipper Name | Shipper Name | Shipper |
| Shipper address/phone/fax | Shipper block | Address / Contact | Address / Contact / Email / Web | — (Master only) |
| Origin | Origin of Goods | Country of Origin | Country of Origin | (related) |
| HS Code | HS Code | Product HS Code | Product HS Code | — / history |
| Incoterms | Incoterms | — (add if needed) | — or extend | Incoterm |
| Ship via | SHIP VIA | — | — | Mode of Shipment |
| Tolerance | Tolerance | Tolerance | (extend Master if needed) | — |
| Currency | Currency | — | — (extend) | — / payments |
| Item # | ITEM # | Product Item Code | Product Item Code | — / history |
| Description | DESCRIPTION | Product Description | Product Description | Product Description |
| Qty | Qty | Total Quantity | Total Quantity | P.O Quantity |
| Unit price | UNIT PRICE | Unit Value | Unit Value | Unit Value |
| Line/Total value | TOTAL | Total Value | Total Value | Total Amount (from shipped) |
| PPC Demand No/Date | — | Form | Master | ITS |
| Division | — | Form | Department category | Division |
| Lead Time | — | Form | Lead Time | Supplier Delivery time |
| Port of loading | — | Form | Port of Loading | POL |
| Certifications | — | Form | Master | — |
| Beneficiary / Consignee | PO only | — | store on PO entity | — |

**Rule:** Anything present on earlier step and matching later columns **auto-posts**. Missing columns are entered manually on that screen. Never silently drop a column that exists in Excel.

---

## 5. Recommended Tech Stack (Market-Standard, Offline → Online)

### 5.1 Database: **PostgreSQL (preferred over MySQL)**

| Criteria | PostgreSQL | MySQL |
|----------|------------|-------|
| Complex reports / analytics | Excellent (CTEs, window functions) | Good but weaker analytics ergonomics |
| JSON for flexible Excel extras | Native `JSONB` | JSON exists; indexing/querying less mature |
| Date / interval math (lead times) | Strong | Adequate |
| Concurrent multi-user (future online) | Excellent | Good |
| ERP industry preference | Very common | Common |
| Offline desktop packaging | Local install / Docker / PGlite option | Local install |

**Decision: PostgreSQL.**  
It fits import tracking, lead-time formulas, heavy reporting, and future SaaS better. MySQL is acceptable only if the client already standardizes on it; functionally PostgreSQL is the better fit here.

**Offline strategy for DB:**
- **Phase 1 (desktop):** PostgreSQL installed locally (installer bundled or guided setup), OR containerized Postgres for IT-managed PCs.  
- **Optional lighter offline:** SQLite for single-user demo only — **not** recommended as long-term ERP store if you already want Postgres/MySQL.  
- **Phase 2 (online):** Same schema on cloud Postgres (Supabase / RDS / Azure / self-host); desktop switches connection string or syncs via API.

### 5.2 Application architecture (best fit for Excel → desktop → web)

| Layer | Choice | Why |
|-------|--------|-----|
| **UI** | **React 18+ + TypeScript** | Dominant market standard; same UI for desktop & future web |
| **Excel-like grids** | **AG Grid** (Community or Enterprise) or **Handsontable** | Spreadsheet feel: keyboard nav, copy/paste, filters, pinned headers |
| **Forms (PO / Form 1)** | React Hook Form + Zod | Validation matching Excel required fields |
| **UI kit** | MUI or Ant Design (dense “office” density) | Familiar dense controls; Excel-like spacing |
| **Charts / dashboards** | Apache ECharts or Recharts | Pie/round graphs required in SUPPLIERS sheet |
| **Desktop shell** | **Tauri 2** (preferred) or Electron | Offline desktop; Tauri = smaller install, better security |
| **API / backend** | **NestJS (Node/TypeScript)** *or* **FastAPI (Python)** | NestJS keeps one language with React; FastAPI great if heavy Excel import scripts |
| **ORM** | Prisma (Nest) or SQLAlchemy/SQLModel (FastAPI) | Migrations, type-safe models |
| **Auth (later online)** | JWT + refresh; roles (Admin, Merchandiser, Import, Finance, Viewer) | Multi-user ready |
| **Local runtime** | Backend + Postgres start with app (service manager / sidecar) | True offline |
| **Export** | ExcelJS / openpyxl parity export | Client still wants Excel outputs |
| **Import legacy data** | One-time ETL from both xlsx files | Seed Master + ITS |

**Recommended concrete stack (recommended default):**

```text
Frontend:  React + TypeScript + Vite + AG Grid + React Hook Form + Zod + ECharts
Desktop:   Tauri 2 (Windows first)
Backend:   NestJS + Prisma
Database:  PostgreSQL 16
Testing:  Vitest + Playwright + pytest/Jest API tests + SQL fixture checks
CI:        GitHub Actions (later)
```

**Alternative ( equally valid):** Electron + NestJS + PostgreSQL if team is already Electron-heavy.  
**Avoid for this project:** pure VBA macros, Access-only, or “Excel as database” long-term.

### 5.3 Why this stack matches client needs

1. **Excel look:** AG Grid screens for Master / Status / Closed / Histories; document-style form for PO Format.  
2. **Offline now:** Tauri app + local Postgres + local API.  
3. **Online later:** Deploy same NestJS + React to server; change DB URL; add auth.  
4. **Market standard:** React + Nest/FastAPI + Postgres is a mainstream ERP-ish stack.  
5. **Reporting:** SQL views + ECharts cover the SUPPLIERS report catalog without rebuilding Excel pivots by hand.

---

## 6. Proposed Domain Model (Normalized, Excel-Faithful)

### 6.1 Core entities

```text
companies / org_settings          → buyer letterhead (PO header)
suppliers                         → shipper master (name, address, country, email, phone, web, category, certs)
products / item_codes             → item code, description, HS, category, default lead time
purchase_orders                   → PO header (date, currency, incoterm, ship_via, tolerance, origin, consignee, beneficiary…)
purchase_order_lines              → item lines (qty, unit price, totals)
ppc_demands                       → demand no + date + division + merchandiser
supplier_entries                  → Form (1) enrichment linked to PO
supplier_master_rows              → denormalized/read model OR view joining above (Excel Master look)
import_shipments                  → ITS Current Status row (open)
import_shipment_events            → optional timeline (revisions, docs)
import_closed_files               → Closed Files extras OR status=closed + extension tables
bank_transactions                 → TT/LC, charges, ROE
insurance_bills / logistics_bills / clearance_docs
qc_reports / claims / developments
users / roles / audit_logs
lookups                           → divisions, merchandisers, ports, banks, forwarders, clearance modes, payment terms
```

### 6.2 Key design rules

1. **PO number** is a primary business key (unique, searchable).  
2. Master Sheet in UI can be a **materialized view** or wide table kept in sync by application services (easier Excel parity).  
3. Computed fields (Elapsed LT, Remaining LT, PO TAT, Delivery Date, Delay buckets, FETA, totals) are computed in **backend services** (single source of truth), not only in the UI.  
4. Moving a row from **Current Status → Closed** is a **status transition** + capture of bank/QC/clearance data — not a copy-paste without link.  
5. History sheets are **read models / reports**, not separate manual entry systems (except corrections with audit).  
6. Every create/update writes **audit_log** (who, when, old/new) — critical for ERP trust.

### 6.3 Suggested PostgreSQL types

- Money amounts: `NUMERIC(18,4)`  
- Quantities: `NUMERIC(18,4)`  
- Dates: `DATE`  
- Lead times: `INTEGER` (days)  
- Flags/certs: `ENUM` or lookup codes  
- Free remarks: `TEXT`  
- Soft delete + `created_at` / `updated_at`

---

## 7. UI / UX Plan (Excel Familiarity)

### 7.1 App shell

- Top menu like Excel workbook tabs:  
  `Purchase Order` | `Supplier Entry` | `Supplier Master` | `Import Status` | `Closed Files` | `Purchase History` | `Payment History` | `Operational History` | `Reports / Dashboard` | `Lookups / Settings`
- Dense toolbar: New, Save, Post to next stage, Search, Filter, Date range, Export Excel, Print PO  
- Keyboard: Enter = next cell, Tab = next field, Ctrl+S save, Ctrl+F find (Excel habits)

### 7.2 Screen-by-screen

| Screen | Layout style | Behavior |
|--------|--------------|----------|
| Purchase Order Format | Document form mirroring Excel PO | Create/edit PO; print/PDF; on Save → offer “Open Supplier Entry with prefill” |
| Supplier Data Entry (1) | Form layout matching sheet sections | Prefill from PO; dropdowns for category/certs/tolerance; Save → upsert Master |
| Supplier Data Entry (2) | Optional AG Grid alternate entry | Same validations as Form 1 |
| Supplier Master | Full-width AG Grid (27+ cols) | Search supplier/product/category; inline edit allowed fields; “Post to ITS” |
| Current Status | AG Grid ~46 cols, frozen left (Sr, Division, PO…) | Auto-calc columns read-only; color delay buckets |
| Closed Files | AG Grid with column groups (QC / Bank / Insurance / Logistics / Clearance) | Only for closed status |
| Histories | Filterable grids | Read-mostly; drill-down to PO/ITS |
| Reports | Filters + tables + pie/bar charts | Implement catalog in phases (see §10) |

### 7.3 Visual fidelity rule

- Labels, column order, and section grouping should **match Excel names** (keep “PPC Demand No”, “B/L / AWB #”, “POL”, etc.).  
- Do **not** rename to fancy ERP jargon in v1 — familiarity is a client requirement.  
- Later, tooltips can explain fields.

---

## 8. Backend Services / Workflows

1. **`createPurchaseOrder`** — validate header + lines; compute line/grand totals.  
2. **`openSupplierEntryFromPO`** — map PO fields → Form DTO.  
3. **`saveSupplierEntry`** — validate; upsert supplier + product; upsert Master row.  
4. **`postMasterToImportStatus`** — create/update open ITS row for matched columns; leave ITS-only fields blank for manual fill.  
5. **`updateImportStatus`** — recompute derived dates/delays.  
6. **`closeImportFile`** — move/flag closed; require/allow QC/bank/logistics/clearance modules.  
7. **`rebuildHistories`** — or use SQL views so histories always live.  
8. **`runReport(reportCode, filters)`** — each SUPPLIERS report has a code.  
9. **`importLegacyExcel`** — ETL for existing File-A/B data.  
10. **`exportExcel(sheetType)`** — regenerate familiar workbooks.

---

## 9. Offline Desktop + Future Online Architecture

```text
PHASE 1 — OFFLINE DESKTOP
┌──────────────────────────────────────────┐
│  Tauri Window                            │
│   └─ React UI (Excel-like)               │
│  Local NestJS API (localhost)            │
│  Local PostgreSQL                        │
│  Optional: auto-backup to folder nightly │
└──────────────────────────────────────────┘

PHASE 2 — ONLINE READY
┌────────────┐     HTTPS      ┌─────────────┐
│ Web / same │ ─────────────► │ Cloud API   │
│ Desktop UI │                │ Cloud PG    │
└────────────┘                │ Auth/Roles  │
                              └─────────────┘
```

**Migration path without rewrite:** keep API contracts stable; only hosting + auth change.  
**Sync option (if hybrid):** outbox table + sync agent — only if client needs offline *and* multi-branch; otherwise Phase 1 fully local, Phase 2 fully online is simpler.

---

## 10. Phased Delivery Plan

### Phase 0 — Discovery lock-in (1 week)
- Confirm field dictionary with client (this document as baseline).  
- Confirm Windows-only vs Mac.  
- Confirm single-user offline vs multi-user LAN.  
- Sample-approve UI mock of PO + Master grid.  
- **Exit criteria:** signed-off field list + stack choice.

### Phase 1 — Foundation (2–3 weeks)
- Repo, NestJS/Prisma, Postgres schema v1, auth stub (local user).  
- Lookups CRUD.  
- Excel import ETL (read both files into DB).  
- **Verification:** schema review; import row counts vs Excel; unit tests on mappers.

### Phase 2 — Purchase Order + Supplier Entry + Master (3–4 weeks)
- PO Format screen (Excel layout).  
- Supplier Entry Form (1) with prefill.  
- Master grid with search.  
- Posting workflow PO → Entry → Master.  
- **Verification:** end-to-end create PO → Master columns match Excel mapping table; no field loss checklist.

### Phase 3 — Import Tracking Status + Closed (3–4 weeks)
- Current Status grid + computed columns.  
- Manual ITS fields + dropdowns.  
- Close workflow + Closed Files grid (grouped columns).  
- Post Master → Status.  
- **Verification:** formula parity tests (Elapsed, Remaining, TAT, Delivery Date, Delay, FETA, Amount); Status→Closed integrity.

### Phase 4 — Histories (2 weeks)
- Purchase / Payment / Operational history views.  
- Filters (supplier, date range, HS, category).  
- **Verification:** history rows = join of Master+ITS; sample supplier portfolio matches Excel intent.

### Phase 5 — Reports & Dashboards (4–6 weeks, can split)
- Implement SUPPLIERS catalog in priority batches:  
  - P0: PO counts, supplier totals, short/over ship, division  
  - P1: payments, lead time, certifications  
  - P2: QC, claims, development, advanced pies  
- **Verification:** each report has fixture + expected numbers.

### Phase 6 — Desktop packaging & hardening (2 weeks)
- Tauri installer, local PG setup guide / service, backups, print PO PDF.  
- **Verification:** clean Windows VM install → create PO offline → restart → data persists.

### Phase 7 — Online readiness (later)
- Deploy API + PG; JWT roles; HTTPS; multi-user concurrency tests.  
- Optional Excel export API for finance.

---

## 11. Testing & Verification Strategy (Mandatory After Every Implementation)

### 11.1 Test pyramid

| Level | Tools | What |
|-------|-------|------|
| Unit | Vitest / Jest / pytest | Mappers PO→Form→Master→ITS; money/qty math; delay buckets |
| Integration | Supertest / pytest + testcontainers Postgres | API workflows, uniqueness of PO, close transition |
| UI | Playwright | Excel-like entry paths, keyboard save, grid filters |
| Formula parity | Golden tests | Same inputs as Excel sample rows → same computed outputs |
| Regression | Checklist per phase | Field-loss audit against this MD catalog |
| UAT | Client | Real PO entry using familiar layouts |

### 11.2 Verification checklist template (run after each feature)

1. **Field presence:** every Excel column for that screen exists in UI + DB.  
2. **Auto-flow:** matched fields copy forward; unmatched remain editable.  
3. **Calculations:** match Excel formulas within rounding rules.  
4. **Persistence:** restart app; data intact.  
5. **Search/filter:** Master/ITS searchable by PO, supplier, item, HS, category.  
6. **Export:** Excel export opens and columns align.  
7. **No silent overwrite:** editing Master does not wipe ITS-only fields.  
8. **Audit:** who changed unit value / qty is logged.

### 11.3 Formula parity set (from File-B samples)

Implement automated tests for:
- `Elapsed Lead Time = TODAY − PPC Demand date`  
- `Remaining Lead Time = Standard Lead Time − Elapsed`  
- `PO TAT = PO Date − PPC Demand date`  
- `Supplier Delivery Date = PO Date + Supplier Delivery time (days)`  
- `Delay against supplier LT = Supplier Delivery Date − Actual Shipment Ready Date` (confirm sign with client)  
- `FETA = Standard Lead Time + PPC Demand date`  
- `Total Amount = Quantity shipped × Unit Value` (confirm vs sample `O*1.45` — may be sample artifact; **clarify with client**)  

### 11.4 Data migration verification

- Count rows imported from Current Status / Closed vs Excel non-empty PO rows.  
- Spot-check 10 POs field-by-field.  
- Certify no truncated text on descriptions / remarks.

---

## 12. Non-Functional Requirements

- **OS:** Windows 10/11 primary (matches client environment).  
- **Performance:** Master/ITS grids smooth at 5k–20k rows (virtualized AG Grid).  
- **Backup:** daily DB dump to user-selected folder.  
- **Security (offline):** local login optional in v1; mandatory for online.  
- **Print:** PO printable/PDF matching Excel PO layout.  
- **i18n:** English first (field names stay Excel English).  
- **Licensing:** prefer AG Grid Community initially; upgrade if Excel-level clipboard/enterprise features needed.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Excel sheets are templates + notes, not clean DB | Treat notes as requirements; normalize carefully |
| Column naming inconsistent (Status vs Closed) | Canonical field dictionary + UI aliases |
| Formula ambiguity (delay sign, `O*1.45`) | Client workshop in Phase 0 |
| Offline Postgres install friction | Bundled installer + setup wizard; IT guide |
| Scope explosion from 100+ reports | Phase reports; P0/P1/P2 |
| “Look exactly like Excel” vs modern UX | Prioritize column names/order/density; avoid card-heavy UI |
| Dual entry Form (1) vs Form (2) | One data model; two UIs |

---

## 14. Clarifications to Confirm With Client (Before Coding Heavy Logic)

1. Is **one PO = one Master row = one ITS row**, or can one PO have multiple shipments/lines in ITS?  
2. Confirm **delay formula sign** and the sample `Total Amount = O*1.45`.  
3. Should **Closed Files** be a separate table or same shipment with `status=closed`? (Recommend same entity + extension.)  
4. Multi-user on LAN in Phase 1, or strictly single PC?  
5. Must print PO look **identical** to Excel template (logo/letterhead)?  
6. Priority order of first 15 reports from SUPPLIERS sheet.  
7. Currencies beyond USD and ROE source of truth.  
8. Who can edit Unit Value after PO is posted to ITS?

---

## 15. Suggested Folder / Repo Structure

```text
erp/
  apps/
    desktop/          # Tauri
    web/              # React (shared with desktop webview)
  packages/
    ui/               # shared components (grids, forms)
    shared/           # zod schemas, DTO types
  services/
    api/              # NestJS + Prisma
  db/
    migrations/
    seeds/
  docs/
    ERP_FULL_PLAN.md  # this file
    FIELD_DICTIONARY.md
    REPORT_CATALOG.md
  tests/
    e2e/
    formula-parity/
```

---

## 16. Immediate Next Steps (After Plan Approval)

1. Client sign-off on this plan + answers to §14.  
2. Create FIELD_DICTIONARY.md (every column → DB field → screen → flow stage).  
3. Scaffold monorepo (React + NestJS + Prisma + Postgres).  
4. Build Phase 1 schema + Excel ETL.  
5. Implement PO → Supplier Entry → Master vertical slice with verification checklist.  
6. Only then ITS Status / Closed.

---

## 17. Stack Decision Summary (Short)

| Decision | Choice |
|----------|--------|
| Database | **PostgreSQL** (not MySQL, unless client mandates) |
| Frontend | **React + TypeScript + AG Grid** (Excel-like) |
| Desktop | **Tauri 2** (or Electron) |
| Backend | **NestJS + Prisma** |
| Charts | **ECharts** |
| Offline | Local API + local Postgres |
| Online later | Same codebase, cloud Postgres + auth |
| Testing | Unit + API + Playwright + formula golden tests + UAT checklists |

---

## 18. Success Criteria

- User can enter a PO in an Excel-familiar screen without training beyond their current sheets.  
- Matching data flows automatically to Supplier Entry → Master → Import Status.  
- Missing fields are manually completable without breaking links.  
- Open vs closed import files behave like File-B.  
- Histories and priority reports work from live data, not copy-paste.  
- App works offline on Windows; architecture ready for online without rewrite.  
- Every delivered phase passes the verification checklist before the next phase starts.

---

## 19. Implementation Status (Living)

Updated as the monorepo lands features. Stack note: desktop uses **Electron + SQLite** (Postgres kept in sync for future SaaS); plan’s Tauri/AG Grid/ECharts remain optional upgrades.

| Plan area | Status | Notes |
|-----------|--------|-------|
| Auth (ADMIN / COMPANY JWT) | Done | Demo users seeded |
| Purchase Order Format | Done | Excel-like form + list CRUD |
| PO Print / PDF | Done | `GET /api/purchase-orders/:id/pdf` + UI button |
| Supplier Entry Form (1) | Done | Prefill from PO; lookups wired |
| Supplier Entry Form (2) AG Grid | Deferred | Same data model; Form 1 is primary |
| Supplier Master | Done | Wide grid + post to ITS |
| Import Tracking (Current Status) | Done | Computed LT/TAT/delays/FETA/amount |
| Closed Files | Done | Status transition + QC/bank/insurance/logistics/clearance grid |
| Histories (Purchase / Payment / Ops) | Done | Payment Term included on Payment History |
| Reports catalog (P0–P2 core) | Done | 20 reports incl. Claims, Air/Courier, Quarterly dashboard |
| Lookups CRUD | Done | `/settings` + seed defaults |
| Backup (SQLite) | Done | Admin download + copy beside DB |
| Excel ETL (File-A/B) | Done | `npm run db:import:excel` (`--dry-run` supported) |
| Formula parity tests | Done | `npm run test:formulas` |
| Desktop packaging | Partial | Electron + `dist:desktop`; installer polish ongoing |
| AG Grid virtualization / ECharts pies | Deferred | HTML tables + catalog reports first |
| Playwright e2e suite | Deferred | Manual + formula script for now |
| Online multi-tenant SaaS | Later | Same API contracts |

### Commands

```bash
npm run setup              # push SQLite+Postgres, seed users + lookups + demo POs
npm run dev                # API :3001 + web :5173
npm run desktop            # Electron shell
npm run db:import:excel    # legacy workbook ETL into SQLite
npm run test:formulas      # §11.3 formula golden checks
```

### Still confirm with client (§14)

Formula delay sign, Total Amount sample quirk (`O*1.45`), multi-shipment per PO, and print letterhead fidelity remain client clarifications — implementation uses the documented formulas in §11.3.

---

*End of plan. Source workbooks fully inventoried: File-A (8 sheets), File-B (2 sheets), including report requirements and computed-column intent.*
