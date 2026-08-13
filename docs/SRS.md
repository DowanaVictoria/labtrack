# Software Requirements Specification (SRS)

**Project:** MediLab, a Multi Tenant Diagnostic Lab Marketplace and Appointment Platform
**Author:** Victoria Dowana (Student ID: 22425077)
**Version:** 2.1
**Date:** 2026-08-12

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non functional requirements for MediLab, a multi tenant marketplace platform. Multiple independent diagnostic labs list their test offerings, pricing, and locations on the platform; patients search a standardized test catalog, compare labs offering a given test, and book an appointment directly with the lab of their choice. It guides the initial release (MVP) build and serves as the basis for effort estimation, design, and testing.

### 1.2 Scope of this Document
Covers: problem statement, stakeholders, functional requirements, non functional requirements, and requirements prioritisation. Effort estimation, which builds directly on this SRS, is documented separately in `Effort_Estimation.md` and later folded into the consolidated Project Documentation.

### 1.3 Definitions
- **Tenant / Lab**: an independent diagnostic laboratory operating its own storefront on the platform, meaning its own profile, staff, test offerings, and appointment queue.
- **Platform Admin**: the operator of MediLab itself, who onboards labs and oversees the marketplace. Does not curate the test catalog (see FR23 change note in §5).
- **Test (standardized)**: a platform level catalog entry (e.g. "Lipid Panel") that labs attach their own pricing/offering to, so patients can compare like for like across labs. Seeded as fixed platform data for the initial release rather than managed through an admin UI.
- **Lab Test Offering**: a specific lab's listing for a standardized test, namely price, turnaround time, and any lab specific prep notes.
- **Appointment**: a booking made by a patient with a specific lab, for a specific test offering, at a specific date/time slot.
- **Sample**: the specimen collected for a booked appointment, tracked through a status pipeline.
- **Status pipeline**: `Booked → Sample Collected → In Progress → Completed` (or `Cancelled`).
- **Multi tenant data isolation**: the guarantee that one lab's staff/admin can never read or modify another lab's data, enforced at the data access layer, not just hidden in the UI.

---

## 2. Problem Statement

Patients seeking a diagnostic lab test today must contact or visit labs one at a time, since there is no way to see, in one place, which labs offer a given test, at what price, in what location, or with what turnaround time. This produces inefficient shopping around and no price transparency. Independent labs, meanwhile, have no shared channel to reach patients beyond their own walk in base, and each manages bookings with the same ad hoc, non digital methods.

MediLab solves both sides of this: it is a marketplace where multiple labs (tenants) list their test offerings, and patients search, compare, and book across all participating labs from a single platform. Each lab retains full control of its own catalog, pricing, staff, and appointment queue; a platform admin governs which labs are onboarded and maintains the shared test taxonomy that makes cross lab comparison meaningful.

---

## 3. Stakeholders & Users

| Stakeholder | Role in system | Primary interest |
|---|---|---|
| **Patient** | End user; searches, compares, and books across labs | Finding the right test at the right price/location, and tracking status after booking |
| **Lab Staff** | Operational user, scoped to one lab | Predictable daily queue, fast status updates |
| **Lab Admin (Tenant Admin)** | Manages one lab's presence on the platform | Accurate profile, pricing control, staff management, visibility into their lab's bookings |
| **Platform Admin** | Operates the marketplace itself; manages lab lifecycle only | Trustworthy lab onboarding and vetting, platform wide health |
| *(Context stakeholder, not a system actor)* Data protection expectations | N/A | Informs NFRs around tenant isolation, access control, and data privacy, given health adjacent data across multiple organisations |

Out of scope as direct actors for this build: insurers, referring physicians, lab equipment/LIS integrations (noted under Future Evolution).

---

## 4. System Overview

