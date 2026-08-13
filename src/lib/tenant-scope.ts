import { prisma } from "@/lib/prisma";

/**
 * Central tenant-isolation enforcement point (docs/System_Design.md §2).
 *
 * `forTenant(labId)` is the ONLY way lab_staff/lab_admin request handlers
 * should touch the database. It wraps the base client so that every read
 * against a lab-scoped model is forced to the caller's own lab, and every
 * write is forced to write into the caller's own lab — a client-supplied
 * labId (or a cross-lab foreign key like appointmentId) can never smuggle
 * a request into another tenant's data, it just yields "not found" instead.
 *
 * Every operation is explicitly categorized below (read / create / update /
 * delete) rather than relying on a catch-all default — an operation this
 * file doesn't recognize (a future Prisma feature, a raw query) is REFUSED,
 * not silently let through unscoped. That asymmetry matters: a scoping bug
 * that's too strict just breaks a feature loudly; one that's too loose
 * leaks another tenant's data silently.
 *
 * `forPatient(patientId)` is the analogous DAL for patients: it scopes
 * Appointment by patientId instead of labId, and refuses every other model
 * outright (patients don't touch Lab/LabTestOffering/Test/Sample through a
 * scoped client — cross-tenant search is a deliberate, separate read path
 * on the base client, filtered by business rules, not an isolation bypass).
 *
 * `unscopedForPlatformAdmin()` is the one deliberate, explicitly-named
 * escape hatch for platform-wide queries. There is no other code path that
 * reaches the database unscoped — grep for `unscopedForPlatformAdmin` to
 * audit every place tenant-scoping is intentionally bypassed.
 */

export class TenantIsolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantIsolationError";
  }
}

const CREATE_OPS = new Set(["create", "createMany", "createManyAndReturn"]);
const UPDATE_OPS = new Set(["update", "updateMany", "updateManyAndReturn", "upsert"]);
const DELETE_OPS = new Set(["delete", "deleteMany"]);
const READ_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "findMany",
  "aggregate",
  "count",
  "groupBy",
]);

// findUnique/update/delete/upsert require a genuine WhereUniqueInput at the
// top level (id, or a compound unique) — extra non-unique fields are allowed
// as siblings, but NOT wrapped in AND/OR, or Prisma rejects the shape.
const UNIQUE_WHERE_OPS = new Set(["findUnique", "findUniqueOrThrow", "update", "delete", "upsert"]);

type AnyArgs = { where?: object; data?: object | object[]; create?: object };

function mergeWhere(operation: string, args: AnyArgs, forced: object): AnyArgs {
  const where = args.where ?? {};
  return {
    ...args,
    where: UNIQUE_WHERE_OPS.has(operation) ? { ...where, ...forced } : { AND: [where, forced] },
  };
}

/** For Lab, LabTestOffering, Appointment, Sample, Test, User — every op not named here is refused. */
type Scoper = (operation: string, args: AnyArgs, query: (args: AnyArgs) => Promise<unknown>) => Promise<unknown>;

// Lab is the tenant root itself: scoped by its own id, not a labId column. A
// lab_admin/staff session never creates or deletes a Lab row through this
// client — registration and deactivation are platform-admin-only flows.
function scopeLab(labId: string): Scoper {
  return async (operation, args, query) => {
    if (!READ_OPS.has(operation) && !UPDATE_OPS.has(operation)) {
      throw new TenantIsolationError(`lab.${operation} is not permitted through a tenant-scoped client`);
    }
    if (UNIQUE_WHERE_OPS.has(operation)) {
      // id is both the unique lookup key AND the forced tenant key here, so
      // the sibling merge used below (`{ ...where, ...forced }`) would let
      // `forced.id` silently clobber a caller-supplied `where.id` instead of
      // rejecting the mismatch — checked explicitly instead.
      const where = (args.where ?? {}) as { id?: string };
      if (where.id !== undefined && where.id !== labId) {
        if (operation === "findUnique") return null;
        throw new TenantIsolationError(`lab.${operation}: not this lab`);
      }
      return query({ ...args, where: { ...where, id: labId } });
    }
    return query(mergeWhere(operation, args, { id: labId }));
  };
}

