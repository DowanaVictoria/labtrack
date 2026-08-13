# MediLab — Project Documentation

**Prepared by:** Victoria Dowana
**Course:** CSCD 602 — Advanced Software Engineering (Examiner: Prof. Solomon Mensah)
**Date:** 2026-08-13

This is the consolidated project document tying together every artifact produced across all six phases. Detailed material lives in its own file (linked throughout) — this document is the narrative that connects them, not a duplicate.

---

## 1. Project Title

**MediLab — Multi-Tenant Diagnostic Lab Marketplace & Appointment Platform**

## 2. Problem Statement

Patients seeking a diagnostic lab test have no way to see, in one place, which labs offer it, at what price, in what location, or with what turnaround time — they must shop around lab by lab, with no price transparency. Independent labs have no shared channel to reach new patients and manage bookings with ad hoc, non-digital methods.

Full statement: `docs/SRS.md` §2.

## 3. Aim and Objectives

**Aim:** build a functional, deployable multi-tenant marketplace where diagnostic labs list test offerings and patients search, compare, and book across all participating labs from a single platform — while demonstrating sound, systematic software engineering practice across the full lifecycle within a 48-hour exam window.

**Objectives:**
- Give patients a single place to compare price, location, and turnaround time across labs for a given test, and to track a booking through to completion.
- Give labs a modern booking/queue system and a channel to reach patients beyond their existing walk-in base, without losing control of their own pricing, staff, and catalog.
- Give a platform admin a governance point for lab onboarding and lab-lifecycle management.
- Make **tenant isolation** — no lab can ever read or write another lab's data — the system's central, first-class engineering concern, not an afterthought (`todo.md`'s Project Concept section).
- Apply requirements engineering, effort estimation, design, implementation, testing, deployment, documentation, maintenance, and future-evolution planning as a connected whole, with particular rigor on effort estimation and technical-debt management per the exam's stated emphasis.

## 4. Stakeholders

| Stakeholder | Role | Primary interest |
|---|---|---|
| Patient | End user | Finding the right test at the right price/location; tracking booking status |
| Lab Staff | Operational user, scoped to one lab | Predictable daily queue, fast status updates |
| Lab Admin (Tenant Admin) | Manages one lab's presence | Accurate profile, pricing control, staff management, visibility into bookings |
| Platform Admin | Operates the marketplace | Trustworthy lab onboarding/vetting, platform-wide health |

Out of scope as direct system actors: insurers, referring physicians, lab equipment/LIS integrations (see §16 Future Evolution). Full detail: `docs/SRS.md` §3.

## 5. Requirements Analysis

Functional requirements span four actor groups (Patient discovery/booking; Lab Staff; Lab Admin; Platform Admin) plus cross-cutting system requirements — 27 functional requirements in total, prioritised MoSCoW. Non-functional requirements (10 total) center on security/tenant-isolation (NFR1, NFR2, NFR7 — Must/Should), responsiveness (NFR5 — Must), data-integrity of the status pipeline (NFR6 — Must), and auditability (NFR10 — Should). Full requirement tables, MoSCoW breakdown, and the explicit Won't-have list (deferred scope, tracked forward into `docs/Technical_Debt_Plan.md` and §16 below): `docs/SRS.md` §5–§7.

## 6. Software Requirements Specification (SRS)

Full document: `docs/SRS.md` — problem statement, stakeholders, system overview, functional/non-functional requirements, MoSCoW prioritisation, assumptions/dependencies, constraints.

## 7. Software Effort Estimation

**Technique:** Use Case Points (UCP), selected and justified in `docs/Effort_Estimation.md` §1. Actor weighting, use-case weighting, Technical Complexity Factor, and Environmental Factor are computed in §2; the full lifecycle rollup (effort, person-hours, duration, assumptions, constraints) is in §3–§5.

The estimate directly shaped scope: `docs/Effort_Estimation.md` §6 explains what got cut to "Won't have" as a result (matching `docs/SRS.md` §7's Won't-have list), and §7 records the final locked-in scope for the initial release — the scope this build actually delivered against.

## 8. System Analysis

The analysis phase (`docs/SRS.md` combined with `docs/System_Design.md` §1–§2) identified one dominant technical risk ahead of any code being written: **tenant isolation**. Every lab-scoped table needs a `labId` column, and every query touching lab-scoped data must be tenant-filtered server-side — a single missed filter anywhere would leak one lab's data to another. This was flagged in `docs/Effort_Estimation.md` §3 as the highest-severity risk and made the single highest-priority item throughout implementation (§10) and testing (§11).

The second key analysis decision was the multi-tenancy data-model approach itself: shared database/shared schema with row-level `labId` filtering, chosen over schema-per-tenant specifically because the product's core value (cross-tenant search/comparison) requires querying across all tenants in one pass — full rationale in `docs/System_Design.md` §2.

## 9. System Design

Full document: `docs/System_Design.md` — technology stack and rationale (§1), the multi-tenancy decision (§2), 3-tier architecture with tenant-scoping at the data-access layer (§3), use-case diagram for all 4 actors (§4), class diagram (§5), sequence diagrams for lab onboarding (§6) and the core booking flow (§7), ER diagram with `labId` foreign keys marked (§8), and low-fidelity UI wireframes (§9).

**Enforcement mechanism actually implemented:** a single Prisma Client Extension (`src/lib/tenant-scope.ts`) is the only way lab-scoped or patient-scoped code touches the database — every operation on every lab-scoped model is explicitly categorized (read/create/update/delete); an operation the file doesn't recognize is refused outright rather than silently let through unscoped. `unscopedForPlatformAdmin()` is the one deliberate, greppable escape hatch for platform-wide queries.

## 10. Implementation

Stack: Next.js 16 (App Router) + React 19, Prisma 7 + PostgreSQL (`@prisma/adapter-pg`), Auth.js v5 (credentials provider, JWT sessions), Zod validation, Tailwind CSS 4, TypeScript.

Delivered against the SRS's Must/Should scope: authentication and role-based + tenant-scoped authorization; lab registration/onboarding and platform-admin approval/rejection/suspension/reinstatement (with audit logging, NFR10); lab test offerings (lab-admin CRUD); patient cross-tenant search/comparison; appointment booking with server-side slot-availability and double-booking protection; patient cancellation; the lab staff queue with an enforced BOOKED → SAMPLE_COLLECTED → IN_PROGRESS → COMPLETED pipeline; input validation on every form (Zod); layered error handling (real HTTP 403s via `next/navigation`'s `forbidden()`, inline business-rule errors via `useActionState`); security controls (bcrypt password hashing, login rate-limiting, CSP/security response headers); a responsive, mobile-and-desktop-verified UI with a small shared design system (`src/components/ui/`).

