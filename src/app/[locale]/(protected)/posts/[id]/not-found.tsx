import { RouteNotFoundState } from '@/components/app-states/RouteNotFoundState'

export default function NotFound() {
  return (
    <RouteNotFoundState
      title="Post nao encontrado"
      description="O post solicitado nao existe, foi removido ou ainda nao foi gerado."
      backHref="/posts"
      backLabel="Voltar para posts"
    />
  )
}
