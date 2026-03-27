-- Migration M010: Seed Metadata Control Table
-- Criado por: auto-flow execute (module-1/TASK-1/ST005)
-- Rollback: DROP TABLE seed_metadata

CREATE TABLE "seed_metadata" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "env" VARCHAR(50) NOT NULL,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" VARCHAR(20) NOT NULL DEFAULT '1.0',
    CONSTRAINT "seed_metadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seed_metadata_env_key" ON "seed_metadata"("env");

-- Rollback:
-- DROP TABLE IF EXISTS "seed_metadata";
