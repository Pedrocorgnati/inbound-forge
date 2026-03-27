# Backend Build Report

**Projeto:** inbound-forge
**Stack:** nextjs-api (Next.js 14+ App Router)
**Modo:** COMPLEMENTAR (frontend já existia)
**Data:** 2026-03-25
**Prisma:** v6.19.2
**Gerado por:** /back-end-build

---

## Estrutura Gerada

### Schema Prisma (25 entidades + 14 enums)

`prisma/schema.prisma`

| Entidade | Rock | Campos principais |
|----------|------|-------------------|
| Operator | Skeleton | email |
| WorkerHealth | Skeleton | type, status, lastHeartbeat |
| CaseLibraryEntry | Rock 1 | name, sector, systemType, outcome, hasQuantifiableResult |
| PainLibraryEntry | Rock 1 | title, description, sectors[] |
| CasePain | Rock 1 | (join table) |
| SolutionPattern | Rock 1 | name, description, painId, caseId |
| Objection | Rock 1 | content, type |
| NicheOpportunity | Rock 1 | sector, painCategory, potentialScore |
| ScrapedText | Rock 1 | source, rawText, classified |
| Theme | Rock 1+2 | title, opportunityScore, status, conversionScore |
| ContentPiece | Rock 2 | themeId, baseTitle, funnelStage, status, selectedAngle |
| ContentAngleVariant | Rock 2 | pieceId, angle, text, isSelected |
| ContentRejection | Rock 2 | pieceId, reason |
| ImageJob | Rock 3 | contentPieceId, templateType, status, processingMs |
| VisualAsset | Rock 3 | name, type, storageUrl |
| ImageTemplate | Rock 3 | imageType, width, height |
| Post | Rock 4 | contentPieceId, channel, scheduledAt, caption, hashtags |
| PublishingQueue | Rock 4 | postId, attempts |
| BlogArticle | Rock 4 | slug, title, body, metaTitle, metaDescription |
| BlogArticleVersion | Rock 4 | articleId, body, versionNumber |
| Lead | Rock 5 | name, company, contactInfo, firstTouchPostId |
| ConversionEvent | Rock 5 | leadId, type, attribution, occurredAt |
| UTMLink | Rock 5 | postId, source, medium, campaign, fullUrl |
| ReconciliationItem | Rock 5 | type, weekOf, resolved |
| ApiUsageLog | Rock 6 | service, metric, value, cost |
| AlertLog | Rock 6 | type, severity, message, resolved |

