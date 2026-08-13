# System Design

**Project:** LabTrack — Multi-Tenant Diagnostic Lab Marketplace & Appointment Platform
**Author:** [Your Name]
**Version:** 1.0
**Date:** 2026-08-12

> Builds on `SRS.md` (requirements, actors, MoSCoW scope) and `Effort_Estimation.md` (use-case sizing). Diagrams selected are the ones that best communicate a multi-tenant system: architecture, tenant data model, use-case, class, two sequence flows, and ER — wireframes are described rather than drawn in full fidelity, appropriate for an initial release.

---

## 1. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Front-end | Next.js (React) + Tailwind CSS | Single framework covers three distinct UI surfaces (patient, lab console, platform-admin console) without standing up separate apps; fast to scaffold |
| Back-end | Next.js API routes (Node.js/TypeScript) | Keeps one deployable unit for a small team; avoids the coordination overhead of a separate backend service for an MVP |
| Database | PostgreSQL (managed, e.g. Supabase/Neon) | Relational integrity (foreign keys, unique constraints) is exactly what tenant-scoped data and slot-clash prevention need |
| ORM | Prisma | Typed schema/migrations, and its query-extension mechanism is the enforcement point for tenant scoping (§2) |
| Auth | Auth.js (NextAuth) or the managed provider's built-in auth | Password hashing and session handling out of the box, rather than hand-rolled — directly supports NFR1 |
| Hosting | Vercel (app) + managed Postgres | Cost-effective/pilot-tier per `SRS.md` §9, minimal ops overhead |

This stack is chosen for velocity on a small team, consistent with the effort estimate's assumption of scaffolding/tooling reuse (`Effort_Estimation.md` §4).

---

## 2. Multi-Tenancy Data Model Decision

**Decision: shared database, shared schema, with a `labId` column on every lab-scoped table, enforced through a single centralised data-access layer.**

Alternative considered: **schema-per-tenant** (or database-per-tenant) — rejected for this release because:
- The platform's core value is **cross-tenant search and comparison** (FR3, FR4) — this requires querying across labs in one pass; schema/DB-per-tenant turns that into a fan-out query across N schemas, adding real complexity for no benefit at pilot scale.
- The initial release onboards a small number of pilot labs (`SRS.md` §4 assumption); the operational cost of migrating N schemas in lockstep isn't justified yet.
- A shared schema lets tenant-scoping be enforced in **one place** — directly satisfying NFR7 ("tenant-scoping logic is centralised, not re-implemented per query"), which is the strongest available mitigation against an isolation bug (the single highest-severity risk identified in `Effort_Estimation.md` §3 and §6).

**Enforcement mechanism:** every Prisma query against a lab-scoped model (`Lab`, `LabTestOffering`, `Appointment` when accessed by staff/admin, `Sample`) is routed through a Prisma Client Extension that automatically injects a `where: { labId: session.labId }` filter for any session whose role is `lab_staff` or `lab_admin`. Application code cannot opt out of this filter — there is no code path that queries these tables without going through the extension. `platform_admin` sessions use a separate, explicitly-named unscoped client method, so a platform-wide query is always a deliberate, visible choice in the code rather than an accidental default.

This decision is the direct architectural response to NFR2 and FR27 in `SRS.md`, and is the first thing to verify under test (see the tenant-isolation checkpoint in `Effort_Estimation.md` §3 and `todo.md` Phase 4).

---

## 3. System Architecture

```mermaid
flowchart TB
    subgraph Clients
        PC["Patient Web UI"]
        LC["Lab Console UI"]
        AC["Platform Admin UI"]
    end

    subgraph App["Next.js Application"]
        API["API Routes / Server Actions"]
        AUTH["Auth.js — session + role"]
        TSCOPE["Tenant-Scoping Extension\n(auto-filters by labId)"]
    end

    DB[("PostgreSQL\nshared schema, labId on tenant tables")]

    PC --> API
    LC --> API
    AC --> API
    API --> AUTH
    API --> TSCOPE
    TSCOPE --> DB
```

All three UI surfaces are one application with role-based routing/rendering, not three separate apps — this keeps the tenant-scoping enforcement point (§2) singular rather than duplicated.

---

## 4. Use-Case Diagram

