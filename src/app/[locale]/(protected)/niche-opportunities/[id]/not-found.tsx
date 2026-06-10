import { RouteNotFoundState } from '@/components/app-states/RouteNotFoundState'

export default function NotFound() {
  return (
    <RouteNotFoundState
      title="Oportunidade nao encontrada"
      description="A oportunidade solicitada nao existe ou foi removida da priorizacao."
      backHref="/niche-opportunities"
      backLabel="Voltar para oportunidades"
    />
  )
}
