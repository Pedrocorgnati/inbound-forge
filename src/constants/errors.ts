// Catálogo de erros — Inbound Forge
// Fonte: ERROR-CATALOG.md (gerado por /error-catalog-create)
// Formato: { code, httpStatus, message, technicalMessage }

export type ErrorCode =
  // VAL — Validação
  | 'VAL_001' | 'VAL_002' | 'VAL_003' | 'VAL_004'
  // SYS — Sistema
  | 'SYS_001' | 'SYS_002' | 'SYS_003' | 'SYS_004'
  // AUTH — Autenticação
  | 'AUTH_001' | 'AUTH_002' | 'AUTH_003'
  // WORKER
  | 'WORKER_001' | 'WORKER_002'
  // KNOWLEDGE
  | 'KNOWLEDGE_080' | 'KNOWLEDGE_081' | 'KNOWLEDGE_050'
  // THEME
  | 'THEME_080' | 'THEME_050' | 'THEME_051' | 'THEME_052'
  // CONTENT
  | 'CONTENT_080' | 'CONTENT_050' | 'CONTENT_051' | 'CONTENT_052'
  // IMAGE
  | 'IMAGE_080' | 'IMAGE_050'
  // POST
  | 'POST_080' | 'POST_050'
  // BLOG
  | 'BLOG_080' | 'BLOG_081' | 'BLOG_050'
  // LEAD
  | 'LEAD_001' | 'LEAD_002'
  | 'LEAD_020' | 'LEAD_021' | 'LEAD_022'
  | 'LEAD_050' | 'LEAD_051' | 'LEAD_052'
  | 'LEAD_080' | 'LEAD_081' | 'LEAD_082'
  // ANALYTICS
  | 'ANALYTICS_080'

export const ERRORS: Record<ErrorCode, { httpStatus: number; message: string }> = {
  // VAL
  VAL_001: { httpStatus: 400, message: 'Campo obrigatório não preenchido.' },
  VAL_002: { httpStatus: 400, message: 'Formato inválido para o campo informado.' },
  VAL_003: { httpStatus: 400, message: 'Valor fora do intervalo permitido.' },
  VAL_004: { httpStatus: 400, message: 'Quantidade de itens fora do permitido.' },
  // SYS
  SYS_001: { httpStatus: 500, message: 'Erro interno. Tente novamente ou contate o suporte.' },
  SYS_002: { httpStatus: 503, message: 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.' },
  SYS_003: { httpStatus: 504, message: 'Tempo limite excedido. Tente novamente.' },
  SYS_004: { httpStatus: 503, message: 'Fila de jobs indisponível. Tente novamente.' },
  // AUTH
  AUTH_001: { httpStatus: 401, message: 'Não autorizado. Faça login para continuar.' },
  AUTH_002: { httpStatus: 401, message: 'Token inválido ou expirado.' },
  AUTH_003: { httpStatus: 403, message: 'Sem permissão para realizar esta ação.' },
  // WORKER
  WORKER_001: { httpStatus: 401, message: 'Token de worker inválido.' },
  WORKER_002: { httpStatus: 400, message: 'Tipo de worker inválido.' },
  // KNOWLEDGE
  KNOWLEDGE_080: { httpStatus: 404, message: 'Entrada não encontrada.' },
  KNOWLEDGE_081: { httpStatus: 409, message: 'Entrada já existe com este identificador.' },
  KNOWLEDGE_050: { httpStatus: 422, message: 'Não é possível validar: campos obrigatórios incompletos.' },
  // THEME
  THEME_080: { httpStatus: 404, message: 'Tema não encontrado.' },
  THEME_050: { httpStatus: 409, message: 'Motor bloqueado: threshold de validação não atingido.' },
  THEME_051: { httpStatus: 422, message: 'Este tema já foi rejeitado.' },
  THEME_052: { httpStatus: 422, message: 'Apenas temas rejeitados podem ser restaurados.' },
  // CONTENT
  CONTENT_080: { httpStatus: 404, message: 'Peça de conteúdo não encontrada.' },
  CONTENT_050: { httpStatus: 422, message: 'Não é possível aprovar: nenhum ângulo selecionado.' },
  CONTENT_051: { httpStatus: 422, message: 'Não é possível aprovar: peça não está em revisão.' },
  CONTENT_052: { httpStatus: 502, message: 'Falha na geração via Claude. Tente novamente.' },
  // IMAGE
  IMAGE_080: { httpStatus: 404, message: 'Job de imagem não encontrado.' },
  IMAGE_050: { httpStatus: 422, message: 'Peça de conteúdo não está aprovada para geração de imagem.' },
  // POST
  POST_080: { httpStatus: 404, message: 'Post não encontrado.' },
  POST_050: { httpStatus: 422, message: 'Não é possível publicar: post não está aprovado.' },
  // BLOG
  BLOG_080: { httpStatus: 404, message: 'Artigo não encontrado.' },
  BLOG_081: { httpStatus: 409, message: 'Slug já utilizado por outro artigo.' },
  BLOG_050: { httpStatus: 422, message: 'Não é possível publicar: artigo não está em revisão.' },
  // LEAD — Auth
  LEAD_001: { httpStatus: 401, message: 'Sessão expirada ou inválida.' },
  LEAD_002: { httpStatus: 403, message: 'Acesso negado a este lead.' },
  // LEAD — Validação
  LEAD_020: { httpStatus: 400, message: 'Consentimento LGPD obrigatório.' },
  LEAD_021: { httpStatus: 400, message: 'Canal inválido.' },
  LEAD_022: { httpStatus: 400, message: 'Estágio do funil inválido.' },
  // LEAD — Regra de negócio
  LEAD_050: { httpStatus: 422, message: 'Post de first-touch não encontrado.' },
  LEAD_051: { httpStatus: 422, message: 'Erro ao criptografar dados do lead.' },
  LEAD_052: { httpStatus: 422, message: 'Erro de integridade na criptografia.' },
  // LEAD — Recurso
  LEAD_080: { httpStatus: 409, message: 'UTM link já existe para este post.' },
  LEAD_081: { httpStatus: 404, message: 'Lead não encontrado.' },
  LEAD_082: { httpStatus: 404, message: 'ConversionEvent não encontrado.' },
  // ANALYTICS
  ANALYTICS_080: { httpStatus: 404, message: 'Item de reconciliação não encontrado.' },
}

export function apiError(code: ErrorCode, details?: string) {
  const { httpStatus, message } = ERRORS[code]
  return {
    status: httpStatus,
    body: { success: false, error: details ?? message, code },
  }
}
