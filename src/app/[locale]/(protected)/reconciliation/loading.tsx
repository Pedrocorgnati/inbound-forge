import { RouteLoadingState } from '@/components/app-states/RouteLoadingState'

export default function ReconciliationLoading() {
  return (
    <RouteLoadingState
      title="Carregando reconciliação"
      description="Buscando eventos de funil e conversões."
      rows={4}
    />
  )
}
