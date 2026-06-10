// /[locale]/privacy — Politica de Privacidade (IB-I18N-01)
// Server Component. Mirror do padrao de /terms: META por locale + componente
// inline por locale com lang LITERAL (nunca lang={locale}, que mentia o idioma
// real do conteudo e violava WCAG 3.1.2). A politica e regida pela LGPD
// independentemente do idioma da UI; as traducoes sao apenas da copy de interface.
import type { Metadata } from 'next'
import { LegalVersionHeader } from '@/components/legal/LegalVersionHeader'
import { routing } from '@/i18n/config'
import { PRIVACY_META } from '@/lib/legal/page-meta'

interface PrivacyPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params
  const meta = PRIVACY_META[locale] ?? PRIVACY_META['pt-BR']
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/privacy`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/privacy`])),
    },
  }
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params
  if (locale === 'pt-BR') return <PrivacyPtBR />
  if (locale === 'it-IT') return <PrivacyItIT />
  if (locale === 'es-ES') return <PrivacyEsES />
  return <PrivacyEnUS />
}

function PrivacyPtBR() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang="pt-BR">
      <LegalVersionHeader doc="privacy" locale="pt-BR" />
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">Política de Privacidade</h1>
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
            <a href="mailto:privacidade@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">privacidade@inboundforge.com</a>.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Dados coletados</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">Coletamos os seguintes tipos de dados:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong>Cookies funcionais:</strong> necessários para o funcionamento básico do site (sempre ativos).</li>
            <li><strong>Cookies de analytics:</strong> dados de navegação anonimizados via Google Analytics 4 (IP anonimizado), coletados apenas com seu consentimento.</li>
            <li><strong>Cookies de marketing:</strong> utilizados para personalização de conteúdo e campanhas, coletados apenas com seu consentimento.</li>
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
          <p className="text-muted-foreground leading-relaxed mb-2">Conforme a LGPD, você tem direito a:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong>Acesso:</strong> solicitar informações sobre quais dados pessoais tratamos.</li>
            <li><strong>Correção:</strong> solicitar a correção de dados incompletos ou desatualizados.</li>
            <li><strong>Eliminação:</strong> solicitar a exclusão de dados pessoais tratados com base no consentimento.</li>
            <li><strong>Portabilidade:</strong> solicitar a transferência de seus dados para outro fornecedor.</li>
            <li><strong>Revogação:</strong> revogar o consentimento a qualquer momento, sem prejudicar o tratamento realizado anteriormente.</li>
            <li><strong>Informação:</strong> ser informado sobre as entidades com as quais compartilhamos seus dados.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Retenção de dados</h2>
          <p className="text-muted-foreground leading-relaxed">
            O cookie de consentimento (<code className="text-sm bg-muted px-1.5 py-0.5 rounded">lgpd_consent</code>)
            é armazenado por até 365 dias. Dados de analytics são retidos conforme a configuração padrão do Google Analytics 4 (14 meses).
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Compartilhamento</h2>
          <p className="text-muted-foreground leading-relaxed">
            Os dados de analytics são processados pelo Google LLC (Google Analytics 4) com IP anonimizado. Não vendemos,
            alugamos ou compartilhamos seus dados pessoais com terceiros para fins não descritos nesta política.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. Contato</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de seus dados, entre em contato pelo e-mail:{' '}
            <a href="mailto:privacidade@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">privacidade@inboundforge.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}