// LabTestOffering / Appointment: labId is a real column, forced on both the
// read-side where and the write-side data so a caller can't read across
// tenants or write a row into (or out of) another tenant's lab.
//
// `validateData` is an extra hook for fields whose FK alone doesn't say
// enough — e.g. Appointment.offeringId references a real LabTestOffering
// row, but that row could belong to a different lab, and the schema has no
// composite FK to rule that out. Without this, forcing `labId` on the
// Appointment would still let it point at another tenant's offering.
//
// CAUTION: validateData (here and in scopeSample) queries the base `prisma`
// client, not whatever client issued the call. Calling a write that goes
// through validateData from inside an explicit `db.$transaction(async tx =>
// ...)` deadlocks until the interactive-transaction timeout, because that
// base-client query can't complete while tx holds the transaction open. Use
// a nested write (e.g. `appointment.update({ data: { sample: { create } } }
// )`) instead of an explicit transaction when you need this kind of
// atomicity — see src/app/actions/queue.ts for why.
function scopeByLabIdColumn(
  labId: string,
  validateData?: (data: Record<string, unknown>) => Promise<void>,
): Scoper {
  return async (operation, args, query) => {
    if (CREATE_OPS.has(operation)) {
      const items = Array.isArray(args.data) ? args.data : [args.data ?? {}];
      if (validateData) {
        for (const item of items) await validateData(item as Record<string, unknown>);
      }
      const data = Array.isArray(args.data)
        ? items.map((d) => ({ ...d, labId }))
        : { ...items[0], labId };
      return query({ ...args, data });
    }
    if (UPDATE_OPS.has(operation)) {
      const merged = mergeWhere(operation, args, { labId });
      if (merged.data) {
        if (validateData) await validateData(merged.data as Record<string, unknown>);
        merged.data = { ...merged.data, labId };
      }
      if (merged.create) {
        if (validateData) await validateData(merged.create as Record<string, unknown>);
        merged.create = { ...merged.create, labId }; // upsert
      }
      return query(merged);
    }
    if (DELETE_OPS.has(operation) || READ_OPS.has(operation)) {
      return query(mergeWhere(operation, args, { labId }));
    }
    throw new TenantIsolationError(`${operation} is not permitted through a tenant-scoped client`);
  };
}

// Sample carries no labId column — it's scoped transitively through its
// Appointment. Reads/updates/deletes filter via that relation; create is
// checked explicitly since Prisma can't express "the connected appointment's
// labId" as a declarative where on a create.
function scopeSample(labId: string): Scoper {
  return async (operation, args, query) => {
    if (operation === "create") {
      const data = (args.data ?? {}) as {
        appointmentId?: string;
        appointment?: { connect?: { id?: string } };
        collectedByStaffId?: string;
      };
      const appointmentId = data.appointmentId ?? data.appointment?.connect?.id;
      await assertAppointmentBelongsToLab(appointmentId, labId, "sample.create");
      await assertStaffBelongsToLab(data.collectedByStaffId, labId, "sample.create");
      return query(args);
    }
    if (UPDATE_OPS.has(operation)) {
      const data = (args.data ?? {}) as {
        appointmentId?: string;
        appointment?: { connect?: { id?: string } };
        collectedByStaffId?: string;
      };
      const reassignedAppointmentId = data.appointmentId ?? data.appointment?.connect?.id;
      if (reassignedAppointmentId) {
        await assertAppointmentBelongsToLab(reassignedAppointmentId, labId, `sample.${operation}`);
      }
      await assertStaffBelongsToLab(data.collectedByStaffId, labId, `sample.${operation}`);
      return query(mergeWhere(operation, args, { appointment: { labId } }));
    }
    if (DELETE_OPS.has(operation) || READ_OPS.has(operation)) {
      return query(mergeWhere(operation, args, { appointment: { labId } }));
    }
    throw new TenantIsolationError(`sample.${operation} is not permitted through a tenant-scoped client`);
  };
}

