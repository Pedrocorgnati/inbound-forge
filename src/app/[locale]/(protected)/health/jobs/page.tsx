/**
 * TASK-4 ST004 (CL-TH-059): page de /health/jobs — WorkerJobs com filtros.
 */
import { WorkerJobsTable } from '@/components/health/WorkerJobsTable'

export const metadata = {
  title: 'Jobs · Health',
}

export default function HealthJobsPage() {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Jobs da fila</h1>
        <p className="text-sm text-muted-foreground">
          Historico de jobs dos workers com status, retries e DLQ.
        </p>
      </header>
      <WorkerJobsTable />
    </div>
  )
}
