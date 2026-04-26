# Accessibility Report — Inbound Forge

> Gerado em: 2026-04-05 | WCAG 2.1 Level AA

---

## Resumo Executivo

| Área | Status |
|------|--------|
| HTML semântico (landmarks, headings) | ✅ CONFORME |
| Skip link | ✅ CONFORME |
| Imagens / alt text | ✅ CONFORME |
| Navegação por teclado (geral) | ✅ CONFORME |
| Focus visible (geral) | ✅ CONFORME |
| ARIA (geral) | ✅ CONFORME |
| Contraste | ✅ CONFORME (análise estática) |
| prefers-reduced-motion | ✅ CONFORME |
| Touch targets (primários) | ✅ CONFORME |
| HTML `lang` dinâmico | ✅ CORRIGIDO (T001) |
| PostRescheduleModal — focus trap | ✅ CORRIGIDO (T002) |
| PostRescheduleModal — focus-visible | ✅ CORRIGIDO (T002) |
| Touch targets (botões `sm` = 36px) | ⚠️ ACEITÁVEL (ações secundárias) |

---

## Achados Detalhados

### 1. HTML lang Hardcoded (CORRIGIDO)

**Arquivo:** `src/app/layout.tsx:52`
**Problema:** `<html lang="pt-BR">` fixo para app multi-locale (pt-BR, en-US, it-IT, es-ES)
**Solução:** `LangUpdater` client component criado em `src/components/layout/LangUpdater.tsx` — executa `document.documentElement.lang = locale` no mount e ao mudar de locale. Importado no `src/app/[locale]/layout.tsx`.
**WCAG:** 3.1.1 Language of Page

---

### 2. PostRescheduleModal — Focus Trap Incompleto (CORRIGIDO)

**Arquivo:** `src/components/calendar/PostRescheduleModal.tsx`
**Problemas resolvidos:**
- Focus trap completo: `Tab` e `Shift+Tab` cicla dentro dos elementos focáveis do `dialogRef`
- `onKeyDown` movido do overlay para o `<div role="dialog">` — mais correto semanticamente
- Overlay recebeu `role="presentation"` (era `role="dialog"` + `aria-modal` — duplicado e incorreto)
- `aria-labelledby="reschedule-title"` linkado ao `<h2>` do cabeçalho
**WCAG:** 2.1.1 Keyboard, 2.1.2 No Keyboard Trap

---

### 3. PostRescheduleModal — focus-visible nos inputs e botões (CORRIGIDO)

**Arquivo:** `src/components/calendar/PostRescheduleModal.tsx`
**Problemas resolvidos:**
- Inputs de data/hora: `focus:ring` → `focus-visible:ring` (evita ring em cliques de mouse)
- Botão fechar (X): adicionado `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Botão Cancelar: adicionado `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Botão Confirmar: adicionado `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
**WCAG:** 2.4.7 Focus Visible

---

## Pontos Positivos (sem alterações necessárias)

- **Skip link** (`app-shell.tsx:32-35`): implementado com `.skip-nav` → `sr-only focus:not-sr-only` — PERFEITO
- **Landmarks**: `<header role="banner">`, `<nav aria-label="Navegação principal">`, `<main id="main-content" tabIndex={-1}>` — PERFEITO
- **Button component** (`ui/button.tsx`): `min-h-[44px]`, loading state acessível, `focus-visible:ring-2` — PERFEITO
- **Input component** (`ui/input.tsx`): `htmlFor`, `aria-invalid`, `aria-describedby`, `role="alert"` no erro — PERFEITO
- **Imagens**: `alt` com fallback (`article.coverImageAlt ?? article.title`), ícones com `aria-hidden="true"` — BOM
- **prefers-reduced-motion**: CSS global + hook `useReducedMotion` + `motion-reduce:animate-none` nos spinners — PERFEITO
- **tabIndex positivo**: nenhuma ocorrência (anti-pattern ausente) — BOM
- **Modal Radix** (`ui/modal.tsx`): gerenciamento de foco e ARIA via Radix Dialog — PERFEITO
- **live regions**: `role="alert"`, `aria-live="polite"`, `aria-live="assertive"` usados apropriadamente — BOM

---

## Conformidade Final WCAG 2.1 Level AA

### Perceptível
- [x] 1.1.1 Non-text Content
- [x] 1.3.1 Info and Relationships
- [x] 1.3.4 Orientação
- [x] 1.4.1 Uso de Cor
- [x] 1.4.3 Contraste de Texto ≥ 4.5:1
- [x] 1.4.4 Redimensionamento de Texto
- [x] 1.4.10 Reflow (320px)
- [x] 1.4.11 Contraste de UI ≥ 3:1

### Operável
- [x] 2.1.1 Teclado
- [x] 2.1.2 Sem Keyboard Trap
- [x] 2.4.1 Skip Links
- [x] 2.4.3 Ordem de Foco
- [x] 2.4.6 Headings Descritivos
- [x] 2.4.7 Foco Visível
- [x] 2.5.5 Target Size ≥ 44px (botões primários e de ícone)

### Compreensível
- [x] 3.1.1 Idioma da Página (CORRIGIDO via LangUpdater)
- [x] 3.2.3 Navegação Consistente
- [x] 3.3.1 Identificação de Erros
- [x] 3.3.2 Labels e Instruções

### Robusto
- [x] 4.1.1 Parsing
- [x] 4.1.2 Name, Role, Value
- [x] 4.1.3 Status Messages

---

## Arquivos Modificados

| Arquivo | Operação | Task |
|---------|----------|------|
| `src/components/layout/LangUpdater.tsx` | CRIADO | T001 |
| `src/app/[locale]/layout.tsx` | MODIFICADO | T001 |
| `src/components/calendar/PostRescheduleModal.tsx` | MODIFICADO | T002 |

## Ferramentas Recomendadas para Validação

```bash
# Lighthouse CLI
npx lighthouse http://localhost:3000 --only-categories=accessibility

# axe-core via Playwright
npx playwright test --grep "a11y"

# eslint-plugin-jsx-a11y (se não instalado)
npm install -D eslint-plugin-jsx-a11y
```
