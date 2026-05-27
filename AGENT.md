# AGENT.md — RxKit Project Context for AI Agents

This file gives a complete picture of the RxKit project so an AI agent can continue work immediately without needing to explore from scratch.

---

## What This App Is

**RxKit** is a web application for pharmacy staff at a Thai hospital. Its purpose is to prepare medicine kits for field/outreach units (หน่วยออกปฏิบัติ), print A4 medicine checklists, and print drug labels.

**Live URL:** https://rxkit-opd.web.app  
**GitHub:** https://github.com/codex074/rxkit (public repo)  
**Firebase project:** `rxkit-a2c07`

The UI is in Thai. All user-facing labels, toasts, and error messages should be written in Thai.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript + Vite 6 |
| Styling | Tailwind CSS 3 (custom design tokens in `tailwind.config.ts`) |
| Routing | React Router v6 |
| Backend | Firebase only — Auth + Firestore + Hosting |
| Icons | Lucide React |
| Toasts | Sonner |
| Font | Sarabun (Thai), Inter (Latin) |

**No server-side code.** This is a Firebase-first SPA. All Firestore access goes through `src/firebase/firestore.ts`.

---

## Running Locally

```bash
npm install
npm run dev        # starts on http://localhost:5173
npm run build      # TypeScript check + Vite production build → dist/
```

Firebase credentials live in `.env.local` (gitignored). The `.env.example` has the key names. The actual credentials are stored only locally — do **not** commit them.

## Deploying

```bash
npm run build
firebase deploy --only hosting          # deploys dist/ to rxkit-opd.web.app
firebase deploy --only firestore        # deploys rules + indexes (rarely needed)
```

---

## Authentication

Firebase Auth with email/password. The UI shows a **username** field — the login flow appends `@rxkit.local` to map to Firebase Auth email.

```
username: RxOPD  →  email: rxopd@rxkit.local  →  Firebase Auth UID: 7wyueWDNqXbN09fc1Utbeng9kvo1
password: rx1234
role: admin
```

The `loginWithUsername()` function in `src/firebase/auth.ts` handles this mapping. After Auth, it reads the user profile from `users/{uid}` in Firestore to get `role` and `active` status.

**Roles:**
- `admin` — full access including master data management
- `staff` — can create field unit records, print
- `viewer` — read-only

Role checking: `src/hooks/useRole.ts` → `useRole(user)` returns `{ isAdmin, isStaff, isViewer }`.

---

## Project Structure

```
src/
├── App.tsx                        # Root — wraps AuthContext + AppRouter
├── main.tsx
├── firebase/
│   ├── config.ts                  # Firebase app init (reads VITE_* env vars)
│   ├── auth.ts                    # loginWithUsername(), logout(), getCurrentUserProfile()
│   └── firestore.ts               # ALL Firestore read/write functions — single source of truth
├── context/
│   └── AuthContext.tsx            # AuthContext — provides { user, loading }
├── hooks/
│   ├── useAuth.ts                 # internal auth state listener
│   ├── useRole.ts                 # isAdmin / isStaff / isViewer
│   └── useSettings.ts             # app settings from Firestore
├── routes/
│   ├── AppRouter.tsx              # all routes
│   ├── ProtectedRoute.tsx         # redirects to /login if not authenticated
│   └── RoleRoute.tsx              # redirects if role insufficient
├── types/
│   ├── user.ts                    # UserProfile, UserRole
│   ├── drug.ts                    # Drug, DrugFormData
│   ├── unit.ts                    # UnitType, DefaultSet, DefaultSetItem
│   ├── fieldUnit.ts               # FieldUnit, FieldUnitItem, FieldUnitItemDraft
│   └── settings.ts                # AppSettings, DEFAULT_SETTINGS
├── utils/
│   ├── fiscalYear.ts              # getThaiFiscalYear(date) — Thai fiscal year (Oct start)
│   ├── date.ts                    # formatThaiDate(), todayISOString()
│   └── calculations.ts
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx          # h-screen flex wrapper: Sidebar + <Outlet />
│   │   └── Sidebar.tsx            # dark navy sidebar (bg-sidebar #0f172a)
│   └── ui/
│       ├── Button.tsx             # variant: primary|secondary|danger|ghost; size: sm|md|lg
│       ├── Input.tsx              # includes Textarea export
│       ├── Select.tsx
│       ├── Modal.tsx
│       ├── Badge.tsx              # variant: default|success|warning|error|info
│       ├── Card.tsx
│       ├── EmptyState.tsx
│       └── Spinner.tsx
└── pages/
    ├── LoginPage.tsx
    ├── DashboardPage.tsx
    ├── DrugListPage.tsx
    ├── UnitTypesPage.tsx          # combined unit types + default drug sets (two-panel layout)
    ├── CreateFieldUnitPage.tsx    # main workflow page
    ├── FieldUnitDetailPage.tsx    # view saved record + print buttons
    ├── PrintChecklistPage.tsx     # A4 print-friendly checklist
    ├── PrintLabelsPage.tsx        # drug label grid for printing
    └── SettingsPage.tsx           # hospital name, label config
```