function PrivacyEnUS() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang="en-US">
      <LegalVersionHeader doc="privacy" locale="en-US" />
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">Privacy Policy</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="text-muted-foreground leading-relaxed">
          Last updated: March 2026. This policy describes how Inbound Forge (&quot;we&quot;, &quot;our&quot;)
          collects, uses, and protects your personal data, in compliance with Brazil&apos;s General Data
          Protection Law (LGPD — Law 13,709/2018).
        </p>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Data Controller</h2>
          <p className="text-muted-foreground leading-relaxed">
            The controller responsible for processing personal data is Inbound Forge. For privacy-related
            contact, use the email:{' '}
            <a href="mailto:privacidade@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">privacidade@inboundforge.com</a>.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Data We Collect</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">We collect the following types of data:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong>Functional cookies:</strong> required for the basic operation of the site (always active).</li>
            <li><strong>Analytics cookies:</strong> anonymized browsing data via Google Analytics 4 (anonymized IP), collected only with your consent.</li>
            <li><strong>Marketing cookies:</strong> used for content personalization and campaigns, collected only with your consent.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Purpose of Processing</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>Ensure the technical operation of the site</li>
            <li>Analyze usage patterns to improve the user experience</li>
            <li>Personalize content and recommendations</li>
            <li>Measure the effectiveness of marketing campaigns</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Legal Basis</h2>
          <p className="text-muted-foreground leading-relaxed">
            Processing of analytics and marketing data is based on the <strong>data subject&apos;s consent</strong>
            (LGPD Art. 7, I). Functional cookies are processed based on <strong>legitimate interest</strong>
            (LGPD Art. 7, IX), as they are strictly necessary for the service to operate.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">Under the LGPD, you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong>Access:</strong> request information about which personal data we process.</li>
            <li><strong>Correction:</strong> request the correction of incomplete or outdated data.</li>
            <li><strong>Deletion:</strong> request the deletion of personal data processed based on consent.</li>
            <li><strong>Portability:</strong> request the transfer of your data to another provider.</li>
            <li><strong>Withdrawal:</strong> withdraw consent at any time, without affecting prior processing.</li>
            <li><strong>Information:</strong> be informed about the entities with which we share your data.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            The consent cookie (<code className="text-sm bg-muted px-1.5 py-0.5 rounded">lgpd_consent</code>)
            is stored for up to 365 days. Analytics data is retained per the Google Analytics 4 default configuration (14 months).
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Sharing</h2>
          <p className="text-muted-foreground leading-relaxed">
            Analytics data is processed by Google LLC (Google Analytics 4) with anonymized IP. We do not sell,
            rent, or share your personal data with third parties for purposes not described in this policy.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            To exercise your rights or clarify questions about the processing of your data, contact us at:{' '}
            <a href="mailto:privacidade@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">privacidade@inboundforge.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}

function PrivacyItIT() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang="it-IT">
      <LegalVersionHeader doc="privacy" locale="it-IT" />
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">Informativa sulla Privacy</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="text-muted-foreground leading-relaxed">
          Ultimo aggiornamento: marzo 2026. La presente informativa descrive come Inbound Forge (&quot;noi&quot;,
          &quot;nostro&quot;) raccoglie, utilizza e protegge i tuoi dati personali, in conformita con la Legge
          Generale sulla Protezione dei Dati (LGPD — Legge 13.709/2018).
        </p>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Titolare del trattamento</h2>
          <p className="text-muted-foreground leading-relaxed">
            Il titolare responsabile del trattamento dei dati personali e Inbound Forge. Per contatti relativi
            alla privacy, usa l&apos;email:{' '}
            <a href="mailto:privacidade@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">privacidade@inboundforge.com</a>.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Dati raccolti</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">Raccogliamo i seguenti tipi di dati:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong>Cookie funzionali:</strong> necessari per il funzionamento di base del sito (sempre attivi).</li>
            <li><strong>Cookie di analytics:</strong> dati di navigazione anonimizzati tramite Google Analytics 4 (IP anonimizzato), raccolti solo con il tuo consenso.</li>
            <li><strong>Cookie di marketing:</strong> utilizzati per la personalizzazione di contenuti e campagne, raccolti solo con il tuo consenso.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Finalita del trattamento</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>Garantire il funzionamento tecnico del sito</li>
            <li>Analizzare i modelli di utilizzo per migliorare l&apos;esperienza utente</li>
            <li>Personalizzare contenuti e raccomandazioni</li>
            <li>Misurare l&apos;efficacia delle campagne di marketing</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Base giuridica</h2>
          <p className="text-muted-foreground leading-relaxed">
            Il trattamento dei dati di analytics e marketing si basa sul <strong>consenso dell&apos;interessato</strong>
            (Art. 7, I LGPD). I cookie funzionali sono trattati sulla base del <strong>legittimo interesse</strong>
            (Art. 7, IX LGPD), poiche strettamente necessari al funzionamento del servizio.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. I tuoi diritti</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">Ai sensi della LGPD, hai diritto a:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong>Accesso:</strong> richiedere informazioni su quali dati personali trattiamo.</li>
            <li><strong>Rettifica:</strong> richiedere la correzione di dati incompleti o non aggiornati.</li>
            <li><strong>Cancellazione:</strong> richiedere l&apos;eliminazione dei dati personali trattati sulla base del consenso.</li>
            <li><strong>Portabilita:</strong> richiedere il trasferimento dei tuoi dati a un altro fornitore.</li>
            <li><strong>Revoca:</strong> revocare il consenso in qualsiasi momento, senza pregiudicare il trattamento precedente.</li>
            <li><strong>Informazione:</strong> essere informato sulle entita con cui condividiamo i tuoi dati.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Conservazione dei dati</h2>
          <p className="text-muted-foreground leading-relaxed">
            Il cookie di consenso (<code className="text-sm bg-muted px-1.5 py-0.5 rounded">lgpd_consent</code>)
            e conservato fino a 365 giorni. I dati di analytics sono conservati secondo la configurazione predefinita di Google Analytics 4 (14 mesi).
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Condivisione</h2>
          <p className="text-muted-foreground leading-relaxed">
            I dati di analytics sono trattati da Google LLC (Google Analytics 4) con IP anonimizzato. Non vendiamo,
            affittiamo ne condividiamo i tuoi dati personali con terzi per finalita non descritte nella presente informativa.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. Contatti</h2>
          <p className="text-muted-foreground leading-relaxed">
            Per esercitare i tuoi diritti o chiarire dubbi sul trattamento dei tuoi dati, contattaci all&apos;email:{' '}
            <a href="mailto:privacidade@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">privacidade@inboundforge.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}

