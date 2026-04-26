// TASK-13 (CL-289): pagina de portabilidade LGPD Art. 18.

import Link from 'next/link'

export default function DataExportPage() {
  return (
    <section className="max-w-2xl space-y-5" data-testid="data-export-page">
      <header>
        <h1 className="text-2xl font-semibold">Exportar meus dados</h1>
        <p className="text-sm text-muted-foreground">
          Portabilidade (LGPD Art. 18, V). O arquivo inclui todos os dados pessoais e de uso
          associados à sua conta (cases, dores, padrões, objeções, leads, log de auditoria).
        </p>
      </header>

      <div className="rounded-md border border-border bg-card p-4 text-sm">
        <p>
          Formato: <strong>JSON estruturado</strong>. Limite de uma exportação a cada 24 horas.
        </p>
        <p className="mt-2 text-muted-foreground">
          Ao solicitar, um registro é gravado no log de auditoria conforme a LGPD.
        </p>
      </div>

      <Link
        href="/api/v1/compliance/data-export"
        className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        data-testid="data-export-download"
      >
        Baixar meus dados
      </Link>
    </section>
  )
}
