# CONTRACT-REPORT — Inbound Forge v1.0.0

**Gerado por:** module-16/TASK-1
**Data:** 2026-03-26
**Versão dos contratos:** 1.0.0

---

## Status dos Contratos

| Contrato | Interface | Owner | Consumidor | Status | Data |
|----------|-----------|-------|-----------|--------|------|
| CX-01 | prisma/Theme.conversionScore | module-7/TASK-2 | module-13/TASK-3 | PASSED | 2026-03-26 |
| CX-02 | prisma/ContentPiece.imageJobId+imageUrl | module-8/TASK-1 | module-9/TASK-5 | PASSED | 2026-03-26 |
| CX-03 | prisma/ContentPiece.scheduledPost | module-8/TASK-1 | module-12/TASK-1 | PASSED | 2026-03-26 |
| CX-04 | prisma/Post.trackingUrl | module-12/TASK-1 | module-13/TASK-1 | PASSED | 2026-03-26 |
| CX-05 | prisma/WorkerHealth.lastHeartbeat | module-1/TASK-1 | module-6, module-9, module-12 | PASSED | 2026-03-26 |
| CX-06 | src/constants/redis-keys.ts | module-1/TASK-3 | module-6/TASK-1, module-9/TASK-1 | PASSED | 2026-03-26 |
| CX-07 | src/types/enums.ts (15 enums) | module-2/TASK-1 | Todos os módulos | PASSED | 2026-03-26 |

**Resultado: 7/7 contratos PASSED**

---

## Verificação por Contrato

### CX-01: Theme.conversionScore
- **Campo no schema:** `Theme.conversionScore Int @default(0)`
- **Invariante:** Atualizado após cada ConversionEvent
- **Implementação:** `src/lib/conversion-score.ts` + `src/app/api/v1/conversions/route.ts`
- **Cenários testados:** happy path, múltiplas conversões, themeId inválido
- **Status:** PASSED

### CX-02: ContentPiece.imageJobId / imageUrl
- **Campos no schema:** `imageJobId String? @unique`, `imageUrl String?`
- **Invariante:** Preenchido após `completeImageJob()`, null após `failImageJob()`
- **Implementação:** `src/lib/image-pipeline.ts`
- **Cenários testados:** job completo, job falhado, unique constraint
- **Status:** PASSED

### CX-03: ContentPiece.scheduledPost
- **Relação no schema:** `Post? @relation` (optional one-to-one via `contentPieceId`)
- **Invariante:** Não-null quando Post criado, null sem Post
- **Status:** PASSED

### CX-04: Post.trackingUrl
- **Campo no schema:** `trackingUrl String? @map("tracking_url")`
- **Invariante:** Preenchido atomicamente com UTMLink via `createUTMLink()`
- **Implementação:** `src/lib/utm-builder.ts` + `src/app/api/v1/utm-links/route.ts`
- **Status:** PASSED

### CX-05: WorkerHealth.lastHeartbeat
- **Campo no schema:** `lastHeartbeat DateTime`
- **Invariante:** Atualizado em todo ciclo dos workers (scraping, image, publishing)
- **NOTIF-001:** Se ausente > 30min, alertar operador via email (src/lib/alert-email.ts)
- **Status:** PASSED

### CX-06: Redis queue keys
- **Arquivo:** `src/constants/redis-keys.ts` — `REDIS_KEYS.SCRAPING_QUEUE`, `IMAGE_QUEUE`, `PUBLISH_QUEUE`
- **Invariante:** Nenhum worker hardcoda strings de queue — sempre importar de redis-keys.ts
- **Verificação estática:** CI faz grep por hardcodes em worker files
- **Status:** PASSED

### CX-07: 15 enums compartilhados
- **Arquivo:** `src/types/enums.ts` — re-exports do `@prisma/client`
- **Enums:** UserRole, EntryStatus, ThemeStatus, ContentAngle, ContentStatus, Channel, WorkerStatus, WorkerType, ConversionType, AttributionType, ArticleStatus, FunnelStage, ImageType, CTADestination, ObjectionType
- **Invariante:** Nunca redefinir localmente — sempre importar de `@/types/enums`
- **Status:** PASSED

---

## Versão dos Contratos

```typescript
// src/constants/contracts.ts
export const CONTRACT_VERSION = '1.0.0'
export const CONTRACT_DATE = '2026-03-26'
```

---

## Regressões Detectadas

Nenhuma regressão detectada nesta versão.

---

## Próxima Revisão

Data: 2026-06-01 — verificar contratos após evolução do schema para features pós-MVP.
