// Pagina /niche-opportunities/rejected — historico de temas rejeitados (TASK-5 ST002)

import { RejectionHistory } from '@/components/niches/RejectionHistory'
import Link from 'next/link'

export default function RejectedThemesPage() {
  return (
    <section className="space-y-5" data-testid="rejected-themes-page">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Historico de temas rejeitados</h1>
          <p className="text-sm text-muted-foreground">
            Filtre por motivo, intervalo de datas ou navegue paginas para auditar decisoes.
          </p>
        </div>
        <Link
          href="../niche-opportunities"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Voltar para oportunidades
        </Link>
      </header>

      <RejectionHistory />
    </section>
  )
}
