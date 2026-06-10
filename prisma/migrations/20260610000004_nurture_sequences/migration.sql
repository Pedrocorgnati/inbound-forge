-- Inbound F4: Nurture Sequences (drip). Aditivo.

-- CreateEnum
CREATE TYPE "SequenceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELED');

-- CreateTable
CREATE TABLE "nurture_sequences" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "status" "SequenceStatus" NOT NULL DEFAULT 'DRAFT',
    "auto_enroll" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nurture_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurture_steps" (
    "id" TEXT NOT NULL,
    "sequence_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "delay_hours" INTEGER NOT NULL DEFAULT 0,
    "subject" VARCHAR(255) NOT NULL,
    "body_html" TEXT NOT NULL,
    CONSTRAINT "nurture_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurture_enrollments" (
    "id" TEXT NOT NULL,
    "sequence_id" TEXT NOT NULL,
    "subscriber_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "next_step_at" TIMESTAMP(3),
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "nurture_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurture_send_logs" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "detail" VARCHAR(500),
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nurture_send_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_nurture_sequences_status" ON "nurture_sequences"("status");
CREATE UNIQUE INDEX "UQ_nurture_step_order" ON "nurture_steps"("sequence_id", "order");
CREATE UNIQUE INDEX "UQ_nurture_enrollment" ON "nurture_enrollments"("sequence_id", "subscriber_id");
CREATE INDEX "IDX_nurture_enrollments_status_next" ON "nurture_enrollments"("status", "next_step_at");
CREATE INDEX "IDX_nurture_send_logs_enrollment" ON "nurture_send_logs"("enrollment_id");

-- AddForeignKey
ALTER TABLE "nurture_steps" ADD CONSTRAINT "nurture_steps_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "nurture_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nurture_enrollments" ADD CONSTRAINT "nurture_enrollments_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "nurture_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nurture_send_logs" ADD CONSTRAINT "nurture_send_logs_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "nurture_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
