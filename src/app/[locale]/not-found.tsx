import { RouteNotFoundState } from '@/components/app-states/RouteNotFoundState'

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-background px-4 py-12">
      <RouteNotFoundState
        title="Pagina nao encontrada"
        description="A pagina que voce procura nao existe ou foi movida."
        backHref="/dashboard"
        backLabel="Voltar ao painel"
      />
    </main>
  )
}