function PrivacyEsES() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang="es-ES">
      <LegalVersionHeader doc="privacy" locale="es-ES" />
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">Política de Privacidad</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="text-muted-foreground leading-relaxed">
          Última actualización: marzo de 2026. Esta política describe cómo Inbound Forge (&quot;nosotros&quot;,
          &quot;nuestro&quot;) recopila, utiliza y protege tus datos personales, conforme a la Ley General de
          Protección de Datos (LGPD — Ley 13.709/2018).
        </p>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Responsable del tratamiento</h2>
          <p className="text-muted-foreground leading-relaxed">
            El responsable del tratamiento de los datos personales es Inbound Forge. Para contacto relacionado
            con la privacidad, utiliza el correo:{' '}
            <a href="mailto:privacidade@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">privacidade@inboundforge.com</a>.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Datos recopilados</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">Recopilamos los siguientes tipos de datos:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong>Cookies funcionales:</strong> necesarias para el funcionamiento básico del sitio (siempre activas).</li>
            <li><strong>Cookies de analytics:</strong> datos de navegación anonimizados mediante Google Analytics 4 (IP anonimizada), recopilados solo con tu consentimiento.</li>
            <li><strong>Cookies de marketing:</strong> utilizadas para la personalización de contenido y campañas, recopiladas solo con tu consentimiento.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Finalidad del tratamiento</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>Garantizar el funcionamiento técnico del sitio</li>
            <li>Analizar patrones de uso para mejorar la experiencia del usuario</li>
            <li>Personalizar contenidos y recomendaciones</li>
            <li>Medir la efectividad de las campañas de marketing</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Base legal</h2>
          <p className="text-muted-foreground leading-relaxed">
            El tratamiento de datos de analytics y marketing se realiza con base en el <strong>consentimiento del
            titular</strong> (Art. 7, I de la LGPD). Las cookies funcionales se tratan con base en el <strong>interés
            legítimo</strong> (Art. 7, IX de la LGPD), por ser estrictamente necesarias para el funcionamiento del servicio.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Tus derechos</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">Conforme a la LGPD, tienes derecho a:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong>Acceso:</strong> solicitar información sobre qué datos personales tratamos.</li>
            <li><strong>Corrección:</strong> solicitar la corrección de datos incompletos o desactualizados.</li>
            <li><strong>Eliminación:</strong> solicitar la eliminación de datos personales tratados con base en el consentimiento.</li>
            <li><strong>Portabilidad:</strong> solicitar la transferencia de tus datos a otro proveedor.</li>
            <li><strong>Revocación:</strong> revocar el consentimiento en cualquier momento, sin perjudicar el tratamiento previo.</li>
            <li><strong>Información:</strong> ser informado sobre las entidades con las que compartimos tus datos.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Retención de datos</h2>
          <p className="text-muted-foreground leading-relaxed">
            La cookie de consentimiento (<code className="text-sm bg-muted px-1.5 py-0.5 rounded">lgpd_consent</code>)
            se almacena hasta 365 días. Los datos de analytics se conservan según la configuración predeterminada de Google Analytics 4 (14 meses).
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Compartición</h2>
          <p className="text-muted-foreground leading-relaxed">
            Los datos de analytics son procesados por Google LLC (Google Analytics 4) con IP anonimizada. No vendemos,
            alquilamos ni compartimos tus datos personales con terceros para fines no descritos en esta política.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. Contacto</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para ejercer tus derechos o aclarar dudas sobre el tratamiento de tus datos, contáctanos en el correo:{' '}
            <a href="mailto:privacidade@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">privacidade@inboundforge.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}
