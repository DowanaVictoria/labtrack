# Technical Debt Plan for MediLab

**Prepared by:** Victoria Dowana (Student ID: 22425077)

Per the exam's explicit emphasis on identifying, prioritising, and managing technical debt (not just building the feature). Every item below is a real, confirmed gap in the current code, cross checked against the source rather than copied from `todo.md`'s original placeholder list (which had drifted stale in at least one place, see `docs/Testing_Report.md` §4).

Classification: **Acceptable temporarily** (fine for a pilot/exam scope release, revisit only if the product grows) · **Scheduled** (known, worth planning for the next iteration) · **Critical** (would block a real production launch).

## 1. Cancelled appointment slots stay permanently blocked

- **Debt:** The `(labId, offeringId, slotDatetime)` unique constraint on `Appointment` (`prisma/schema.prisma`) doesn't exclude `CANCELLED` rows, so once a slot is booked and then cancelled, no one, not even a different patient, can ever rebook that exact slot.
- **Cause:** The DB level uniqueness check is a simple 3 column constraint; excluding a status would need a partial unique index (`WHERE status != 'CANCELLED'`), which Prisma's schema DSL doesn't express directly (would need a raw migration).
- **Impact:** Growing, silent inventory loss, since every cancellation permanently removes a bookable slot. Low severity at pilot scale (few labs, few slots/day), compounds over time.
- **Priority:** Scheduled.
- **Proposed resolution:** Add a partial unique index via a raw SQL migration (`CREATE UNIQUE INDEX ... WHERE status != 'CANCELLED'`), or drop `slotDatetime` uniqueness entirely in favor of an application level availability check (already exists as a secondary check in `booking.ts`) plus optimistic concurrency handling for the race case.

## 2. Login rate limiter is in memory, per process

- **Debt:** `src/lib/rate-limit.ts`'s brute force guard (5 attempts/15min) stores state in a `Map` inside the Node process.
- **Cause:** Deliberate pilot scale simplification, documented inline in the source (NFR8), to avoid standing up Redis or similar for a single instance deployment.
- **Impact:** Resets on every redeploy; doesn't share state across multiple instances behind a load balancer, so an attacker distributed across instances isn't actually rate limited. No impact at single instance pilot scale.
- **Priority:** Acceptable temporarily; **Critical** if deployed behind more than one instance.
- **Proposed resolution:** Swap the `Map` for a shared store (Redis, or the DB itself) keyed the same way (by email) before any multi instance deployment.

## 3. Manual, one at a time lab approval

- **Debt:** Platform admin approves/rejects/suspends labs individually through `/admin`; there's no bulk action, no automated vetting (e.g. business registration verification), no SLA/reminder system for a lab stuck pending.
- **Cause:** Out of scope for the 48 hour build; `docs/Effort_Estimation.md` explicitly cut automation here to protect the core marketplace/booking flow.
- **Impact:** Doesn't scale past a handful of pending labs; acceptable for a pilot with a small, known set of onboarding labs.
- **Priority:** Acceptable temporarily.
- **Proposed resolution:** Bulk approve UI and/or an automated document verification step, once onboarding volume justifies it.

## 4. Location matching is city text, not real geocoding