### Libs Base (3 novos)

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/prisma.ts` | Singleton PrismaClient com hot-reload para dev |
| `src/lib/redis.ts` | Cliente Upstash Redis com QUEUE_KEYS e CACHE_KEYS |
| `src/lib/api-auth.ts` | requireSession(), requireWorkerToken(), ok(), notFound(), etc. |

### Schemas Zod (9 arquivos)

| Arquivo | Schemas |
|---------|---------|
| `src/schemas/health.schema.ts` | HeartbeatSchema |
| `src/schemas/knowledge.schema.ts` | CreateCase, CreatePain, CreateSolutionPattern, CreateObjection |
| `src/schemas/theme.schema.ts` | RejectTheme, ListThemes |
| `src/schemas/content.schema.ts` | GenerateContent, ApproveContent, RejectContent, EditContent |
| `src/schemas/image.schema.ts` | GenerateImage |
| `src/schemas/post.schema.ts` | CreatePost, UpdatePost, ListPosts |
| `src/schemas/blog.schema.ts` | CreateBlogArticle, UpdateBlogArticle, ListBlog |
| `src/schemas/lead.schema.ts` | CreateLead, UpdateLead, CreateConversion |
| `src/schemas/utm.schema.ts` | GenerateUTM |

### Constants (1 arquivo)

| Arquivo | Descrição |
|---------|-----------|
| `src/constants/errors.ts` | ErrorCode union type + ERRORS map (29 códigos) + apiError() helper |

### Routes / Controllers (42 endpoints)

| Grupo | Endpoints |
|-------|-----------|
| **Health** (2) | GET /v1/health, POST /v1/health/heartbeat |
| **Knowledge** (12) | GET+POST cases/pains/patterns/objections, PUT cases/pains/objections/{id}, DELETE cases/{id}, PATCH cases+pains/{id}/validate, GET threshold |
| **Themes** (5) | GET /themes, GET /themes/{id}, POST /themes/{id}/reject, POST /themes/{id}/restore, POST /themes/generate |
| **Content** (6) | GET /content, POST /content/generate, GET+PUT /content/{pieceId}, POST /content/{pieceId}/approve, POST /content/{pieceId}/reject |
| **Images** (4) | POST /images/generate, GET /images/{jobId}, GET+POST /assets, DELETE /assets/{id} |
| **Posts** (6) | GET+POST /posts, PUT+DELETE /posts/{id}, POST /posts/{id}/approve, POST /posts/{id}/publish |
| **Blog** (6) | GET+POST /blog, GET+PUT /blog/{idOrSlug}, POST /blog/{id}/publish, POST /blog/{id}/revalidate |
| **Leads** (5) | GET+POST /leads, GET+PUT+DELETE /leads/{id}, GET+POST /leads/{id}/conversions |
| **Analytics** (4) | GET /analytics/funnel, GET /analytics/themes-ranking, GET /analytics/reconciliation, PATCH /analytics/reconciliation/{id}/resolve |
| **UTM** (1) | POST /utm/generate |

### Services (5 arquivos com stubs)

| Arquivo | Métodos |
|---------|---------|
| `src/services/knowledge.service.ts` | listCases, createCase, validateCase, listPains, createPain, createSolutionPattern, getThreshold |
| `src/services/content.service.ts` | listPieces, generateAngles, approvePiece, rejectPiece |
| `src/services/image.service.ts` | enqueueGeneration, getJobStatus, listAssets |
| `src/services/post.service.ts` | listPosts, createPost, updatePost, publishPost |
| `src/services/analytics.service.ts` | getFunnel, getThemesRanking, runWeeklyReconciliation |

### Testes Base (3 arquivos)

- `src/services/__tests__/knowledge.service.test.ts` — 3 describes
- `src/services/__tests__/content.service.test.ts` — 3 describes
- `src/services/__tests__/analytics.service.test.ts` — 3 describes

---

## Stubs Pendentes (TODO: Implementar via /auto-flow execute)

| Serviço | Método | Rock |
|---------|--------|------|
| KnowledgeService | createCase, validateCase, createPain, createSolutionPattern | Rock 1 |
| ContentService | generateAngles (Claude), approvePiece, rejectPiece | Rock 2 |
| ImageService | enqueueGeneration (Redis + Ideogram/Flux) | Rock 3 |
| PostService | createPost, updatePost, publishPost (modos assistidos) | Rock 4 |
| AnalyticsService | getFunnel (GA4), getThemesRanking (learn-to-rank), runWeeklyReconciliation | Rock 5 |
| content/generate | POST handler completo com Claude API | Rock 2 |
| assets/route | POST handler completo com Supabase Storage upload | Rock 3 |

---

## Build Status

```
TypeScript (tsc --noEmit): ✅ PASSOU — sem erros
Prisma generate:           ✅ PASSOU — v6.19.2
```

---

## Próximos Passos

1. **`/env-creation`** — configurar `.env` com valores reais (Supabase, Upstash, APIs)
2. **`/db-migration-create`** — gerar migrations Prisma + seed de dados
3. **`/create-test-user`** — criar operador de teste via seed
4. **`/auto-flow execute [range]`** — implementar lógica de negócio task a task

### Variáveis de ambiente obrigatórias antes de subir

```
DATABASE_URL          # Supabase connection pooler (Transaction mode)
DIRECT_URL            # Supabase direct connection (para migrate)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
WORKER_AUTH_TOKEN     # openssl rand -base64 32
ANTHROPIC_API_KEY     # Para /content/generate
```
