import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalVersionHeader } from '@/components/legal/LegalVersionHeader'

interface CookiesPageProps {
  params: Promise<{ locale: string }>
}

const SUPPORTED_LOCALES = ['pt-BR', 'en', 'it', 'es-ES'] as const

export async function generateMetadata({ params }: CookiesPageProps): Promise<Metadata> {
  const { locale } = await params
  const alternatesLanguages: Record<string, string> = {}
  for (const supported of SUPPORTED_LOCALES) {
    alternatesLanguages[supported] = `/${supported}/cookies`
  }
  return {
    title: 'Politica de Cookies | Inbound Forge',
    description:
      'Como o Inbound Forge utiliza cookies, categorias, finalidades, tempo de retencao e como gerenciar suas preferencias conforme a LGPD.',
    alternates: {
      canonical: `/${locale}/cookies`,
      languages: alternatesLanguages,
    },
  }
}

export default async function CookiesPage({ params }: CookiesPageProps) {
  const { locale } = await params

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang={locale}>
      <LegalVersionHeader doc="cookies" locale={locale} />
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">
        Politica de Cookies
      </h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="text-muted-foreground leading-relaxed">
          Ultima atualizacao: abril de 2026. Esta politica descreve como o Inbound Forge
          utiliza cookies e tecnologias similares, em conformidade com a Lei Geral de
          Protecao de Dados (LGPD &mdash; Lei 13.709/2018) e com a regulamentacao europeia
          aplicavel quando o acesso ocorre desde a Uniao Europeia.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. O que sao cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            Cookies sao pequenos arquivos de texto armazenados no seu navegador quando voce
            visita um site. Eles permitem que o site lembre informacoes sobre sua visita,
            tornando a navegacao mais eficiente e personalizada.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Categorias de cookies</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              <strong>Funcionais (sempre ativos):</strong> indispensaveis para o funcionamento
              tecnico do site, manutencao de sessao autenticada e preferencias de idioma.
              Nao requerem consentimento porque sao base contratual / interesse legitimo.
            </li>
            <li>
              <strong>Analytics:</strong> dados de navegacao anonimizados via Google Analytics 4
              com IP anonimizado. Coletados apenas mediante consentimento explicito.
            </li>
            <li>
              <strong>Marketing:</strong> personalizacao de conteudo e mensuracao de campanhas.
              Coletados apenas mediante consentimento explicito.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Cookies utilizados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-foreground">
                  <th className="py-2 pr-4">Cookie</th>
                  <th className="py-2 pr-4">Categoria</th>
                  <th className="py-2 pr-4">Finalidade</th>
                  <th className="py-2">Retencao</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">if_session</td>
                  <td className="py-2 pr-4">Funcional</td>
                  <td className="py-2 pr-4">Manter sessao autenticada</td>
                  <td className="py-2">Sessao</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">if_consent</td>
                  <td className="py-2 pr-4">Funcional</td>
                  <td className="py-2 pr-4">Armazenar preferencias de consentimento</td>
                  <td className="py-2">12 meses</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">_ga, _ga_*</td>
                  <td className="py-2 pr-4">Analytics</td>
                  <td className="py-2 pr-4">Identificacao anonimizada de visitantes (GA4)</td>
                  <td className="py-2">14 meses</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">_gid</td>
                  <td className="py-2 pr-4">Analytics</td>
                  <td className="py-2 pr-4">Distincao de sessoes para analise (GA4)</td>
                  <td className="py-2">24 horas</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Como gerenciar suas preferencias</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Voce pode revisar e alterar suas preferencias a qualquer momento reabrindo o
            banner de consentimento atraves do botao &quot;Preferencias de Cookies&quot;
            disponivel no rodape do site. Tambem e possivel bloquear cookies diretamente
            nas configuracoes do seu navegador, embora isso possa afetar funcionalidades
            do site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Documentos relacionados</h2>
          <p className="text-muted-foreground leading-relaxed">
            Consulte tambem nossa{' '}
            <Link href={`/${locale}/privacy`} className="text-primary underline underline-offset-2 hover:text-primary-hover">
              Politica de Privacidade
            </Link>{' '}
            e os{' '}
            <Link href={`/${locale}/terms`} className="text-primary underline underline-offset-2 hover:text-primary-hover">
              Termos de Uso
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Contato</h2>
          <p className="text-muted-foreground leading-relaxed">
            Duvidas relacionadas ao tratamento de cookies podem ser enviadas para{' '}
            <a
              href="mailto:privacidade@inboundforge.com"
              className="text-primary underline underline-offset-2 hover:text-primary-hover"
            >
              privacidade@inboundforge.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
