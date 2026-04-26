-- Intake Review TASK-11 ST001 (CL-245..247) — Centro de notificacoes in-app.

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT,
    "link" VARCHAR(500),
    "read_at" TIMESTAMP(3),
    "source_id" VARCHAR(100),
    "source_type" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_notifications_read_created" ON "notifications"("read_at", "created_at");
CREATE INDEX "IDX_notifications_type_created" ON "notifications"("type", "created_at");
