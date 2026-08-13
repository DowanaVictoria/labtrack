# Testing Report for MediLab

**Prepared by:** Victoria Dowana (Student ID: 22425077)

Companion to `docs/SRS.md`, `docs/System_Design.md`, and `todo.md`'s Phase 4 checklist. Covers everything actually run and verified, not aspirational coverage.

## 1. Approach

Two complementary layers of automated testing, plus the live/manual verification already performed during Phase 3 implementation (documented inline in `todo.md`, not repeated here):

1. **`scripts/verify-tenant-isolation.ts`** (`npm run verify:tenant-isolation`): a standalone script exercising `src/lib/tenant-scope.ts`'s Prisma Client Extension directly: every model, every operation, cross tenant reads/writes attempted and asserted to fail.
2. **Vitest suite** (`npm test`), added 2026-08-13. Calls the real Server Actions in `src/app/actions/` with a mocked `auth()` session, against the live dev Postgres database (not an in memory fake: Prisma's query builder, the real schema constraints, and `tenant-scope.ts` are all exercised for real). This is the layer that would catch a future action that forgets to route through `requireTenantSession()`/`requirePatientSession()`/`requirePlatformAdminSession()`.

Both layers clean up their own fixtures (`afterAll`/`afterEach`) and were confirmed to leave no residue in the dev database after a run.

3. **System test walkthrough** (2026-08-13): a one off Playwright script driving real Chromium against `next dev` + the live dev DB, exercising the complete lab onboarding to first booking journey across all 4 roles in one continuous run. Installed temporarily and removed afterward (`npm uninstall playwright`), same convention as Phase 3's responsive UI check, see §6.

Not automated as a retained suite: formal usability testing (subjective, needs a human tester, not a pass/fail assertion) and formal UAT. See `docs/Technical_Debt_Plan.md` §8 for the case to make the Playwright suite permanent.

## 2. Test suite inventory

| File | Focus | Cases |
|---|---|---|
| `src/app/actions/__tests__/tenant-isolation.test.ts` | Cross tenant/cross patient isolation at the Server Action layer, across `offerings.ts`, `queue.ts`, `staff.ts`, `lab-profile.ts`, `appointments.ts`, `labs.ts` | 13 |
| `src/app/actions/__tests__/queue-transitions.test.ts` | Sample/status pipeline state machine (`queue.ts`): valid steps, invalid/skipped/reverse transitions, re marking, missing input | 9 |
| `src/app/actions/__tests__/booking-flow.test.ts` | Booking (`booking.ts`): happy path, past date rejection, inactive offering, unapproved lab, double booking | 5 |
| `src/app/actions/__tests__/labs-lifecycle.test.ts` | Lab approval/rejection/suspension/reinstatement (`labs.ts`) + audit log entries (NFR10) | 5 |
| `src/app/actions/__tests__/register.test.ts` | Patient and lab registration (`register.ts`), duplicate email rejection, password hashing round trip | 4 |
| `src/app/actions/__tests__/security.test.ts` | Auth bypass (no session → redirect), injection payload safety | 4 |
| `src/lib/__tests__/rate-limit.test.ts` | Login brute force limiter (the custom logic behind `src/auth.ts`'s `authorize()`) | 4 |
| `src/app/actions/__tests__/test-catalog.test.ts` | Lab admin adding a new test to the catalog (FR28, `tests.ts`): create, case insensitive duplicate rejection, LAB_STAFF forbidden, no session redirect | 4 |
| **Total** | | **48** |

All 48 pass as of 2026-08-13 (`npm test`). `npx tsc --noEmit` and `npm run lint` are both clean, including the new test files.

## 3. Representative test cases

| # | Test case | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| 1 | Lab B staff attempts `updateOffering` on Lab A's offering | Rejected, Lab A's row unchanged | Rejected, row unchanged (verified by re querying the base client) | Pass |
| 2 | Lab A staff runs `markSampleCollected` → `advanceStatus` → `advanceStatus` on its own appointment | BOOKED → SAMPLE_COLLECTED → IN_PROGRESS → COMPLETED, in order | Matched exactly | Pass |
| 3 | `advanceStatus` called on an already COMPLETED appointment | Rejected: no transition past COMPLETED | Rejected, status unchanged | Pass |
| 4 | Patient books the same lab/offering/slot twice | Second attempt rejected ("just taken"), only one row exists | Matched | Pass |
| 5 | Patient books a slot in the past | Rejected by Zod validation before any DB write | Matched | Pass |
| 6 | Platform admin approves an already APPROVED lab | Rejected: must be PENDING; exactly one `APPROVE_LAB` audit log row (the rejected retry didn't log again) | Matched | Pass |
| 7 | `registerPatient` called twice with the same email | Second call rejected, only one `User` row created | Matched | Pass |
| 8 | Any lab scoped action called with no session (`auth()` → `null`) | Redirects to `/login` rather than running the mutation | Matched (asserted via the `NEXT_REDIRECT` digest) | Pass |
| 9 | `updateLabProfile` called with a classic `'; DROP TABLE users; --` payload as the lab name | Stored verbatim as inert text; `users` table unaffected | Matched: Prisma's parameterized query builder means there is no code path where this could execute as SQL | Pass |
| 10 | LAB_STAFF session calls `addStaff` (LAB_ADMIN only action) | Real 403 via `next/navigation`'s `forbidden()` | Matched | Pass |

Full list of all 48 cases is in the test files themselves (each `it(...)` description is written to double as a test log entry).

## 4. Defects found and corrected

| Defect | Found via | Corrective action |
|---|---|---|
| `todo.md` claimed platform admin test catalog CRUD (`createTest`/`updateTest`/`deleteTest`) was implemented and verified; the code doesn't exist. `docs/SRS.md` §5's "Change note (v2.1)" shows this scope (FR23) was deliberately removed, but the checklist line was never updated to match. | Discovered while scoping which Server Actions the tenant isolation suite needed to cover: grepped for the claimed file/functions and found nothing. | Corrected the stale `todo.md` line (struck through, with an explanation) rather than writing tests against code that doesn't exist. No functional defect, just a documentation accuracy one. |

No functional defects were found in the code itself during this round of testing. Every case listed above passed on the first correctly written attempt (a few tests initially had bugs in the *test* itself: a wrong `Decimal.toString()` formatting expectation, a `(labId, testId)` unique constraint collision between two fixture offerings, and `vi.mocked()` fighting an unrelated NextAuth middleware type overload, all fixed in the test code, not the application code).

## 5. Coverage vs. remaining gaps (ties back to `todo.md` Phase 4)

Done: functional test cases (booking, cancel, status update, lab registration, lab approval; search/compare has no server side logic beyond a filtered read, covered by Phase 3's live verification), unit tests (slot availability, status transition rules, tenant scoping filter logic, rate limiter), tenant isolation tests, a light security check (auth bypass, access control, injection payload safety), a full system test walkthrough (§6).

Still open: formal user acceptance testing and a usability check, both of which need a human perspective, not something to assert in code. See `docs/Technical_Debt_Plan.md` for known limitations distinct from untested but working functionality.

## 6. System test: full lab onboarding to first booking walkthrough

One continuous Playwright run against `next dev` (real browser, real dev Postgres DB, real seeded accounts from `npm run db:seed`), covering the exact journey `todo.md`'s Phase 4 line calls for: a new lab registers, a platform admin approves it, the lab admin sets up offerings and staff, a patient finds and books it, lab staff process it through the full status pipeline, and the patient sees the final result.

| # | Step | Result |
|---|---|---|
| 1 | Unauthenticated: submit `registerLab` for a brand new lab | Pass, redirected to `/login?registered=lab` |
| 2 | Platform admin (`admin@labtrack.test`, seeded) logs in | Pass |
| 3 | Platform admin sees the new lab in "Pending lab registrations" and clicks Approve | Pass |
| 4 | Real UI sign out (account menu → "Sign out"), not just a fresh browser context | Pass |
| 5 | New lab admin logs in, `/lab` shows no pending approval banner | Pass |
| 6 | Lab admin adds an offering (CBC, GHS 75, 18h turnaround) via `/lab/offerings` | Pass |
| 7 | Lab admin adds a staff account via `/lab/staff`; "Staff account created" confirmation with credentials shown | Pass |
| 8 | Patient (`patient@labtrack.test`, seeded) logs in, searches "CBC", finds the new lab's offering listed alongside the seeded pilot labs, books a same day slot | Pass |
| 9 | Patient's "My appointments" shows the booking as BOOKED | Pass |
| 10 | New staff account logs in, sees the booking in "Today's queue" | Pass |
| 11 | Staff clicks through the full pipeline: Mark collected → Advance → Complete | Pass |
| 12 | Patient reloads `/patient`; the appointment now shows COMPLETED | Pass |

**12/12 steps passed.** Screenshots captured at each step (kept outside the repo, in the session scratchpad, consistent with Phase 3's screenshots, which also weren't committed).

**Bugs found, both in the test script, not the application:**
1. First run: the script assumed the post login redirect would land role aware users on `/lab` automatically. It doesn't: `/` (home) has no role based auto redirect, it's a plain marketing page. Fixed by navigating to `/lab` explicitly after login rather than waiting for a navigation that was never going to happen.
2. First run's cleanup crashed with a foreign key violation deleting the walkthrough's `Lab` row: `approveLab`'s audit log write (NFR10, `AuditLog.targetLabId`) wasn't accounted for in the teardown order. Fixed by deleting the lab's audit log rows before the `Lab` row itself; the one row orphaned by the crashed first run was cleaned up by hand and confirmed gone.
3. Minor precision issue, not re run for: step 11's wait condition (`getByText("Completed", { exact: false })`, unscoped to the specific appointment row) could in principle resolve early against the dashboard's ever present "COMPLETED" stat tile label rather than the appointment's own status badge, since Playwright's text matching is case insensitive by default, so "Completed" matches "COMPLETED" wherever it appears on the page. The screenshot taken immediately after does show a mid transition loading state rather than the final badge. This does **not** cast doubt on the overall result: step 12, in a separate browser context reloading `/patient` from scratch and scoping its assertion to the specific appointment's list row (`patientPage2.locator("li", { hasText: labName })`), independently confirms the appointment really did reach COMPLETED, visible in its own screenshot. Worth tightening if this script is ever retained (see `docs/Technical_Debt_Plan.md` §8).

No application defects found.
