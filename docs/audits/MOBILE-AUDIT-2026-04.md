# Mobile-First Audit — 2026-04

**Rastreabilidade:** TASK-4 (CL-145) — intake-review onda P0.
**Viewport de referencia:** 375 x 667 (iPhone SE) e 390 x 844 (iPhone 14).
**Data:** 2026-04-23.

---

## 1. Escopo auditado

| Rota | Status |
|------|--------|
| `/(protected)/dashboard` | OK — BentoGrid colapsa em 1 coluna no mobile (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`). |
| `/(protected)/calendar` | OK — CalendarListView renderiza na viewport < 768px; WeekView/MonthView caem por back-up. |
| `/(protected)/knowledge` | OK — Tabs empilham e EmptyState responsivo. |
| `/(protected)/leads` | OK — LeadsList grid 1→2→3; PipelineBoard agora tem scroll horizontal snap (ST003). |

## 2. Correcoes aplicadas

### ST002 — Dashboard BentoGrid

Confirmado: `grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3` ja presente. Cards "wide" marcam col-span 2 somente em md+. Mobile renderiza 1 por linha sem perda de info.

### ST003 — PipelineBoard scroll horizontal

Antes: `grid grid-cols-1 md:grid-cols-5` — empilhava verticalmente em mobile (navegacao pesada para 5 colunas).

Depois: `flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-5`. Colunas ganham `min-w-[80vw] snap-start` no mobile e `min-w-0` no md+.

### ST004 — Calendar list view mobile

Ja existia como `CalendarListView.tsx` e `CalendarContent` usa `isMobile && showListView` para selecionar vista agenda. TASK-4 confirmou o comportamento, nao precisa mudanca.

### ST005 — Touch targets

Auditado `src/components/ui/button.tsx`:

| Size | Height | WCAG 44x44 |
|------|--------|------------|
| `default` | `h-11 min-h-[44px]` | OK |
| `md` | `h-11 min-h-[44px]` | OK |
| `lg` | `h-12 min-h-[48px]` | OK |
| `icon` | `h-11 w-11 min-h-[44px] min-w-[44px]` | OK |
| `sm` | `h-9` (36px) | USO RESTRITO — permitido em chips densos desktop-only |

Regra: nunca usar `size="sm"` em CTAs primarios em mobile. Documentado no UX-PATTERNS.md.

## 3. Lighthouse (target)

Meta: mobile score >= 85 nas paginas auditadas. Execucao depende de build + servidor em pre-deploy (`pre-deploy-testing`); script de baseline em `tests/mobile/lighthouse-mobile.spec.ts` (criacao diferida para P1 se necessario — Playwright ja presente como devDep).

## 4. Issues remanescentes (backlog P1/P2)

- `CalendarGrid` WeekView em 375px: day columns ficam muito estreitas quando ha mais de 2 posts — mitigado pela list-view, porem uma versao "mini day" poderia expandir ao tap. (P2)
- `Header`: workers dots podem sobrepor em < 360px. (P2 — `flex-wrap` ja planejado)
- `BentoGrid` cards "wide": em mobile, wide e normal renderizam iguais (col-span implicito), o que e visualmente correto, porem a altura padrao poderia diminuir em < 400px. (P3)

## 5. Comandos de verificacao manual

```bash
# Playwright (quando disponivel)
npx playwright test --grep "mobile"

# Lighthouse CI
npm run build && npm start
npx @lhci/cli autorun --collect.url=http://localhost:3000/pt-BR/dashboard
```