// Test is the platform-level catalog (docs/System_Design.md §2 lists it as
// NOT tenant-scoped) — a lab_admin reads it to pick a test to offer, and (as
// of SRS.md FR28) may also CREATE a new catalog entry when the one they need
// doesn't exist yet, so every lab can list tests the seeded catalog didn't
// anticipate. Update/delete stay blocked: editing or removing an entry other
// labs may already depend on is a bigger blast radius than adding one, and
// nothing in the app needs it yet. `createTest` (src/app/actions/tests.ts)
// does a case-insensitive duplicate-name check before creating, since this
// client has no other gate against catalog fragmentation — see
// docs/Technical_Debt_Plan.md for the known gap (app-level check only, no DB
// unique constraint, so a race between two concurrent creates isn't ruled
// out at the database level).
const scopeTest: Scoper = async (operation, args, query) => {
  if (READ_OPS.has(operation) || operation === "create") {
    return query(args);
  }
  throw new TenantIsolationError(`test.${operation} is not permitted through a tenant-scoped client`);
};

// User (FR19): a lab_admin can create/remove LAB_STAFF accounts for their
// own lab. Reads are scoped to the caller's own lab (covers both roles,
// since both live in User with the same labId); create forces both labId
// AND role — a tenant-scoped client can never create a LAB_ADMIN or an
// account for another lab, so this can't be used to self-escalate. Update
// is refused outright: nothing in the app needs it yet, so it's not a path
// worth having open.
function scopeUser(labId: string): Scoper {
  return async (operation, args, query) => {
    if (CREATE_OPS.has(operation)) {
      const items = Array.isArray(args.data) ? args.data : [args.data ?? {}];
      const data = items.map((d) => ({ ...d, labId, role: "LAB_STAFF" }));
      return query({ ...args, data: Array.isArray(args.data) ? data : data[0] });
    }
    if (DELETE_OPS.has(operation)) {
      // role forced into the where too: only a LAB_STAFF row can be deleted
      // this way, never the caller's own admin account or another lab's.
      return query(mergeWhere(operation, args, { labId, role: "LAB_STAFF" }));
    }
    if (READ_OPS.has(operation)) {
      return query(mergeWhere(operation, args, { labId }));
    }
    throw new TenantIsolationError(`user.${operation} is not permitted through a tenant-scoped client`);
  };
}

async function assertAppointmentBelongsToLab(appointmentId: string | undefined, labId: string, context: string) {
  if (!appointmentId) {
    throw new TenantIsolationError(`${context} requires an appointmentId`);
  }
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { labId: true },
  });
  if (!appointment || appointment.labId !== labId) {
    throw new TenantIsolationError(`${context}: appointment does not belong to this lab`);
  }
}

async function assertStaffBelongsToLab(staffId: string | null | undefined, labId: string, context: string) {
  if (staffId === undefined || staffId === null) return; // not set, or being cleared
  const staff = await prisma.user.findUnique({ where: { id: staffId }, select: { labId: true } });
  if (!staff || staff.labId !== labId) {
    throw new TenantIsolationError(`${context}: collectedByStaffId does not belong to this lab`);
  }
}

async function assertOfferingBelongsToLab(data: Record<string, unknown>, labId: string) {
  const offeringId = data.offeringId as string | undefined;
  if (offeringId === undefined) return; // not being set/changed
  const offering = await prisma.labTestOffering.findUnique({
    where: { id: offeringId },
    select: { labId: true },
  });
  if (!offering || offering.labId !== labId) {
    throw new TenantIsolationError("appointment: offering does not belong to this lab");
  }
}

