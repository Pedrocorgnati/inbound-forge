-- Inbound F1: Email Marketing (subscribers + broadcasts). Aditivo.

-- CreateEnum
CREATE TYPE "SubscriberStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED');
CREATE TYPE "BroadcastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELED', 'FAILED');
CREATE TYPE "BroadcastRecipientStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "email_subscribers" (
    "id" TEXT NOT NULL,
    "encrypted_email" TEXT NOT NULL,
    "email_hash" VARCHAR(64) NOT NULL,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'PENDING',
    "channel" "Channel",
    "lead_id" TEXT,
    "source" VARCHAR(120),
    "lgpd_consent" BOOLEAN NOT NULL DEFAULT false,
    "lgpd_consent_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "unsubscribed_at" TIMESTAMP(3),
    "source_ip_hash" VARCHAR(64),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" TEXT NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "preheader" VARCHAR(255),
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "from_name" VARCHAR(120),
    "reply_to" VARCHAR(254),
    "status" "BroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "open_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_recipients" (
    "id" TEXT NOT NULL,
    "broadcast_id" TEXT NOT NULL,
    "subscriber_id" TEXT NOT NULL,
    "status" "BroadcastRecipientStatus" NOT NULL DEFAULT 'QUEUED',
    "resend_message_id" VARCHAR(120),
    "sent_at" TIMESTAMP(3),
    "last_error" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_subscribers_email_hash_key" ON "email_subscribers"("email_hash");
CREATE INDEX "IDX_email_subscribers_status" ON "email_subscribers"("status");
CREATE INDEX "IDX_email_subscribers_created" ON "email_subscribers"("created_at");
CREATE INDEX "IDX_broadcasts_status_scheduled" ON "broadcasts"("status", "scheduled_at");
CREATE UNIQUE INDEX "UQ_broadcast_recipient" ON "broadcast_recipients"("broadcast_id", "subscriber_id");
CREATE INDEX "IDX_broadcast_recipients_broadcast_status" ON "broadcast_recipients"("broadcast_id", "status");

-- AddForeignKey
ALTER TABLE "email_subscribers" ADD CONSTRAINT "email_subscribers_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "email_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