MediLab is a multi tenant web application with four actors: Patient, Lab Staff, Lab Admin, and Platform Admin. A shared, platform owned test catalog lets patients discover and compare **Lab Test Offerings** across many labs; each lab's operational data (staff, offerings, appointments, samples) is logically isolated so no lab can see another lab's data. Patients book directly with a chosen lab; that lab's staff run their own queue. See `System_Design.md` for architecture, tenant isolation approach, ER, and use case diagrams.

---

## 5. Functional Requirements

### Patient: discovery and booking

| ID | Requirement | Priority |
|---|---|---|
| FR1 | Patient can register an account | Must |
| FR2 | User can log in / log out (all roles) | Must |
| FR3 | Patient can search the standardized test catalog by name/category | Must |
| FR4 | Patient can view all labs offering a matched test, with price, location, and turnaround time (comparison view) | Must |
| FR5 | Patient can filter/sort comparison results by price, location, or turnaround time | Should |
| FR6 | Patient can view a lab's profile (name, address, contact, offered tests) | Should |
| FR7 | Patient can book an appointment with a specific lab, for a specific test offering and slot | Must |
| FR8 | System displays prep instructions before booking confirmation | Must |
| FR9 | Patient can view their own appointments and status across all labs they've booked with | Must |
| FR10 | Patient can cancel an upcoming appointment | Should |
| FR11 | Patient can reschedule an upcoming appointment | Could |

### Lab Staff

| ID | Requirement | Priority |
|---|---|---|
| FR12 | Lab staff can log in, scoped to their own lab | Must |
| FR13 | Lab staff can view their lab's queue of today's/upcoming appointments | Must |
| FR14 | Lab staff can mark a sample as collected (records status + timestamp) | Must |
| FR15 | Lab staff can advance an appointment/sample's status along the defined pipeline | Must |
| FR16 | Lab staff can view a single patient's appointment detail (within their own lab only) | Should |

### Lab Admin (Tenant Admin)

| ID | Requirement | Priority |
|---|---|---|
| FR17 | Lab admin can register their lab on the platform (submits a profile for platform admin approval) | Must |
| FR18 | Lab admin can manage their lab's profile (name, address, contact info) | Must |
| FR19 | Lab admin can manage staff accounts for their lab | Should |
| FR20 | Lab admin can add/edit/deactivate their lab's test offerings (select from the platform test catalog; set price, turnaround time, prep instructions) | Must |
| FR21 | Lab admin can view basic operational statistics for their own lab | Should |
| FR28 | Lab admin can add a new test to the shared platform catalog when the one they need doesn't already exist, then immediately offer it | Should |

### Platform Admin

| ID | Requirement | Priority |
|---|---|---|
| FR22 | Platform admin can review and approve or reject new lab registrations | Must |
| FR24 | Platform admin can suspend or reinstate a lab | Should |
| FR25 | Platform admin can view platform wide operational statistics (labs, bookings, tests) | Should |

> **Change note (v2.1):** FR23 ("Platform admin can manage the global standardized test catalog") is **removed**: the platform admin's scope is lab lifecycle management only (approve/reject/suspend/reinstate + stats), not test taxonomy curation. The standardized `Test` catalog itself still exists (labs still attach offerings to it, so cross lab comparison stays meaningful), but for the initial release it's fixed, seeded platform data rather than something edited through an admin UI. FR22, FR24, FR25's IDs are left as is rather than renumbered, to avoid touching every downstream reference (design docs, code comments) to an ID that didn't otherwise change.

