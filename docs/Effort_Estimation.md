# Software Effort Estimation

**Project:** LabTrack — Multi-Tenant Diagnostic Lab Marketplace & Appointment Platform
**Technique:** Use Case Points (UCP)
**Author:** [Your Name]
**Version:** 2.0
**Date:** 2026-08-12

> This document builds directly on the functional requirements and actors defined in `SRS.md`. Its conclusions are folded into Section 7 ("Software Effort Estimation") of the consolidated Project Documentation.

---

## 1. Technique Selection & Justification

**Selected: Use Case Points (UCP)**

Alternatives considered and rejected for this specific project:

- **COCOMO/COCOMO II** — requires an upfront size estimate (KLOC or a calibrated proxy) that isn't knowable before any code exists; better suited to later re-estimation once a codebase exists to size.
- **Story Points** — requires a historical team velocity to convert points into time; there is no prior sprint history for this team, so points would have to be arbitrarily anchored anyway.
- **Expert estimation (pure)** — reasonable as a sanity check, but too coarse a basis on its own to defend the estimate to a client or stakeholder, especially given the added architectural risk of multi-tenancy.

UCP was chosen because the requirements in `SRS.md` are already actor- and use-case-shaped (Patient, Lab Staff, Lab Admin, Platform Admin; a clear list of discrete use cases per role), so actors and use cases can be classified directly from the SRS without extra translation, and the method produces a traceable effort number broken into inputs that can be independently re-checked.

---

## 2. Use Case Points Calculation

### 2.1 Actor Weighting (UAW)

All four actors are humans interacting through a GUI → classified **Complex** (weight 3).

| Actor | Type | Weight |
|---|---|---|
| Patient | Complex (GUI) | 3 |
| Lab Staff | Complex (GUI) | 3 |
| Lab Admin | Complex (GUI) | 3 |
| Platform Admin | Complex (GUI) | 3 |
| **UAW (total)** | | **12** |

### 2.2 Use Case Weighting (UUCW)

Classified by transaction count: Simple (≤3) = 5, Average (4–7) = 10, Complex (>7) = 15. Every use case at **Must-have or Should-have** priority in `SRS.md` §7 is counted; Could-have and Won't-have are excluded.

| Use Case | FRs | Priority | Transactions (approx.) | Class | Weight |
|---|---|---|---|---|---|
| Register (Patient) | FR1 | Must | 3 | Simple | 5 |
| Login/Logout (shared, all roles) | FR2 | Must | 2 | Simple | 5 |
| Search & Compare Labs for a Test | FR3, FR4 | Must | 5: search term → query test catalog → query cross-tenant offerings → aggregate results → render comparison | Average | 10 |
| Filter/Sort Comparison Results | FR5 | Should | 3 | Simple | 5 |
| View Lab Profile | FR6 | Should | 2 | Simple | 5 |
| Book Appointment | FR7, FR8, FR26 | Must | 8: select lab offering → check slot availability (scoped to lab) → validate → display prep instructions → confirm → reject on clash → persist → confirm to user | Complex | 15 |
| View My Appointments/Status | FR9 | Must | 2 | Simple | 5 |
| Cancel Appointment | FR10 | Should | 3 | Simple | 5 |
| View Today's Queue (Lab Staff) | FR13 | Must | 3 | Simple | 5 |
| Update Appointment/Sample Status | FR14, FR15 | Must | 5: select appt → validate transition → update → timestamp → persist | Average | 10 |
| View Patient Appointment Detail | FR16 | Should | 2 | Simple | 5 |
| Lab Registration / Onboarding | FR17 | Must | 5: fill lab profile → submit → validate → create pending record → confirmation | Average | 10 |
| Manage Lab Profile | FR18 | Must | 3 | Simple | 5 |
| Manage Staff Accounts | FR19 | Should | 4: add/edit/remove/list | Average | 10 |
| Manage Test Offerings — CRUD | FR20 | Must | 6 | Average | 10 |
| View Lab Stats | FR21 | Should | 2 | Simple | 5 |
| Review & Approve Lab Registration | FR22 | Must | 5: view pending → review → approve/reject → notify → persist | Average | 10 |
| Suspend/Reinstate Lab | FR24 | Should | 3 | Simple | 5 |
| View Platform-wide Stats | FR25 | Should | 2 | Simple | 5 |
| **UUCW (total)** | | | | | **135** |

