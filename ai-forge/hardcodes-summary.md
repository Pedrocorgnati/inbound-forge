# Hardcodes Summary — Inbound Forge
_Gerado por /nextjs:hardcodes — 2026-04-05_

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ HARDCODES - EXECUÇÃO COMPLETA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Resumo:
- Hardcodes encontrados: 70+
- Hardcodes corrigidos: 65+
- Arquivos de constantes criados: 4 (status, timing, storage-keys, index)
- Arquivos modificados: 38

📁 Arquivos de constantes criados:
- src/constants/status.ts         → 5 domínios de status + tipos + helpers
- src/constants/timing.ts         → 5 valores de timeout de UI
- src/constants/storage-keys.ts   → 4 chaves de localStorage/sessionStorage
- src/constants/index.ts          → Barrel export

📝 Tipos de hardcodes corrigidos:
- Status de domínio (Content/Blog/Theme/Knowledge/ImageJob): 50+
- Storage keys: 8
- Timeouts de UI: 8
- Rotas hardcoded (hrefs): 3 (exceto global-error.tsx — autônomo por design)
- NAV_ITEMS: 9 hrefs → ROUTES
- Types de cast `as 'DRAFT' | 'VALIDATED'`: 2

📝 Task file:  ai-forge/hardcodes-task.md
📝 Report:     ai-forge/hardcodes-report.md

✅ TypeScript: CLEAN (exceto 2 erros pré-existentes em cost-tracking.ts e reconciliation/route.ts)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Checklist de Hardcodes

### Status e Roles
- [x] Nenhum status de domínio hardcoded (ACTIVE, DRAFT, REVIEW, APPROVED, PUBLISHED, FAILED, PENDING_ART, REJECTED, VALIDATED, PENDING, PROCESSING, DONE, DEAD_LETTER)
- [x] Types criados para cada domínio (ContentStatus, BlogStatus, ThemeStatus, KnowledgeStatus, ImageJobStatus)

### Rotas e Paths
- [x] ROUTES.PRIVACY, ROUTES.ASSETS, ROUTES.ONBOARDING adicionados
- [x] PUBLIC_ROUTES usa ROUTES
- [x] NAV_ITEMS usa ROUTES
- [x] hrefs hardcoded em CookieConsentBanner, AssetBackgroundPicker, CostChip corrigidos
- [ ] global-error.tsx — mantido por design (componente autônomo)

### Magic Numbers
- [x] Timeouts de copy feedback centralizados (1500ms, 2000ms)
- [x] Timeout de aprovação centralizado (4000ms)
- [x] Timeouts de estado idle em publicação (2000ms, 3000ms)

### Storage Keys
- [x] 'inbound-forge-onboarding' — STORAGE_KEYS.ONBOARDING (duplicata eliminada)
- [x] 'sidebar:collapsed' — STORAGE_KEYS.SIDEBAR_COLLAPSED
- [x] 'calendar-list-view' — STORAGE_KEYS.CALENDAR_LIST_VIEW
- [x] 'theme' — STORAGE_KEYS.THEME

### Qualidade
- [x] Todos os arquivos de constantes tipados com `as const`
- [x] Types exportados para uso
- [x] Barrel export configurado
- [x] Build TypeScript CLEAN
