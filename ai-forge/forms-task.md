# Forms Task — Inbound Forge

Gerado em: 2026-04-05

---

## Resumo de Issues

| # | Severidade | Arquivo(s) | Tipo |
|---|---|---|---|
| T001 | CRÍTICO | PainsStep, FirstCaseStep, PatternForm, ArticleForm | a11y: textareas sem aria-invalid/aria-describedby |
| T002 | CRÍTICO | PostForm | a11y: campos raw sem aria attrs de erro |
| T003 | CRÍTICO | LeadForm | a11y: Checkbox LGPD sem label associado (htmlFor) |
| T004 | ALTO | ConversionForm | a11y: RadioGroup sem fieldset/legend; date input sem aria attrs |
| T005 | MÉDIO | ConversionForm | isSubmitting via useState em vez de formState |
| T006 | MÉDIO | todos com useForm | validation mode: nenhum form usa mode:'onBlur' |
| T007 | MÉDIO | PatternForm, CaseForm | sem elemento `<form>`, Enter não submete |

---

### T001 – Textareas raw sem aria-invalid/aria-describedby
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Status:** COMPLETED
**Arquivos:**
- modificar: `src/components/onboarding/steps/PainsStep.tsx`
- modificar: `src/components/onboarding/steps/FirstCaseStep.tsx`
- modificar: `src/components/knowledge/PatternForm.tsx`
- modificar: `src/components/blog-admin/ArticleForm.tsx`

**Descrição:** Textareas inline não têm `aria-invalid` e `aria-describedby` apontando para o id da mensagem de erro. Screen readers não anunciam o estado de erro nem a mensagem.

**Critérios de Aceite:**
- `aria-invalid="true"` presente quando há erro
- `aria-describedby` aponta para o id do `<p>` de erro
- id correto no elemento de erro

**Estimativa:** 1h

---

### T002 – PostForm: raw inputs/select/textarea sem aria attrs de erro
**Tipo:** SEQUENTIAL
**Dependências:** T001
**Status:** COMPLETED
**Arquivos:**
- modificar: `src/components/publishing/PostForm.tsx`

**Descrição:** PostForm usa elementos HTML raw (`<input>`, `<select>`, `<textarea>`) sem `aria-invalid` e `aria-describedby` nas mensagens de erro, ao contrário dos demais forms que usam os componentes Input/Select/Textarea.

**Critérios de Aceite:**
- Campos com erro têm `aria-invalid="true"` e `aria-describedby` com id único
- `<p>` de erro tem id correspondente e `role="alert"`

**Estimativa:** 1h

---

### T003 – LeadForm: Checkbox LGPD sem label associado
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED
**Arquivos:**
- modificar: `src/components/leads/LeadForm.tsx`

**Descrição:** O Checkbox do consentimento LGPD não tem um `id` e o texto label está em `<p>` não associado. Screen readers não anunciam o label do checkbox.

**Critérios de Aceite:**
- Checkbox tem `id="lgpd-consent"`
- Texto envolto em `<label htmlFor="lgpd-consent">`

**Estimativa:** 0.5h

---

### T004 – ConversionForm: RadioGroup sem fieldset/legend; occurredAt sem aria attrs
**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** COMPLETED
**Arquivos:**
- modificar: `src/components/conversions/ConversionForm.tsx`

**Descrição:** Grupo de radio buttons não está envolto em `<fieldset>`/`<legend>`, violando WCAG para grupos de controles. O campo `occurredAt` (date) não tem `aria-invalid` nem `aria-describedby`.

**Critérios de Aceite:**
- RadioGroup envolto em `<fieldset>` com `<legend>` visível
- `occurredAt` input tem `aria-invalid` e `aria-describedby` quando com erro

**Estimativa:** 0.5h

---

### T005 – ConversionForm: isSubmitting via useState em vez de formState
**Tipo:** SEQUENTIAL
**Dependências:** T004
**Status:** COMPLETED
**Arquivos:**
- modificar: `src/components/conversions/ConversionForm.tsx`

**Descrição:** `isSubmitting` é gerenciado com `useState` em vez de `formState.isSubmitting` do react-hook-form, causando inconsistência e potencial race condition.

**Critérios de Aceite:**
- `useState(false)` para isSubmitting removido
- Usa `formState.isSubmitting` do `useForm`

**Estimativa:** 0.5h

---

### T006 – Validation mode onBlur ausente em forms com react-hook-form
**Tipo:** PARALLEL-GROUP-2
**Dependências:** none
**Status:** COMPLETED
**Arquivos:**
- modificar: `src/components/auth/login-form.tsx`
- modificar: `src/components/conversions/ConversionForm.tsx`
- modificar: `src/components/onboarding/steps/PainsStep.tsx`
- modificar: `src/components/onboarding/steps/FirstCaseStep.tsx`
- modificar: `src/components/publishing/PostForm.tsx`
- modificar: `src/components/blog-admin/ArticleForm.tsx`

**Descrição:** Nenhum form com react-hook-form define `mode: 'onBlur'`. Erros aparecem apenas no submit, degradando a UX.

**Critérios de Aceite:**
- `useForm({ mode: 'onBlur', reValidateMode: 'onChange', ... })` em cada form

**Estimativa:** 0.5h

---

### T007 – PatternForm e CaseForm: sem elemento `<form>` (Enter não submete)
**Tipo:** PARALLEL-GROUP-3
**Dependências:** none
**Status:** COMPLETED
**Arquivos:**
- modificar: `src/components/knowledge/PatternForm.tsx`
- modificar: `src/components/knowledge/CaseForm.tsx`

**Descrição:** Esses forms usam `<div>` como container e botões com `onClick`. O Enter não submete o form e é semanticamente incorreto.

**Critérios de Aceite:**
- Container raiz substituído por `<form onSubmit={...} noValidate>`
- Botão primário com `type="submit"`, demais com `type="button"`

**Estimativa:** 1h
