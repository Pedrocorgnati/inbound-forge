import { RouteNotFoundState } from '@/components/app-states/RouteNotFoundState'

export default function NotFound() {
  return (
    <RouteNotFoundState
      title="Artigo nao encontrado"
      description="O artigo solicitado nao existe, foi removido ou voce nao tem acesso a ele."
      backHref="/blog-manage"
      backLabel="Voltar ao blog"
    />
  )
}
