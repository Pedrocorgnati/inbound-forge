# Hardcodes Task — Inbound Forge
_Gerado por /nextjs:hardcodes — 2026-04-05_

## Resumo da Análise

| Categoria | Ocorrências | Arquivos | Prioridade |
|-----------|-------------|----------|------------|
| Status strings de domínio | 50+ | 15+ | ALTA |
| Storage keys inline | 8 | 4 | MÉDIA |
| Timeouts de UI (ms) | 8 | 6 | MÉDIA |
| Rotas hardcoded (hrefs) | 4 | 4 | BAIXA |
| Rotas no middleware | 2 | 1 | BAIXA |

---

## Grupo 1 — Criar Arquivos de Constantes (PARALLEL-GROUP-1)

### T001 - Criar `src/constants/status.ts`
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- criar: `src/constants/status.ts`

**Hardcodes detectados:**
- Content/Post: `'DRAFT','REVIEW','APPROVED','PUBLISHED','FAILED','PENDING_ART'` em `schemas/content.schema.ts:27`, `api/v1/content/.../approve/route.ts:44`, `api/v1/images/generate/route.ts:36,48,61`, `api/v1/posts/.../approve/route.ts:20`, `api/v1/posts/.../publish/route.ts:18,30`, `api/v1/posts/route.ts:74`, `components/content/ApprovalPanel.tsx:19,53`
- Blog: `'DRAFT','REVIEW','PUBLISHED'` em `schemas/blog.schema.ts:29`, `api/v1/blog/route.ts:33`, `api/v1/blog/.../publish/route.ts:20`, `components/blog-manage/page.tsx:142,190,198`, `services/blog-admin.service.ts:118`
- Theme: `'ACTIVE','DEPRIORITIZED','REJECTED'` em `schemas/theme.schema.ts:10`, `api/v1/themes/.../reject/route.ts:31,39`, `api/v1/themes/.../restore/route.ts:24`, `components/dashboard/ThemeCard.tsx:29`, `services/theme-generation.service.ts:54`
- Knowledge: `'DRAFT','VALIDATED'` em `api/v1/knowledge/cases/.../validate/route.ts:20`, `api/v1/knowledge/pains/.../validate/route.ts:18`, `api/v1/knowledge/threshold/route.ts:14,15`, `components/knowledge/PainCard.tsx:37,38`
- ImageJob: `'PENDING','PROCESSING','DONE','FAILED','DEAD_LETTER'` em `api/image-jobs/with-asset/route.ts:74,100,125`, `api/image-jobs/route.ts:59,77`, `api/v1/images/generate/route.ts:48,61`, `components/content/ImagePreviewPanel.tsx:68,114,122,135,154`

**Critérios de Aceite:**
- [ ] Constantes exportadas com `as const` e tipos derivados
- [ ] Imports atualizados em todos os consumidores
- [ ] Build passando

---

### T002 - Criar `src/constants/timing.ts`
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- criar: `src/constants/timing.ts`

**Hardcodes detectados:**
- `1500ms` — `components/dev/DataTestOverlay.tsx:44,56`
- `2000ms` — `components/content/CopyToClipboard.tsx:32`, `components/ui/copy-button.tsx:21`, `components/publishing/InstagramPublishButton.tsx:63`, `components/publishing/CopyButton.tsx:33`
- `3000ms` — `components/publishing/CopyButton.tsx:36`
- `4000ms` — `components/content/ApprovalPanel.tsx:46`

---

### T003 - Criar `src/constants/storage-keys.ts`
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- criar: `src/constants/storage-keys.ts`

**Hardcodes detectados:**
- `'inbound-forge-onboarding'` — DUPLICADO em `components/onboarding/steps/ActivationStep.tsx:24` e `components/onboarding/OnboardingWizard.tsx:16`
- `'sidebar:collapsed'` — `hooks/useSidebarState.ts:5`
- `'calendar-list-view'` — inline em `components/calendar/CalendarContent.tsx:56,63`
- `'theme'` — inline em `components/ui/theme-toggle.tsx:11,23`

---

