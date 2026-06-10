-- Inbound F2: Lead Capture Forms. Aditivo.

-- AlterEnum (PG12+: ADD VALUE pode rodar em transacao desde que o valor nao seja
-- usado na mesma transacao — nao e usado aqui)
ALTER TYPE "ConversionType" ADD VALUE IF NOT EXISTS 'FORM_SUBMISSION';

-- CreateEnum
CREATE TYPE "FormKind" AS ENUM ('NEWSLETTER', 'GATED_DOWNLOAD', 'DEMO_REQUEST', 'GENERIC');
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "lead_forms" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "kind" "FormKind" NOT NULL DEFAULT 'NEWSLETTER',
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "headline" VARCHAR(200),
    "description" TEXT,
    "cta_label" VARCHAR(80),
    "success_message" TEXT,
    "lgpd_consent_text" TEXT,
    "default_channel" "Channel",
    "submission_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lead_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_form_submissions" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "subscriber_id" TEXT,
    "encrypted_payload" TEXT NOT NULL,
    "correlation_id" VARCHAR(36) NOT NULL,
    "utm_source" VARCHAR(120),
    "utm_medium" VARCHAR(120),
    "utm_campaign" VARCHAR(120),
    "source_ip_hash" VARCHAR(64),
    "user_agent" VARCHAR(500),
    "lgpd_consent" BOOLEAN NOT NULL DEFAULT false,
    "lgpd_consent_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_forms_slug_key" ON "lead_forms"("slug");
CREATE INDEX "IDX_lead_forms_status" ON "lead_forms"("status");
CREATE UNIQUE INDEX "lead_form_submissions_correlation_id_key" ON "lead_form_submissions"("correlation_id");
CREATE INDEX "IDX_lead_form_submissions_form_created" ON "lead_form_submissions"("form_id", "created_at");

-- AddForeignKey
ALTER TABLE "lead_form_submissions" ADD CONSTRAINT "lead_form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "lead_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