```mermaid
flowchart LR
    Patient((Patient))
    Staff((Lab Staff))
    LabAdmin((Lab Admin))
    PlatformAdmin((Platform Admin))

    Patient --> UC1[Register / Login]
    Patient --> UC2[Search & Compare Labs]
    Patient --> UC3[Book Appointment]
    Patient --> UC4[View My Appointments]
    Patient --> UC5[Cancel Appointment]

    Staff --> UC1
    Staff --> UC6[View Lab Queue]
    Staff --> UC7[Update Sample/Status]

    LabAdmin --> UC1
    LabAdmin --> UC8[Register Lab]
    LabAdmin --> UC9[Manage Lab Profile]
    LabAdmin --> UC10[Manage Test Offerings]
    LabAdmin --> UC11[Manage Staff Accounts]

    PlatformAdmin --> UC1
    PlatformAdmin --> UC12[Approve/Reject Lab]
    PlatformAdmin --> UC14[Suspend/Reinstate Lab]
```

Maps directly to the FR groupings in `SRS.md` §5; every Must-have FR has a corresponding node above. `Test` is still a platform-owned, shared catalog entity (see §5/§8), but per `SRS.md` §5's FR23 change note it's fixed seeded data for the initial release, not a use case the platform admin performs — hence no "manage test catalog" node here.

---

## 5. Class Diagram

```mermaid
classDiagram
    class User {
        +id: UUID
        +name: string
        +email: string
        +passwordHash: string
        +role: Role
        +labId: UUID?
        +createdAt: DateTime
    }
    class Lab {
        +id: UUID
        +name: string
        +address: string
        +city: string
        +contactEmail: string
        +status: LabStatus
        +createdAt: DateTime
    }
    class Test {
        +id: UUID
        +name: string
        +category: string
        +sampleType: string
        +description: string
    }
    class LabTestOffering {
        +id: UUID
        +labId: UUID
        +testId: UUID
        +price: Decimal
        +turnaroundHours: int
        +prepInstructions: string
        +active: boolean
    }
    class Appointment {
        +id: UUID
        +patientId: UUID
        +labId: UUID
        +offeringId: UUID
        +slotDatetime: DateTime
        +status: AppointmentStatus
        +createdAt: DateTime
    }
    class Sample {
        +id: UUID
        +appointmentId: UUID
        +collectedAt: DateTime
        +collectedByStaffId: UUID
        +notes: string
    }

    Lab "1" --> "*" User : employs (staff/admin)
    Lab "1" --> "*" LabTestOffering : lists
    Test "1" --> "*" LabTestOffering : standardises
    User "1" --> "*" Appointment : books (patient)
    Lab "1" --> "*" Appointment : receives
    LabTestOffering "1" --> "*" Appointment : booked for
    Appointment "1" --> "0..1" Sample : produces
```

`labId` appears on `User` (nullable — null for patients and platform admins), `Lab` itself, `LabTestOffering`, and `Appointment` — these are exactly the tables the tenant-scoping extension (§2) intercepts.

---

## 6. Sequence Diagram — Lab Onboarding

```mermaid
sequenceDiagram
    actor LA as Lab Admin
    participant Sys as LabTrack
    participant DB as Database
    actor PA as Platform Admin

    LA->>Sys: Submit lab registration (profile)
    Sys->>DB: Create Lab (status = pending)
    Sys-->>LA: Confirmation — pending approval
    PA->>Sys: View pending lab registrations
    Sys->>DB: Query Lab where status = pending
    DB-->>Sys: Pending labs list
    PA->>Sys: Review & approve
    Sys->>DB: Update Lab.status = approved
    Sys-->>LA: Notify approved
    LA->>Sys: Add test offerings (price, turnaround, prep)
    Sys->>DB: Create LabTestOffering rows (labId scoped)
    Note over Sys,DB: Lab now discoverable in patient search (§7)
```

---

## 7. Sequence Diagram — Core Booking Flow

```mermaid
sequenceDiagram
    actor P as Patient
    participant Sys as LabTrack
    participant DB as Database
    actor S as Lab Staff

    P->>Sys: Search test (e.g. "Lipid Panel")
    Sys->>DB: Query Test + active LabTestOfferings (joined, approved labs only)
    DB-->>Sys: Matching offerings across labs
    Sys-->>P: Comparison list (price, location, turnaround)
    P->>Sys: Select offering + slot, confirm
    Sys->>DB: Check slot availability (scoped to labId)
    alt slot available
        Sys->>DB: Create Appointment (status = Booked)
        Sys-->>P: Confirmation + prep instructions
    else slot taken
        Sys-->>P: Slot unavailable — choose another
    end
    S->>Sys: View today's queue (scoped to their labId)
    Sys->>DB: Query Appointments where labId = staff.labId
    DB-->>Sys: Today's appointments
    S->>Sys: Mark sample collected
    Sys->>DB: Create Sample, update Appointment.status = Sample Collected
    S->>Sys: Advance status (In Progress → Completed)
    Sys->>DB: Update Appointment.status
    P->>Sys: View appointment status
    Sys->>DB: Query Appointment where patientId = P.id
    DB-->>Sys: Current status
    Sys-->>P: Status shown
```