### T004 - Atualizar `src/constants/routes.ts` — adicionar rotas faltantes
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/constants/routes.ts`

**Hardcodes detectados:**
- `/privacy` usado em `components/consent/CookieConsentBanner.tsx:79` mas ausente de ROUTES
- `/assets` usado em `components/asset-library/AssetBackgroundPicker.tsx:150` mas ausente de ROUTES
- `/onboarding` usado em `middleware.ts` como string local mas ausente de ROUTES

---

## Grupo 2 — Substituir Hardcodes (SEQUENTIAL, deps: Grupo 1)

### T005 - Atualizar nav.ts para usar ROUTES
**Tipo:** SEQUENTIAL | Dep: T004
**Arquivos:**
- modificar: `src/constants/nav.ts`

---

### T006 - Substituir status em API routes (10 arquivos)
**Tipo:** SEQUENTIAL | Dep: T001
**Arquivos:**
- `src/app/api/image-jobs/route.ts`
- `src/app/api/image-jobs/with-asset/route.ts`
- `src/app/api/v1/content/[pieceId]/approve/route.ts`
- `src/app/api/v1/images/generate/route.ts`
- `src/app/api/v1/posts/[id]/approve/route.ts`
- `src/app/api/v1/posts/[id]/publish/route.ts`
- `src/app/api/v1/posts/route.ts`
- `src/app/api/v1/blog/route.ts`
- `src/app/api/v1/blog/[idOrSlug]/publish/route.ts`
- `src/app/api/v1/blog/[idOrSlug]/route.ts`
- `src/app/api/v1/knowledge/cases/[id]/validate/route.ts`
- `src/app/api/v1/knowledge/pains/[id]/validate/route.ts`
- `src/app/api/v1/knowledge/threshold/route.ts`
- `src/app/api/v1/knowledge/cases/route.ts`
- `src/app/api/v1/knowledge/pains/route.ts`
- `src/app/api/v1/themes/[id]/reject/route.ts`
- `src/app/api/v1/themes/[id]/restore/route.ts`
- `src/app/api/v1/health/detailed/route.ts`

---

### T007 - Substituir status em componentes e services (8 arquivos)
**Tipo:** SEQUENTIAL | Dep: T001
**Arquivos:**
- `src/schemas/content.schema.ts`
- `src/schemas/blog.schema.ts`
- `src/schemas/theme.schema.ts`
- `src/components/content/ApprovalPanel.tsx`
- `src/components/content/ImagePreviewPanel.tsx`
- `src/components/knowledge/PainCard.tsx`
- `src/components/dashboard/ThemeCard.tsx`
- `src/lib/services/blog-admin.service.ts`
- `src/lib/services/theme-generation.service.ts`
- `src/app/[locale]/(protected)/blog-manage/page.tsx`
- `src/app/[locale]/(protected)/blog-manage/[slug]/review/page.tsx`

---

### T008 - Substituir magic timeouts de UI (6 arquivos)
**Tipo:** SEQUENTIAL | Dep: T002
**Arquivos:**
- `src/components/dev/DataTestOverlay.tsx`
- `src/components/content/CopyToClipboard.tsx`
- `src/components/content/ApprovalPanel.tsx`
- `src/components/ui/copy-button.tsx`
- `src/components/publishing/InstagramPublishButton.tsx`
- `src/components/publishing/CopyButton.tsx`

---

### T009 - Substituir storage keys inline (4 arquivos)
**Tipo:** SEQUENTIAL | Dep: T003
**Arquivos:**
- `src/components/onboarding/steps/ActivationStep.tsx`
- `src/components/onboarding/OnboardingWizard.tsx`
- `src/hooks/useSidebarState.ts`
- `src/components/calendar/CalendarContent.tsx`
- `src/components/ui/theme-toggle.tsx`

---

### T010 - Substituir hrefs hardcoded (4 componentes)
**Tipo:** SEQUENTIAL | Dep: T004
**Arquivos:**
- `src/app/global-error.tsx`
- `src/components/consent/CookieConsentBanner.tsx`
- `src/components/asset-library/AssetBackgroundPicker.tsx`
- `src/components/health/CostChip.tsx`
