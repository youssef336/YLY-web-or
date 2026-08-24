# Bello — Member Evaluation and Tracking System

**Bello** is an **offline-first** committee member evaluation dashboard (Web + PWA)
built with Clean Architecture. Every evaluator's data lives only on their own
device (IndexedDB in the browser). There is no backend: scores are computed
on-device, the real **SMMEMBER** Excel template is injected in the browser, and
reports are shared through a WhatsApp deep link.

**Stack:** Next.js 16 (App Router, static) · TypeScript · Tailwind CSS v4 ·
IndexedDB (`idb`) · ExcelJS (browser build) · Zod.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build        # production build (PWA service worker is enabled)
npm start
```

Quality gates:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
```

No environment variables or external services are required. The real template is
bundled at `public/templates/SMMEMBER (1) (1) (3).xlsx` and served with the app.

> Dev on a LAN: `next.config.mjs` whitelists `allowedDevOrigins` so the app can
> be opened from a phone via `http://192.168.1.10:3000` without cross-origin
> errors. Add your machine's IP if it changes.

---

## System behavior

| Feature | Where it lives |
| --- | --- |
| Add / rename / delete member | Home page + profile page (all local) |
| Leaderboard (desc. by Total /110) | Home page |
| Technical score (0..50) | Profile page |
| Field Visits (Location/Event name + Date picker + 1/0, max 15) | Profile page |
| Meetings (Date picker only + 1/0, max 15) | Profile page |
| Interaction / Respect Hierarchy / Bonus (0..10 each) | Profile page — **each saved independently** |
| Live Total /110, %, Grade | Recomputed from shared domain rules |
| Export to `SMMEMBER (1) (1) (3).xlsx` | Injects all members into the bundled real template |
| Share report on WhatsApp | Opens a `wa.me` deep link to the Team Leader |

**Offline-first rule:** all mutations (add/edit/delete of members and entries)
happen against IndexedDB only. Refresh the page or lose the network and the data
is still there — that is the whole point of the architecture.

---

## Architecture

Strict **Onion / Clean Architecture** with a **client-side composition root**.
The dependency rule is enforced by construction: nothing inside a layer imports
from a layer outside it.

```
 UI (React components)                      --> outermost ring
   │
 Interface Adapters (presenters, DTOs)
   │
 Application (use cases + ports)            --> orchestration + business flows
   │
 Domain (entities + scoring rules)          --> enterprise rules, zero dependencies
   │
 Infrastructure (IndexedDB, ExcelJS, wa.me) --> implements ports
```

```
src/
├── domain/                      # Layer 1 - Domain (zero dependencies)
│   ├── entities/                # Member, FieldVisit, Meeting, CategoryScores,
│   │                            # TechnicalEvaluation, MemberProfile
│   └── score/scoring.ts         # 110-point aggregation aligned to the template
│
├── application/                 # Layer 2 - Application
│   ├── ports/                   # LocalMemberRepository, ExcelGenerator,
│   │                            # WhatsAppDeepLinkBuilder (interfaces)
│   ├── dto/member.dto.ts        # Zod-validated input DTOs
│   ├── use-cases/               # AddMember, CalculateLeaderboard, CRUD for
│   │                            # visits/meetings, ExportEvaluationToExcel,
│   │                            # BuildWhatsAppDeepLink, ...
│   └── use-cases/validation.ts  # parseOrThrow (zod -> ValidationError), newId
│
├── interface-adapters/          # Layer 3 - Interface Adapters
│   └── presenters/              # leaderboard + profile view models
│
├── infrastructure/              # Layer 4 - Frameworks & Drivers
│   ├── config.ts                # WhatsApp recipient + template paths
│   ├── db/                      # idb-database.ts + IndexedDB repository adapter
│   ├── excel/                   # smmember-layout.ts + exceljs-injector.ts
│   ├── whatsapp/wa-deeplink.ts  # wa.me link builder
│   ├── download.ts              # triggers the .xlsx download
│   └── container.ts             # client composition root (getContainer())
│
└── app/                         # Next.js App Router (outermost ring)
    ├── layout.tsx               # manifest link + service worker registration
    ├── page.tsx                 # Leaderboard / directory home
    ├── members/[id]/page.tsx    # Evaluation profile (full CRUD + live scoring)
    ├── service-worker-register.tsx
    └── manifest.ts              # PWA manifest
```

---

### Layer 1 — Domain

