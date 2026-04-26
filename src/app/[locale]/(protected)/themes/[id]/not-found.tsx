import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl p-4 text-center" data-testid="theme-detail-not-found">
      <h1 className="text-lg font-semibold">Tema nao encontrado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        O tema solicitado nao existe ou foi removido.
      </p>
      <Button asChild className="mt-4">
        <Link href="/dashboard">Voltar ao dashboard</Link>
      </Button>
    </div>
  )
}