---

## Routes

| Path | Component | Role required |
|------|-----------|---------------|
| `/login` | LoginPage | public |
| `/dashboard` | DashboardPage | authenticated |
| `/drugs` | DrugListPage | authenticated (admin for write) |
| `/unit-types` | UnitTypesPage | admin |
| `/field-units/create` | CreateFieldUnitPage | staff+ |
| `/field-units/:id` | FieldUnitDetailPage | authenticated |
| `/field-units/:id/print-checklist` | PrintChecklistPage | authenticated |
| `/field-units/:id/print-labels` | PrintLabelsPage | authenticated |
| `/settings` | SettingsPage | admin |

> **Note:** `/default-sets` route was removed. Default set management is now embedded inside `/unit-types` (UnitTypesPage, two-panel layout). The file `DefaultSetsPage.tsx` still exists in `src/pages/` but is no longer routed.

---

## Design System

Colors are defined in `tailwind.config.ts`:

- **`primary` / `primary-active`** — blue `#2563eb` / `#1d4ed8` (used for buttons, active nav, focus rings)
- **`sidebar`** — `#0f172a` dark navy (sidebar background)
- **`sidebar-elevated`** — `#1e293b` (hover state in sidebar)
- **`ink`** — `#111827` (main text)
- **`muted`** — `#6b7280` (secondary text)
- **`hairline`** — `#e5e7eb` (borders)
- **`surface-soft`** — `#f8fafc` (page background)
- **`success`/`warning`/`error`/`info`** — with matching `-bg` and `-text` variants

Key design rules:
- Sidebar: dark navy, active nav = `bg-primary text-white`, inactive = `text-sidebar-text`
- All buttons use the `Button` component — never raw `<button>` for actions
- All form inputs use `Input` or `Select` components
- Print pages use `@media print` — hide `.no-print`, show `.print-only`
- Thai font: Sarabun (loaded from Google Fonts in `index.html`)

---

## Firestore Data Model

All Firestore access is centralized in `src/firebase/firestore.ts`. Never import Firestore SDK directly in pages — always call the exported functions.

### Collections and document counts (as of build)

| Collection | ~Docs | Purpose |
|------------|-------|---------|
| `users` | 2 | User profiles (uid, username, role, active) |
| `drugs` | 84 | Drug master list including vaccines/antivenoms |
| `unitTypes` | 5 | ปฐมพยาบาล, รับเสด็จ, น้ำท่วม, พอ.สว., อื่นๆ |
| `defaultSets` | 5 | One defaultSet per unitType |
| `defaultSetItems` | 99 | Drug items per defaultSet |
| `fieldUnits` | 1+ | Saved outreach preparation records |
| `fieldUnitItems` | varies | Drug items per fieldUnit (snapshot at save time) |
| `settings` | 1 | doc ID = `app` (hospital name, label config) |
| `activityLogs` | varies | Write-only log of user actions |

### Key relationships

```
unitTypes/{id}
  └── defaultSets/{id}  (where unitTypeId == unitTypes.id)
        └── defaultSetItems/{id}  (where setId == defaultSets.id)

fieldUnits/{id}
  └── fieldUnitItems/{id}  (where fieldUnitId == fieldUnits.id)
      — all drug fields are SNAPSHOTS (do not reference live drug data)
```

### Snapshot pattern (important)

When saving a `fieldUnit`, all drug data is snapshotted into `fieldUnitItems`:
`drugNameSnapshot`, `strengthSnapshot`, `dosageFormSnapshot`, `unitSnapshot`, `pricePerUnitSnapshot`, `instructionSnapshot`, `warningSnapshot`, `labelNoteSnapshot`.

This means editing a drug in the master list does **not** affect already-saved records.

### Composite Firestore indexes (deployed)

All indexes are in `firestore.indexes.json` and deployed. Key ones:

- `defaultSetItems`: `(setId, active, sortOrder)` — needed by `getDefaultSetItems()`
- `defaultSetItems`: `(setId, sortOrder)`
- `drugs`: `(active, name)` — needed by `getActiveDrugs()`
- `unitTypes`: `(active, sortOrder)` — needed by `getActiveUnitTypes()`
- `fieldUnitItems`: `(fieldUnitId, sortOrder)`

---

## Core Firestore Functions (src/firebase/firestore.ts)