Pure TypeScript types and functions with **zero imports from any other layer**.
`src/domain/score/scoring.ts` is the single source of truth for scoring.

The scoring rules mirror the formulas already inside the real template
(`Member Evaluation` sheet), so the on-screen total is identical to what Excel
computes when the injected file is opened:

| Category | Template cells | Formula | Cap |
| --- | --- | --- | --- |
| Technical | B | raw input | **/50** |
| Field Visits | D..R → S | `SUM(D:R)/count * 20` | **/20** |
| Meetings | U..AI → AJ | `SUM(U:AI)/count * 10` | **/10** |
| Interaction | AK | direct input | **/10** |
| Respect Hierarchy | AL | direct input | **/10** |
| Bonus | AM | direct input | **/10** |
| **Total** | AN | `B + S + AJ + AK + AL + AM` | **/110** |

`calculateScoreSummary` clamps each category, normalizes Field Visits and
Meetings by their average (exactly like the template's `S`/`AJ` formulas), adds
the three direct `/10` inputs, and derives the percentage and grade:

```ts
const summary = calculateScoreSummary({
  technical: 42,
  fieldVisits: [{ score: 1 }, { score: 1 }, { score: 0 }], // -> 13.33 /20
  meetings: [{ score: 1 }, { score: 1 }, { score: 0 }, { score: 0 }], // -> 5 /10
  interaction: 8,
  respectHierarchy: 7,
  bonus: 9,
});
// total 84.33, percentage 76.7, grade C
```

Grade bands: **A** ≥ 90, **B** ≥ 80, **C** ≥ 70, **D** ≥ 60, **F** < 60.

---

### Layer 2 — Application

**Ports (interfaces owned by the application)** — `src/application/ports/`

```ts
// member-repository.port.ts  (async, so SQLite/Hive/Isar can implement it on mobile)
export interface LocalMemberRepository {
  createMember(member): Promise<Member>;
  findById(id): Promise<Member | null>;
  findAll(): Promise<Member[]>;
  updateMemberName(id, name): Promise<Member>;
  deleteMember(id): Promise<void>;
  getTechnical(memberId): Promise<TechnicalEvaluation | null>;
  upsertTechnical(memberId, score): Promise<TechnicalEvaluation>;
  addFieldVisit(input): Promise<FieldVisit>;
  updateFieldVisit(id, input): Promise<FieldVisit>;
  removeFieldVisit(id): Promise<void>;
  // ... same shape for meetings
  loadProfile(memberId): Promise<MemberProfile | null>;
}

// excel-generator.port.ts
export interface ExcelGenerator {
  generateAll(profiles: MemberProfile[]): Promise<Uint8Array>;
}

// whatsapp-deeplink.port.ts
export interface WhatsAppDeepLinkBuilder {
  build(to: string, message: string): string;
}
```

**Use cases** — `src/application/use-cases/`

```
add-member.use-case.ts  update-member-name.use-case.ts  delete-member.use-case.ts
list-members.use-case.ts  get-member-profile.use-case.ts
calculate-leaderboard.use-case.ts
update-technical-score.use-case.ts  update-category-scores.use-case.ts
add/update/remove-field-visit.use-case.ts
add/update/remove-meeting.use-case.ts
export-evaluation-to-excel.use-case.ts   build-whatsapp-deeplink.use-case.ts
```

Use cases are thin orchestrators: validate input via Zod DTOs
(`parseOrThrow`), call the injected port, and throw domain errors
(`MemberNotFoundError`, `ValidationError`). Every mutation returns through
`loadProfile`, so the UI always re-renders with a freshly computed summary.

**Input DTOs** (`src/application/dto/member.dto.ts`):

```ts
export const FieldVisitInputSchema = z.object({
  name: z.string().trim().min(1).max(200),  // "Location / Event name" (text field)
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // native <input type="date">
  score: z.union([z.literal(0), z.literal(1)]),
});

export const MeetingInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // date picker only
  score: z.union([z.literal(0), z.literal(1)]),
});

export const CategoryScoresInputSchema = z.object({
  interaction: z.number().min(0).max(10),
  respectHierarchy: z.number().min(0).max(10),
  bonus: z.number().min(0).max(10),
});
```

The three category scores are saved **independently**: `CategoryScoreField`
(`src/components/category-score-field.tsx`) owns one input + its own Save button
and persists a single field while keeping the other two unchanged.

---

### Layer 3 — Interface Adapters

**Presenters** (`src/interface-adapters/presenters/`) map domain aggregates to
the exact shape the UI consumes (`LeaderboardMemberView`, `ProfileView`), so
components never touch domain shapes directly. The profile screen recomputes its
summary through the same `calculateScoreSummary` used by the export, guaranteeing
the number on screen equals the number Excel computes.

---

### Layer 4 — Infrastructure

**Persistence — IndexedDB (`idb`)**

`IdbLocalRepository` (`src/infrastructure/db/local-repository.idb.ts`) implements
`LocalMemberRepository`. Five object stores (`members`, `technical`,
`fieldVisits`, `meetings`) with a `by-member` index on each entry store;
the database is opened lazily once per session. Because the port is async, a
future mobile build can swap in an Isar/SQLite adapter without touching any use
case.

**Excel — ExcelJS injector (browser)**

`src/infrastructure/excel/smmember-layout.ts` is a declarative contract of where
data lives in the real template:

```
SMMEMBER template, sheet "Member Evaluation"  (rows 5..304 = one member per row)
  row 2  section headers (dark blue / amber — static text)
  row 3  LIGHT YELLOW header row — Field Visit labels D3..R3 ("Name - Date"),
         Meeting labels U3..AI3 ("Date")  ← the target header row
  row 4  DARK YELLOW numbering row — static column indexes 1..15 (NEVER written)
  A   Member name
  B   Technical Evaluation /50            (data entry)
  C   Field Visits Entered               (FORMULA — counts labels in row 3, never written)
  D..R  15 Field Visit scores (0/1)
  S   Field Visits Total /20              (template formula — untouched)
  T   Meetings Entered                   (FORMULA — counts labels in row 3, never written)
  U..AI 15 Meeting scores (0/1)
  AJ  Meetings Total /10                  (template formula — untouched)
  AK, AL, AM Interaction / Respect Hierarchy / Bonus (/10 each, direct input)
  AN  Total /110, AO %, AP Grade          (template formulas — untouched)
```

The header row constant is `SMMEMBER_TEMPLATE.headerRow = 3` — the empty
light-yellow row directly **above** the dark-yellow numbering row (row 4), so
the template's static 1..15 column indexes are preserved.

Field Visits and Meetings are **shared event columns**: each occupies one of the
15 slots (D..R / U..AI), its label lives in the header row (row 3), and every
member's 0/1 score sits in their row under that column. The repository assigns
slots on save — an entry reuses the slot of an existing entry with the same
header label (`fieldVisitHeaderLabel` = `"Name - Date"`, `meetingHeaderLabel` =
date), otherwise it takes the next free slot.

`ExceljsInjector` fetches the bundled template, writes the labels into the
header row (row 3), and injects each member's data cell-by-cell (A, B, D..R,
U..AI, AK/AL/AM) ranked by total descending. Only data-entry cells are written;
the template's formula columns (`C`/`T` counts and `S`/`AJ`/`AN`/`AO`/`AP`) are
never touched, so **Excel recomputes everything on open** from the injected
values — the exported file is the real HR template, not a generated spreadsheet.

