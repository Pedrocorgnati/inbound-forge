-- Intake-Review TASK-5 (CL-198): historico auditavel de falhas de publicacao
CREATE TABLE "post_publish_errors" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "status_code" INTEGER,
    "api_message" TEXT,
    "request_payload" JSONB,
    "response_body" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_publish_errors_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_post_publish_errors_post" ON "post_publish_errors"("post_id", "created_at");
