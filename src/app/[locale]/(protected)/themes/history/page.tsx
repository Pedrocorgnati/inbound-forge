// Intake-Review TASK-3 ST004 (CL-198): historico consolidado de temas.
import { ThemeHistoryTable } from '@/components/dashboard/ThemeHistoryTable'

export const dynamic = 'force-dynamic'

export default function ThemeHistoryPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-6 p-4" data-testid="theme-history-page">
      <header>
        <h1 className="text-2xl font-semibold">Historico de temas</h1>
        <p className="text-sm text-muted-foreground">
          Publicados, editados e rejeitados em um so lugar.
        </p>
      </header>
      <ThemeHistoryTable />
    </section>
  )
}
