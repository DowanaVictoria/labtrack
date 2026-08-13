# Project Checklist — LabTrack: Multi-Tenant Diagnostic Lab Marketplace & Appointment Platform

## Project Concept

**Problem:** Patients seeking a diagnostic lab test have no way to see, in one place, which labs offer it, at what price, in what location, or with what turnaround time — they must shop around lab by lab. Independent labs have no shared channel to reach new patients or a modern booking system.

**Solution:** A multi-tenant marketplace platform. Labs (tenants) register, list their test offerings and pricing, and manage their own staff and appointment queue. Patients search a standardized test catalog, compare offering labs (price/location/turnaround), and book an appointment directly with the lab of their choice, then track sample status (Booked → Sample Collected → In Progress → Completed). A platform admin onboards/approves labs and curates the shared test taxonomy that makes cross-lab comparison possible.

**Roles:** Patient · Lab Staff · Lab Admin (Tenant Admin) · Platform Admin

**Core entities:** User (role: patient/lab_staff/lab_admin/platform_admin, with a lab_id for lab-scoped roles), Lab (tenant: name, address, contact, approval status), Test (platform-level standardized catalog: name, category, sample type), LabTestOffering (lab_id + test_id, price, turnaround time, prep instructions), Appointment (patient, lab, offering, slot datetime, status), Sample (linked to appointment, collected\_at, status)

**Key architectural shift from a single-lab design:** every lab-scoped table carries a `lab_id`, and every query touching lab-scoped data must be tenant-filtered server-side — this is the system's central risk (see `docs/Effort_Estimation.md` §3 tenant-isolation checkpoint) and needs to be a first-class concern in Phase 2 design, not bolted on later.

---

## Phase 1 — Planning & Requirements ✅ DONE

