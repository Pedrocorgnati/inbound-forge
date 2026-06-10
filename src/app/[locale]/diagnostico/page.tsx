import type { Metadata } from 'next'
import { DiagnosticoForm } from './_components/DiagnosticoForm'

interface DiagnosticoPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: DiagnosticoPageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Diagnostico gratuito | Inbound Forge',
    description:
      'Envie sua dor operacional com consentimento LGPD e receba um correlation_id para acompanhamento.',
    alternates: {
      canonical: `/${locale}/diagnostico`,
    },
  }
}

export default async function DiagnosticoPage({ params }: DiagnosticoPageProps) {
  const { locale } = await params

  return (
    <main className="min-h-dvh bg-background" lang={locale}>
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-14">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase text-primary">Diagnostico</p>
          <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-normal text-foreground sm:text-5xl">
            Conte onde o processo trava
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Use o formulario publico para registrar a dor, o segmento e os dados de
            contato com consentimento explicito. A resposta devolve um codigo de suporte
            para acompanhamento sem expor seus dados pessoais.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
            <div className="rounded-md border border-border bg-surface p-4">
              PII criptografada com AES-256-GCM antes de persistir.
            </div>
            <div className="rounded-md border border-border bg-surface p-4">
              O texto bruto fica retido por 1 hora para triagem inicial.
            </div>
            <div className="rounded-md border border-border bg-surface p-4">
              Protecao anti-spam por limite de IP e prova de trabalho leve.
            </div>
          </div>
        </div>
        <DiagnosticoForm locale={locale} />
      </section>
    </main>
  )
}

