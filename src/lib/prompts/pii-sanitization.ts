/**
 * PII Sanitization Prompt — Inbound Forge
 * TASK-1 ST001 / intake-review LGPD Compliance
 *
 * Instrução centralizada para remoção de PII em todas as chamadas ao Claude.
 * Base legal: Art. 10 LGPD — Interesse Legítimo.
 * COMP-001: Garantir que nomes próprios, emails, telefones, CPFs, endereços
 *           e nomes de empresas não apareçam no output da IA.
 */

/**
 * Instrução explícita para o Claude remover/substituir dados pessoais identificáveis.
 * Deve ser injetada em TODOS os system prompts que processam texto de terceiros.
 */
export const PII_SANITIZATION_INSTRUCTION = `
CONFORMIDADE LGPD — INSTRUÇÃO OBRIGATÓRIA:
Ao processar textos que você receber, NUNCA inclua no seu output dados pessoais identificáveis.
Substitua os seguintes tipos de dado por descritores genéricos:
- Nomes próprios de pessoas → "[pessoa]" ou "[usuário]"
- Emails → "[email]"
- Telefones (celular, fixo, com ou sem DDD) → "[telefone]"
- CPFs e CNPJs → "[documento]"
- Endereços físicos (rua, número, CEP, cidade quando contextualmente identificável) → "[endereço]"
- Nomes de empresas específicas quando contextualmente identificáveis como PII → "[empresa do setor X]"

Esta instrução se aplica apenas ao seu output — não ao texto de entrada que você analisa.
Sua análise pode fazer referência ao conteúdo sem reproduzir os dados identificáveis.
`.trim()

/**
 * Concatena a instrução de sanitização de PII ao system prompt existente.
 * Uso: withPiiSanitization(meuSystemPrompt)
 *
 * @param systemPrompt - System prompt original do serviço
 * @returns System prompt com instrução PII anexada
 */
export function withPiiSanitization(systemPrompt: string): string {
  return `${systemPrompt}\n\n${PII_SANITIZATION_INSTRUCTION}`
}
