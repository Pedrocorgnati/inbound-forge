# Styling Tasks — inbound-forge
_Gerado por /nextjs:styling em 2026-04-05_

---

### T001 – Adicionar tokens semânticos faltantes ao tailwind.config.ts
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED

**Arquivos:**
- modificar: `tailwind.config.ts`
- modificar: `src/components/ui/badge.tsx`
- modificar: `src/components/ui/button.tsx`

**Descrição:**
Badge e Button têm cores hardcoded via Tailwind arbitrary values (`text-[#065F46]`, `hover:bg-[#B91C1C]`, etc.).
Tokens faltantes que precisam ser declarados no config: `*.text` para cores semânticas (success, warning, danger, error, info),
`danger.hover`, `primary.light-hover`, e as cores do badge `instagram`.

**Critérios de Aceite:**
- [ ] `success.text`, `warning.text`, `danger.text`, `error.text`, `info.text` definidos no config
- [ ] `danger.hover` e `primary.light-hover` definidos no config
- [ ] `instagram` (bg + text) definido no config
- [ ] `badge.tsx` usa apenas classes de token (zero `[#...]`)
- [ ] `button.tsx` usa apenas classes de token (zero `[#...]`)

**Estimativa:** 0.5h

---

### T002 – Criar componente Textarea reutilizável
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED ✓

**Arquivos:**
- criar: `src/components/ui/textarea.tsx`
- modificar: `src/components/ui/index.ts`

**Descrição:**
Não existe `textarea.tsx` na UI library. A mesma string de 250–330 chars de className é repetida 20x em 14 arquivos.
Criar um componente `Textarea` com a mesma API do `Input` (label, error, helperText) e base styles extraídas.

**Critérios de Aceite:**
- [ ] `textarea.tsx` criado com label, error, helperText, className props
- [ ] Base classes extraídas (não repetidas inline)
- [ ] Exportado via `index.ts`
- [ ] Accessibility: aria-invalid, aria-describedby, id derivado do label

**Estimativa:** 0.5h

---

### T003 – Substituir textareas inline pelo componente Textarea (14 arquivos)
**Tipo:** PARALLEL-GROUP-1
**Dependências:** T002
**Status:** TODO

**Arquivos:**
- modificar: `src/components/knowledge/PatternForm.tsx`
- modificar: `src/components/knowledge/ObjectionForm.tsx`
- modificar: `src/components/knowledge/PainForm.tsx`
- modificar: `src/components/blog-admin/ArticleForm.tsx`
- modificar: `src/components/onboarding/steps/PainsStep.tsx`
- modificar: `src/components/onboarding/steps/ObjectionsStep.tsx`
- modificar: `src/components/onboarding/steps/SolutionsStep.tsx`
- modificar: `src/components/onboarding/steps/FirstCaseStep.tsx`
- modificar: `src/components/conversions/ConversionForm.tsx`
- modificar: `src/components/leads/LeadForm.tsx`
- modificar: `src/components/calendar/MonthView.tsx`
- modificar: `src/components/calendar/CalendarDay.tsx`
- modificar: `src/components/blog-admin/ArticleEditor.tsx`
- modificar: `src/components/onboarding/CredentialTestCard.tsx`

**Descrição:**
Substituir `<textarea className="flex min-h-[...] w-full rounded-md border border-input ..." />` pelo componente `<Textarea />`.
Para casos com `min-h` customizado, usar `className="min-h-[Xpx]"` para override.
Para casos com `font-mono` ou `resize-y`, também via `className`.

**Critérios de Aceite:**
- [ ] Nenhuma string de className de textarea >80 chars inline
- [ ] Todos os arquivos importam `Textarea` de `@/components/ui`
- [ ] Comportamento visual idêntico (min-h customizados preservados)

**Estimativa:** 1.5h

---

### T004 – Remover dependência next-themes (opcional)
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** TODO

**Arquivos:**
- modificar: `package.json`

**Descrição:**
`next-themes@0.4.4` está instalado mas não é usado. O projeto usa implementação manual em `theme-toggle.tsx`.
Remover a dependência reduz o bundle e evita confusão.

**Critérios de Aceite:**
- [ ] `next-themes` removido do package.json
- [ ] `npm install` / `npm run build` sem erros

**Estimativa:** 0.25h
**Nota:** Confirmar com o time antes de remover — pode ser intencional para uso futuro.
