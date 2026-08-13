# Maintenance & Future Evolution Plan — LabTrack

## 1. Maintenance strategy

**Monitoring.** Vercel's deployment dashboard covers uptime/build failures; there's no application-level error tracking (e.g. Sentry) wired in yet — the nearest thing today is `src/app/error.tsx`'s generic client-facing fallback and Next.js's own server logs. Adding a lightweight error-tracking integration is the single highest-leverage maintenance improvement not yet made (see §2).

**Routine maintenance tasks:**
- Dependency updates: `next`, `next-auth` (still on a beta release — `^5.0.0-beta.32` — worth tracking for a stable v5 release), `prisma`, and `zod` are the ones most likely to ship breaking changes worth reviewing individually rather than blanket-upgrading.
- Database backups: not currently configured — whichever Postgres provider is used in production (Neon/Vercel Postgres per `docs/Testing_Report.md` §6's deployment path) should have point-in-time recovery or scheduled backups enabled before real patient/lab data accumulates.
- Audit log review: `AuditLog` (NFR10) records every lab approval/rejection/suspension — worth a periodic spot-check by the platform admin, since nothing currently alerts on unusual activity there.
- Rate-limiter reset: `src/lib/rate-limit.ts`'s in-memory state resets on every deploy/restart by design (`docs/Technical_Debt_Plan.md` §2) — not an incident, just worth knowing so a "why did the lockout clear" question has a ready answer.

**Who fixes what:** given this is a solo-built pilot (`docs/SRS.md`'s stakeholder list), there's no formal on-call rotation — the practical process is: reproduce, check `docs/Technical_Debt_Plan.md` first (is this a known, accepted gap rather than a bug?), then fix and add a regression test in `src/app/actions/__tests__/` or `src/lib/__tests__/` following the existing pattern (`docs/Testing_Report.md` §1–2) before shipping the fix.

**Regression safety net.** Before merging any change: `npm test` (44+ Vitest cases), `npm run verify:tenant-isolation`, `npx tsc --noEmit`, `npm run lint`. All four are fast (a few seconds combined) and were kept green throughout Phase 3–4 — treat a red result on any of them as blocking, especially `verify:tenant-isolation` given the tenant-isolation guarantee is the system's core risk (`todo.md`'s Project Concept section).

## 2. Near-term technical debt repayment (from `docs/Technical_Debt_Plan.md`)

In rough priority order for a "v1.1":
1. **Simplified result model** (`docs/Technical_Debt_Plan.md` §7) — the biggest functional gap. Add a `Result` model and a lab-staff upload/patient-view flow.
2. **Cancelled slots stay blocked** (§1) — a partial unique index fix, small and self-contained.
3. **Retained E2E test suite** (§8) — reinstall Playwright as a real devDependency (not install-then-remove) and add it to CI, building on the walkthrough script proven out in `docs/Testing_Report.md` §6.
4. Everything else in the debt plan is explicitly "acceptable temporarily" and doesn't need near-term action.

## 3. Future evolution — beyond debt repayment

Roughly in the order the product would naturally grow, referencing the scope explicitly cut in `docs/Effort_Estimation.md` §6:

1. **Real geocoding and distance search** — replace the city-text filter (`docs/Technical_Debt_Plan.md` §4) once the lab count per city grows enough that "nearest" actually matters.
2. **Payment integration** — online checkout at booking time, once off-platform payment (the current model) becomes friction rather than a deliberate simplification.
3. **SMS notifications** — a second channel alongside the existing email path (`src/lib/email.ts`), for patients/staff without reliable email access.
4. **Multi-instance deployment support** — replace the in-memory rate limiter (`docs/Technical_Debt_Plan.md` §2) with a shared store; this is a prerequisite for horizontal scaling, not optional once traffic justifies more than one instance.
5. **Automated lab vetting** — reduce the platform admin's manual, one-at-a-time approval bottleneck (§3) as onboarding volume grows past what one person can review promptly.
6. **Richer platform-admin test-catalog tooling** — `docs/SRS.md` §5's "Change note (v2.1)" deliberately deferred test-catalog CRUD out of scope for the initial release (catalog is fixed, seeded data). Revisit once the catalog needs to grow beyond what a direct DB seed can handle.
7. **Notifications beyond booking/cancellation** — e.g. a reminder before an upcoming appointment, or a nudge to a lab with an aging PENDING sample.

## 4. What would NOT change

The core architectural decisions — shared-DB multi-tenancy with `lab_id` row-level scoping enforced through a single Prisma Client Extension (`src/lib/tenant-scope.ts`), rather than schema-per-tenant — should hold even at meaningfully larger scale (`docs/System_Design.md` §2's rationale doesn't change with growth, only with a much larger number of very large tenants, which isn't this product's shape). Any future evolution should extend that pattern (new lab-scoped models get a `labId` column and a corresponding scoper function) rather than introduce a second, inconsistent access path.
