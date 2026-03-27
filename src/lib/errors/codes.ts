export const ERROR_CODES = {
  // Validação
  'ERR-001': 'Dados de entrada inválidos',
  'ERR-002': 'Campo obrigatório ausente',
  'ERR-003': 'Formato inválido',
  // Auth
  'ERR-010': 'Não autenticado',
  'ERR-011': 'Sem permissão',
  'ERR-012': 'Conta bloqueada',
  'ERR-013': 'Sessão expirada',
  // Recursos
  'ERR-020': 'Recurso não encontrado',
  'ERR-021': 'Conflito — recurso já existe',
  'ERR-022': 'Operação não permitida no estado atual',
  // Workers
  'ERR-030': 'Worker indisponível',
  'ERR-031': 'Fila cheia',
  'ERR-032': 'Timeout de worker',
  // PII / LGPD
  'ERR-040': 'Operação em PII requer consentimento',
  'ERR-041': 'Dados PII não encontrados',
  // Servidor
  'ERR-500': 'Erro interno do servidor',
  'ERR-503': 'Serviço temporariamente indisponível',
} as const

export type ErrorCode = keyof typeof ERROR_CODES
