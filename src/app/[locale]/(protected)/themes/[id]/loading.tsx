export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4" data-testid="theme-detail-loading">
      <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-md border border-border bg-muted/40" />
        <div className="h-24 animate-pulse rounded-md border border-border bg-muted/40" />
      </div>
      <div className="h-32 animate-pulse rounded-md border border-border bg-muted/40" />
    </div>
  )
}
