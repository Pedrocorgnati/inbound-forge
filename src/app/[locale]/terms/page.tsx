/**
 * /[locale]/terms — Termos de Uso
 * TASK-5 ST001 / CL-245
 *
 * Pagina estatica de Termos de Uso, par de /privacy.
 * Server Component — sem dependencias cliente.
 */
import type { Metadata } from 'next'
import { LegalVersionHeader } from '@/components/legal/LegalVersionHeader'

interface TermsPageProps {
  params: Promise<{ locale: string }>
}

const META: Record<string, { title: string; description: string }> = {
  'pt-BR': {
    title: 'Termos de Uso | Inbound Forge',
    description: 'Leia os Termos de Uso do Inbound Forge: condicoes de acesso, licenca de conteudo, isencoes e lei aplicavel.',
  },
  'en-US': {
    title: 'Terms of Use | Inbound Forge',
    description: 'Read the Inbound Forge Terms of Use: access conditions, content license, disclaimers and applicable law.',
  },
  'it-IT': {
    title: 'Termini di Utilizzo | Inbound Forge',
    description: 'Leggi i Termini di Utilizzo di Inbound Forge: condizioni di accesso, licenza dei contenuti, limitazioni e legge applicabile.',
  },
  'es-ES': {
    title: 'Terminos de Uso | Inbound Forge',
    description: 'Lee los Terminos de Uso de Inbound Forge: condiciones de acceso, licencia de contenido, exenciones y ley aplicable.',
  },
}

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { locale } = await params
  const meta = META[locale] ?? META['pt-BR']
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/${locale}/terms` },
  }
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params
  const isPtBR = locale === 'pt-BR'
  const isItIT = locale === 'it-IT'
  const isEsES = locale === 'es-ES'

  if (isPtBR) return <TermsPtBR />
  if (isItIT) return <TermsItIT />
  if (isEsES) return <TermsEsES />
  return <TermsEnUS />
}

function TermsPtBR() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang="pt-BR">
      <LegalVersionHeader doc="terms" locale="pt-BR" />
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">Termos de Uso</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="leading-relaxed text-muted-foreground">
          Ultima atualizacao: abril de 2026. Ao acessar o Inbound Forge, voce concorda com os presentes Termos de Uso.
        </p>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">1. Aceite dos Termos</h2>
          <p className="leading-relaxed text-muted-foreground">
            O uso do Inbound Forge implica aceite integral destes Termos. Se voce nao concordar, nao utilize o servico.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">2. Licenca de uso do conteudo</h2>
          <p className="leading-relaxed text-muted-foreground">
            Todo o conteudo gerado pelo Inbound Forge permanece de propriedade do operador que o criou. A plataforma
            nao reivindica qualquer direito sobre textos, imagens ou publicacoes produzidos pelos usuarios.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">3. Uso aceitavel</h2>
          <p className="leading-relaxed text-muted-foreground">
            E vedado utilizar a plataforma para publicar conteudo ilicito, difamatorio, discriminatorio ou que infrinja
            direitos de terceiros. O Inbound Forge reserva-se o direito de suspender contas em violacao destas regras.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">4. Isencao de garantias</h2>
          <p className="leading-relaxed text-muted-foreground">
            O servico e fornecido &quot;como esta&quot;, sem garantias de disponibilidade continua ou adequacao
            a finalidades especificas. Nao nos responsabilizamos por interrupcoes decorrentes de manutencao, falhas
            de terceiros ou casos de forca maior.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">5. Lei aplicavel</h2>
          <p className="leading-relaxed text-muted-foreground">
            Estes Termos sao regidos pelas leis da Republica Federativa do Brasil. Fica eleito o foro da comarca de
            Sao Paulo/SP para dirimir eventuais controversias.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">6. Contato</h2>
          <p className="leading-relaxed text-muted-foreground">
            Duvidas sobre estes Termos:{' '}
            <a href="mailto:legal@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">
              legal@inboundforge.com
            </a>
          </p>
        </section>
      </div>
    </main>
  )
}

function TermsEnUS() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang="en-US">
      <LegalVersionHeader doc="terms" locale="en-US" />
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">Terms of Use</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="leading-relaxed text-muted-foreground">Last updated: April 2026. By accessing Inbound Forge, you agree to these Terms of Use.</p>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">1. Acceptance</h2>
          <p className="leading-relaxed text-muted-foreground">Use of Inbound Forge implies full acceptance of these Terms. If you disagree, do not use the service.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">2. Content License</h2>
          <p className="leading-relaxed text-muted-foreground">All content generated through Inbound Forge remains the property of the operator who created it. The platform claims no rights over texts, images, or publications produced by users.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">3. Acceptable Use</h2>
          <p className="leading-relaxed text-muted-foreground">You may not use the platform to publish unlawful, defamatory, discriminatory, or third-party infringing content. Inbound Forge reserves the right to suspend accounts in violation.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">4. Disclaimer of Warranties</h2>
          <p className="leading-relaxed text-muted-foreground">The service is provided &quot;as is&quot; without warranties of continuous availability or fitness for a particular purpose. We are not liable for outages due to maintenance, third-party failures, or force majeure.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">5. Governing Law</h2>
          <p className="leading-relaxed text-muted-foreground">These Terms are governed by the laws of Brazil. The courts of Sao Paulo, Brazil shall have exclusive jurisdiction.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">6. Contact</h2>
          <p className="leading-relaxed text-muted-foreground">Questions: <a href="mailto:legal@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">legal@inboundforge.com</a></p>
        </section>
      </div>
    </main>
  )
}

function TermsItIT() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang="it-IT">
      <LegalVersionHeader doc="terms" locale="it-IT" />
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">Termini di Utilizzo</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="leading-relaxed text-muted-foreground">Ultimo aggiornamento: aprile 2026. Utilizzando Inbound Forge, accetti i presenti Termini.</p>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">1. Accettazione</h2>
          <p className="leading-relaxed text-muted-foreground">L&apos;uso di Inbound Forge implica l&apos;accettazione integrale dei presenti Termini. In caso di disaccordo, non utilizzare il servizio.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">2. Licenza dei contenuti</h2>
          <p className="leading-relaxed text-muted-foreground">Tutti i contenuti generati tramite Inbound Forge rimangono di proprieta dell&apos;operatore che li ha creati. La piattaforma non rivendica alcun diritto su testi, immagini o pubblicazioni prodotte dagli utenti.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">3. Uso accettabile</h2>
          <p className="leading-relaxed text-muted-foreground">E vietato utilizzare la piattaforma per pubblicare contenuti illeciti, diffamatori, discriminatori o che violino diritti di terzi. Inbound Forge si riserva il diritto di sospendere account in violazione.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">4. Esclusione di garanzie</h2>
          <p className="leading-relaxed text-muted-foreground">Il servizio e fornito &quot;cosi com&apos;e&quot;, senza garanzie di disponibilita continua. Non siamo responsabili per interruzioni dovute a manutenzione, guasti di terzi o cause di forza maggiore.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">5. Legge applicabile</h2>
          <p className="leading-relaxed text-muted-foreground">I presenti Termini sono regolati dalle leggi della Repubblica Federativa del Brasile. Il foro competente e quello di San Paolo, Brasile.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">6. Contatti</h2>
          <p className="leading-relaxed text-muted-foreground">Domande: <a href="mailto:legal@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">legal@inboundforge.com</a></p>
        </section>
      </div>
    </main>
  )
}

function TermsEsES() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang="es-ES">
      <LegalVersionHeader doc="terms" locale="es-ES" />
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">Terminos de Uso</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="leading-relaxed text-muted-foreground">Ultima actualizacion: abril de 2026. Al acceder a Inbound Forge, aceptas estos Terminos de Uso.</p>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">1. Aceptacion</h2>
          <p className="leading-relaxed text-muted-foreground">El uso de Inbound Forge implica la aceptacion plena de estos Terminos. Si no esta de acuerdo, no utilice el servicio.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">2. Licencia de contenido</h2>
          <p className="leading-relaxed text-muted-foreground">Todo el contenido generado a traves de Inbound Forge es propiedad del operador que lo creo. La plataforma no reclama ningun derecho sobre textos, imagenes o publicaciones producidas por los usuarios.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">3. Uso aceptable</h2>
          <p className="leading-relaxed text-muted-foreground">Queda prohibido utilizar la plataforma para publicar contenido ilicito, difamatorio, discriminatorio o que infrinja derechos de terceros. Inbound Forge se reserva el derecho de suspender cuentas en infraccion.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">4. Exencion de garantias</h2>
          <p className="leading-relaxed text-muted-foreground">El servicio se proporciona &quot;tal cual&quot;, sin garantias de disponibilidad continua. No nos hacemos responsables de interrupciones por mantenimiento, fallos de terceros o fuerza mayor.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">5. Ley aplicable</h2>
          <p className="leading-relaxed text-muted-foreground">Estos Terminos se rigen por las leyes de la Republica Federativa de Brasil. Los tribunales de Sao Paulo, Brasil, tendran jurisdiccion exclusiva.</p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">6. Contacto</h2>
          <p className="leading-relaxed text-muted-foreground">Consultas: <a href="mailto:legal@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">legal@inboundforge.com</a></p>
        </section>
      </div>
    </main>
  )
}
