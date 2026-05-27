# CLAUDE.md

## Project Name

**RxKit**

A compact web application for preparing medicine kits for field/outreach units, printing medicine checklists, and printing drug labels.

---

## Role for Claude

You are a senior full-stack developer specializing in:

- React
- TypeScript
- Vite
- Tailwind CSS
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- Healthcare/pharmacy workflow applications
- Clean, minimal UI design inspired by Cal.com

Your task is to build a production-ready first version of **RxKit**.

The app must be simple, fast, easy for pharmacy staff to use, and suitable for real hospital workflow.

---

# 1. Current Scope

Build version 1 of RxKit with the following core features:

1. Login system
2. Role-based access control
3. Drug-list management
4. Field/outreach unit type management
5. Default medicine set management for each unit type
6. Create medicine preparation record for an outreach unit
7. Load default medicine set automatically by selected unit type
8. Edit medicine list before saving
9. Save preparation record to Firestore
10. Print A4 medicine checklist
11. Print drug labels based on label template/config
12. Basic dashboard showing recent records only
13. Thai fiscal year calculation
14. Clean responsive UI using React + TypeScript + Tailwind CSS

Do **not** build report, graph, value summary, or analytics features in this version.

---

# 2. Explicitly Out of Scope for Version 1

Do not create these features yet:

- Historical reports
- Medicine value summary
- Total value dashboard
- Medicine frequency report
- Charts
- Export report
- Advanced analytics
- Stock deduction
- Inventory management
- Barcode scanning
- PDF export
- Multi-hospital support
- Google Apps Script backend
- Google Sheet database

Price fields may exist in Drug-list for future use, but do not build value report or value analytics yet.

---

# 3. Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Firebase JS SDK
- SweetAlert2 or Sonner for alerts/toasts
- Lucide React for icons
- Optional: React Hook Form + Zod for forms and validation

## Backend / Database

Use Firebase only.

- Firebase Authentication for login
- Cloud Firestore for database
- Firebase Hosting for deployment

Do not use:

- Google Apps Script
- Google Sheet as database
- `google.script.run`
- Server-side Express API unless absolutely necessary

This project should be a Firebase-first static web application.

---

# 4. Recommended Hosting

Use **Firebase Hosting** as the default deployment target.

GitHub Pages is acceptable only if specifically requested later, but the current preferred setup is:

```txt
React + TypeScript + Vite
Firebase Authentication
Cloud Firestore
Firebase Hosting
```

---

# 5. Design Direction

Use `DESIGN.md` as the source of truth for UI style.

The UI should follow a clean Cal.com-inspired style:

- Minimal layout
- White background
- Soft gray borders
- Rounded cards
- Clear typography
- Good spacing
- Black/dark primary buttons
- Subtle secondary buttons
- Clean data tables
- Fast task-oriented workflow
- Avoid excessive colors
- Avoid clutter
- Desktop and tablet friendly
- Mobile usable for basic review tasks

The application is for pharmacy staff, so clarity and speed are more important than decoration.

---

# 6. Main Workflow

## User Flow

1. User opens RxKit
2. User logs in
3. Dashboard appears
4. User clicks “Create Field Unit Kit”
5. User selects unit type
6. App loads default medicine set for that unit type
7. User edits medicine list, quantity per item, and number of kits/sets
8. User adds or removes medicines if needed
9. User saves the preparation record
10. App displays print buttons
11. User prints:
    - A4 checklist
    - Drug labels

---

# 7. Login and Authentication

Use Firebase Authentication.

## Default Admin Account

Create or document an initial admin login:

```txt
Username: RxOPD
Password: 1234
Role: admin
```

Because Firebase Authentication uses email/password by default, implement one of these approaches:

### Preferred Approach

Use username login in the UI, but map it internally to a Firebase Auth email.

Example seed account:

```txt
username: RxOPD
email: rxopd@rxkit.local
password: 1234
role: admin
```

In Firestore, store a user profile document:

```txt
users/{uid}
  username: RxOPD
  usernameLower: rxopd
  email: rxopd@rxkit.local
  displayName: RxOPD Admin
  role: admin
  active: true
```

The login form should show:

- Username
- Password

Do not force the user to type an email address.

If username-to-email lookup is complex for Firebase security rules in the first version, document a fallback login using:

```txt
Email: rxopd@rxkit.local
Password: 1234
```

But the UI should still be designed around the concept of username login.

## Roles

Implement these roles:

```txt
admin
staff
viewer
```

### admin

Can:

- Manage users/profile metadata if implemented
- Manage Drug-list
- Manage unit types
- Manage default medicine sets
- Create and edit field unit kit records
- Print checklist and labels