- **Debt:** Patient search filters labs by a plain case insensitive substring match on `city` (`src/app/patient/page.tsx`), not distance/geocoding.
- **Cause:** Documented, deliberate scope decision in `docs/SRS.md` §8 for the initial release.
- **Impact:** A patient can't sort/filter by "nearest," and typos or alternate spellings of a city name won't match. Acceptable when the lab count per city is small (a pilot's reality); becomes a real usability gap at scale.
- **Priority:** Acceptable temporarily.
- **Proposed resolution:** Integrate a geocoding provider, store lab lat/lng, sort search results by distance.

## 5. SMS notifications not implemented (email exists)

- **Debt:** Only email notifications exist (`src/lib/email.ts`, Gmail SMTP), for staff account creation, appointment booking, and cancellation. There is no SMS channel.
- **Cause:** `todo.md`'s original placeholder for this line read "no email/SMS notifications (in app status only)"; that was already stale by the time Phase 4 started, since email was built during Phase 3. Corrected here.
- **Impact:** Patients/staff without reliable email access (or who'd prefer SMS) get no notification. Low impact at pilot scale.
- **Priority:** Acceptable temporarily.
- **Proposed resolution:** Add an SMS provider (Twilio or similar) as a second notification channel alongside the existing email path, reusing the same "best effort, never blocks the underlying action" pattern already established in `email.ts`.

## 6. No real payment integration

- **Debt:** `LabTestOffering.price` is informational only; there's no checkout, payment capture, or refund flow anywhere in the app.
- **Cause:** Out of scope by design. `docs/Effort_Estimation.md`'s locked in scope treats MediLab as a booking/comparison marketplace, with payment handled off platform (at the lab, in person) for the initial release.
- **Impact:** None currently, since this was never promised functionality, not a regression.
- **Priority:** Acceptable temporarily (would become Scheduled the moment online payment becomes an actual product requirement).
- **Proposed resolution:** Integrate a payment provider (Stripe or similar) at checkout time in the booking flow, if/when in platform payment becomes a requirement.

## 7. Simplified result model: status only, no real lab values or files

- **Debt:** `Sample` (`prisma/schema.prisma`) tracks `collectedAt`, `collectedByStaffId`, and free text `notes`, with no structured result values and no file/PDF attachment for an actual lab report.
- **Cause:** Scope cut in `docs/Effort_Estimation.md`. Full result modeling (per test type structured values, file storage, patient facing result viewer) was judged too large for the 48 hour window relative to the core booking/marketplace flow.
- **Impact:** A patient sees status progress ("Completed") but not their actual result through the platform, so they'd still need to collect it from the lab directly. This is the single biggest functional gap relative to a real product.
- **Priority:** Scheduled, the natural next major feature.
- **Proposed resolution:** Add a `Result` model (structured value fields per test category, or a file upload path for a lab issued PDF/report), a lab staff upload flow, and a patient facing result view, gated the same way `Sample` already is (transitively through `Appointment.labId`).

## 8. Automated test coverage: strong at the action/unit layer, absent at the browser/system layer

- **Debt:** `docs/Testing_Report.md` documents 48 passing automated tests (unit, functional, integration, tenant isolation, light security) at the Server Action layer, but there is no automated system/E2E test suite (real browser, real click through across all 4 roles) and no formal UAT or usability testing. Phase 3's UI verification used Playwright, but only as a one off manual check (installed temporarily, removed afterward), not a retained suite.
- **Cause:** Time boxed exam scope. Action layer testing was judged the higher leverage investment (it's what actually caught the `todo.md`/FR23 documentation drift and would catch a tenant isolation regression), given 48 hours total.
- **Impact:** A regression purely in rendering/client side interaction (not server logic) wouldn't be caught by any automated check currently in the repo.
- **Priority:** Scheduled.
- **Proposed resolution:** Reinstall Playwright as a retained devDependency (not install then remove) and add a small E2E suite covering one full journey per role, run in CI.

## 9. New test catalog entries have no database level duplicate guard

- **Debt:** `createTest` (`src/app/actions/tests.ts`, FR28) checks for a case insensitive duplicate test name before creating one, but that check runs in application code against a plain `findFirst`, not a database unique constraint on `Test.name`. Two concurrent submissions of the same test name from two different labs could both pass the check and create duplicate rows.
- **Cause:** Adding a real DB level unique index requires a schema migration against the live production database, which wasn't run as part of this fix; the application level check was judged sufficient to catch the common case (one lab admin submitting a name that already exists) even though it doesn't close the race condition.
- **Impact:** Low at pilot scale, since two lab admins creating the identical test name in the same instant is unlikely, but the guarantee is genuinely weaker than the rest of the schema, where uniqueness (e.g. `(labId, testId)` on offerings) is enforced by Postgres itself, not application code.
- **Priority:** Acceptable temporarily; Scheduled once more than a couple of labs are actively using this feature.
- **Proposed resolution:** Add `@@unique([name])` (or a case insensitive functional index) to the `Test` model in `prisma/schema.prisma` and run a migration, then let the database itself be the backstop instead of the `findFirst` check alone.

## Summary table

| # | Debt | Priority |
|---|---|---|
| 1 | Cancelled slots stay blocked | Scheduled |
| 2 | In memory, per process rate limiter | Acceptable temporarily (Critical if multi instance) |
| 3 | Manual lab approval | Acceptable temporarily |
| 4 | City text location matching | Acceptable temporarily |
| 5 | No SMS (email only) | Acceptable temporarily |
| 6 | No payment integration | Acceptable temporarily |
| 7 | Simplified result model | Scheduled |
| 8 | No retained E2E/system test suite | Scheduled |
| 9 | New test catalog entries: no DB level duplicate guard | Acceptable temporarily |