---

## 8. ER Diagram

```mermaid
erDiagram
    LAB ||--o{ USER : employs
    LAB ||--o{ LAB_TEST_OFFERING : lists
    TEST ||--o{ LAB_TEST_OFFERING : standardises
    USER ||--o{ APPOINTMENT : books
    LAB ||--o{ APPOINTMENT : receives
    LAB_TEST_OFFERING ||--o{ APPOINTMENT : booked_for
    APPOINTMENT ||--o| SAMPLE : produces

    LAB {
        uuid id PK
        string name
        string address
        string city
        string status
    }
    USER {
        uuid id PK
        string email
        string role
        uuid labId FK "nullable"
    }
    TEST {
        uuid id PK
        string name
        string category
        string sampleType
    }
    LAB_TEST_OFFERING {
        uuid id PK
        uuid labId FK
        uuid testId FK
        decimal price
        int turnaroundHours
        boolean active
    }
    APPOINTMENT {
        uuid id PK
        uuid patientId FK
        uuid labId FK
        uuid offeringId FK
        datetime slotDatetime
        string status
    }
    SAMPLE {
        uuid id PK
        uuid appointmentId FK
        datetime collectedAt
        uuid collectedByStaffId FK
    }
```

A unique constraint on `(labId, offeringId, slotDatetime)` in `APPOINTMENT` is the database-level backstop for FR26 (slot-clash prevention) — the application check in §7 is the primary defense, but the constraint guarantees correctness even under concurrent requests.

---

## 9. UI Wireframes (low-fidelity)

**Patient — Search & Compare**
```
┌─────────────────────────────────────────────┐
│ Search: [ Lipid Panel            ] [Search]  │
│ Filter: Price ▾   Location ▾   Turnaround ▾  │
├─────────────────────────────────────────────┤
│ CityLab Diagnostics   GHS 80   Osu   24h  [Book] │
│ QuickTest Labs        GHS 65   Tema  48h  [Book] │
│ MedCheck Labs         GHS 95   Osu   12h  [Book] │
└─────────────────────────────────────────────┘
```

**Patient — Booking Confirmation**
```
┌─────────────────────────────────────────────┐
│ CityLab Diagnostics — Lipid Panel — GHS 80   │
│ Prep: Fast 12 hours before sample collection │
│ Slot: [ Tue 18 Aug, 9:00 AM ▾ ]              │
│                          [Confirm Booking]    │
└─────────────────────────────────────────────┘
```

**Lab Staff — Queue**
```
┌─────────────────────────────────────────────┐
│ Today's Queue — CityLab Diagnostics          │
├─────────────────────────────────────────────┤
│ 9:00  J. Owusu   Lipid Panel   [Mark Collected] │
│ 9:30  A. Mensah  CBC           Sample Collected │
│ 10:00 K. Boateng Lipid Panel   In Progress → [Complete] │
└─────────────────────────────────────────────┘
```

**Lab Admin — Test Offerings**
```
┌─────────────────────────────────────────────┐
│ CityLab Diagnostics — Test Offerings [+ Add] │
├─────────────────────────────────────────────┤
│ Lipid Panel   GHS 80   24h   Active  [Edit]  │
│ CBC           GHS 45   12h   Active  [Edit]  │
└─────────────────────────────────────────────┘
```

**Platform Admin — Pending Lab Approvals**
```
┌─────────────────────────────────────────────┐
│ Pending Lab Registrations                    │
├─────────────────────────────────────────────┤
│ MedCheck Labs — Osu   [View] [Approve] [Reject] │
└─────────────────────────────────────────────┘
```

---

## 10. Traceability to Requirements

| Diagram | Primary FRs covered |
|---|---|
| Architecture (§3) | NFR2, NFR7, NFR9 |
| Use-case (§4) | FR1–FR25, excluding FR23 (removed — see `SRS.md` §5 change note) |
| Class (§5) / ER (§8) | Entities underlying every FR |
| Sequence — onboarding (§6) | FR17, FR22 |
| Sequence — booking (§7) | FR3, FR4, FR7, FR8, FR13–FR15, FR26 |
| Wireframes (§9) | FR3–FR9, FR13, FR20, FR22 |
