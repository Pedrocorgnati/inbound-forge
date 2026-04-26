import Link from 'next/link'
import { DEFAULT_LOCALE } from '@/types'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
      <div className="space-y-4">
        <p className="text-8xl font-bold text-primary/20">404</p>
        <h1 className="text-2xl font-bold text-foreground">Página não encontrada</h1>
        <p className="text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          href={`/${DEFAULT_LOCALE}/dashboard`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Voltar ao painel
        </Link>
      </div>
    </main>
  )
}