> **Change note (v2.2):** FR28 is added post delivery: a real gap surfaced (a lab admin genuinely could not add a test the seeded catalog didn't anticipate), and the fix deliberately went to Lab Admin rather than reviving FR23's platform admin governed version, since the person who needs a new test listed is the lab admin, not the platform admin. This reopens the risk FR23's removal was partly meant to avoid, namely catalog fragmentation from multiple labs naming similar tests differently, so `createTest` (`src/app/actions/tests.ts`) enforces a case insensitive duplicate name check before creating. That check is application level only, not a database constraint; see `Technical_Debt_Plan.md` for the disclosed gap.

### System / cross cutting

| ID | Requirement | Priority |
|---|---|---|
| FR26 | System prevents two appointments from being booked into the same lab's same slot | Must |
| FR27 | System enforces strict multi tenant data isolation: lab staff/admin can only ever access their own lab's data | Must |

## 6. Non Functional Requirements

| ID | Requirement | Category | Priority |
|---|---|---|---|
| NFR1 | Passwords are hashed; all protected routes require authentication | Security | Must |
| NFR2 | Role based **and tenant scoped** authorization is enforced server side at the data access layer; no cross tenant data leakage under any circumstance | Security / Privacy | Must |
| NFR3 | A first time patient can search, compare, and book in a small number of steps | Usability | Should |
| NFR4 | Typical page interactions respond within ~1–2s under light, single instance load | Performance | Should |
| NFR5 | UI is usable on both mobile and desktop viewport widths | Responsiveness | Must |
| NFR6 | Appointment status only transitions in the defined valid sequence (no invalid jumps) | Reliability / Data integrity | Must |
| NFR7 | Tenant scoping logic is centralised (e.g. a single data access layer/policy), not re implemented per query, to minimise the risk of isolation bugs | Maintainability / Security | Should |
| NFR8 | Architecture does not preclude later horizontal scaling as lab/patient volume grows (documented, not built) | Scalability (documented) | Could |
| NFR9 | Hosted on a platform with reasonable uptime for pilot/MVP operation | Availability | Must |
| NFR10 | Platform admin actions on lab approval/suspension are logged and auditable | Governance / Auditability | Should |

---

## 7. Requirements Prioritisation (MoSCoW)

Prioritised against the initial release scope; cross validated against effort estimation in `Effort_Estimation.md`.

### Must have (core scope, committed)
FR1, FR2, FR3, FR4, FR7, FR8, FR9, FR12, FR13, FR14, FR15, FR17, FR18, FR20, FR22, FR26, FR27
NFR1, NFR2, NFR5, NFR6, NFR9

### Should have (built if Must have lands on schedule)
FR5, FR6, FR10, FR16, FR19, FR21, FR24, FR25, FR28
NFR3, NFR4, NFR7, NFR10

### Could have (stretch, only if significant time remains)
FR11
NFR8

### Won't have (explicitly deferred, see Future Evolution)
- Lab ratings/reviews from patients
- Real geo distance search backed by maps/geocoding (initial release uses city/text location matching only)
- Email/SMS notifications (status is in app only)
- Real payment processing / online checkout
- Real lab result values or uploaded report files (result field is a status flag only)
- Native mobile app
- Insurance/LIS/equipment integrations
- Advanced analytics/BI dashboards
- Automated (non manual) fraud/quality review of lab listings
- Multi currency / multi region localisation

**Rationale:** the Won't have list matches items identified as out of scope for the initial release and is also tracked as anticipated technical debt (see `Technical_Debt_Plan.md`) and future evolution.

---

## 8. Assumptions & Dependencies

- Single currency, single region for the initial release (no localisation).
- Labs are responsible for the accuracy of their own listed pricing and offerings; the platform does not independently verify pricing.
- Location matching is by city/text field, not real geocoding, for the initial release.
- No integration with real payment, SMS, or email providers.
- Detailed effort/duration assumptions are documented in `Effort_Estimation.md` §4.

## 9. Constraints

- Delivery is scoped to a defined initial release; features beyond Must/Should have are deferred to subsequent releases (see Future Evolution).
- Initial release is resourced as a small dedicated team (see `Effort_Estimation.md` §3 for team size/duration trade offs).
- Initial deployment targets cost effective hosting suitable for a pilot/MVP rollout with a small number of onboarded labs (see NFR9); production scale hosting and multi region deployment are future considerations.
- A full formal security audit is out of scope for the initial release; baseline security controls and tenant isolation testing (NFR1, NFR2, NFR7) are implemented and validated via targeted testing (see `Testing_Report.md`). A full audit, especially of tenant isolation, is strongly recommended before onboarding labs handling real patient data at scale.
