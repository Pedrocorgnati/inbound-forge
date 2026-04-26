# Hardcodes Report — Inbound Forge
_Gerado por /nextjs:hardcodes — 2026-04-05_

## Arquivos de Constantes Criados

| Arquivo | Conteúdo |
|---------|----------|
| `src/constants/status.ts` | ContentStatus, BlogStatus, ThemeStatus, KnowledgeStatus, ImageJobStatus, HealthStatus |
| `src/constants/timing.ts` | UI_TIMING — timeouts de copy/aprovação/publicação |
| `src/constants/storage-keys.ts` | STORAGE_KEYS — onboarding, sidebar, calendar, theme |
| `src/constants/index.ts` | Barrel export de todos os constants |

## Arquivos Modificados

### Constants Atualizados
- `src/constants/routes.ts` — adicionados ASSETS, ONBOARDING, PRIVACY; PUBLIC_ROUTES usa ROUTES
- `src/constants/nav.ts` — NAV_ITEMS agora usa ROUTES em vez de strings literais

### Schemas
- `src/schemas/content.schema.ts` — enum status usa CONTENT_STATUS
- `src/schemas/blog.schema.ts` — enum status usa BLOG_STATUS
- `src/schemas/theme.schema.ts` — enum status usa THEME_STATUS

### API Routes
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

### Pages
- `src/app/[locale]/(protected)/blog-manage/page.tsx`
- `src/app/[locale]/(protected)/blog-manage/[slug]/review/page.tsx`

### Components
- `src/components/content/ApprovalPanel.tsx` — status + timing
- `src/components/content/ImagePreviewPanel.tsx` — IMAGE_JOB_STATUS
- `src/components/content/CopyToClipboard.tsx` — UI_TIMING
- `src/components/knowledge/PainCard.tsx` — KNOWLEDGE_STATUS
- `src/components/dashboard/ThemeCard.tsx` — THEME_STATUS
- `src/components/dev/DataTestOverlay.tsx` — UI_TIMING
- `src/components/ui/copy-button.tsx` — UI_TIMING
- `src/components/ui/theme-toggle.tsx` — STORAGE_KEYS
- `src/components/publishing/InstagramPublishButton.tsx` — UI_TIMING
- `src/components/publishing/CopyButton.tsx` — UI_TIMING
- `src/components/consent/CookieConsentBanner.tsx` — ROUTES.PRIVACY
- `src/components/asset-library/AssetBackgroundPicker.tsx` — ROUTES.ASSETS
- `src/components/health/CostChip.tsx` — ROUTES.HEALTH
- `src/components/onboarding/steps/ActivationStep.tsx` — STORAGE_KEYS
- `src/components/onboarding/OnboardingWizard.tsx` — STORAGE_KEYS
- `src/components/calendar/CalendarContent.tsx` — STORAGE_KEYS

### Hooks
- `src/hooks/useSidebarState.ts` — STORAGE_KEYS

### Services
- `src/lib/services/blog-admin.service.ts` — BLOG_STATUS
- `src/lib/services/theme-generation.service.ts` — KNOWLEDGE_STATUS
- `src/lib/services/angle-generation.service.ts` — THEME_STATUS

## Exceções Documentadas

| Arquivo | Hardcode mantido | Motivo |
|---------|-----------------|--------|
| `src/app/global-error.tsx` | `href="/"` | Componente intencionalmente autônomo sem imports de módulos internos |
| `src/components/asset-library/AssetUploadZone.tsx` | `upload.status === 'done'/'error'/'uploading'` | Status local de estado de upload UI — não é status de domínio DB |
| `src/components/analytics/ReconciliationPanel.tsx` | `filter === 'pending'` | Estado local de filtro de UI — não é status de domínio |
| `src/components/layout/worker-dot.tsx` | `status === 'ERROR'` | Worker status — fora do escopo do STATUS de domínio principal |
| `src/components/publishing/InstagramPreChecks.tsx` | `status === 'warn'` | Estado local de pré-checks |
| `src/components/onboarding/CredentialTestCard.tsx` | `status === 'testing'` | Estado local de UI |
| Timers de pollingInterval em hooks | `POLL_INTERVAL`, `5 * 60 * 1000` | Já usando constantes locais nomeadas |

## Hardcodes não corrigidos (fora do escopo)

- **ENV vars** → `/nextjs:configuration`
- **Textos de UI inline** (toast messages) → Seriam migrados para `i18n` em projeto multilíngue
- **Magic numbers de paginação `take: 1, take: 5`** → São limites de query específicos, não paginação de UI
- **Inline limit e page em knowledge/posts routes** → Já usando validação Zod com defaults