- [x] Write problem statement & confirm intended users (patients, lab staff, admin) → `docs/SRS.md` §2
- [x] Identify stakeholders (patients, lab technicians, lab admin/owner, regulatory/privacy angle as NFR context) → `docs/SRS.md` §3
- [x] Gather & list functional requirements (register/login, browse tests, book appointment, view prep instructions, cancel/reschedule, staff: view day's schedule, mark sample collected, update status, admin: manage test catalog, view basic stats) → `docs/SRS.md` §5
- [x] Gather & list non-functional requirements (data privacy of patient info, responsiveness, basic performance under a few concurrent bookings, availability) → `docs/SRS.md` §6
- [x] Prioritise requirements (MoSCoW: Must/Should/Could/Won't for the initial release) → `docs/SRS.md` §7
- [x] Draft SRS document → `docs/SRS.md`
- [x] Select & justify effort estimation technique (Use Case Points) → `docs/Effort_Estimation.md` §1
- [x] Produce estimate: effort, person-hours, duration, assumptions, constraints → `docs/Effort_Estimation.md` §2–5
- [x] Explain how the estimate shaped scope (what got cut to "Won't have") → `docs/Effort_Estimation.md` §6
- [x] Write down final locked-in scope for the initial release → `docs/Effort_Estimation.md` §7

## Phase 2 — Analysis & Design ✅ DONE

- [x] System architecture diagram (client–server / 3-tier: front-end, API, DB) showing tenant-scoping at the data-access layer → `docs/System_Design.md` §3
- [x] Decide & document multi-tenancy data model approach (shared DB with `lab_id` column + row-level filtering vs. schema-per-tenant) and why → `docs/System_Design.md` §2
- [x] Use-case diagram (Patient, Lab Staff, Lab Admin, Platform Admin actors) → `docs/System_Design.md` §4
- [x] Class diagram (User, Lab, Test, LabTestOffering, Appointment, Sample) → `docs/System_Design.md` §5
- [x] Sequence diagram: lab onboarding (Lab Admin registers → Platform Admin approves → Lab appears in search) → `docs/System_Design.md` §6
- [x] Sequence diagram: core booking flow (Patient searches/compares → books with a Lab → Lab Staff collects sample → status updates → Patient sees status) → `docs/System_Design.md` §7
- [x] ER / database diagram (users, labs, tests, lab_test_offerings, appointments, samples) with `lab_id` foreign keys marked → `docs/System_Design.md` §8
- [x] UI wireframes (patient search/compare, patient booking flow, lab staff dashboard, lab admin console, platform admin console) → `docs/System_Design.md` §9
- [x] Define technology stack (front-end / back-end / DB / hosting choice) and confirm it supports server-side tenant filtering cleanly → `docs/System_Design.md` §1
- [ ] Pre-identify likely technical debt sources (see Phase 4 log) — carried into Phase 4

## Phase 3 — Implementation

- [x] Set up repo, project scaffold, DB schema/migrations (including `lab_id` on all tenant-scoped tables) → `prisma/schema.prisma`, `prisma/migrations/20260812174511_init`
- [x] Implement tenant-scoping enforcement layer (Prisma Client Extension, §2 of `docs/System_Design.md`) → `src/lib/tenant-scope.ts`, verified live via `npm run verify:tenant-isolation`. Audited 2026-08-12: closed a gap where `Appointment.offeringId` could point at another lab's `LabTestOffering` (FK only guaranteed the row existed, not which lab it belonged to) — now checked on create/update via `assertOfferingBelongsToLab`, with `sample.update`/`sample.delete` cross-tenant coverage added to the verify script too
- [x] Implement authentication (patient, lab staff, lab admin, platform admin login) → Auth.js v5 credentials provider, `src/auth.ts`, `src/app/login/`
- [x] Implement authorisation: role-based **and** tenant-scoped — every lab-scoped query filtered server-side, never trusted from the client → `src/lib/session.ts` (`requireTenantSession`/`requirePlatformAdminSession`/`requirePatientSession`), `src/proxy.ts` for optimistic route redirects; verified live end-to-end (login → session → scoped query) for both lab-admin and platform-admin roles
- [x] ~~Implement platform-level test catalog (platform admin CRUD)~~ — **superseded, docs/SRS.md §5 change note (v2.1):** FR23 was removed from scope; the platform admin's job is lab lifecycle only. `Test` is fixed, seeded platform data for the initial release, not admin-editable. This checklist line was stale (described a `src/app/actions/tests.ts` with `createTest`/`updateTest`/`deleteTest` that doesn't exist in the code) — corrected 2026-08-13 while building the tenant-isolation test suite below, which is why it surfaced.
- [x] Implement lab registration/onboarding flow (lab admin submits profile → pending state) → `src/app/actions/register.ts` (`registerLab`, creates Lab+LAB_ADMIN User in one transaction), `src/app/register/`; `/lab` shows a pending/rejected/suspended banner from `lab.status`. Verified live end-to-end: register → pending → login shows banner → platform admin approves → banner clears
- [x] Implement platform admin lab approval/rejection flow → `src/app/actions/labs.ts` (`approveLab`/`rejectLab`), wired into `src/app/admin/page.tsx`; verified live including that a lab_admin session gets `ForbiddenError` calling the action directly (not just page-level gating)
- [x] Implement lab test offerings (lab admin CRUD: attach platform test, set price/turnaround/prep instructions) → `src/app/actions/offerings.ts` (`createOffering`, `updateOffering`), `/lab` add-offering form + inline per-row edit forms. Verified live: add, edit, cross-tenant write blocked (500, data unchanged), duplicate-offering guard returns a clean error instead of a second row
- [x] Implement patient search & cross-tenant comparison view (test → matching lab offerings, price/location/turnaround) → `src/app/patient/page.tsx`, reads the base `prisma` client directly (deliberate — cross-tenant search is the product's core feature, not a scoping bypass), filtered to `active` offerings at `APPROVED` labs
- [x] Implement appointment booking (select lab offering → pick slot → confirm; show prep instructions; enforce per-lab slot-clash prevention) → `src/app/actions/booking.ts` (`bookAppointment`), `src/app/patient/book/[offeringId]/`; added `forPatient(patientId)` to `src/lib/tenant-scope.ts` (scopes Appointment by patientId, derives labId from offeringId server-side rather than trusting the client, blocks every other model). Verified live: search → book → shows in "My appointments"; exact slot re-booked returns a clean "just taken" error (DB unique constraint) with no duplicate row; past-datetime rejected; wrong-role access blocked
- [x] Implement appointment cancel (patient) → `src/app/actions/appointments.ts` (`cancelAppointment`), cancel button on `/patient`'s "My appointments" for BOOKED rows only. Verified live: cancel works, re-cancelling an already-CANCELLED row is rejected, cancelling a COMPLETED appointment is rejected, and a different patient's attempt to cancel someone else's appointment is blocked (500, status unchanged) via the existing `forPatient` scoping. Known limitation carried from the schema: the (labId, offeringId, slotDatetime) unique constraint doesn't exclude CANCELLED rows, so a cancelled slot stays occupied — worth a Phase 4 technical-debt entry, not fixed here since it's a documented design decision (`docs/System_Design.md` §8)
- [x] Implement lab staff dashboard (today's appointments for their lab only, mark sample collected, update status pipeline) → `src/app/actions/queue.ts` (`markSampleCollected`, `advanceStatus`), `/lab` "Today's queue" filtered to the local day + read-only "Upcoming (later)" list. Status pipeline BOOKED → SAMPLE_COLLECTED → IN_PROGRESS → COMPLETED enforced server-side (NEXT_STATUS map), not just by which button is shown. Verified live end-to-end through all three transitions, invalid transitions rejected (advance-from-COMPLETED, re-mark-collected), cross-tenant action blocked. Found and fixed a real deadlock along the way: wrapping the Sample-create + status-update in an explicit `db.$transaction` timed out, because `tenant-scope.ts`'s cross-lab validation hooks query the base `prisma` client from inside the extension handler, which can't resolve while `tx` holds the transaction open — replaced with a single atomic nested write (`appointment.update({ data: { sample: { create } } } })`) and documented the trap in `tenant-scope.ts`
- [x] Implement patient status view across all their appointments/labs → covered by the "My appointments" section on `src/app/patient/page.tsx`
- [x] Input validation (booking form, offering form, lab registration form, auth forms) → added Zod (matches the pattern the bundled Next.js docs recommend), `src/lib/validation.ts`'s `parseForm()` helper, applied to `login`, `registerLab`, `createOffering`/`updateOffering`, `bookAppointment`. Real gap closed, not just formalized: email format was never validated server-side before (a malformed email on login/register previously fell through to a generic auth failure or was accepted outright) — now rejected immediately with a specific message. Also added length/range limits that didn't exist before (price ≤ 1,000,000, turnaround ≤ 2000h, prep instructions ≤ 500 chars, name/address/city length bounds). Verified live for all four forms with real invalid input (bad email format, too-short lab name, oversized price, 600-char prep text, garbage date string, past date) — every case rejected with the correct message and confirmed no row was written
- [x] Error handling (invalid slot, double-booking, unauthorised access attempts, cross-tenant access attempts) → two-tier fix. (1) Access-control: `src/lib/session.ts`'s three `requireXSession()` guards now call `next/navigation`'s `forbidden()` instead of throwing, rendering `src/app/forbidden.tsx` with a real HTTP 403 (enabled via `experimental.authInterrupts` in `next.config.ts`) — verified live, status code confirmed. (2) Business-rule failures (invalid status transition, cross-tenant write rejected, stale-page race, FK-in-use delete): converted every remaining plain `<form action={fn}>` to the `useActionState` inline-error pattern already used by login/register/booking — `queue.ts`, `appointments.ts`, `offerings.ts`'s `updateOffering`, `tests.ts`'s `updateTest`/`deleteTest`, with new small client wrapper components per row (`EditOfferingForm`, `QueueActionForm`, `CancelAppointmentForm`, `TestRowForm`). Added `src/app/error.tsx` as a generic safety net for anything still unhandled. Verified live: a race (button captured while BOOKED, status changed to CANCELLED before submit) now returns 200 with an inline "may be out of date" message instead of a 500; a cross-tenant offering write returns 200 with an inline "may no longer exist" message instead of crashing. `labs.ts`'s `approveLab`/`rejectLab` left on the generic safety net — its only failure modes are the now-handled `forbidden()` case and an unreachable-from-the-UI missing-labId case, not worth the churn
- [x] Security controls (password hashing, protected routes, no sensitive data leakage in API responses, no cross-tenant data leakage in API responses) → password hashing (bcrypt), protected routes (`proxy.ts` + `requireXSession()`), and no cross-tenant leakage were already covered by earlier work. Added this round: (1) login brute-force protection — `src/lib/rate-limit.ts` (in-memory sliding window, 5 attempts/15min, keyed by email), wired into `src/auth.ts`'s `authorize()`; state is per-process, documented as a pilot-scale limitation (NFR8) not a production-scale one. (2) Security response headers in `next.config.ts` — CSP (Next's documented "without nonces" baseline, appropriate since this app loads no third-party scripts), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Strict-Transport-Security. (3) Verified `GET /api/auth/session` exposes only name/email/id/role/labId — no `passwordHash`, no other users' data. Verified live: confirmed 6th login attempt is blocked even with the *correct* password (proves the limiter, not luck) while a different account logs in normally in parallel (proves it's per-email, not global); confirmed all headers present on responses; confirmed login and a real Server Action mutation both still work end-to-end with the CSP active. Residual, disclosed risk: CSP enforcement is client-side (browser), and this session has no real browser available to verify client-side JS/hydration isn't subtly affected — only that pages load, headers are correct, and server-side form submission (which works without JS via progressive enhancement) is unaffected
- [x] Responsive UI (mobile + desktop check) across patient, lab, and platform-admin surfaces → verified with real rendered screenshots (Playwright + Chromium, installed temporarily for this check and removed afterward — not a permanent dependency), not just CSS review, at 375×812 (mobile) and 1280×900 (desktop) for every page: home, login, register, `/lab`, `/admin`, `/patient`, `/patient/book/[offeringId]`. Found and fixed two real issues: (1) every page used a flat `p-16` (64px) container padding, leaving only ~247px of usable width on a 375px screen — changed to `p-4 sm:p-8 lg:p-16` across all seven pages so desktop is pixel-identical to before and mobile gets real breathing room. (2) list rows pairing descriptive text with an action button (`/lab`'s queue, `/admin`'s pending labs, `/patient`'s offerings and appointments) used a fixed `flex items-center justify-between` with no wrap, cramping the button against the text on narrow screens — changed to `flex-col sm:flex-row` so they stack on mobile and sit side-by-side from `sm:` up. Multi-field forms (offering/test edit rows) already used `flex-wrap` and needed no changes. Confirmed via screenshots that desktop layouts are unchanged and mobile layouts have no horizontal overflow, cramping, or clipped content
- [x] Visual design pass (not an exam checklist line item, requested directly) → replaced the bare-bones unstyled UI with a real design system: `src/components/ui/` (`Button` with primary/secondary/danger/ghost variants, `StatusBadge` for appointment/lab statuses, `Card`, `PageShell`, shared `field.ts` input/label classes) plus a shared `AppHeader` for the three authenticated dashboards. Rebuilt all 9 pages and every form component on top of it — teal/slate palette, dark-mode-aware. Found and fixed a real bug in the process: `globals.css` had a hardcoded `font-family: Arial, Helvetica, sans-serif` on `body` that silently overrode the Geist font already being loaded via `next/font` — the app had been rendering in fallback Arial the whole time. Verified with real rendered screenshots (mobile + desktop, all 9 pages) before/after, plus a live browser functional test (Playwright click on "Mark sample collected", confirmed the status badge updates) to prove the redesigned client components are still interactive, not just visually restyled
- [ ] Continuous smoke-testing as features land, with explicit cross-tenant-isolation checks on every lab-scoped endpoint

## Phase 4 — Testing & Refinement

- [x] Write & run functional test cases (search/compare, booking, cancel, status update, login/logout, lab registration, lab approval) → see `docs/Testing_Report.md` §2 for the full inventory. `src/app/actions/__tests__/booking-flow.test.ts` (booking), `tenant-isolation.test.ts` (cancel, status update), `queue-transitions.test.ts` (status update pipeline), `register.test.ts` (registration + a bcrypt round-trip standing in for login), `labs-lifecycle.test.ts` (lab approval). "search/compare" has no server-side logic beyond a filtered read (`src/app/patient/page.tsx`) — covered by Phase 3's live verification, not re-tested here.
- [x] Unit tests for key logic (slot availability check, status transition rules, tenant-scoping filter logic) → slot availability/double-booking: `booking-flow.test.ts`. Status transition rules (full BOOKED→SAMPLE_COLLECTED→IN_PROGRESS→COMPLETED pipeline, invalid/skipped/reverse transitions): `queue-transitions.test.ts`. Tenant-scoping filter logic: `scripts/verify-tenant-isolation.ts` (DAL level) + `tenant-isolation.test.ts` (action level). Login's custom logic (rate limiter): `src/lib/__tests__/rate-limit.test.ts`.
- [x] **Tenant-isolation tests (highest priority):** attempt cross-tenant reads/writes from a lab staff/admin session against another lab's data on every lab-scoped endpoint; all must fail → `src/app/actions/__tests__/tenant-isolation.test.ts` (`npm test`, Vitest). Complements `scripts/verify-tenant-isolation.ts` (which drives `tenant-scope.ts`'s DAL directly) by instead calling the real Server Actions — `offerings.ts` (create/update), `queue.ts` (markSampleCollected/advanceStatus), `staff.ts` (addStaff/removeStaff), `lab-profile.ts` (updateLabProfile), `appointments.ts` (cancelAppointment) — with a mocked `auth()` session per test, so a regression where an action forgets to route through `requireTenantSession()`/`requirePatientSession()` and hits the base `prisma` client would be caught here even though the DAL itself is sound. 13 cases: cross-tenant attempt rejected + underlying row provably unchanged, own-tenant attempt succeeds, plus role gates (LAB_STAFF blocked from admin-only actions, LAB_ADMIN blocked from platform-admin actions) via `next/navigation`'s real `forbidden()`. Runs against the live dev DB (same as the verify script); fixtures cleaned up in `afterAll`, confirmed no leftover rows after a run. Setup notes for next time: `server-only` isn't a real installable package (Next resolves it via its bundler) — aliased to a local no-op stub in `vitest.config.ts`; `.env` values are double-quoted and Prisma doesn't auto-load `.env` itself, so `vitest.config.ts` parses it manually (strips quotes) into `test.env` rather than mutating `process.env` directly, since the default worker pool doesn't reliably inherit that; `forbidden()` needs `__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS=true` set (mirrors `next.config.ts`'s `experimental.authInterrupts`) or it throws a different "experimental" error instead of a real 403.
- [x] Integration tests (API ↔ DB for booking flow and search/comparison aggregation across labs) → every action-level test in `src/app/actions/__tests__/` runs against the real dev Postgres DB (not a mock), so booking, cancellation, staff management, lab lifecycle, and offerings are all integration-tested by construction. Search/comparison aggregation specifically (the read in `src/app/patient/page.tsx`) is not separately tested — it's a plain Prisma query with no custom logic beyond the documented city-text filter (`docs/Technical_Debt_Plan.md` §4), low risk.
- [x] System test (end-to-end walkthrough all 4 roles, including a full lab-onboarding-to-first-booking journey) → `docs/Testing_Report.md` §6. One continuous Playwright run (installed temporarily, removed afterward — same convention as Phase 3's responsive-UI check) against `next dev` + the live dev DB: register a new lab → platform admin approves → lab admin adds an offering and staff → patient searches, finds, and books it → new staff account processes it through the full status pipeline → patient sees it COMPLETED. 12/12 steps passed, real UI sign-out included (not just fresh browser contexts). Two bugs found and fixed, both in the throwaway test script itself, not the app (a wrong assumption about post-login redirect behavior, and a cleanup ordering bug against `AuditLog`'s FK) — see the report for the full writeup and one remaining test-script precision caveat.
- [ ] User acceptance test (does it solve the stated problem for a patient persona and a lab-admin persona?) — needs a human perspective, not something to assert in code. Remaining Phase 4 item.
- [x] Light security check (auth bypass attempts, SQL/NoSQL injection on forms, access control on routes, tenant-boundary bypass attempts) → `src/app/actions/__tests__/security.test.ts` (auth bypass → redirect to `/login`, injection-payload safety) + `tenant-isolation.test.ts` (access control / tenant-boundary bypass, already itemized above). Confirmed via `grep` that no code path in `src/` or `scripts/` uses `$queryRaw`/`$executeRaw`/`*Unsafe` — every query goes through Prisma's parameterized query builder, which structurally rules out string-built SQL injection.
- [ ] Light usability check — needs a human perspective. Remaining Phase 4 item.
- [x] Document test log: test case / expected / actual / pass-fail / defects / corrective action → `docs/Testing_Report.md`
- [x] Fix critical defects found — treat any tenant-isolation failure as release-blocking → none found; see `docs/Testing_Report.md` §4 (the one defect found was a stale `todo.md` line, not application code)
- [x] Log technical debt items as they're introduced: **Debt → Cause → Impact → Priority → Proposed Resolution** → `docs/Technical_Debt_Plan.md`. Note: this checklist's own placeholder examples had drifted stale too (e.g. "no email/SMS notifications" — email was actually implemented in Phase 3) — corrected in the real doc rather than carried forward blindly.
- [x] Classify each debt item: acceptable temporarily / scheduled / critical → `docs/Technical_Debt_Plan.md`'s summary table
- [ ] Refactor critical areas where feasible — nothing currently classified Critical (see `docs/Technical_Debt_Plan.md` §2's conditional Critical only applies if/when deployed multi-instance); no refactor needed yet.

## Phase 5 — Deployment

- [ ] Deploy app (Vercel/Netlify/Render or similar) with DB provisioned
- [ ] Verify production environment loads correctly
- [ ] Test live application end-to-end (all 4 roles)
- [ ] Verify DB/API connections in production
- [ ] Seed at least 2 pilot labs with distinct offerings, so cross-tenant isolation and search/comparison are demonstrable
- [ ] Create test credentials: patient user, lab staff, lab admin, platform admin
- [ ] Verify source-code repository is accessible to stakeholders

## Phase 6 — Documentation & Delivery

- [x] Write consolidated Project Documentation (all sections — see below) → `docs/Project_Documentation.md`
- [x] Write User Manual (patient flow + staff/admin flow, with screenshots) → `docs/User_Manual.md`, illustrated with real screenshots from the Phase 4 system-test walkthrough (`docs/screenshots/`), not mockups
- [x] Finalise Testing Report → `docs/Testing_Report.md` (includes §6, the system-test walkthrough writeup)
- [x] Finalise Technical Debt Plan (with repayment plan for future versions) → `docs/Technical_Debt_Plan.md`; near-term repayment order folded into `docs/Maintenance_and_Future_Evolution.md` §2
- [x] Finalise Maintenance & Future Evolution Plan → `docs/Maintenance_and_Future_Evolution.md`
- [ ] Verify all live URLs and credentials work (fresh incognito test) — blocked on Phase 5 (live deployment in progress)
- [ ] Package delivery folder: `LabTrack_Delivery/` — blocked on Phase 5 (needs the live URL for `Deployment_and_Source_Links.txt`)
- [ ] Deliver to client/stakeholder — blocked on the above

---

## Project Documentation — Required Sections

All 19 present in `docs/Project_Documentation.md`, each either self-contained or explicitly pointing to its detailed source doc:

- [x] 1. Project title
- [x] 2. Problem statement
- [x] 3. Aim and objectives
- [x] 4. Stakeholders
- [x] 5. Requirements analysis
- [x] 6. SRS
- [x] 7. Software effort estimation
- [x] 8. System analysis
- [x] 9. System design
- [x] 10. Implementation
- [x] 11. Testing
- [x] 12. Technical debt
- [x] 13. Deployment — describes the plan/checklist and current in-progress status honestly; will need the final live URL once Phase 5 completes
- [x] 14. User manual
- [x] 15. Maintenance strategy
- [x] 16. Future evolution
- [x] 17. Limitations
- [x] 18. Conclusion
- [x] 19. References (acknowledge all libraries/frameworks/APIs/datasets used)

## Final Delivery Package

```
LabTrack_Delivery/
├── Project_Documentation.pdf
├── SRS.pdf
├── Testing_Report.pdf
├── Technical_Debt_Plan.pdf
├── User_Manual.pdf
├── Deployment_and_Source_Links.txt
└── Supporting_Files/
```

**Deployment_and_Source_Links.txt** must include:
- [ ] Prepared By
- [ ] Project Title
- [ ] Live Application URL
- [ ] Lab Admin Console URL (if separate)
- [ ] Platform Admin Console URL (if separate)
- [ ] Test Patient Username / Password
- [ ] Test Lab Staff Username / Password
- [ ] Test Lab Admin Username / Password
- [ ] Platform Admin Username / Password
- [ ] Source Code Repository link

## Final Pre-Delivery Checklist

- [x] Realistic problem defined
- [x] Stakeholders/users identified
- [x] Requirements analysis complete
- [x] SRS developed
- [x] Software effort estimated
- [x] Estimation technique justified
- [x] System designed (diagrams selected & produced)
- [ ] Functional application implemented
- [ ] Application tested
- [ ] Test results documented
- [ ] Technical debt identified
- [ ] Technical debt resolution strategies proposed
- [ ] Application deployed
- [ ] Live deployment tested
- [ ] User manual prepared
- [ ] Maintenance strategy prepared
- [ ] Future evolution plan prepared
- [ ] Source-code repository provided
- [ ] All URLs and credentials verified
- [ ] Project title and version/reference included
- [ ] All required files packaged and delivered

## Deliverable Coverage Checklist

| Component | Status |
|---|---|
| Requirements Engineering & SRS | [x] |
| Software Effort Estimation | [x] |
| System Analysis & Design | [x] |
| Implementation & Functionality | [ ] |
| Testing & Quality Assurance | [ ] |
| Technical Debt Identification & Management | [ ] |
| Deployment & Accessibility | [ ] |
| Documentation & User Manual | [ ] |
| Maintenance & Future Evolution | [ ] |