// Patient side of Appointment: scoped by patientId rather than labId — a
// patient reads/writes only their own bookings. `labId` is never trusted
// from the caller here either: it's always re-derived from the offeringId
// being booked, so a patient-scoped client can't be tricked into writing an
// Appointment whose labId and offeringId point at different labs.
//
// Cross-tenant SEARCH (browsing labs/offerings to find something to book) is
// a different concern — it's the platform's core feature, not a scoping
// bypass — and goes through the base `prisma` client directly, filtered by
// business rules (approved labs, active offerings), not through this file.
function scopeAppointmentByPatientId(patientId: string): Scoper {
  return async (operation, args, query) => {
    if (CREATE_OPS.has(operation)) {
      const items = Array.isArray(args.data) ? args.data : [args.data ?? {}];
      const data = [];
      for (const item of items) {
        const labId = await deriveLabIdFromOffering((item as { offeringId?: string }).offeringId);
        data.push({ ...item, patientId, labId });
      }
      return query({ ...args, data: Array.isArray(args.data) ? data : data[0] });
    }
    if (UPDATE_OPS.has(operation)) {
      const merged = mergeWhere(operation, args, { patientId });
      if (merged.data) {
        const offeringId = (merged.data as { offeringId?: string }).offeringId;
        const labId = offeringId !== undefined ? await deriveLabIdFromOffering(offeringId) : undefined;
        merged.data = { ...merged.data, patientId, ...(labId ? { labId } : {}) };
      }
      return query(merged);
    }
    if (DELETE_OPS.has(operation) || READ_OPS.has(operation)) {
      return query(mergeWhere(operation, args, { patientId }));
    }
    throw new TenantIsolationError(`appointment.${operation} is not permitted through a patient-scoped client`);
  };
}

async function deriveLabIdFromOffering(offeringId: string | undefined): Promise<string> {
  if (!offeringId) {
    throw new TenantIsolationError("appointment requires an offeringId");
  }
  const offering = await prisma.labTestOffering.findUnique({ where: { id: offeringId }, select: { labId: true } });
  if (!offering) {
    throw new TenantIsolationError("appointment: offering does not exist");
  }
  return offering.labId;
}

// Everything except Appointment is out of bounds through a patient-scoped
// client — search reads go through the base `prisma` client instead (see
// scopeAppointmentByPatientId's doc comment), so a patient-scoped client
// touching Lab/LabTestOffering/Test/Sample is always a bug, not a valid path.
const blockAllOperations = (modelName: string): Scoper => {
  return async (operation) => {
    throw new TenantIsolationError(`${modelName}.${operation} is not permitted through a patient-scoped client`);
  };
};

export function forTenant(labId: string) {
  const lab = scopeLab(labId);
  const labTestOffering = scopeByLabIdColumn(labId);
  const appointment = scopeByLabIdColumn(labId, (data) => assertOfferingBelongsToLab(data, labId));
  const sample = scopeSample(labId);
  const user = scopeUser(labId);

  return prisma.$extends({
    name: `tenant-scope:${labId}`,
    query: {
      lab: {
        $allOperations: ({ operation, args, query }) => lab(operation, args as AnyArgs, query as never),
      },
      labTestOffering: {
        $allOperations: ({ operation, args, query }) =>
          labTestOffering(operation, args as AnyArgs, query as never),
      },
      appointment: {
        $allOperations: ({ operation, args, query }) => appointment(operation, args as AnyArgs, query as never),
      },
      sample: {
        $allOperations: ({ operation, args, query }) => sample(operation, args as AnyArgs, query as never),
      },
      test: {
        $allOperations: ({ operation, args, query }) =>
          scopeTest(operation, args as AnyArgs, query as never),
      },
      user: {
        $allOperations: ({ operation, args, query }) => user(operation, args as AnyArgs, query as never),
      },
    },
  });
}

export function forPatient(patientId: string) {
  const appointment = scopeAppointmentByPatientId(patientId);
  const blockLab = blockAllOperations("lab");
  const blockLabTestOffering = blockAllOperations("labTestOffering");
  const blockSample = blockAllOperations("sample");
  const blockTest = blockAllOperations("test");

  return prisma.$extends({
    name: `patient-scope:${patientId}`,
    query: {
      appointment: {
        $allOperations: ({ operation, args, query }) => appointment(operation, args as AnyArgs, query as never),
      },
      lab: { $allOperations: ({ operation, args, query }) => blockLab(operation, args as AnyArgs, query as never) },
      labTestOffering: {
        $allOperations: ({ operation, args, query }) =>
          blockLabTestOffering(operation, args as AnyArgs, query as never),
      },
      sample: {
        $allOperations: ({ operation, args, query }) => blockSample(operation, args as AnyArgs, query as never),
      },
      test: {
        $allOperations: ({ operation, args, query }) => blockTest(operation, args as AnyArgs, query as never),
      },
    },
  });
}

export function unscopedForPlatformAdmin() {
  return prisma;
}
