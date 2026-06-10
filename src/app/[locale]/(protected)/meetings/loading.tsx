import { RouteLoadingState } from '@/components/app-states/RouteLoadingState'

export default function MeetingsLoading() {
  return (
    <RouteLoadingState
      title="Carregando reuniões"
      description="Buscando eventos Cal.com associados aos leads."
      rows={4}
    />
  )
}
