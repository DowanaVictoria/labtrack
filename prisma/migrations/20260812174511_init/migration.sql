-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'LAB_STAFF', 'LAB_ADMIN', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "LabStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('BOOKED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "labs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "status" "LabStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "labId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sampleType" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_test_offerings" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "turnaroundHours" INTEGER NOT NULL,
    "prepInstructions" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lab_test_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "slotDatetime" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'BOOKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "samples" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3),
    "collectedByStaffId" TEXT,
    "notes" TEXT,

    CONSTRAINT "samples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "labs_status_idx" ON "labs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_labId_idx" ON "users"("labId");

-- CreateIndex
CREATE INDEX "lab_test_offerings_labId_idx" ON "lab_test_offerings"("labId");

-- CreateIndex
CREATE INDEX "lab_test_offerings_testId_idx" ON "lab_test_offerings"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_test_offerings_labId_testId_key" ON "lab_test_offerings"("labId", "testId");

-- CreateIndex
CREATE INDEX "appointments_labId_idx" ON "appointments"("labId");

-- CreateIndex
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_labId_offeringId_slotDatetime_key" ON "appointments"("labId", "offeringId", "slotDatetime");

-- CreateIndex
CREATE UNIQUE INDEX "samples_appointmentId_key" ON "samples"("appointmentId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_labId_fkey" FOREIGN KEY ("labId") REFERENCES "labs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_offerings" ADD CONSTRAINT "lab_test_offerings_labId_fkey" FOREIGN KEY ("labId") REFERENCES "labs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_offerings" ADD CONSTRAINT "lab_test_offerings_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_labId_fkey" FOREIGN KEY ("labId") REFERENCES "labs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "lab_test_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_collectedByStaffId_fkey" FOREIGN KEY ("collectedByStaffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
