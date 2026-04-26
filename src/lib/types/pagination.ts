/**
 * Tipo compartilhado de paginação — usado em CaseList, PainList, PatternList, LeadsList.
 */
export interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}
