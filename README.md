<h1 align="center">Member Evaluation — OER Edition</h1>

<p align="center">
  The <b>OER committee</b> edition: offline-first PWA built around <b>field work</b> — visits and meetings /30 each, tasks /20 — exported into the real <code>ORMEMBER</code> Excel template.
</p>

<p align="center">
  <a href="https://yly-web-or.vercel.app"><img src="https://img.shields.io/badge/Live%20demo-yly--web--or.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live demo" /></a>
  <img src="https://img.shields.io/badge/Next.js%2016-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS%20v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/PWA-offline--first-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
</p>

<p align="center"><b><a href="https://yly-web-or.vercel.app">▶ Open the live demo</a></b></p>

## About

An **offline-first** member evaluation dashboard (Web + installable PWA) for the
**OER committee**, built with Clean Architecture. Every evaluator's data
lives only on their own device (IndexedDB in the browser) — there is no backend:
scores are computed on-device, the committee's real `ORMEMBER (1).xlsx` Excel
template is filled in the browser, and reports are shared through a WhatsApp
deep link. A leader dashboard then merges every evaluator's file into one master
report.

> **Part of the YLY evaluation suite.** Each committee has its own deployment with
> its own template and weighting. It is the field-work edition: **field visits and meetings are worth 30 points each**, tasks only 20 — and its template puts visits first (columns C..Q).
> Sibling editions: [EHI/HR](https://github.com/youssef336/YLY-web-HR) · [PR](https://github.com/youssef336/YLY-web-PR) · [Social Media](https://github.com/youssef336/YLY-web-sm) · the original React/Vite prototype lives in
> [YLY-web](https://github.com/youssef336/YLY-web).

## ✨ Features

- 📴 **Offline-first** — every mutation hits IndexedDB only; refresh or lose the network and the data is still there.
- 🏆 **Leaderboard** of all members, sorted by total /110, with percentage and A–F grade badges.
- 📅 **Global events** — field visits (name, date, Day/Night shift) and meetings created once and scored per member.
- ✅ **T × Q × D tasks** — up to 10 per member, scored on submission, quality and deadline.
- 🎚️ **Category scores** (Interaction, Respect Hierarchy, Bonus) — each with its own Save button.
- 📊 **Live scoring** — Field Visits /30 · Meetings /30 · Tasks /20 · Interaction /10 · Respect Hierarchy /10 · Bonus /10, recomputed instantly from one shared domain function.
- 📗 **Real-template Excel export** — data is injected into the committee's own `ORMEMBER (1).xlsx` with ExcelJS, entirely in the browser.
- 🧩 **Leader merge dashboard** (`/leader`) — drag & drop evaluators' `.xlsx` files, define official events and monthly targets, download one merged master report.
- 💬 **WhatsApp reporting** via a `wa.me` deep link — no server, no API keys.
- 📲 **Installable PWA** with a cache-first service worker.

## 🛠 Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) · React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Persistence | IndexedDB via [`idb`](https://github.com/jakearchibald/idb) |
| Excel | [ExcelJS](https://github.com/exceljs/exceljs) (browser build) |
| Validation | Zod |
| Architecture | Onion / Clean Architecture with a client-side composition root |

---

## 🚀 Quick start

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
bundled under `public/exel need/` and served with the app (path configured in
`src/infrastructure/config.ts` → `/exel need/ORMEMBER (1).xlsx`).

> Dev on a LAN: `next.config.mjs` whitelists `allowedDevOrigins` so the app can
> be opened from a phone on the local network without cross-origin errors. Add
> your machine's IP if it changes.

---

## System behavior

| Feature | Where it lives |
| --- | --- |
| Add / rename / delete member | Home page + profile page (all local) |
| Leaderboard (desc. by Total /110) | Home page |
| Global events — field visits (name + date + Day/Night shift) and meetings, shared by all members (15 slots each) | Home page |
| Tasks — up to 10 per member, each scored T × Q × D | Profile page |
| Field-visit / meeting attendance (1/0) per member | Profile page |
| Interaction / Respect Hierarchy / Bonus (0..10 each) | Profile page — **each saved independently** |
| Live Total /110, %, Grade | Recomputed from shared domain rules |
| Export to `ORMEMBER (1).xlsx` | Injects all members into the bundled real template |
| Merge evaluators' files into one master report | `/leader` dashboard |
| Share report on WhatsApp | Opens a `wa.me` deep link to the team leader |

**Offline-first rule:** all mutations (add/edit/delete of members and entries)
happen against IndexedDB only. Refresh the page or lose the network and the data
is still there — that is the whole point of the architecture.

---

## 🏗 Architecture

Strict **Onion / Clean Architecture** with a **client-side composition root**.
The dependency rule is enforced by construction: nothing inside a layer imports
from a layer outside it.

```
 UI (React components)                      --> outermost ring
   │
 Interface Adapters (presenters)
   │
 Application (use cases + ports + DTOs)     --> orchestration + business flows
   │
 Domain (entities + scoring rules)          --> enterprise rules, zero dependencies
   │
 Infrastructure (IndexedDB, ExcelJS, wa.me) --> implements ports
```

```
src/
├── domain/                      # Layer 1 - Domain (zero dependencies)
│   ├── entities/                # Member, GlobalFieldVisit, GlobalMeeting, FieldVisit,
│   │                            # Meeting, CategoryScores, HrTask, MemberProfile
│   └── score/scoring.ts         # /110 aggregation aligned to the template
│
├── application/                 # Layer 2 - Application
│   ├── ports/                   # LocalMemberRepository, ExcelGenerator,
│   │                            # WhatsAppDeepLinkBuilder (interfaces)
│   ├── dto/member.dto.ts        # Zod-validated input DTOs
│   └── use-cases/               # members, global events, scores, export,
│                                # WhatsApp deep link, validation helpers
│
├── interface-adapters/          # Layer 3 - Interface Adapters
│   └── presenters/              # leaderboard + profile view models
│
├── infrastructure/              # Layer 4 - Frameworks & Drivers
│   ├── config.ts                # WhatsApp recipient + template paths
│   ├── db/                      # idb-database.ts + IndexedDB repository adapter
│   ├── excel/                   # hr-committee-layout.ts, template-parser.ts,
│   │                            # exceljs-injector.ts, excel-merger.ts
│   ├── whatsapp/wa-deeplink.ts  # wa.me link builder
│   ├── download.ts              # triggers the .xlsx download
│   └── container.ts             # client composition root (getContainer())
│
├── components/                  # leaderboard / profile UI building blocks
└── app/                         # Next.js App Router (outermost ring)
    ├── layout.tsx               # manifest link + service worker registration
    ├── page.tsx                 # Leaderboard + global events home
    ├── members/[id]/page.tsx    # Evaluation profile (full CRUD + live scoring)
    ├── leader/page.tsx          # Leader dashboard — merge evaluators' files
    ├── service-worker-register.tsx
    └── manifest.ts              # PWA manifest
```

---

### Layer 1 — Domain

Pure TypeScript types and functions with **zero imports from any other layer**.
`src/domain/score/scoring.ts` is the single source of truth for scoring, and it
mirrors the OER template's layout:

| Category | Template cells | Formula | Cap |
| --- | --- | --- | --- |
| Field Visits | C..Q | `avg(0/1 scores) × 30` | **/30** |
| Meetings | T..AH | `avg(0/1 scores) × 30` | **/30** |
| Tasks | AK..CT (10 tasks × T/Q/D) | `Σ T×Q×D`, capped | **/20** |
| Interaction | CU | direct input | **/10** |
| Respect Hierarchy | CV | direct input | **/10** |
| Bonus | CW | direct input | **/10** |
| **Total** | | sum of the above | **/110** |

`calculateScoreSummary` clamps each category, normalizes Field Visits and
Meetings by their average (exactly like the template's formulas), adds the three
direct `/10` inputs, and derives the percentage and grade.

**HR tasks** (`src/domain/entities/hr-task.ts`) are the committee-specific twist: each
member can log up to **10 tasks**, and every task is scored on three axes —
**T** (submission: 0 · 0.25 · 0.5 · 1), **Q** (quality: 1–5) and **D** (deadline:
0 · 0.25 · 0.5 · 1). A task is worth `T × Q × D`, and the sum is capped at the
committee's task maximum.

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
  addHrTask(input): Promise<HrTask>;
  updateHrTask(id, { t, q, d }): Promise<HrTask>;
  removeHrTask(id): Promise<void>;
  addFieldVisit(input): Promise<FieldVisit>;
  updateFieldVisit(id, input): Promise<FieldVisit>;
  removeFieldVisit(id): Promise<void>;
  // ... same shape for meetings and global events
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
add-member  update-member-name  delete-member  list-members  get-member-profile
calculate-leaderboard  update-category-scores
create / list / delete-global-field-visit   create / list / delete-global-meeting
add / update / remove-field-visit           add / update / remove-meeting
add-hr-task / update-hr-task / remove-hr-task.use-case.ts
export-evaluation-to-excel   build-whatsapp-deeplink
```

Use cases are thin orchestrators: validate input via Zod DTOs
(`parseOrThrow`), call the injected port, and throw domain errors
(`MemberNotFoundError`, `ValidationError`). Every mutation returns through
`loadProfile`, so the UI always re-renders with a freshly computed summary.

**Input DTOs** (`src/application/dto/member.dto.ts`):

```ts
export const HrTaskInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  t: z.union([z.literal(0), z.literal(0.25), z.literal(0.5), z.literal(1)]),
  q: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  d: z.union([z.literal(0), z.literal(0.25), z.literal(0.5), z.literal(1)]),
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
`LocalMemberRepository` on a `member-eval-db` database with the object stores
`members`, `categoryScores`, `globalFieldVisits`, `globalMeetings`, `fieldVisits`, `meetings`, `hrTasks`; per-member entry stores carry a `by-member` index, and the database is
opened lazily once per session. Because the port is async, a future mobile build
can swap in an Isar/SQLite adapter without touching any use case.

**Excel — ExcelJS injector (browser)**

`src/infrastructure/excel/hr-committee-layout.ts` is a declarative contract of where
data lives in the real template:

```
ORMEMBER (OER) template, sheet "Member Evaluation"  (rows 4..303 = one member per row)
  row 3  LIGHT YELLOW header row — visit dates in C3:Q3,
         meeting dates in T3:AH3, task names in AK3, AN3, …
  A        Member name
  B        Field Visits Entered              (formula — never written)
  C..Q     15 field-visit scores (0/1)
  S        Meetings Entered                  (formula — never written)
  T..AH    15 meeting scores (0/1)
  AJ       Tasks Entered                     (formula — never written)
  AK..CT   10 tasks × 3 columns (T, Q, D)
  CU/CV/CW Interaction / Respect Hierarchy / Bonus (direct input)
```

Field Visits and Meetings are **shared event columns**: each global event
occupies one of the 15 slots, its label lives in the header row (row 3), and every
member's 0/1 score sits in their row under that column.

`ExceljsInjector` loads the original workbook (never creates a new one) and
writes through fixed numeric column indices (`OER_COL`) to guarantee the OER
mapping. It **only writes cells that have data** and never touches formula
columns (`B`, `S`, `AJ` and the trailing totals), then strips cached results so
Excel recalculates on open.

**Leader merge — `excel-merger.ts`**

The `/leader` page accepts several evaluators' exported `.xlsx` files (drag &
drop). The leader defines the official field visits, meetings, tasks and monthly
targets; those become the master row-3 headers, and every uploaded file is
mapped onto the master by **date** for all three categories (tasks, visits, meetings). The result is downloaded as a single
merged master report with the template's formulas intact.

**WhatsApp — deep link**

No server, no API keys: `WaMeDeepLinkBuilder` builds
`https://wa.me/<number>?text=<url-encoded summary>`, which opens WhatsApp with
the report pre-filled (attachments must be added manually). The recipient is
configured in `src/infrastructure/config.ts`.

**Composition root** (`src/infrastructure/container.ts`) wires the concrete
adapters into every use case. The UI calls `getContainer().<useCase>.execute(...)`
directly — no HTTP, no global state.

---

## 📲 PWA / offline

- `public/sw.js` is a cache-first service worker (registered only in production
  builds) that precaches the app shell and caches the `.xlsx` templates it serves,
  so the app and the Excel export keep working with no network. Bump
  `CACHE_NAME` whenever the bundled template changes so installed browsers
  re-cache it.
- `src/app/manifest.ts` makes the app installable on phones and desktops.

---

## Scoring note

The UI rounds each normalized bucket to 2 decimals before summing, so in rare
fractional cases the total Excel computes can differ very slightly from the
on-screen total. The template's own formulas are authoritative.

---

## 👤 Author

**Youssef Belal Zakaria** · [GitHub @youssef336](https://github.com/youssef336)

⭐ If you like this project, give it a star!