### staff

Can:

- View active drugs
- View active unit types
- Create field unit kit records
- Edit own draft if supported
- Print checklist and labels

### viewer

Can:

- View saved records
- View print pages
- Cannot create/edit master data

---

# 8. Firestore Data Model

Use Cloud Firestore collections as follows.

## 8.1 users

```txt
users/{uid}
  uid: string
  username: string
  usernameLower: string
  email: string
  displayName: string
  role: "admin" | "staff" | "viewer"
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
```

## 8.2 drugs

This collection is the replacement for the previous Google Sheet named `Drug-list`.

In the UI, the page can still be called **Drug-list**.

```txt
drugs/{drugId}
  code: string
  name: string
  genericName: string
  tradeName: string
  strength: string
  dosageForm: string
  unit: string
  pricePerUnit: number
  instruction: string
  warning: string
  labelNote: string
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
```

Important rules:

- Admin can add/edit/deactivate drugs from the web page.
- Do not read drug price from a hospital accounting file in this version.
- Price is manually set and edited in the Drug-list page.
- Keep `pricePerUnit` because it will be useful later.
- Do not create total medicine value reports in this version.
- When saving a field unit record, snapshot the drug price for future use.

## 8.3 unitTypes

```txt
unitTypes/{unitTypeId}
  name: string
  description: string
  active: boolean
  sortOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
```

Default unit types:

```txt
ปฐมพยาบาล
รับเสด็จ
น้ำท่วม
พอ.สว.
อื่นๆ
```

Admin must be able to:

- Add a new unit type
- Edit unit type name
- Edit description
- Deactivate unit type
- Reorder if convenient

## 8.4 defaultSets

Use one default medicine set per unit type for version 1.

```txt
defaultSets/{setId}
  unitTypeId: string
  unitTypeName: string
  name: string
  description: string
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
```

## 8.5 defaultSetItems

```txt
defaultSetItems/{itemId}
  setId: string
  unitTypeId: string
  drugId: string
  drugNameSnapshot: string
  strengthSnapshot: string
  dosageFormSnapshot: string
  unitSnapshot: string
  qtyPerSet: number
  note: string
  active: boolean
  sortOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp
```

Admin must be able to manage default medicine items for each unit type from the web UI:

- Add drug to default set
- Remove drug from default set
- Change quantity per item
- Change order
- Add note

## 8.6 fieldUnits

This collection stores each saved field/outreach preparation record.

```txt
fieldUnits/{fieldUnitId}
  fiscalYear: number
  unitTypeId: string
  unitTypeName: string
  eventDate: string
  location: string
  responsiblePerson: string
  numberOfSets: number
  status: "draft" | "saved" | "printed" | "cancelled"
  note: string
  createdBy: string
  createdByName: string
  createdAt: Timestamp
  updatedAt: Timestamp
```

Do not include total value summary in version 1.

## 8.7 fieldUnitItems

```txt
fieldUnitItems/{itemId}
  fieldUnitId: string
  drugId: string
  drugCodeSnapshot: string
  drugNameSnapshot: string
  genericNameSnapshot: string
  tradeNameSnapshot: string
  strengthSnapshot: string
  dosageFormSnapshot: string
  unitSnapshot: string
  pricePerUnitSnapshot: number
  instructionSnapshot: string
  warningSnapshot: string
  labelNoteSnapshot: string
  qtyPerSet: number
  numberOfSets: number
  totalQty: number
  note: string
  sortOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp
```

Important:

- Snapshot all important drug data at the time of saving.
- Old saved records must not change if the Drug-list is edited later.
- `pricePerUnitSnapshot` is stored for future use but not used in reports yet.

## 8.8 settings

```txt
settings/app
  appName: "RxKit"
  hospitalName: string
  fiscalYearStartMonth: 10
  labelWidthMm: number
  labelHeightMm: number
  labelColumns: number
  labelRows: number
  labelGapMm: number
  labelMarginTopMm: number
  labelMarginLeftMm: number
  labelFontSizePx: number
  updatedAt: Timestamp
```

Default label config:

```txt
labelWidthMm: 70
labelHeightMm: 35
labelColumns: 3
labelRows: 8
labelGapMm: 2
labelMarginTopMm: 10
labelMarginLeftMm: 5
labelFontSizePx: 10
```

## 8.9 activityLogs

```txt
activityLogs/{logId}
  action: string
  detail: string
  uid: string
  username: string
  createdAt: Timestamp
```

Log important events:

- login
- create field unit
- update field unit
- print checklist
- print labels
- create/update/deactivate drug
- update default set

