/**
 * Constantes compartilhadas do domínio Knowledge.
 * Centralizadas aqui para evitar duplicação entre forms e lists.
 */

/** Opções de setor para forms (sem opção "todas"). */
export const SECTOR_OPTIONS = [
  { value: 'operational_time', label: 'Tempo Operacional' },
  { value: 'spreadsheet_dependency', label: 'Dependência de Planilhas' },
  { value: 'systems_integration', label: 'Integração de Sistemas' },
  { value: 'manual_budgeting', label: 'Orçamento Manual' },
  { value: 'visibility_dashboards', label: 'Visibilidade / Dashboards' },
  { value: 'slow_customer_service', label: 'Atendimento Lento' },
  { value: 'scaling_difficulty', label: 'Dificuldade de Escalar' },
  { value: 'low_predictability', label: 'Baixa Previsibilidade' },
  { value: 'human_errors', label: 'Erros Humanos' },
  { value: 'ad_hoc_operation', label: 'Operação Ad-hoc' },
] as const

/** Opções de setor para filtros de lista (inclui opção "todas as categorias"). */
export const SECTOR_FILTER_OPTIONS = [
  { value: '', label: 'Todas as categorias' },
  ...SECTOR_OPTIONS,
] as const
