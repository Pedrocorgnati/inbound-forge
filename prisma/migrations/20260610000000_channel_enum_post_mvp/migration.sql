-- AUDIT-3: valores post-MVP do enum Channel (CL-064/CL-065). Declarados em
-- prisma/schema.prisma mas sem migration que os crie -> `prisma migrate diff` acusa
-- drift. Nao sao usados pela 005 (backfill de leads), por isso ficam aqui ao final.
-- IF NOT EXISTS (PG12+) torna idempotente em prod onde ja possam existir por db-push.
ALTER TYPE "Channel" ADD VALUE IF NOT EXISTS 'TIKTOK';
ALTER TYPE "Channel" ADD VALUE IF NOT EXISTS 'YOUTUBE_SHORTS';