---

# 9. Drug-list Management

Create a page named **Drug-list** or **Medicine Master**.

Admin can:

- Add drug
- Edit drug
- Deactivate drug
- Search drug
- Filter active/inactive drugs
- Edit price per unit manually
- Edit instruction and warning used on labels

Fields:

- Code
- Drug name
- Generic name
- Trade name
- Strength
- Dosage form
- Unit
- Price per unit
- Instruction
- Warning
- Label note
- Active status

Search should work by:

- code
- name
- generic name
- trade name
- strength
- dosage form

Do not depend on an external hospital drug price file.

---

# 10. Unit Type and Default Set Management

Create a page for admin to manage unit types and default sets.

## Unit Types

Admin can manage these unit types:

- ปฐมพยาบาล
- รับเสด็จ
- น้ำท่วม
- พอ.สว.
- อื่นๆ

Admin can add more unit types later.

## Default Medicine Set

For each unit type, admin can define default medicines.

Each default medicine item must include:

- Drug
- Quantity per set
- Note
- Sort order

When user creates a field unit kit, selecting a unit type must load the default medicine set automatically.

The loaded list becomes editable before saving.

---

# 11. Create Field Unit Kit

Create page: **Create Field Unit Kit**

Form fields:

- Unit type
- Event date
- Location
- Responsible person
- Number of sets
- Note

Behavior:

1. User selects unit type
2. App loads default medicine set
3. User enters number of sets
4. App calculates total quantity per drug
5. User can add/remove/edit medicine items
6. User saves record
7. App creates `fieldUnits` document
8. App creates `fieldUnitItems` documents
9. App shows buttons to print checklist and labels

Calculation:

```txt
totalQty = qtyPerSet * numberOfSets
```

Do not calculate total value in version 1.

---

# 12. Print Checklist

Create a print-friendly A4 checklist page.

Checklist must show:

- App name / hospital name
- Title: รายการจัดเตรียมยาออกหน่วย
- Unit type
- Event date
- Location
- Responsible person
- Fiscal year
- Number of sets
- Note
- Medicine table

Medicine table columns:

- No.
- Drug name
- Strength
- Dosage form
- Quantity per set
- Number of sets
- Total quantity
- Unit
- Prepare checkbox
- Verify checkbox
- Note

Footer:

- Prepared by
- Checked by
- Date

Print requirements:

- A4 portrait
- Clean black-and-white print style
- Hide navbar/buttons when printing
- Use CSS `@media print`
- Avoid page break inside table rows where possible
- Make checkboxes printable

---

# 13. Print Drug Labels

Create a print-friendly drug label page.

Labels must use configurable dimensions from `settings/app`.

Each label should show:

- Drug name
- Strength
- Dosage form
- Instruction
- Warning
- Quantity
- Unit
- Unit type
- Event date
- Label note if available

The label layout should be suitable for printing many labels on A4.

Use CSS millimeter units.

Default config:

```ts
const DEFAULT_LABEL_CONFIG = {
  pageSize: "A4",
  labelWidthMm: 70,
  labelHeightMm: 35,
  columns: 3,
  rows: 8,
  gapMm: 2,
  marginTopMm: 10,
  marginLeftMm: 5,
  fontSizePx: 10,
};
```

Important:

- Print labels according to the saved `fieldUnitItems`
- Use `totalQty` or number of sets as appropriate for label quantity
- Allow future adjustment of label size via settings
- Hide buttons/navbar during print
- Avoid splitting a label across pages

---

# 14. Thai Fiscal Year Logic

Implement Thai fiscal year calculation.

Rules:

- Thai fiscal year starts in October
- October 2025 to September 2026 = fiscal year 2569
- Use Buddhist Era year
- Month 10, 11, 12 belongs to next Buddhist fiscal year
- Month 1-9 belongs to current Buddhist year

Example:

```txt
2025-10-01 => 2569
2026-09-30 => 2569
2026-10-01 => 2570
```

Create utility:

```ts
export function getThaiFiscalYear(date: Date | string): number
```

Use this when saving every field unit record.

---

# 15. Validation Rules

Validate all important forms.

## Login

- username required
- password required
- user must be active

## Drug-list

- drug name required
- unit required
- price per unit must be number >= 0
- inactive drugs should not appear in new selections unless explicitly enabled

## Unit Type

- unit type name required
- name must not duplicate another active unit type

## Default Set

- drug required
- qty per set must be number > 0

## Field Unit Kit

- unit type required
- event date required
- responsible person required
- number of sets must be number > 0
- at least one medicine item required
- qty per set must be number > 0
- total quantity must be calculated correctly

