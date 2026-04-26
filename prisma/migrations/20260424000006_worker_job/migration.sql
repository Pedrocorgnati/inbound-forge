-- TASK-4 ST001 (CL-TH-010) — WorkerJob model para rastrear lifecycle de jobs da fila.

CREATE TYPE "WorkerJobStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'DEAD_LETTER'
);

CREATE TABLE "worker_jobs" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type"         VARCHAR(64) NOT NULL,
  "status"       "WorkerJobStatus" NOT NULL DEFAULT 'PENDING',
  "retry_count"  INTEGER NOT NULL DEFAULT 0,
  "payload"      JSONB,
  "error"        TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at"   TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "IDX_worker_jobs_status_created"
  ON "worker_jobs" ("status", "created_at");

CREATE INDEX "IDX_worker_jobs_type_status"
  ON "worker_jobs" ("type", "status");
