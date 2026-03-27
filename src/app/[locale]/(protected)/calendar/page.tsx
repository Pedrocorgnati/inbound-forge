import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CalendarContent } from '@/components/calendar/CalendarContent'

export const metadata: Metadata = { title: 'Calendario Editorial' }

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendario Editorial</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Planejamento e agendamento de publicacoes
            </p>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-[100px] animate-pulse rounded-md bg-gray-100" />
            ))}
          </div>
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  )
}