*(v2.1: "Manage Global Test Catalog" / FR23 removed — see `SRS.md` §5 change note. Platform admin's scope is lab lifecycle only; `Test` is fixed seeded data for the initial release, not an admin use case.)*

**UUCP (Unadjusted Use Case Points) = UAW + UUCW = 12 + 135 = 147**

### 2.3 Technical Complexity Factor (TCF)

`TCF = 0.6 + (0.01 × ΣTFactor)`, factors rated 0 (irrelevant) – 5 (essential).

| Factor | Weight | Rating | Weighted |
|---|---|---|---|
| T1 Distributed system | 2 | 2 | 4 |
| T2 Performance objectives | 1 | 3 | 3 |
| T3 End-user efficiency | 1 | 4 | 4 |
| T4 Complex internal processing | 1 | 4 | 4 |
| T5 Reusability | 1 | 2 | 2 |
| T6 Easy to install | 0.5 | 4 | 2 |
| T7 Easy to use | 0.5 | 4 | 2 |
| T8 Portability | 2 | 3 | 6 |
| T9 Easy to change | 1 | 3 | 3 |
| T10 Concurrency | 1 | 3 | 3 |
| T11 Security objectives | 1 | 5 | 5 |
| T12 Third-party access | 1 | 0 | 0 |
| T13 Special training needed | 1 | 2 | 2 |
| **ΣTFactor** | | | **40** |

TCF = 0.6 + (0.01 × 40) = **1.00**

Ratings that changed materially from a single-tenant design, briefly justified:
- **T4 Complex internal processing (rated 4, up from a single-lab baseline of 2)** — cross-tenant search/comparison queries, tenant-scoped filtering on every request, and an approval workflow are genuinely more complex than single-lab CRUD.
- **T11 Security objectives (rated 5, up from 4)** — multi-tenant data isolation (NFR2, NFR7) is a hard requirement: a leak here exposes one lab's patient data to another lab, not just a routine access-control bug.
- **T1 Distributed system (rated 2, up from 1)** — still a single deployed application and database, not physically distributed, but logical multi-tenancy introduces distribution-like reasoning (per-tenant scoping on every query), so it is no longer rated at the floor.
- **T10 Concurrency (rated 3, up from 2)** — many labs' staff and many patients transacting concurrently against shared slot-booking logic is a more realistic concern than a single lab's queue.
- **T13 Special training needed (rated 2, up from 1)** — four distinct roles (vs. three) with a lab-onboarding/approval flow require slightly more onboarding material than a single-lab app.

### 2.4 Environmental Factor (EF)

`EF = 1.4 + (-0.03 × ΣEFactor)`, factors rated 0–5.

| Factor | Weight | Rating | Weighted |
|---|---|---|---|
| E1 Familiarity with dev process | 1.5 | 3 | 4.5 |
| E2 Application experience | 0.5 | 3 | 1.5 |
| E3 OO/web framework experience | 1 | 4 | 4 |
| E4 Lead analyst capability | 0.5 | 3 | 1.5 |
| E5 Motivation | 1 | 5 | 5 |
| E6 Stable requirements | 2 | 2 | 4 |
| E7 Part-time staff (negative factor) | -1 | 0 | 0 |
| E8 Difficult programming language (negative factor) | -1 | 1 | -1 |
| **ΣEFactor** | | | **19.5** |

EF = 1.4 + (-0.03 × 19.5) = **0.815**

Ratings that changed materially, briefly justified:
- **E6 Stable requirements (rated 2, down from 3)** — a multi-tenant marketplace has more moving parts whose shape can shift once real labs start onboarding (e.g. how pricing tiers or approval rules should work), so requirements are less firmly settled than a single-tenant app's would be at this stage.

### 2.5 Adjusted Use Case Points

`UCP = UUCP × TCF × EF = 147 × 1.00 × 0.815 ≈ 120 UCP`

---

## 3. From UCP to Effort, Person-Hours, and Duration

The textbook default of ~20 person-hours/UCP is calibrated for a larger multi-person team building production-grade enterprise software, including significant coordination overhead. That default is closer to appropriate here than it would be for a single-tenant app, given the added architectural risk of multi-tenancy — but a small, tool-assisted team can still reasonably operate below it. A three-point (PERT-style) range is used instead of a single asserted multiplier, so the uncertainty stays visible:

| Scenario | hrs/UCP | Basis | Effort (120 UCP) |
|---|---|---|---|
| Optimistic | 2.5 | Heavy reuse of scaffolding, hosted auth, ORM tooling, and a well-tested tenant-isolation pattern from day one; no unexpected blockers | 300h |
| Most likely | 3.5 | Normal implementation pace including typical debugging, code review, and stakeholder feedback cycles | 420h |
| Pessimistic | 5.5 | Tenant-isolation bugs discovered late, lab-onboarding workflow requiring rework after stakeholder feedback, integration friction | 660h |

**PERT expected effort = (Optimistic + 4×Most likely + Pessimistic) / 6 = (300 + 4×420 + 660) / 6 ≈ 440 person-hours**

### Full lifecycle rollup

The UCP-derived figure covers design, implementation, and testing of the use-case-shaped functionality. Requirements/planning and deployment/documentation scale with process overhead and the number of distinct role-based surfaces (patient app, lab console, platform-admin console) rather than with use-case count, so they are estimated separately:

| Phase | Estimated effort |
|---|---|
| Requirements & planning | ~16h |
| Design + Implementation + Testing (UCP-derived, PERT-expected) | ~440h |
| Deployment | ~12h |
| Documentation | ~18h |
| **Total (full lifecycle)** | **~486 person-hours** |

### Duration

| Team composition | Estimated duration |
|---|---|
| One developer, full-time (~40h/week) | ~12 weeks (~3 months) |
| One developer, part-time/consulting pace (~20h/week) | ~24 weeks (~6 months) |
| Two-developer team (patient-facing + lab/platform-admin split) | ~6–7 weeks |
| Three-developer team (patient app / lab console / platform-admin + shared backend) | ~4–5 weeks |

**Recommended checkpoint:** at roughly 40% of the estimated core-build effort, review whether the Must-have surface is on track — specifically, whether tenant data isolation (FR27, NFR2) is proven correct under test by that point, since it is the requirement whose failure mode is most severe (a cross-tenant data leak). If isolation testing is not passing cleanly at that checkpoint, treat it as the top priority over any remaining Should-have feature work.

---

## 4. Assumptions

- The developer(s) have working proficiency in the chosen web stack going in, including familiarity with implementing row-level or schema-level multi-tenancy, rather than learning it from zero during the build.
- Requirements are locked prior to implementation start for the Must-have set; the marketplace-specific Should-have items (staff management, platform stats) may still see minor refinement without triggering a full re-estimate.
- Tooling (framework scaffolding, ORM/migrations, managed auth libraries, and an established tenant-scoping pattern) is used rather than building primitives from scratch.
- Cost-effective hosting is acceptable for the initial deployment; no bespoke infrastructure provisioning beyond that.
- The initial release onboards a small number of pilot labs, not an open self-serve marketplace at scale.

## 5. Constraints

- Delivery is scoped to a defined initial release; effort beyond that is a separate future estimate (see `SRS.md` §9).
- A small, dedicated team delivers the initial release — see the team-composition options in §3.
- Hosting is cost-effective/pilot-tier initially, which bounds achievable performance/availability guarantees (see NFR9 in `SRS.md`).
- No budget is allocated for a formal, independent security audit in the initial release; tenant-isolation testing is the highest-priority item within the testing budget that is allocated (see `Testing_Report.md`).

## 6. How This Estimate Shaped Scope

- **Book Appointment** remains the single Complex use case (15 pts), but is now materially riskier than in a single-tenant design because slot-availability checks and clash prevention must be correctly scoped per lab — this kept it Must-have with explicit note that it needs the most testing attention.
- **Search & Compare Labs for a Test**, **Lab Registration/Onboarding**, and **Review & Approve Lab Registration** are the three use cases that exist *because* this is a marketplace rather than a single-tenant app; all three are Must-have, since without them there is no multi-tenant value proposition at all — a lab can't join, an admin can't vet it, and a patient can't discover it.
- Ratings/reviews, real geo-distance search, and richer platform analytics were the clearest candidates for Won't-have: they add UUCW without being necessary for the core "find a lab, compare, book" loop.
- The jump from a single-tenant UCP of ~59 to a multi-tenant UCP of ~120 — roughly 2.0×, not a modest increment — is the direct, traceable consequence of adding a fourth actor and the onboarding/comparison use cases; this is presented explicitly so the effort implication of the multi-tenant pivot is visible rather than absorbed silently into a schedule.
- The tenant-isolation checkpoint in §3 exists because, unlike a feature gap, an isolation failure is a trust-destroying defect for a marketplace — it is treated as the one item that overrides Should-have work if the two compete for time.

## 7. Final Locked-In Scope for the Initial Release

**Committed (Must-have):** patient registration/login, cross-tenant test search and comparison (price/location/turnaround), appointment booking with prep-instruction display and per-lab slot-clash prevention, patient status view, lab staff login and queue/status management scoped to their lab, lab registration and profile management, lab test-offering CRUD, platform-admin lab approval, strict multi-tenant data isolation enforced server-side.

**Stretch (Should-have, built only if Must-have lands ahead of schedule):** result filtering/sorting, lab profile pages, appointment cancellation, staff single-patient detail view, lab staff-account management, lab-level and platform-level stats, lab suspend/reinstate, auditable platform-admin actions.

**Deferred (Could/Won't-have):** reschedule flow, lab ratings/reviews, real geo-distance search, real payment processing, real result values/files, native mobile app, insurance/LIS integrations, advanced analytics dashboards, automated listing review, multi-currency/localisation — all carried forward into the Technical Debt Plan and Future Evolution section.

This scope is the one design and implementation proceed against; any change to it must be re-checked against this estimate before implementation continues.