**WhatsApp — deep link**

No server, no API keys: `WaMeDeepLinkBuilder` builds
`https://wa.me/201100572740?text=<url-encoded summary>`, which opens WhatsApp
with the report pre-filled (attachments must be added manually). The recipient is
configured in `src/infrastructure/config.ts`.

**Composition root** (`src/infrastructure/container.ts`) wires the concrete
adapters into every use case. The UI calls `getContainer().<useCase>.execute(...)`
directly — no HTTP, no global state.

---

## PWA / offline

- `public/sw.js` is a cache-first service worker (registered only in production
  builds) that precaches the app shell **and the bundled template**
  (`/templates/SMMEMBER (1) (1) (3).xlsx`), so the app and the Excel export keep
  working with no network. Keep the precache filename in sync with the bundled
  file and bump `CACHE_NAME` whenever it changes so installed browsers
  re-cache it (this was the fix for "Export failed. Check that the template is
  bundled.").
- `src/app/manifest.ts` makes the app installable on phones/desktops.

---

## Scoring note

The template's `S`/`AJ` formulas are not rounded inside Excel; the UI rounds each
normalized bucket to 2 decimals before summing. In rare fractional cases (e.g.
1-of-3 meetings), the exported `AN` can differ from the on-screen total by
≤ 0.02/110. The template's own formulas are authoritative.#   Y L Y - w e b 2  
 #   Y L Y - w e b - H R  
 #   Y L Y - w e b - o r  
 