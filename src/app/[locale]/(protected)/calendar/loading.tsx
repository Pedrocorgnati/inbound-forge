// TASK-1 ST005 (CL-274) — loading.tsx escopado do calendario.

export default function CalendarLoading() {
  return (
    <div className="space-y-6" aria-busy="true" data-testid="calendar-loading">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-28 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  )
}
