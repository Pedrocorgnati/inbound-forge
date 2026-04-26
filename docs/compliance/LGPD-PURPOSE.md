# LGPD — FINALIDADE ESPECÍFICA E BASE LEGAL

**Status:** canônico
**Última revisão:** 2026-04-23
**Base legal:** Lei 13.709/2018 (LGPD) + Lei 15.352/2026 + ANPD Radar Tecnológico nº 3 (nov/2024)
**Fonte:** INTAKE.md §"Compliance e Dados"

---

## 1. Escopo

Este documento materializa o princípio de **finalidade específica** (LGPD Art. 6º I) para cada categoria de dado manipulado pelo Inbound Forge, declarando base legal, retenção e controles aplicados.

O Inbound Forge processa textos públicos via web scraping e deve operar em conformidade com a LGPD e regulamentações da ANPD sobre scraping.

---

## 2. Inventário de Dados e Finalidades

### 2.1 Textos coletados via scraping (corpus temático)

| Campo | Valor |
|-------|-------|
| **Fonte** | Fóruns públicos, marketplaces, descrições de vagas — manualmente curados pelo operador |
| **Finalidade específica** | Alimentar o motor de inteligência temática para identificação de padrões de dor operacional |
| **Base legal** | Legítimo interesse (LGPD Art. 10) |
| **Dados coletados** | Texto público não-pessoal (trechos anonimizados classificados por categoria de dor, setor, tipo de problema) |
| **Dados descartados antes da persistência** | Nomes, e-mails, telefones, documentos, URLs de perfil, qualquer PII |
| **Retenção** | Texto original descartado após classificação. Apenas classificação agregada (categoria, setor, score) é retida |
| **Compartilhamento** | NENHUM — dados não são vendidos, compartilhados ou usados para contato direto |
| **Opt-out** | Não aplicável (sem PII persistida). Se ANPD regulamentar novos requisitos, sistema será adaptado |

### 2.2 Leads (contatos inbound)

| Campo | Valor |
|-------|-------|
| **Fonte** | Formulários do blog, respostas a CTAs, contatos diretos do operador |
| **Finalidade específica** | Contato comercial solicitado pelo próprio lead; agendamento de reuniões via Cal.com |
| **Base legal** | Consentimento (LGPD Art. 7º I) no momento do preenchimento do formulário |
| **Dados coletados** | Nome, e-mail, empresa (opcional), mensagem, origem do lead (UTM/referer) |
| **Retenção** | 24 meses após último contato. Após isso, anonimização (nome e e-mail → hash) mantendo apenas métricas agregadas |
| **Compartilhamento** | Cal.com (agendamento) — processador sob contrato padrão. Nenhum outro compartilhamento |
| **Opt-out** | Link de unsubscribe + endpoint `DELETE /api/v1/leads/{id}` com confirmação |

### 2.3 Conteúdo gerado (posts, artigos)

| Campo | Valor |
|-------|-------|
| **Fonte** | Geração assistida (Claude) a partir de temas rankeados |
| **Finalidade** | Publicação como conteúdo de marketing do operador |
| **Base legal** | Não aplicável (dados não-pessoais, conteúdo autoral) |
| **Retenção** | Indefinida; versionamento preservado no banco |

### 2.4 Logs de operação

| Campo | Valor |
|-------|-------|
| **Fonte** | Sistema (auditoria de coletas e publicações) |
| **Finalidade específica** | Auditoria, prestação de contas à ANPD, troubleshooting |
| **Base legal** | Legítimo interesse (LGPD Art. 10) e cumprimento de obrigação regulatória |
| **Dados coletados** | Data, fonte, volume, resultado de classificação, hash do texto original |
| **Retenção** | 5 anos (alinhado com prazo prescricional para fiscalização) |
| **Compartilhamento** | Apenas sob requisição formal da ANPD |

---

## 3. Princípios Aplicados

Alinhados com LGPD Art. 6º:

1. **Finalidade específica** (Art. 6º I) — cada dado tem finalidade declarada neste documento. Uso para finalidade diversa exige atualização deste doc + avaliação de base legal.
2. **Adequação** (Art. 6º II) — coleta limitada ao necessário para o motor temático e geração de conteúdo.
3. **Necessidade / retenção mínima** (Art. 6º III) — textos originais descartados após classificação; leads anonimizados após 24 meses.
4. **Livre acesso** (Art. 6º IV) — leads podem solicitar dados via e-mail de contato publicado no site.
5. **Qualidade dos dados** (Art. 6º V) — classificações revisadas periodicamente; reprocessamento permitido.
6. **Transparência** (Art. 6º VI) — este doc + política de privacidade pública.
7. **Segurança** (Art. 6º VII) — TLS em trânsito, criptografia em repouso (Supabase), segredos em Vault do Vercel/Railway, ver `docs/KEY-ROTATION.md`.
8. **Prevenção** (Art. 6º VIII) — pipeline de anonimização antes da persistência.
9. **Não discriminação** (Art. 6º IX) — dados agregados não usados para decisões automatizadas sobre indivíduos.
10. **Responsabilização** (Art. 6º X) — logs de coleta auditáveis; este doc versionado.

---

## 4. Controles Técnicos

| Controle | Implementação |
|----------|---------------|
| Anonimização pré-persistência | Prompt de classificação (Claude) com instrução explícita de remover PII do output |
| Fontes controladas | Whitelist de fontes em `ScrapingSource` com flag `manuallyApproved` |
| Fontes protegidas (LinkedIn, Facebook) | Bloqueadas no scraping-worker — reset protection (TASK-11 ST complementa) |
| Log de auditoria | Tabela `ScrapingLog` com append-only |
| Retenção automática de leads | Cron mensal (a implementar pós-MVP) — anonimização após 24m |
| Rotação de chaves | `docs/KEY-ROTATION.md` — trimestral |

---

## 5. Direitos do Titular (Art. 18 LGPD)

Aplicável apenas a **leads** (única categoria com PII). Contato: e-mail do operador publicado na política de privacidade.

- **Confirmação e acesso** (Art. 18 I, II) — resposta em até 15 dias.
- **Correção** (Art. 18 III) — via formulário ou e-mail.
- **Anonimização / eliminação** (Art. 18 IV, VI) — endpoint `DELETE /api/v1/leads/{id}` com confirmação e log.
- **Portabilidade** (Art. 18 V) — export JSON sob demanda.
- **Revogação de consentimento** (Art. 18 IX) — unsubscribe + exclusão dos dados.

---

## 6. Riscos Monitorados

- ANPD planeja pelo menos 3 ações de fiscalização sobre scraping em 2025–2026.
- Multa de até 2% do faturamento por infração.
- **Mitigação:** fontes manualmente curadas, anonimização garantida, logs auditáveis, este doc mantido atualizado.

---

## 7. Revisão

Documento revisto a cada:
- Mudança regulatória da ANPD.
- Adição de nova fonte de dados ou campo com PII.
- Mudança de base legal para qualquer categoria.

### Changelog

- 2026-04-23 — versão inicial extraída do INTAKE.md §"Compliance e Dados"

---

## Referências

- INTAKE.md §"Compliance e Dados"
- `docs/security/THREAT-MODEL.md` (se existir)
- `docs/KEY-ROTATION.md`
- ANPD Radar Tecnológico nº 3 (nov/2024)
- Lei 13.709/2018 (LGPD) + Lei 15.352/2026