---

# 16. Firebase Security Rules

Create secure Firestore rules.

Minimum rule intent:

- Only authenticated users can access data
- `admin` can manage master data
- `staff` can create field unit records
- `viewer` can read records only
- Inactive users should not be allowed to write

Use `users/{uid}` profile document to check role and active status.

Security rules must not allow public write access.

---

# 17. Suggested Project Structure

Create a clean Vite + React + TypeScript structure.

```txt
rxkit/
├── CLAUDE.md
├── README.md
├── DESIGN.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── .env.example
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── AppRouter.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── RoleRoute.tsx
│   ├── firebase/
│   │   ├── config.ts
│   │   ├── auth.ts
│   │   └── firestore.ts
│   ├── types/
│   │   ├── user.ts
│   │   ├── drug.ts
│   │   ├── unit.ts
│   │   ├── fieldUnit.ts
│   │   └── settings.ts
│   ├── utils/
│   │   ├── fiscalYear.ts
│   │   ├── date.ts
│   │   ├── id.ts
│   │   └── calculations.ts
│   ├── services/
│   │   ├── userService.ts
│   │   ├── drugService.ts
│   │   ├── unitTypeService.ts
│   │   ├── defaultSetService.ts
│   │   ├── fieldUnitService.ts
│   │   ├── settingsService.ts
│   │   └── logService.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useRole.ts
│   │   ├── useDrugs.ts
│   │   └── useSettings.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── drugs/
│   │   │   ├── DrugTable.tsx
│   │   │   ├── DrugForm.tsx
│   │   │   └── DrugSearch.tsx
│   │   ├── units/
│   │   │   ├── UnitTypeTable.tsx
│   │   │   ├── UnitTypeForm.tsx
│   │   │   └── DefaultSetEditor.tsx
│   │   └── print/
│   │       ├── ChecklistPrint.tsx
│   │       └── LabelPrint.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── DrugListPage.tsx
│   │   ├── UnitTypesPage.tsx
│   │   ├── DefaultSetsPage.tsx
│   │   ├── CreateFieldUnitPage.tsx
│   │   ├── FieldUnitDetailPage.tsx
│   │   ├── PrintChecklistPage.tsx
│   │   ├── PrintLabelsPage.tsx
│   │   └── SettingsPage.tsx
│   └── styles/
│       ├── index.css
│       └── print.css
└── scripts/
    └── seed.ts
```

---

# 18. Required Pages

## 18.1 LoginPage

- Username/password form
- Minimal centered card
- Error handling
- Loading state

## 18.2 DashboardPage

Show only simple operational information:

- Create Field Unit Kit button
- Recent field unit records
- Quick links:
  - Drug-list
  - Unit Types
  - Default Sets
  - Settings

Do not show value dashboard, reports, charts, or medicine value summary.

## 18.3 DrugListPage

- Search drugs
- Add drug
- Edit drug
- Deactivate drug
- Show active/inactive status
- Admin only for create/update/deactivate
- Staff can read active drugs

## 18.4 UnitTypesPage

- Add/edit/deactivate unit types
- Admin only

## 18.5 DefaultSetsPage

- Select unit type
- Manage default medicines
- Add/remove drug
- Edit qty per set
- Admin only

## 18.6 CreateFieldUnitPage

- Select unit type
- Load default set
- Enter number of sets
- Edit medicine items
- Save
- Show print buttons after save

## 18.7 FieldUnitDetailPage

- Show saved record
- Show saved items
- Print checklist button
- Print labels button

## 18.8 PrintChecklistPage

- Print-friendly A4 checklist

## 18.9 PrintLabelsPage

- Print-friendly labels

## 18.10 SettingsPage

Admin can edit:

- Hospital name
- Label dimensions
- Label columns/rows
- Margins
- Font size

---

# 19. Required Services

Implement Firestore service layer.

## auth.ts

```ts
loginWithUsername(username: string, password: string)
logout()
getCurrentUserProfile()
```

## drugService.ts

```ts
getActiveDrugs()
searchDrugs(query: string)
createDrug(data)
updateDrug(drugId, data)
deactivateDrug(drugId)
```

## unitTypeService.ts

```ts
getActiveUnitTypes()
createUnitType(data)
updateUnitType(unitTypeId, data)
deactivateUnitType(unitTypeId)
```

## defaultSetService.ts

```ts
getDefaultSetByUnitType(unitTypeId: string)
getDefaultSetItems(unitTypeId: string)
saveDefaultSetItems(unitTypeId: string, items)
```

## fieldUnitService.ts