```typescript
// Users
getUserProfile(uid)
createUserProfile(profile)

// Drugs
getActiveDrugs()              // where active==true, orderBy name
getAllDrugs()
getDrugById(drugId)
createDrug(data, uid)
updateDrug(drugId, data, uid)
deactivateDrug(drugId, uid)

// Unit Types
getActiveUnitTypes()          // where active==true, orderBy sortOrder
getAllUnitTypes()              // orderBy sortOrder
createUnitType(data, uid)
updateUnitType(unitTypeId, data, uid)

// Default Sets
getDefaultSetByUnitType(unitTypeId)
getOrCreateDefaultSet(unitTypeId, unitTypeName, uid)
getDefaultSetItems(setId)     // where setId==X, active==true, orderBy sortOrder
addDefaultSetItem(item)
updateDefaultSetItem(itemId, data)
deleteDefaultSetItem(itemId)

// Field Units
createFieldUnit(formData, items, uid, displayName, fiscalYear) → id
getFieldUnitById(fieldUnitId)
getFieldUnitItems(fieldUnitId)
listRecentFieldUnits(limit)
updateFieldUnitStatus(fieldUnitId, status)

// Settings
getAppSettings()
updateAppSettings(data)

// Activity Log
writeActivityLog(action, detail, uid, username)
```

---

## Thai Fiscal Year

Thai fiscal year starts in October. Use `getThaiFiscalYear(date)` from `src/utils/fiscalYear.ts`.

```
Oct 2025 – Sep 2026 = fiscal year 2569 (Buddhist era)
Oct 2026 – Sep 2027 = fiscal year 2570
```

Always call this when saving a `fieldUnit`.

---

## Data Already in Firestore

The following data was imported from the hospital's raw Excel/Word files:

**Unit types** (5):
- `ปฐมพยาบาล` — 23 default items (oral + injectable, elastic bandages)
- `รับเสด็จ` — 65 default items (full emergency drug kit: injectables + orals + vaccines + antivenoms)
- `พอ.สว.` — 11 default items (vaccines + antivenoms only)
- `น้ำท่วม` — 0 default items (no raw data)
- `อื่นๆ` — 0 default items (no raw data)

**Drugs** (84): includes standard hospital drugs + antivenoms (เซรุ่มงูกะปะ, เซรุ่มงูเห่า, etc.) + vaccines (Tetagam, PCEC, HRIG). Most have instruction/warning text from drug label templates. `pricePerUnit` is 0 for all — needs manual entry by admin.

---

## Scripts (scripts/)

One-off Node.js ESM scripts for Firestore data management. All use `gcloud auth print-access-token` + Firestore REST API (not Firebase Admin SDK).

| Script | Purpose |
|--------|---------|
| `import-drugs.mjs` | Import drugs from `raw/Drug-list.xlsx` + `raw/Drug-label.doc` |
| `fix-default-sets.mjs` | Rebuild ปฐมพยาบาล items, create รับเสด็จ/พอ.สว. sets |
| `fix-uid.mjs` | One-time fix: write user profile at correct Firebase Auth UID |
| `setup.mjs` | Initial Firestore seed (unit types, settings) |

To run: `node scripts/<script>.mjs` (requires active `gcloud auth` session).

---

## Known Limitations / Future Work

These are explicitly out of scope for the current version and should not be built unless the user asks:

- **No edit page for saved fieldUnit** — records can be viewed but not edited after save. `FieldUnitDetailPage` is read-only.
- **`pricePerUnit` = 0 for all drugs** — field exists, snapshots are captured, but no value calculation/reporting.
- **No reports or analytics** — no charts, fiscal year summaries, drug usage reports.
- **น้ำท่วม / อื่นๆ have no default drug sets** — admin must add them manually via `/unit-types`.
- **No user management UI** — users are created directly in Firebase Auth + Firestore. No in-app user management page.
- **DefaultSetsPage.tsx** — file exists but is not routed. Its functionality is now in `UnitTypesPage.tsx`. Can be deleted if cleaning up.

---

## Common Patterns to Follow

**Adding a new page:**
1. Create `src/pages/NewPage.tsx`
2. Add route in `src/routes/AppRouter.tsx`
3. Add nav item in `src/components/layout/Sidebar.tsx` if needed
4. Add Firestore functions in `src/firebase/firestore.ts`

**Error handling in async functions:**
Always use `try/catch` with a `toast.error(...)` — never `try/finally` without catch (errors get silently swallowed).

**Loading initial data:**
Use `Promise.all([...]).then(...).catch(() => toast.error(...)).finally(() => setLoading(false))`.

**Form validation:**
Build a `validate()` function that returns `Record<string, string>` errors. Show per-field errors via the `error` prop on `Input`/`Select`. Show a summary toast on failure.

**Drug picker (searchable):**
Use the pattern from `CreateFieldUnitPage.tsx` — text input + `onMouseDown` dropdown. The `useRef` click-outside pattern prevents blur-before-click race condition.

**Print pages:**
- Wrap non-print UI in `className="no-print"`
- Use `window.print()` for the print button
- Print styles are in `src/styles/print.css`
