// FE-02: hub de Compliance. Resolve simultaneamente: (a) orfaos data-export e
// scraping-audit (alcancaveis via este hub), (b) backHref '/compliance' quebrado
// nos error.tsx das subpaginas, (c) pattern do breadcrumb-registry sem pagina.
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Compliance | Inbound Forge',
  description: 'Auditoria de coleta, auditoria de scraping e exportacao de dados (LGPD).',
}

interface CompliancePageProps {
  params: Promise<{ locale: string }>
}

const SECTIONS = [
  {
    segment: '/compliance/audit',
    title: 'Auditoria de coleta',
    description: 'Trilha de auditoria das coletas e do tratamento de dados das fontes.',
  },
  {
    segment: '/compliance/scraping-audit',
    title: 'Auditoria de scraping',
    description: 'Registros detalhados das execucoes de scraping por fonte e operador.',
  },
  {
    segment: '/compliance/data-export',
    title: 'Exportar meus dados',
    description: 'Solicite a exportacao dos seus dados pessoais (portabilidade LGPD).',
  },
] as const

export default async function CompliancePage({ params }: CompliancePageProps) {
  const { locale } = await params

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Compliance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auditoria de coleta, auditoria de scraping e portabilidade de dados conforme a LGPD.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.segment}
            href={`/${locale}${section.segment}`}
            className="block rounded-lg border border-border p-5 transition-colors hover:border-primary hover:bg-muted/40"
          >
            <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