```ts
createFieldUnit(payload)
getFieldUnitById(fieldUnitId: string)
getFieldUnitItems(fieldUnitId: string)
listRecentFieldUnits(limitCount: number)
```

## settingsService.ts

```ts
getAppSettings()
updateAppSettings(data)
```

## logService.ts

```ts
writeActivityLog(action: string, detail: string)
```

---

# 20. Seed Data

Provide clear instructions or a script to create initial data.

Seed:

1. Default admin account
2. User profile document
3. Default unit types
4. App settings
5. Empty default sets

Initial admin:

```txt
username: RxOPD
email: rxopd@rxkit.local
password: 1234
role: admin
active: true
```

README must clearly explain how to create this account in Firebase Authentication and Firestore.

---

# 21. Environment Variables

Create `.env.example`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Do not commit real Firebase credentials if the user later provides them.

---

# 22. README Requirements

Create a complete `README.md` in Thai.

README must explain:

1. Project overview
2. Tech stack
3. How to create Firebase project
4. How to enable Firebase Authentication
5. How to enable Firestore
6. How to create `.env`
7. How to install dependencies
8. How to run locally
9. How to seed initial admin account
10. How to deploy to Firebase Hosting
11. How to use the app
12. How to manage Drug-list
13. How to manage unit types
14. How to manage default medicine sets
15. How to create field unit kit
16. How to print checklist
17. How to print labels
18. Known limitations for version 1
19. Future roadmap

Default login instruction:

```txt
Username: RxOPD
Password: 1234
```

If Firebase Auth requires email during setup, document:

```txt
Email: rxopd@rxkit.local
Password: 1234
```

---

# 23. DESIGN.md Requirements

Create `DESIGN.md` with UI guidance.

Include:

- Layout principles
- Color system
- Typography
- Button styles
- Card styles
- Table styles
- Form styles
- Print style
- Responsive behavior
- Accessibility notes

Design should be inspired by Cal.com:

- Minimal
- Clear
- Spacious
- Monochrome leaning
- High readability
- Task-focused

---

# 24. Important Development Rules

Follow these rules:

- Use TypeScript strictly
- Avoid `any` where possible
- Create clear interfaces/types
- Keep components small and readable
- Use service layer for Firestore access
- Do not scatter Firestore calls everywhere
- Use loading, empty, and error states
- Validate forms before saving
- Use optimistic UI only where safe
- Use Firestore server timestamps
- Snapshot drug data when saving field unit items
- Do not mutate saved historical records when master drug changes
- Do not build report/value features yet
- Do not depend on Google Sheet
- Do not use Google Apps Script
- Do not expose admin-only actions to staff/viewer

---

# 25. Acceptance Criteria

Version 1 is complete when:

1. App runs locally with Vite
2. Firebase config works via `.env`
3. User can login
4. Default admin `RxOPD / 1234` is documented and works after setup
5. Role-based routes work
6. Admin can manage Drug-list
7. Admin can set price per drug manually
8. Admin can manage unit types
9. Admin can manage default medicine sets for each unit type
10. Staff/admin can create field unit kit
11. Selecting unit type loads default medicine list
12. User can edit medicines and quantities before saving
13. App calculates total quantity correctly
14. App saves field unit record to Firestore
15. App saves field unit items with snapshots
16. App calculates Thai fiscal year correctly
17. User can print A4 checklist
18. User can print drug labels
19. Dashboard shows recent records only
20. No reports/value summary/charts are created in version 1
21. README.md is complete in Thai
22. DESIGN.md is created
23. Firebase security rules are included
24. App can deploy to Firebase Hosting

---

# 26. Future Roadmap, Do Not Build Now

Leave these as future tasks only:

- Medicine value summary
- Total cost per event
- Reports by fiscal year
- Frequency report
- Drug usage analytics
- Charts
- CSV/Excel import
- PDF export
- Stock management
- Low-stock alerts
- Approval workflow
- Multi-site support

---

# 27. First Task for Claude

Build the complete version 1 project now.

Start by creating:

1. Vite + React + TypeScript project structure
2. Tailwind setup
3. Firebase setup
4. Firestore types and services
5. Auth flow
6. Protected routes
7. App layout
8. Drug-list management
9. Unit type management
10. Default set management
11. Field unit kit creation workflow
12. Checklist print page
13. Drug label print page
14. Settings page
15. Firestore security rules
16. README.md in Thai
17. DESIGN.md

Write real working code, not pseudocode.

The final project should be ready to run with:

```bash
npm install
npm run dev
```

And ready to deploy with Firebase Hosting after Firebase config is added.
