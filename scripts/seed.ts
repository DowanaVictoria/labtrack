// Seeds a realistic multi-city, multi-category, multi-lab dataset so every
// redesigned page (UI_REDESIGN_PLAN.md §11) can be visually verified against
// varied data instead of the original 2-city/2-offering set. Existing seed
// IDs/emails are kept stable and idempotent (`upsert` on fixed `seed-*` ids)
// — this only adds rows, never renumbers or removes what was already there
// (UI_REDESIGN_PLAN.md §10). Run with: npm run db:seed
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const PASSWORD = "password123";

// One canonical spelling per city/area, reused consistently everywhere below
// — seeding both "Accra" and "accra" as if they were different places would
// make the free-text city filter's demo look broken (UI_REDESIGN_PLAN.md §8/§11).
const CITY = {
  osu: "Osu (Accra)",
  eastLegon: "East Legon (Accra)",
  airport: "Airport Residential Area (Accra)",
  tema: "Tema",
  kumasi: "Kumasi",
  takoradi: "Takoradi",
  capeCoast: "Cape Coast",
  tamale: "Tamale",
} as const;

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ---------------------------------------------------------------------
  // Test templates — Test is now per-lab (SRS.md FR28 change note), not a
  // shared platform catalog, so these definitions are no longer created
  // directly. They're reused as templates below: each lab that offers a
  // given test gets its own Test row cloned from the matching template, so
  // e.g. "Lipid Panel" ends up as 4 separate database rows (one per lab that
  // offers it), each independently owned and invisible to other labs.
  // ---------------------------------------------------------------------
  const testDefs = [
    {
      id: "seed-test-lipid-panel",
      name: "Lipid Panel",
      category: "Blood",
      sampleType: "Serum",
      description: "Measures cholesterol and triglycerides.",
    },
    {
      id: "seed-test-cbc",
      name: "CBC",
      category: "Blood",
      sampleType: "Whole blood",
      description: "Complete blood count.",
    },
    {
      id: "seed-test-malaria",
      name: "Malaria Test",
      category: "Blood",
      sampleType: "Whole blood",
      description: "Rapid diagnostic test for malaria parasites.",
    },
    {
      id: "seed-test-glucose-fasting",
      name: "Blood Glucose (Fasting)",
      category: "Blood",
      sampleType: "Serum",
      description: "Measures blood sugar after an overnight fast — used to screen for diabetes.",
    },
    {
      id: "seed-test-hba1c",
      name: "HbA1c",
      category: "Blood",
      sampleType: "Whole blood",
      description: "Average blood sugar over the past 2-3 months.",
    },
    {
      id: "seed-test-urinalysis",
      name: "Urinalysis",
      category: "Urine",
      sampleType: "Urine",
      description: "Screens for infection, kidney issues, and other abnormalities in urine.",
    },
    {
      id: "seed-test-pregnancy-urine",
      name: "Pregnancy Test (Urine)",
      category: "Urine",
      sampleType: "Urine",
      description: "Detects hCG in urine to confirm pregnancy.",
    },
    {
      id: "seed-test-abdominal-ultrasound",
      name: "Abdominal Ultrasound",
      category: "Imaging",
      sampleType: "N/A (imaging study)",
      description: "Ultrasound imaging of abdominal organs.",
    },
    {
      id: "seed-test-chest-xray",
      name: "Chest X-Ray",
      category: "Imaging",
      sampleType: "N/A (imaging study)",
      description: "X-ray imaging of the chest, lungs, and heart.",
    },
    {
      id: "seed-test-ecg",
      name: "ECG",
      category: "Cardiac",
      sampleType: "N/A (procedure)",
      description: "Electrocardiogram — records the heart's electrical activity.",
    },
    {
      id: "seed-test-tsh",
      name: "Thyroid Function Test (TSH)",
      category: "Hormone",
      sampleType: "Serum",
      description: "Measures thyroid-stimulating hormone to assess thyroid function.",
    },
    {
      id: "seed-test-widal",
      name: "Widal Test",
      category: "Microbiology",
      sampleType: "Serum",
      description: "Screens for typhoid fever via antibody agglutination.",
    },
    {
      id: "seed-test-hepatitis-b",
      name: "Hepatitis B Surface Antigen",
      category: "Serology",
      sampleType: "Serum",
      description: "Screens for active Hepatitis B infection.",
    },
    {
      id: "seed-test-hiv-screening",
      name: "HIV Screening",
      category: "Serology",
      sampleType: "Serum",
      description: "Rapid antibody screening test for HIV.",
    },
  ];

  const testTemplatesByKey = Object.fromEntries(testDefs.map((t) => [t.id, t]));

  // ---------------------------------------------------------------------
  // Labs — 8 APPROVED spread across the city list, 2 PENDING (so the admin
  // approval-queue demo stays meaningful). Existing labs keep their ids and
  // gain description/operatingHours; new labs are additive.
  // ---------------------------------------------------------------------
  const labDefs = [
    {
      id: "seed-lab-citylab",
      name: "CityLab Diagnostics",
      address: "1 Main St",
      city: CITY.osu,
      contactEmail: "contact@citylab.test",
      status: "APPROVED" as const,
      description: "A full-service diagnostic lab in the heart of Osu, offering same-day results on most routine tests.",
      operatingHours: "Mon–Sat, 7:00am–7:00pm",
    },
    {
      id: "seed-lab-quicktest",
      name: "QuickTest Labs",
      address: "2 High St",
      city: CITY.tema,
      contactEmail: "contact@quicktest.test",
      status: "APPROVED" as const,
      description: "Fast turnaround diagnostics for Tema and the surrounding industrial area, with an on-site phlebotomy team.",
      operatingHours: "Mon–Fri, 8:00am–6:00pm; Sat, 8:00am–1:00pm",
    },
    {
      id: "seed-lab-medcheck",
      name: "MedCheck Labs",
      address: "3 Ring Rd",
      city: CITY.osu,
      contactEmail: "contact@medcheck.test",
      status: "PENDING" as const,
      description: "A newly registered general diagnostics lab awaiting platform review.",
      operatingHours: "Mon–Sat, 8:00am–6:00pm",
    },
    {
      id: "seed-lab-legon-diagnostics",
      name: "Legon Diagnostics",
      address: "14 University Ave",
      city: CITY.eastLegon,
      contactEmail: "contact@legondiagnostics.test",
      status: "APPROVED" as const,
      description: "Specialist blood and hormone testing serving East Legon's residential and university community.",
      operatingHours: "Mon–Sat, 7:30am–6:30pm",
    },
    {
      id: "seed-lab-airport-health",
      name: "Airport Health Labs",
      address: "9 Liberation Rd",
      city: CITY.airport,
      contactEmail: "contact@airporthealth.test",
      status: "APPROVED" as const,
      description: "Imaging-focused diagnostic centre near Airport Residential Area, with same-day X-ray and ultrasound reporting.",
      operatingHours: "Daily, 6:00am–9:00pm",
    },
    {
      id: "seed-lab-ashanti-medical",
      name: "Ashanti Medical Labs",
      address: "22 Bantama High St",
      city: CITY.kumasi,
      contactEmail: "contact@ashantimedical.test",
      status: "APPROVED" as const,
      description: "Kumasi's longest-running independent diagnostic lab, offering a broad routine test menu at accessible prices.",
      operatingHours: "Mon–Sat, 7:00am–7:00pm",
    },
    {
      id: "seed-lab-western-coast",
      name: "Western Coast Diagnostics",
      address: "5 Harbour Rd",
      city: CITY.takoradi,
      contactEmail: "contact@westerncoast.test",
      status: "APPROVED" as const,
      description: "Serving Takoradi's port community with rapid screening and microbiology testing.",
      operatingHours: "Mon–Fri, 8:00am–6:00pm; Sat, 9:00am–2:00pm",
    },
    {
      id: "seed-lab-cape-coast-clinical",
      name: "Cape Coast Clinical Labs",
      address: "11 Castle Rd",
      city: CITY.capeCoast,
      contactEmail: "contact@capecoastclinical.test",
      status: "APPROVED" as const,
      description: "A patient-first clinical lab in Cape Coast offering routine and prenatal screening panels.",
      operatingHours: "Mon–Sat, 8:00am–5:00pm",
    },
    {
      id: "seed-lab-northern-star",
      name: "Northern Star Diagnostics",
      address: "3 Bolgatanga Rd",
      city: CITY.tamale,
      contactEmail: "contact@northernstar.test",
      status: "APPROVED" as const,
      description: "Tamale's regional diagnostic hub, offering essential blood testing with rapid turnaround.",
      operatingHours: "Mon–Sat, 7:00am–6:00pm",
    },
    {
      id: "seed-lab-new-horizon",
      name: "New Horizon Labs",
      address: "6 Spintex Rd",
      city: CITY.eastLegon,
      contactEmail: "contact@newhorizon.test",
      status: "PENDING" as const,
      description: "A newly registered lab awaiting platform review.",
      operatingHours: "Mon–Fri, 8:00am–5:00pm",
    },
  ];

  const labs: Record<string, { id: string }> = {};
  for (const l of labDefs) {
    labs[l.id] = await prisma.lab.upsert({ where: { id: l.id }, update: {}, create: l });
  }

  // ---------------------------------------------------------------------
  // Offerings — 2-5 per approved lab, sparse (not every lab offers every
  // test). Price range ~GHS 20-450, turnaround 2-72h, deliberate mix of
  // offerings with and without prepInstructions.
  // ---------------------------------------------------------------------
  const offeringDefs: {
    labId: string;
    testId: string;
    price: number;
    turnaroundHours: number;
    prepInstructions?: string;
  }[] = [
    // CityLab Diagnostics (Osu) — 5 offerings
    { labId: "seed-lab-citylab", testId: "seed-test-lipid-panel", price: 80, turnaroundHours: 24, prepInstructions: "Fast for 8-12 hours before sample collection." },
    { labId: "seed-lab-citylab", testId: "seed-test-cbc", price: 45, turnaroundHours: 6 },
    { labId: "seed-lab-citylab", testId: "seed-test-malaria", price: 25, turnaroundHours: 2 },
    { labId: "seed-lab-citylab", testId: "seed-test-glucose-fasting", price: 30, turnaroundHours: 6, prepInstructions: "Fast for 8-12 hours before sample collection." },
    { labId: "seed-lab-citylab", testId: "seed-test-hiv-screening", price: 60, turnaroundHours: 24 },

    // QuickTest Labs (Tema) — 4 offerings
    { labId: "seed-lab-quicktest", testId: "seed-test-lipid-panel", price: 65, turnaroundHours: 48 },
    { labId: "seed-lab-quicktest", testId: "seed-test-urinalysis", price: 35, turnaroundHours: 4 },
    { labId: "seed-lab-quicktest", testId: "seed-test-ecg", price: 120, turnaroundHours: 3 },
    { labId: "seed-lab-quicktest", testId: "seed-test-widal", price: 40, turnaroundHours: 12 },

    // Legon Diagnostics (East Legon) — 4 offerings
    { labId: "seed-lab-legon-diagnostics", testId: "seed-test-cbc", price: 50, turnaroundHours: 6 },
    { labId: "seed-lab-legon-diagnostics", testId: "seed-test-hba1c", price: 95, turnaroundHours: 24 },
    { labId: "seed-lab-legon-diagnostics", testId: "seed-test-tsh", price: 150, turnaroundHours: 48, prepInstructions: "No special preparation needed." },
    { labId: "seed-lab-legon-diagnostics", testId: "seed-test-hepatitis-b", price: 110, turnaroundHours: 24 },

    // Airport Health Labs (Airport Residential Area) — 3 offerings, imaging-heavy
    { labId: "seed-lab-airport-health", testId: "seed-test-chest-xray", price: 180, turnaroundHours: 2 },
    { labId: "seed-lab-airport-health", testId: "seed-test-abdominal-ultrasound", price: 220, turnaroundHours: 3, prepInstructions: "Drink 1L of water 1 hour before the scan; do not urinate before your appointment." },
    { labId: "seed-lab-airport-health", testId: "seed-test-pregnancy-urine", price: 30, turnaroundHours: 2 },

    // Ashanti Medical Labs (Kumasi) — 5 offerings
    { labId: "seed-lab-ashanti-medical", testId: "seed-test-malaria", price: 20, turnaroundHours: 2 },
    { labId: "seed-lab-ashanti-medical", testId: "seed-test-cbc", price: 40, turnaroundHours: 6 },
    { labId: "seed-lab-ashanti-medical", testId: "seed-test-lipid-panel", price: 70, turnaroundHours: 24, prepInstructions: "Fast for 8-12 hours before sample collection." },
    { labId: "seed-lab-ashanti-medical", testId: "seed-test-glucose-fasting", price: 28, turnaroundHours: 6, prepInstructions: "Fast for 8-12 hours before sample collection." },
    { labId: "seed-lab-ashanti-medical", testId: "seed-test-ecg", price: 100, turnaroundHours: 3 },

    // Western Coast Diagnostics (Takoradi) — 3 offerings
    { labId: "seed-lab-western-coast", testId: "seed-test-urinalysis", price: 32, turnaroundHours: 4 },
    { labId: "seed-lab-western-coast", testId: "seed-test-hiv-screening", price: 55, turnaroundHours: 24 },
    { labId: "seed-lab-western-coast", testId: "seed-test-widal", price: 38, turnaroundHours: 12 },

    // Cape Coast Clinical Labs (Cape Coast) — 3 offerings
    { labId: "seed-lab-cape-coast-clinical", testId: "seed-test-lipid-panel", price: 75, turnaroundHours: 24, prepInstructions: "Fast for 8-12 hours before sample collection." },
    { labId: "seed-lab-cape-coast-clinical", testId: "seed-test-pregnancy-urine", price: 28, turnaroundHours: 2 },
    { labId: "seed-lab-cape-coast-clinical", testId: "seed-test-tsh", price: 145, turnaroundHours: 48 },

    // Northern Star Diagnostics (Tamale) — 3 offerings
    { labId: "seed-lab-northern-star", testId: "seed-test-cbc", price: 42, turnaroundHours: 8 },
    { labId: "seed-lab-northern-star", testId: "seed-test-malaria", price: 22, turnaroundHours: 2 },
    { labId: "seed-lab-northern-star", testId: "seed-test-glucose-fasting", price: 26, turnaroundHours: 6, prepInstructions: "Fast for 8-12 hours before sample collection." },
  ];

  const offerings: Record<string, { id: string }> = {};
  const labTestIds = new Set<string>();
  for (const o of offeringDefs) {
    const template = testTemplatesByKey[o.testId];
    // Deterministic per-lab id so re-running the script is idempotent, e.g.
    // "seed-test-lipid-panel--seed-lab-citylab" — distinct from every other
    // lab's own copy of the same template.
    const labTestId = `${o.testId}--${o.labId}`;
    const labTest = await prisma.test.upsert({
      where: { id: labTestId },
      update: {},
      create: {
        id: labTestId,
        labId: o.labId,
        name: template.name,
        category: template.category,
        sampleType: template.sampleType,
        description: template.description,
      },
    });
    labTestIds.add(labTest.id);

    const key = `${o.labId}:${o.testId}`;
    offerings[key] = await prisma.labTestOffering.upsert({
      where: { labId_testId: { labId: o.labId, testId: labTest.id } },
      update: {},
      create: {
        labId: o.labId,
        testId: labTest.id,
        price: o.price,
        turnaroundHours: o.turnaroundHours,
        prepInstructions: o.prepInstructions,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Users — the original 5 seed users are unchanged; add a LAB_ADMIN (and a
  // couple of LAB_STAFF for variety) across the new labs, plus one more
  // PATIENT with a fuller appointment history.
  // ---------------------------------------------------------------------
  const users = [
    { id: "seed-user-platform-admin", email: "admin@labtrack.test", name: "Platform Admin", role: "PLATFORM_ADMIN" as const, labId: null },
    { id: "seed-user-citylab-admin", email: "admin@citylab.test", name: "CityLab Admin", role: "LAB_ADMIN" as const, labId: labs["seed-lab-citylab"].id },
    { id: "seed-user-citylab-staff", email: "staff@citylab.test", name: "CityLab Staff", role: "LAB_STAFF" as const, labId: labs["seed-lab-citylab"].id },
    { id: "seed-user-quicktest-admin", email: "admin@quicktest.test", name: "QuickTest Admin", role: "LAB_ADMIN" as const, labId: labs["seed-lab-quicktest"].id },
    { id: "seed-user-patient", email: "patient@labtrack.test", name: "Ama Owusu", role: "PATIENT" as const, labId: null },

    // New: an admin (and staff, where noted) for each newly added lab.
    { id: "seed-user-medcheck-admin", email: "admin@medcheck.test", name: "MedCheck Admin", role: "LAB_ADMIN" as const, labId: labs["seed-lab-medcheck"].id },
    { id: "seed-user-legon-admin", email: "admin@legondiagnostics.test", name: "Legon Diagnostics Admin", role: "LAB_ADMIN" as const, labId: labs["seed-lab-legon-diagnostics"].id },
    { id: "seed-user-legon-staff", email: "staff@legondiagnostics.test", name: "Legon Diagnostics Staff", role: "LAB_STAFF" as const, labId: labs["seed-lab-legon-diagnostics"].id },
    { id: "seed-user-airport-admin", email: "admin@airporthealth.test", name: "Airport Health Admin", role: "LAB_ADMIN" as const, labId: labs["seed-lab-airport-health"].id },
    { id: "seed-user-ashanti-admin", email: "admin@ashantimedical.test", name: "Ashanti Medical Admin", role: "LAB_ADMIN" as const, labId: labs["seed-lab-ashanti-medical"].id },
    { id: "seed-user-ashanti-staff", email: "staff@ashantimedical.test", name: "Ashanti Medical Staff", role: "LAB_STAFF" as const, labId: labs["seed-lab-ashanti-medical"].id },
    { id: "seed-user-western-coast-admin", email: "admin@westerncoast.test", name: "Western Coast Admin", role: "LAB_ADMIN" as const, labId: labs["seed-lab-western-coast"].id },
    { id: "seed-user-cape-coast-admin", email: "admin@capecoastclinical.test", name: "Cape Coast Clinical Admin", role: "LAB_ADMIN" as const, labId: labs["seed-lab-cape-coast-clinical"].id },
    { id: "seed-user-northern-star-admin", email: "admin@northernstar.test", name: "Northern Star Admin", role: "LAB_ADMIN" as const, labId: labs["seed-lab-northern-star"].id },
    { id: "seed-user-new-horizon-admin", email: "admin@newhorizon.test", name: "New Horizon Admin", role: "LAB_ADMIN" as const, labId: labs["seed-lab-new-horizon"].id },

    // New: a second patient with a fuller appointment history.
    { id: "seed-user-patient-2", email: "patient2@labtrack.test", name: "Kwame Mensah", role: "PATIENT" as const, labId: null },
  ];

  for (const u of users) {
    await prisma.user.upsert({ where: { id: u.id }, update: {}, create: { ...u, passwordHash } });
  }

  // ---------------------------------------------------------------------
  // Appointments — previously zero seeded. A mix of statuses across both
  // patients and multiple labs so /patient/appointments demonstrates the
  // full StatusBadge palette. Respects the (labId, offeringId, slotDatetime)
  // unique constraint — every slot below is distinct.
  // ---------------------------------------------------------------------
  const now = Date.now();
  const days = (n: number) => new Date(now + n * 86_400_000);

  type AppointmentDef = {
    id: string;
    patientId: string;
    labId: string;
    offeringId: string;
    slotDatetime: Date;
    status: "BOOKED" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    sample?: { collectedAt: Date; collectedByStaffId?: string; notes?: string };
  };

  const patient1 = users.find((u) => u.id === "seed-user-patient")!.id;
  const patient2 = users.find((u) => u.id === "seed-user-patient-2")!.id;
  const citylabStaff = "seed-user-citylab-staff";
  const ashantiStaff = "seed-user-ashanti-staff";

  const appointmentDefs: AppointmentDef[] = [
    // Ama Owusu (seed-user-patient) — future bookings
    {
      id: "seed-appt-1",
      patientId: patient1,
      labId: "seed-lab-citylab",
      offeringId: offerings["seed-lab-citylab:seed-test-lipid-panel"].id,
      slotDatetime: days(3),
      status: "BOOKED",
    },
    {
      id: "seed-appt-2",
      patientId: patient1,
      labId: "seed-lab-quicktest",
      offeringId: offerings["seed-lab-quicktest:seed-test-ecg"].id,
      slotDatetime: days(7),
      status: "BOOKED",
    },
    // Ama Owusu — mid-pipeline
    {
      id: "seed-appt-3",
      patientId: patient1,
      labId: "seed-lab-citylab",
      offeringId: offerings["seed-lab-citylab:seed-test-cbc"].id,
      slotDatetime: days(-2),
      status: "SAMPLE_COLLECTED",
      sample: { collectedAt: days(-2), collectedByStaffId: citylabStaff },
    },
    {
      id: "seed-appt-4",
      patientId: patient1,
      labId: "seed-lab-ashanti-medical",
      offeringId: offerings["seed-lab-ashanti-medical:seed-test-malaria"].id,
      slotDatetime: days(-3),
      status: "IN_PROGRESS",
      sample: { collectedAt: days(-3), collectedByStaffId: ashantiStaff },
    },
    // Ama Owusu — completed
    {
      id: "seed-appt-5",
      patientId: patient1,
      labId: "seed-lab-citylab",
      offeringId: offerings["seed-lab-citylab:seed-test-glucose-fasting"].id,
      slotDatetime: days(-10),
      status: "COMPLETED",
      sample: { collectedAt: days(-10), collectedByStaffId: citylabStaff, notes: "Sample within normal range." },
    },
    {
      id: "seed-appt-6",
      patientId: patient1,
      labId: "seed-lab-quicktest",
      offeringId: offerings["seed-lab-quicktest:seed-test-urinalysis"].id,
      slotDatetime: days(-20),
      status: "COMPLETED",
      sample: { collectedAt: days(-20) },
    },
    // Ama Owusu — cancelled
    {
      id: "seed-appt-7",
      patientId: patient1,
      labId: "seed-lab-legon-diagnostics",
      offeringId: offerings["seed-lab-legon-diagnostics:seed-test-cbc"].id,
      slotDatetime: days(-1),
      status: "CANCELLED",
    },

    // Kwame Mensah (seed-user-patient-2)
    {
      id: "seed-appt-8",
      patientId: patient2,
      labId: "seed-lab-legon-diagnostics",
      offeringId: offerings["seed-lab-legon-diagnostics:seed-test-tsh"].id,
      slotDatetime: days(5),
      status: "BOOKED",
    },
    {
      id: "seed-appt-9",
      patientId: patient2,
      labId: "seed-lab-airport-health",
      offeringId: offerings["seed-lab-airport-health:seed-test-chest-xray"].id,
      slotDatetime: days(-15),
      status: "COMPLETED",
      sample: { collectedAt: days(-15) },
    },
    {
      id: "seed-appt-10",
      patientId: patient2,
      labId: "seed-lab-cape-coast-clinical",
      offeringId: offerings["seed-lab-cape-coast-clinical:seed-test-pregnancy-urine"].id,
      slotDatetime: days(-1),
      status: "SAMPLE_COLLECTED",
      sample: { collectedAt: days(-1) },
    },
  ];

  for (const a of appointmentDefs) {
    // Upserted by the stable seed-* id (not the (labId, offeringId,
    // slotDatetime) compound unique) — slotDatetime is computed relative to
    // `Date.now()` at seed time, so re-running the script on a later day
    // would otherwise compute a different slotDatetime and collide on `id`
    // instead of matching the existing row. Each definition's own
    // (labId, offeringId, slotDatetime) triple is still distinct within a
    // single run, satisfying the DB constraint the same way a real booking
    // would.
    const appointment = await prisma.appointment.upsert({
      where: { id: a.id },
      update: { slotDatetime: a.slotDatetime, status: a.status },
      create: {
        id: a.id,
        patientId: a.patientId,
        labId: a.labId,
        offeringId: a.offeringId,
        slotDatetime: a.slotDatetime,
        status: a.status,
      },
    });

    if (a.sample) {
      await prisma.sample.upsert({
        where: { appointmentId: appointment.id },
        update: {},
        create: {
          appointmentId: appointment.id,
          collectedAt: a.sample.collectedAt,
          collectedByStaffId: a.sample.collectedByStaffId,
          notes: a.sample.notes,
        },
      });
    }
  }

  const pendingCount = labDefs.filter((l) => l.status === "PENDING").length;
  console.log(`Seeded ${labDefs.length} labs (${pendingCount} pending review), ${labTestIds.size} per-lab test rows (from ${testDefs.length} templates), ${offeringDefs.length} offerings, ${appointmentDefs.length} appointments.`);
  console.log(`All seeded users share the password: ${PASSWORD}`);
  for (const u of users) console.log(`  ${u.role.padEnd(14)} ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
