// Seeds one user per role plus two pilot labs, so auth and tenant-scoping
// can be exercised end-to-end in the browser. Run with: npm run db:seed
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const test = await prisma.test.upsert({
    where: { id: "seed-test-lipid-panel" },
    update: {},
    create: {
      id: "seed-test-lipid-panel",
      name: "Lipid Panel",
      category: "Blood",
      sampleType: "Serum",
      description: "Measures cholesterol and triglycerides.",
    },
  });
  await prisma.test.upsert({
    where: { id: "seed-test-cbc" },
    update: {},
    create: {
      id: "seed-test-cbc",
      name: "CBC",
      category: "Blood",
      sampleType: "Whole blood",
      description: "Complete blood count.",
    },
  });
  await prisma.test.upsert({
    where: { id: "seed-test-malaria" },
    update: {},
    create: {
      id: "seed-test-malaria",
      name: "Malaria Test",
      category: "Blood",
      sampleType: "Whole blood",
      description: "Rapid diagnostic test for malaria parasites.",
    },
  });

  const labA = await prisma.lab.upsert({
    where: { id: "seed-lab-citylab" },
    update: {},
    create: {
      id: "seed-lab-citylab",
      name: "CityLab Diagnostics",
      address: "1 Main St",
      city: "Osu",
      contactEmail: "contact@citylab.test",
      status: "APPROVED",
    },
  });

  const labB = await prisma.lab.upsert({
    where: { id: "seed-lab-quicktest" },
    update: {},
    create: {
      id: "seed-lab-quicktest",
      name: "QuickTest Labs",
      address: "2 High St",
      city: "Tema",
      contactEmail: "contact@quicktest.test",
      status: "APPROVED",
    },
  });

  const pendingLab = await prisma.lab.upsert({
    where: { id: "seed-lab-medcheck" },
    update: {},
    create: {
      id: "seed-lab-medcheck",
      name: "MedCheck Labs",
      address: "3 Ring Rd",
      city: "Osu",
      contactEmail: "contact@medcheck.test",
      status: "PENDING",
    },
  });

  await prisma.labTestOffering.upsert({
    where: { labId_testId: { labId: labA.id, testId: test.id } },
    update: {},
    create: { labId: labA.id, testId: test.id, price: 80, turnaroundHours: 24, prepInstructions: "Fast 12 hours before sample collection" },
  });
  await prisma.labTestOffering.upsert({
    where: { labId_testId: { labId: labB.id, testId: test.id } },
    update: {},
    create: { labId: labB.id, testId: test.id, price: 65, turnaroundHours: 48 },
  });

  const users = [
    { id: "seed-user-platform-admin", email: "admin@labtrack.test", name: "Platform Admin", role: "PLATFORM_ADMIN" as const, labId: null },
    { id: "seed-user-citylab-admin", email: "admin@citylab.test", name: "CityLab Admin", role: "LAB_ADMIN" as const, labId: labA.id },
    { id: "seed-user-citylab-staff", email: "staff@citylab.test", name: "CityLab Staff", role: "LAB_STAFF" as const, labId: labA.id },
    { id: "seed-user-quicktest-admin", email: "admin@quicktest.test", name: "QuickTest Admin", role: "LAB_ADMIN" as const, labId: labB.id },
    { id: "seed-user-patient", email: "patient@labtrack.test", name: "Ama Owusu", role: "PATIENT" as const, labId: null },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { ...u, passwordHash },
    });
  }

  console.log(`Seeded. Pending lab for admin review: ${pendingLab.name}`);
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
