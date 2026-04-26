import type { Metadata } from 'next'
import { LegalVersionHeader } from '@/components/legal/LegalVersionHeader'

interface PrivacyPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Política de Privacidade | Inbound Forge',
    description:
      'Saiba como o Inbound Forge coleta, utiliza e protege seus dados pessoais conforme a LGPD.',
    alternates: {
      canonical: `/${locale}/privacy`,
    },
  }
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang={locale}>
      <LegalVersionHeader doc="privacy" locale={locale} />
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">
        Política de Privacidade
      </h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="text-muted-foreground leading-relaxed">
          Última atualização: março de 2026. Esta política descreve como o Inbound Forge
          (&quot;nós&quot;, &quot;nosso&quot;) coleta, utiliza e protege seus dados pessoais,
          em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).
        </p>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Controlador dos dados</h2>
          <p className="text-muted-foreground leading-relaxed">
            O controlador responsável pelo tratamento dos dados pessoais é o Inbound Forge.
            Para contato relacionado à privacidade, utilize o e-mail:{' '}
            <a
              href="mailto:privacidade@inboundforge.com"
              className="text-primary underline underline-offset-2 hover:text-primary-hover"
            >
              privacidade@inboundforge.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Dados coletados</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Coletamos os seguintes tipos de dados:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>
              <strong>Cookies funcionais:</strong> necessários para o funcionamento básico do site
              (sempre ativos).
            </li>
            <li>
              <strong>Cookies de analytics:</strong> dados de navegação anonimizados via Google
              Analytics 4 (IP anonimizado), coletados apenas com seu consentimento.
            </li>
            <li>
              <strong>Cookies de marketing:</strong> utilizados para personalização de conteúdo e
              campanhas, coletados apenas com seu consentimento.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Finalidade do tratamento</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>Garantir o funcionamento técnico do site</li>
            <li>Analisar padrões de uso para melhorar a experiência do usuário</li>
            <li>Personalizar conteúdos e recomendações</li>
            <li>Mensurar a efetividade de campanhas de marketing</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Base legal</h2>
          <p className="text-muted-foreground leading-relaxed">
            O tratamento de dados de analytics e marketing é realizado com base no{' '}
            <strong>consentimento do titular</strong> (Art. 7º, I da LGPD). Cookies funcionais
            são tratados com base no <strong>legítimo interesse</strong> (Art. 7º, IX da LGPD),
            pois são estritamente necessários para o funcionamento do serviço.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Seus direitos</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Conforme a LGPD, você tem direito a:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>
              <strong>Acesso:</strong> solicitar informações sobre quais dados pessoais tratamos.
            </li>
            <li>
              <strong>Correção:</strong> solicitar a correção de dados incompletos ou desatualizados.
            </li>
            <li>
              <strong>Eliminação:</strong> solicitar a exclusão de dados pessoais tratados com base
              no consentimento.
            </li>
            <li>
              <strong>Portabilidade:</strong> solicitar a transferência de seus dados para outro
              fornecedor.
            </li>
            <li>
              <strong>Revogação:</strong> revogar o consentimento a qualquer momento, sem
              prejudicar o tratamento realizado anteriormente.
            </li>
            <li>
              <strong>Informação:</strong> ser informado sobre as entidades com as quais
              compartilhamos seus dados.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Retenção de dados</h2>
          <p className="text-muted-foreground leading-relaxed">
            O cookie de consentimento (<code className="text-sm bg-muted px-1.5 py-0.5 rounded">lgpd_consent</code>)
            é armazenado por até 365 dias. Dados de analytics são retidos conforme a
            configuração padrão do Google Analytics 4 (14 meses).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Compartilhamento</h2>
          <p className="text-muted-foreground leading-relaxed">
            Os dados de analytics são processados pelo Google LLC (Google Analytics 4) com IP
            anonimizado. Não vendemos, alugamos ou compartilhamos seus dados pessoais com
            terceiros para fins não descritos nesta política.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. Contato</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de seus dados,
            entre em contato pelo e-mail:{' '}
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
