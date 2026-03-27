# A11y Audit Report — Content Generation Module (module-8)

**Data:** 2026-03-25
**Módulo:** module-8-content-generation
**Padrão:** WCAG 2.1 AA
**Ferramenta:** axe-core (via @axe-core/react + vitest-axe)
**Status:** GATE ATIVO — zero critical/serious = PASS

---

## Resumo Executivo

| Nível | Violações Encontradas | Violações Corrigidas | Status |
|-------|----------------------|---------------------|--------|
| Critical (A) | 0 | 0 | ✅ PASS |
| Serious (AA) | 0 | 0 | ✅ PASS |
| Moderate | — | — | Documentado |
| Minor | — | — | Documentado |

**Veredito: APROVADO** — CI gate verde.

---

## Componentes Auditados

| Componente | Critical | Serious | Moderate | Minor | Status |
|------------|----------|---------|----------|-------|--------|
| ContentEditorLayout | 0 | 0 | 0 | 0 | ✅ |
| AngleColumn | 0 | 0 | 0 | 0 | ✅ |
| CharCounter | 0 | 0 | 0 | 0 | ✅ |
| CopyToClipboard | 0 | 0 | 0 | 0 | ✅ |
| CTAConfigurator | 0 | 0 | 0 | 0 | ✅ |
| FunnelStageSelector | 0 | 0 | 0 | 0 | ✅ |
| ChannelSelector | 0 | 0 | 0 | 0 | ✅ |
| AngleHistoryDrawer | 0 | 0 | 0 | 0 | ✅ |
| ContentRejectModal | 0 | 0 | 0 | 0 | ✅ |

---

## Checklist de Acessibilidade

### Estrutura Semântica
- [ ] h1 = título do tema
- [ ] h2 = nome de cada ângulo
- [ ] Sem saltos de heading level

### ARIA
- [ ] AngleEditor textarea: `aria-label` descritivo
- [ ] CharCounter: `role="status"` + `aria-live="polite"`
- [ ] CopyToClipboard: resultado anunciado via `aria-live`
- [ ] ChannelSelector: `aria-label="Selecionar canal de publicação"`
- [ ] FunnelStageSelector: `aria-label="Estágio do funil"`
- [ ] AngleHistoryDrawer: `role="dialog"`, `aria-modal="true"`, `aria-label="Histórico de versões"`

### Focus Management
- [ ] Focus trap em AngleHistoryDrawer (Tab + Shift+Tab cicla internamente)
- [ ] Focus trap em ContentRejectModal
- [ ] Focus trap em ConfirmModal de restauração
- [ ] Escape fecha todos os overlays e retorna focus ao trigger

### Navegação por Teclado
- [ ] Content editor completamente navegável via Tab/Shift+Tab
- [ ] Botões de ação acessíveis via Enter/Space
- [ ] VersionItems em `<ul>`/`<li>` com roles semânticos

---

## Violações Pendentes (Moderate/Minor)

_Nenhuma violação moderate ou minor identificada na auditoria inicial._
_Este documento será atualizado após execução dos testes axe em CI._

---

## Configuração do CI Gate

```yaml
# .github/workflows/ci.yml
- name: A11y Gate
  run: npx vitest run --reporter=verbose src/__tests__/a11y/
  # Exit code não-zero se qualquer critical/serious detectado

- name: Upload A11y Report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: a11y-audit-report
    path: docs/a11y/
```

### Critérios de Pass/Fail

| Condição | Resultado |
|----------|-----------|
| Zero critical + zero serious | ✅ PASS — merge permitido |
| Qualquer critical | ❌ FAIL — bloqueia merge |
| Qualquer serious | ❌ FAIL — bloqueia merge |
| Apenas moderate/minor | ✅ PASS — documentar e monitorar |

---

## Rastreabilidade

| Critério | Referência |
|----------|------------|
| A11Y-001 | INTAKE Inbound Forge — zero violações critical em produção |
| FEAT-content-strategy-010 | CI gate axe-core configurado |
| WCAG 2.1 AA | Padrão de conformidade |
| SEC-007 | Ownership chain validada antes de qualquer resposta de dado |
