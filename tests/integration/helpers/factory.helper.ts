/**
 * Factory Helper — Integração
 *
 * Funções de factory para criar payloads de teste únicos.
 * Prefixo [TEST-] em campos string para facilitar cleanup nos afterEach.
 *
 * Convenção de cleanup:
 *   await prisma.caseLibraryEntry.deleteMany({ where: { name: { startsWith: '[TEST-' } } })
 */

import { randomBytes } from 'crypto'

function uid(): string {
  return randomBytes(4).toString('hex')
}

// ─── Knowledge: Cases ────────────────────────────────────────────────────────

export function buildCasePayload(overrides: Record<string, unknown> = {}) {
  return {
    name: `[TEST-${uid()}] Case de automação para inbound`,
    sector: 'Tecnologia',
    systemType: 'CRM + automação de marketing',
    outcome: `O cliente reduziu o ciclo de vendas em 40% após implementar o sistema de pontuação de leads automático. A qualificação passou de manual (3 dias) para automática (2 horas). Equipe de vendas foca nos leads com score acima de 70.`,
    hasQuantifiableResult: true,
    ...overrides,
  }
}

// ─── Knowledge: Pains ────────────────────────────────────────────────────────

export function buildPainPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: `[TEST-${uid()}] Dificuldade em gerar conteúdo consistente`,
    description: `Empresas de consultoria perdem potenciais clientes por não conseguir manter um fluxo constante de conteúdo relevante. O time técnico não tem tempo, e o marketing não tem domínio do assunto.`,
    sectors: ['Consultoria', 'Tecnologia'],
    ...overrides,
  }
}

// ─── Knowledge: Solution Patterns ────────────────────────────────────────────

export function buildSolutionPatternPayload(
  painId: string,
  caseId: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    name: `[TEST-${uid()}] Framework de conteúdo baseado em cases`,
    description: `Estratégia de reutilizar resultados de cases reais para gerar conteúdo técnico credível que ressoa com o ICP.`,
    painId,
    caseId,
    ...overrides,
  }
}

// ─── Knowledge: Objections ───────────────────────────────────────────────────

export function buildObjectionPayload(overrides: Record<string, unknown> = {}) {
  return {
    content: `[TEST-${uid()}] Já temos um time de marketing interno, não precisamos de automação.`,
    type: 'objection',
    ...overrides,
  }
}

// ─── Themes ──────────────────────────────────────────────────────────────────

export function buildRejectThemePayload(overrides: Record<string, unknown> = {}) {
  return {
    reason: `[TEST-${uid()}] Tema muito genérico para o nosso ICP atual.`,
    ...overrides,
  }
}

// ─── Content ─────────────────────────────────────────────────────────────────

export function buildGenerateContentPayload(themeId: string, overrides: Record<string, unknown> = {}) {
  return {
    themeId,
    ...overrides,
  }
}

// ─── Images ──────────────────────────────────────────────────────────────────

export function buildGenerateImagePayload(
  contentPieceId: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    contentPieceId,
    templateType: 'CAROUSEL',
    ...overrides,
  }
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export function buildPostPayload(contentPieceId: string, overrides: Record<string, unknown> = {}) {
  const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // +7 dias
  return {
    contentPieceId,
    channel: 'LINKEDIN',
    scheduledAt,
    caption: `[TEST-${uid()}] Conteúdo gerado automaticamente para LinkedIn. Teste de integração.`,
    hashtags: ['#inboundmarketing', '#automacao'],
    cta: 'Saiba mais no link da bio.',
    ...overrides,
  }
}

// ─── Blog Articles ────────────────────────────────────────────────────────────

export function buildBlogArticlePayload(
  contentPieceId: string,
  overrides: Record<string, unknown> = {}
) {
  const uid_ = uid()
  return {
    contentPieceId,
    title: `[TEST-${uid_}] Como automatizar seu inbound marketing`,
    slug: `test-${uid_}-como-automatizar-inbound`,
    excerpt: `Aprenda a usar IA para escalar sua produção de conteúdo técnico sem perder qualidade.`,
    body: `# Como automatizar seu inbound marketing\n\nEste é um artigo de teste para integração.`,
    seoTitle: `[TEST-${uid_}] Como automatizar inbound marketing com IA`,
    seoDescription: `Guia prático para escalar conteúdo com IA e dados reais de cases.`,
    status: 'DRAFT',
    ...overrides,
  }
}

// ─── Leads ───────────────────────────────────────────────────────────────────

export function buildLeadPayload(
  firstTouchPostId: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    name: `[TEST-${uid()}] Lead de integração`,
    company: 'Empresa de Teste Ltda',
    contactInfo: `test-lead-${uid()}@example-integration.com`,
    firstTouchPostId,
    notes: 'Lead criado automaticamente em teste de integração.',
    ...overrides,
  }
}

// ─── Heartbeat ───────────────────────────────────────────────────────────────

export function buildHeartbeatPayload(overrides: Record<string, unknown> = {}) {
  return {
    type: 'SCRAPING',
    status: 'ACTIVE',
    errorMessage: null,
    ...overrides,
  }
}
