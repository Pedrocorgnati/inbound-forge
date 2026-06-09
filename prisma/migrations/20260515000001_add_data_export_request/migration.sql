-- TASK-2 ST001 (CL-298): tabela para rastrear pedidos de export LGPD
-- Migration: add_data_export_request

CREATE TABLE "data_export_requests" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "file_url" TEXT,
    "expires_at" TIMESTAMP(3),
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_data_export_requests_operator" ON "data_export_requests"("operator_id", "requested_at");

ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_operator_id_fkey"
    FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
