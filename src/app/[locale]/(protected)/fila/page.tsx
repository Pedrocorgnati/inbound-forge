import { QueueBoard } from '@/components/queue/QueueBoard'

export const dynamic = 'force-dynamic'

export default function FilaPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Fila de Publicação</h1>
        <p className="text-sm text-muted-foreground">
          Arraste para reordenar, clique para editar. Atualização em tempo real via Supabase.
        </p>
      </header>
      <QueueBoard />
    </section>
  )
}
