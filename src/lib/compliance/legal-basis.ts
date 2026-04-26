/**
 * LGPD Legal Basis — Inbound Forge
 * TASK-1 ST005 / intake-review LGPD Compliance
 *
 * Documentação formal da base legal para processamento de dados (CL-141).
 * Art. 10, Lei 13.709/2018 (LGPD) — Legítimo Interesse.
 * Esta constante é a fonte canônica de verdade da base legal no código.
 * Última revisão: 2026-04-07
 */

export interface LegalBasis {
  article: string
  basis: string
  purpose: string
  dataTypes: string[]
  retention: string
  safeguards: string[]
  lastReviewedAt: string
}

/**
 * Base legal formal para scraping e processamento de textos públicos.
 * Deve ser retornada pelo endpoint GET /api/compliance/legal-basis.
 */
export const LEGAL_BASIS: LegalBasis = {
  article: 'Art. 10, Lei 13.709/2018 (LGPD)',
  basis: 'Legítimo interesse',
  purpose:
    'Análise de tendências de mercado e dores operacionais em textos públicos para geração de conteúdo de marketing personalizado para o operador',
  dataTypes: [
    'textos públicos de fóruns e redes sociais (sem coleta intencional de PII)',
  ],
  retention:
    'Texto original (rawText) descartado após classificação via pipeline IA (TTL controlado por ScrapedText.expiresAt). Apenas classificações anonimizadas são retidas.',
  safeguards: [
    'PII removido via instrução explícita ao Claude (system prompt LGPD)',
    'Fontes de dados curadas manualmente pelo operador',
    'Log dedicado de coletas (ScrapingAuditLog) para rastreabilidade',
    'Textos não vinculados a perfis individuais identificáveis',
    'Operador responsável por curadoria de fontes (Art. 48 LGPD)',
  ],
  lastReviewedAt: '2026-04-07T00:00:00.000Z',
}
