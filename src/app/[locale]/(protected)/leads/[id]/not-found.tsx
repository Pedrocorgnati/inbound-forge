import Link from 'next/link'

export default function LeadNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <p className="text-6xl font-bold text-primary/20">404</p>
      <h2 className="text-xl font-semibold text-foreground">Lead não encontrado</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Este lead não existe ou foi removido.
      </p>
      <Link
        href="../leads"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
      >
        Voltar para Leads
      </Link>
    </div>
  )
}
