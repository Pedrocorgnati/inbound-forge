# Inbound Machine — 5 features (2026-06-10)

5 features que transformam o inbound-forge numa maquina de inbound completa, sobre o
engine existente (conteudo/SEO/publishing/blog/leads/analytics). Funil:

```
  Forms (F2)  ──►  Subscribers/Email (F1)  ──►  Sequences/drip (F4)
      │                    │                          │
      ▼                    ▼                          ▼
   Lead ────────►  Lead Scoring (F3) ──MQL──►  Automation (F5) ──► notify / set-stage / enroll
```

## F1 — Email Marketing (fundacao)
Subscribers com **double-opt-in** (LGPD) + **broadcasts/newsletter**. Email criptografado
(AES-256) + emailHash para dedup. Transporte `src/lib/email/marketing-send.ts` (Resend REST,
**fail-closed** sem link de unsubscribe, header `List-Unsubscribe` RFC 8058).
- Publico: `/subscribe` (signup) + `/api/v1/subscribers` + `/api/subscribe/confirm` + `/api/unsubscribe` (one-click).
- Operador: `/broadcasts` (compositor + envio) + `/subscribers` (lista mascarada).
- Cron `broadcast-sender` (a cada 5 min) drena SCHEDULED->SENT em lotes.

## F2 — Lead Capture Forms + lead magnets (capture)
Forms publicos reutilizaveis (`/f/<slug>`) que criam **Lead + ConversionEvent(FORM_SUBMISSION) +
EmailSubscriber** numa so submissao (`createLeadFromCapture`). ECU: a captura nunca se perde
mesmo sem Theme/Post. Operador: `/forms` (lista + builder). UTM da query e propagado.

## F3 — Lead Scoring (qualify)
`recomputeLeadScore` soma pontos por conversao + perfil e promove **NEW->MQL** no threshold
(100, override via SystemSetting `lead_scoring.config`). Recalcula a cada conversao/captura.
Badge de score no LeadCard (🔥 MQL). Dispara alerta + o trigger LEAD_MQL (F5).

## F4 — Nurture Sequences / drip (nurture)
Sequencias de email automatizadas. Subscriber confirma (F1) -> auto-enroll nas sequences ACTIVE.
Cron `nurture-tick` (5 min) envia os steps devidos via o transporte de F1 (com unsubscribe),
respeitando o consentimento (so CONFIRMED; cancela ao descadastrar). Operador: `/sequences`.

## F5 — Marketing Automation (orchestrate, a cola)
Regras **trigger -> acao**. Triggers: LEAD_CREATED, LEAD_STATUS_CHANGED, LEAD_MQL (cabeados nos
pontos que o app ja emite). Acoes: NOTIFY (F1), SET_FUNNEL_STAGE (Lead), ENROLL_SEQUENCE (F4).
Cada execucao auditada em AutomationRun. Operador: `/automations`.

## Crons novos (vercel.json + CRON_JOBS)
`broadcast-sender`, `nurture-tick` — ambos `*/5 * * * *`, Bearer CRON_SECRET (middleware isenta `/api/cron/*`).

## Env (opcional)
`MARKETING_EMAIL_FROM` (fallback `ALERT_EMAIL_FROM`) — remetente dos emails de marketing.
`BROADCAST_SEND_BATCH` / `NURTURE_TICK_BATCH` (default 50). Reusa `RESEND_API_KEY` + `CRON_SECRET` + `CSRF_SECRET`.

## LGPD (first-class em todas)
Double-opt-in, unsubscribe one-click obrigatorio em todo email (fail-closed), email/payload
criptografados, sourceIpHash, sem PII em log (SEC-008), cancelamento de nurture ao descadastrar.

## Migrations
`20260610000001_email_marketing` .. `20260610000005_marketing_automation` — todas aditivas,
verificadas em postgres local dentro de transacao (mimica `prisma migrate deploy`).
