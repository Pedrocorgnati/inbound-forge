# PRD: Acessibilidade e Semântica — Inbound Forge

> Gerado em: 2026-04-05 | Stack: Next.js + next-intl + Radix UI + Tailwind

---

## Problemas Encontrados

### Semântica (WCAG 3.1.1)
- HTML raiz com `lang="pt-BR"` hardcoded — app multi-locale (pt-BR, en-US, it-IT, es-ES)
- Locale layout usa `<div lang={locale}>` como workaround, mas o atributo `lang` no `<html>` permanece errado para locales não-PT

### Navegação por Teclado (WCAG 2.1.x)
- PostRescheduleModal: focus trap incompleto — apenas seta foco inicial, sem ciclo Tab/Shift+Tab
- PostRescheduleModal: inputs de data/hora usam `focus:ring` em vez de `focus-visible:ring` (mostra ring em cliques de mouse)
- PostRescheduleModal: botões Cancelar e Confirmar sem focus ring algum
- PostRescheduleModal: botão fechar (X) sem focus ring

### ARIA (WCAG 4.1.x)
- Sem issues críticos — uso de ARIA está bem implementado no restante do projeto

### Imagens (WCAG 1.1.1)
- Sem issues críticos — alt text implementado com fallbacks adequados

### Contraste (WCAG 1.4.x)
- Sem issues críticos detectados via análise estática

### Motion (WCAG 2.3.x)
- `prefers-reduced-motion` implementado tanto em CSS global quanto em hook JS — CONFORME

### Touch (WCAG 2.5.x)
- Button size `sm` (`h-9` = 36px) abaixo do recomendado 44px para ações secundárias
- Todos os botões primários e de ícone atendem o mínimo de 44px

---

## Conformidade WCAG 2.1

### Level A (Mínimo)
| Critério | Status | Notas |
|----------|--------|-------|
| 1.1.1 Non-text Content | ✅ | Alt text com fallback adequado |
| 1.3.1 Info and Relationships | ✅ | Landmarks, headings e listas semânticos |
| 2.1.1 Keyboard | ⚠️ | PostRescheduleModal sem focus trap completo |
| 2.4.1 Bypass Blocks | ✅ | Skip link implementado e estilizado |
| 4.1.2 Name, Role, Value | ⚠️ | Botões sem focus ring no modal customizado |

### Level AA (Recomendado)
| Critério | Status | Notas |
|----------|--------|-------|
| 1.4.3 Contrast (Minimum) | ✅ | Sem violações detectadas estaticamente |
| 1.4.4 Resize Text | ✅ | Uso de rem/tailwind |
| 2.4.7 Focus Visible | ⚠️ | PostRescheduleModal: focus não visível em inputs e botões |
| 3.1.1 Language of Page | ⚠️ | HTML raiz com lang hardcoded |
| 3.3.3 Error Suggestion | ✅ | Mensagens de erro inline com role="alert" |

---

## Impacto
- Componentes afetados: 2 (`src/app/layout.tsx`, `PostRescheduleModal.tsx`)
- Páginas afetadas: todas (lang) + `/calendar` (modal)
- Risco: **MÉDIO**

---

## Tasks

### T001 - Atualizar lang do HTML dinamicamente via locale

**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- criar: `src/components/layout/LangUpdater.tsx`
- modificar: `src/app/[locale]/layout.tsx`

**Descrição:**
O layout raiz tem `<html lang="pt-BR">` hardcoded. Como Next.js App Router exige que o root layout contenha as tags `<html>` e `<body>`, o locale layout não pode redeclará-las. A solução é adicionar um client component mínimo (`LangUpdater`) que executa `document.documentElement.lang = locale` no mount e em mudanças de locale, garantindo que screen readers leiam o idioma correto do documento.

**WCAG:** 3.1.1 Language of Page

**Critérios de Aceite:**
- [ ] `document.documentElement.lang` reflete o locale da rota atual
- [ ] Funciona para os 4 locales: pt-BR, en-US, it-IT, es-ES
- [ ] Zero regressão de hidratação (sem mismatches)

**Estimativa:** 0.5h

---

### T002 - Corrigir foco e focus trap do PostRescheduleModal

**Tipo:** SEQUENTIAL
**Dependências:** T001
**Arquivos:**
- modificar: `src/components/calendar/PostRescheduleModal.tsx`

**Descrição:**
PostRescheduleModal é um `<div role="dialog">` customizado (não usa Radix Dialog). Tem três problemas de acessibilidade:
1. Inputs de data/hora usam `focus:outline-none focus:ring-1` — deve ser `focus-visible:` para não mostrar ring em cliques de mouse
2. Botões Cancelar e Confirmar e botão X não têm nenhum focus ring
3. O focus trap implementado só seta o foco inicial — Tab e Shift+Tab podem sair do modal

**WCAG:** 2.1.1 Keyboard, 2.1.2 No Keyboard Trap, 2.4.7 Focus Visible

**Critérios de Aceite:**
- [ ] Tab cicla apenas dentro do modal quando aberto
- [ ] Shift+Tab cicla inversamente dentro do modal
- [ ] Inputs mostram ring apenas no foco via teclado (focus-visible)
- [ ] Botões X, Cancelar e Confirmar têm focus ring visível via teclado
- [ ] Esc fecha o modal (já implementado, manter)

**Estimativa:** 1h

---

## Status das Tasks

| Task | Status |
|------|--------|
| T001 | COMPLETED |
| T002 | COMPLETED |
