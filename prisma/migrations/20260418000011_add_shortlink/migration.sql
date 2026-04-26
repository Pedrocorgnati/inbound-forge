-- Intake-Review TASK-1 (CL-275): Shortlink rastreavel para CTAs externos
-- CreateTable
CREATE TABLE "shortlinks" (
    "id" TEXT NOT NULL,
    "short_id" VARCHAR(12) NOT NULL,
    "target_url" VARCHAR(2048) NOT NULL,
    "channel" VARCHAR(32) NOT NULL,
    "utm_source" VARCHAR(50),
    "utm_medium" VARCHAR(50),
    "utm_campaign" VARCHAR(255),
    "utm_content" VARCHAR(255),
    "utm_term" VARCHAR(255),
    "post_id" TEXT,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shortlinks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shortlinks_short_id_key" ON "shortlinks"("short_id");

-- CreateIndex
CREATE INDEX "IDX_shortlinks_post" ON "shortlinks"("post_id");

-- CreateIndex
CREATE INDEX "IDX_shortlinks_channel_date" ON "shortlinks"("channel", "created_at");