One deliberate, documented scope change during implementation: platform-admin test-catalog CRUD (originally SRS FR23) was removed — `docs/SRS.md` §5's "Change note (v2.1)" — in favor of a fixed, seeded test catalog, keeping the platform admin's job to lab-lifecycle governance only. (A stale `todo.md` line describing this as built was found and corrected during Phase 4 — see `docs/Testing_Report.md` §4.)

Full implementation log, including specific bugs found and fixed along the way (e.g. a cross-tenant offering FK gap closed via `assertOfferingBelongsToLab`, a transaction/tenant-scope deadlock trap documented and worked around in `tenant-scope.ts`, a font-loading bug found during the visual-design pass): `todo.md` Phase 3, with inline verification notes on every item.

## 11. Testing

Full document: `docs/Testing_Report.md`. Summary:

- **44 automated Vitest tests** across 7 files: tenant-isolation at the Server Action layer (13 — complementing `scripts/verify-tenant-isolation.ts`'s DAL-level check), status-pipeline unit tests (9), booking functional/integration tests (5), lab-lifecycle tests with audit-log verification (5), registration tests (4), a light security check — auth bypass, injection-payload safety (4), and the login rate-limiter's own unit tests (4).
- **A full system-test walkthrough** (`docs/Testing_Report.md` §6): one continuous Playwright run driving a real browser through the complete lab-onboarding-to-first-booking journey across all 4 roles — 12/12 steps passed. Screenshots in `docs/screenshots/`, reused in `docs/User_Manual.md`.
- **One defect found:** a stale `todo.md` documentation claim (§10 above) — not an application defect. No functional defects were found in the application code itself during Phase 4.
- **Not yet done:** formal user acceptance testing and a usability check — both need a human tester rather than something a script can assert (`docs/Testing_Report.md` §5).

## 12. Technical Debt

Full document: `docs/Technical_Debt_Plan.md` — 8 debt items, each verified against the actual code (not guessed), classified acceptable-temporarily / scheduled / critical, with cause, impact, and a proposed resolution for each. Headline items: cancelled appointment slots stay permanently blocked (scheduled); the login rate limiter is in-memory/per-process (critical only if deployed multi-instance); the result model is status-only, no structured values or files (scheduled — the largest functional gap relative to a full product); no retained end-to-end test suite (scheduled).

## 13. Deployment

Target: Vercel (application) + a managed Postgres provider (Vercel Postgres / Neon), matching `docs/System_Design.md` §1's technology choice.

Deployment checklist (`todo.md` Phase 5): push to the GitHub repository (`DowanaVictoria/labtrack`), link the repo to a Vercel project, provision the production Postgres database, set environment variables (`AUTH_SECRET`, `DATABASE_URL`, `SMTP_USER`/`SMTP_PASSWORD`), run `npx prisma migrate deploy` against the production database, seed at least 2 pilot labs with distinct offerings (`npm run db:seed`) so cross-tenant isolation and search/comparison are demonstrable live, deploy, and verify all 4 roles end-to-end in production.

**Status as of this document:** the application is fully built and tested locally/in a local dev deployment; live production deployment is in progress. See `Deployment_and_Source_Links.txt` in the final delivery package for the live URL and credentials once complete.

## 14. User Manual

Full document: `docs/User_Manual.md` — step-by-step walkthroughs for every role (patient search/compare/book/track/cancel; lab registration and onboarding; lab admin's offerings/staff/profile management; lab staff's daily queue; platform admin's lab review and monitoring), illustrated with real screenshots from the Phase 4 system-test walkthrough rather than mockups.

## 15. Maintenance Strategy

Full document: `docs/Maintenance_and_Future_Evolution.md` §1–§2. Summary: no formal on-call rotation (solo-built pilot) — the working process is reproduce → check whether it's a known, accepted debt item first → fix → add a regression test in the existing Vitest suite. `npm test` + `npm run verify:tenant-isolation` + `npx tsc --noEmit` + `npm run lint` form the regression safety net and should stay green before any change ships, with `verify:tenant-isolation` treated as release-blocking given tenant isolation is the system's core guarantee.

## 16. Future Evolution

Full document: `docs/Maintenance_and_Future_Evolution.md` §3–§4. Roughly in order of natural product growth: a structured result model (biggest gap), real geocoding/distance search, online payment, SMS notifications, multi-instance-ready rate limiting, automated lab vetting, and richer test-catalog tooling if/when the fixed seeded catalog stops being enough. The core multi-tenancy architecture (shared DB, `labId` row-level scoping via a single enforcement point) is expected to hold through this growth, not be replaced.

## 17. Limitations

Everything in `docs/Technical_Debt_Plan.md` is a known, disclosed limitation of the initial release, not a hidden gap:
- Cancelled appointment slots can't be rebooked (schema-level, disclosed in `docs/System_Design.md` §8).
- Login rate-limiting is in-memory and per-process — fine for a single-instance pilot, not multi-instance-safe yet.
- Lab approval is manual, one at a time.
- Location search matches by city text, not real distance.
- No SMS channel (email only).
- No in-platform payment.
- Results are tracked as a status only — no structured values or uploaded report files.
- No retained, CI-integrated end-to-end test suite (system testing was a one-off walkthrough, not a permanent regression gate).
- Formal UAT and usability testing were not performed (need a human tester).

## 18. Conclusion

MediLab delivers a working multi-tenant diagnostic-lab marketplace within the exam's 48-hour constraint, built through a full, evidenced software engineering lifecycle: requirements gathered and prioritised before any code was written; effort estimated with Use Case Points and used to actively shape scope (not just recorded after the fact); a multi-tenancy architecture chosen and justified against an explicit alternative; tenant isolation treated as the system's central risk from analysis through a dedicated, layered test suite; 44 automated tests plus a full cross-role system-test walkthrough, all passing; every known limitation disclosed and classified rather than hidden. The one documentation drift found during the project (a stale `todo.md` claim) was caught by cross-checking against the actual code rather than trusted at face value — itself a small demonstration of the kind of engineering discipline the exam asks for.

## 19. References

**Frameworks/libraries** (see `package.json` for exact versions): Next.js, React, Prisma (`@prisma/client`, `@prisma/adapter-pg`), Auth.js (`next-auth`), Zod, Tailwind CSS, bcryptjs, Nodemailer, TypeScript, ESLint (`eslint-config-next`), Vitest, tsx.

**Services:** PostgreSQL (production: Vercel Postgres / Neon), Vercel (hosting), Gmail SMTP (outbound email via Nodemailer), Playwright + Chromium (used temporarily for the Phase 3 responsive-UI check and the Phase 4 system-test walkthrough; not a retained runtime dependency).

**Datasets:** none — the seeded test catalog (`scripts/seed.ts`) is originally authored placeholder data (Lipid Panel, CBC, Malaria Test), not sourced from an external dataset.

**Course materials:** `CSCD 602 Advanced Software Engineering Project Exams.md` — the examination brief this entire project answers to.
