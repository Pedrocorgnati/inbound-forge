// /[locale]/cookies — Politica de Cookies (IB-I18N-01)
// Mirror do padrao de /terms: META por locale + componente inline por locale com
// lang LITERAL. Corrige tambem o bug de hreflang: SUPPORTED_LOCALES usava 'en'/'it'
// (rotas inexistentes) — agora deriva de routing.locales (pt-BR/en-US/it-IT/es-ES).
import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalVersionHeader } from '@/components/legal/LegalVersionHeader'
import { routing } from '@/i18n/config'
import { COOKIES_META } from '@/lib/legal/page-meta'

interface CookiesPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: CookiesPageProps): Promise<Metadata> {
  const { locale } = await params
  const meta = COOKIES_META[locale] ?? COOKIES_META['pt-BR']
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/cookies`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/cookies`])),
    },
  }
}

export default async function CookiesPage({ params }: CookiesPageProps) {
  const { locale } = await params
  if (locale === 'pt-BR') return <CookiesPtBR locale={locale} />
  if (locale === 'it-IT') return <CookiesItIT locale={locale} />
  if (locale === 'es-ES') return <CookiesEsES locale={locale} />
  return <CookiesEnUS locale={locale} />
}

function CookiesPtBR({ locale }: { locale: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang="pt-BR">
      <LegalVersionHeader doc="cookies" locale="pt-BR" />
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">Politica de Cookies</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="text-muted-foreground leading-relaxed">
          Ultima atualizacao: abril de 2026. Esta politica descreve como o Inbound Forge utiliza cookies e
          tecnologias similares, em conformidade com a Lei Geral de Protecao de Dados (LGPD &mdash; Lei 13.709/2018)
          e com a regulamentacao europeia aplicavel quando o acesso ocorre desde a Uniao Europeia.
        </p>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. O que sao cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            Cookies sao pequenos arquivos de texto armazenados no seu navegador quando voce visita um site.
            Eles permitem que o site lembre informacoes sobre sua visita, tornando a navegacao mais eficiente e personalizada.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Categorias de cookies</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Funcionais (sempre ativos):</strong> indispensaveis para o funcionamento tecnico do site, manutencao de sessao autenticada e preferencias de idioma. Nao requerem consentimento porque sao base contratual / interesse legitimo.</li>
            <li><strong>Analytics:</strong> dados de navegacao anonimizados via Google Analytics 4 com IP anonimizado. Coletados apenas mediante consentimento explicito.</li>
            <li><strong>Marketing:</strong> personalizacao de conteudo e mensuracao de campanhas. Coletados apenas mediante consentimento explicito.</li>
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
                <tr className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-xs">if_session</td><td className="py-2 pr-4">Funcional</td><td className="py-2 pr-4">Manter sessao autenticada</td><td className="py-2">Sessao</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-xs">lgpd_consent</td><td className="py-2 pr-4">Funcional</td><td className="py-2 pr-4">Armazenar preferencias de consentimento</td><td className="py-2">12 meses</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-xs">_ga, _ga_*</td><td className="py-2 pr-4">Analytics</td><td className="py-2 pr-4">Identificacao anonimizada de visitantes (GA4)</td><td className="py-2">14 meses</td></tr>
                <tr><td className="py-2 pr-4 font-mono text-xs">_gid</td><td className="py-2 pr-4">Analytics</td><td className="py-2 pr-4">Distincao de sessoes para analise (GA4)</td><td className="py-2">24 horas</td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Como gerenciar suas preferencias</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Voce pode revisar e alterar suas preferencias a qualquer momento reabrindo o banner de consentimento
            atraves do botao &quot;Preferencias de Cookies&quot; disponivel no rodape do site. Tambem e possivel
            bloquear cookies diretamente nas configuracoes do seu navegador, embora isso possa afetar funcionalidades do site.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Documentos relacionados</h2>
          <p className="text-muted-foreground leading-relaxed">
            Consulte tambem nossa{' '}
            <Link href={`/${locale}/privacy`} className="text-primary underline underline-offset-2 hover:text-primary-hover">Politica de Privacidade</Link>{' '}
            e os{' '}
            <Link href={`/${locale}/terms`} className="text-primary underline underline-offset-2 hover:text-primary-hover">Termos de Uso</Link>.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Contato</h2>
          <p className="text-muted-foreground leading-relaxed">
            Duvidas relacionadas ao tratamento de cookies podem ser enviadas para{' '}
            <a href="mailto:privacidade@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">privacidade@inboundforge.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}

function CookiesEnUS({ locale }: { locale: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang="en-US">
      <LegalVersionHeader doc="cookies" locale="en-US" />
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">Cookie Policy</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="text-muted-foreground leading-relaxed">
          Last updated: April 2026. This policy describes how Inbound Forge uses cookies and similar technologies,
          in compliance with Brazil&apos;s General Data Protection Law (LGPD &mdash; Law 13,709/2018) and with applicable
          European regulation when access occurs from the European Union.
        </p>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. What are cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            Cookies are small text files stored in your browser when you visit a site. They let the site remember
            information about your visit, making navigation more efficient and personalized.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Cookie categories</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Functional (always active):</strong> indispensable for the technical operation of the site, maintaining an authenticated session and language preferences. They do not require consent because they rely on contractual basis / legitimate interest.</li>
            <li><strong>Analytics:</strong> anonymized browsing data via Google Analytics 4 with anonymized IP. Collected only with explicit consent.</li>
            <li><strong>Marketing:</strong> content personalization and campaign measurement. Collected only with explicit consent.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Cookies used</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-foreground">
                  <th className="py-2 pr-4">Cookie</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Purpose</th>
                  <th className="py-2">Retention</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-xs">if_session</td><td className="py-2 pr-4">Functional</td><td className="py-2 pr-4">Maintain authenticated session</td><td className="py-2">Session</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-xs">lgpd_consent</td><td className="py-2 pr-4">Functional</td><td className="py-2 pr-4">Store consent preferences</td><td className="py-2">12 months</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-xs">_ga, _ga_*</td><td className="py-2 pr-4">Analytics</td><td className="py-2 pr-4">Anonymized visitor identification (GA4)</td><td className="py-2">14 months</td></tr>
                <tr><td className="py-2 pr-4 font-mono text-xs">_gid</td><td className="py-2 pr-4">Analytics</td><td className="py-2 pr-4">Session distinction for analysis (GA4)</td><td className="py-2">24 hours</td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. How to manage your preferences</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            You can review and change your preferences at any time by reopening the consent banner via the
            &quot;Cookie Preferences&quot; button in the site footer. You can also block cookies directly in your
            browser settings, although this may affect site functionality.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Related documents</h2>
          <p className="text-muted-foreground leading-relaxed">
            See also our{' '}
            <Link href={`/${locale}/privacy`} className="text-primary underline underline-offset-2 hover:text-primary-hover">Privacy Policy</Link>{' '}
            and the{' '}
            <Link href={`/${locale}/terms`} className="text-primary underline underline-offset-2 hover:text-primary-hover">Terms of Use</Link>.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            Questions about cookie processing can be sent to{' '}
            <a href="mailto:privacidade@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">privacidade@inboundforge.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}

function CookiesItIT({ locale }: { locale: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang="it-IT">
      <LegalVersionHeader doc="cookies" locale="it-IT" />
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">Informativa sui Cookie</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="text-muted-foreground leading-relaxed">
          Ultimo aggiornamento: aprile 2026. La presente informativa descrive come Inbound Forge utilizza i cookie
          e tecnologie simili, in conformita con la Legge Generale sulla Protezione dei Dati (LGPD &mdash; Legge 13.709/2018)
          e con la regolamentazione europea applicabile quando l&apos;accesso avviene dall&apos;Unione Europea.
        </p>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Cosa sono i cookie</h2>
          <p className="text-muted-foreground leading-relaxed">
            I cookie sono piccoli file di testo memorizzati nel tuo browser quando visiti un sito. Permettono al sito
            di ricordare informazioni sulla tua visita, rendendo la navigazione piu efficiente e personalizzata.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Categorie di cookie</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Funzionali (sempre attivi):</strong> indispensabili per il funzionamento tecnico del sito, il mantenimento della sessione autenticata e le preferenze di lingua. Non richiedono consenso perche basati su base contrattuale / interesse legittimo.</li>
            <li><strong>Analytics:</strong> dati di navigazione anonimizzati tramite Google Analytics 4 con IP anonimizzato. Raccolti solo previo consenso esplicito.</li>
            <li><strong>Marketing:</strong> personalizzazione dei contenuti e misurazione delle campagne. Raccolti solo previo consenso esplicito.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Cookie utilizzati</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-foreground">
                  <th className="py-2 pr-4">Cookie</th>
                  <th className="py-2 pr-4">Categoria</th>
                  <th className="py-2 pr-4">Finalita</th>
                  <th className="py-2">Conservazione</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-xs">if_session</td><td className="py-2 pr-4">Funzionale</td><td className="py-2 pr-4">Mantenere la sessione autenticata</td><td className="py-2">Sessione</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-xs">lgpd_consent</td><td className="py-2 pr-4">Funzionale</td><td className="py-2 pr-4">Memorizzare le preferenze di consenso</td><td className="py-2">12 mesi</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-xs">_ga, _ga_*</td><td className="py-2 pr-4">Analytics</td><td className="py-2 pr-4">Identificazione anonimizzata dei visitatori (GA4)</td><td className="py-2">14 mesi</td></tr>
                <tr><td className="py-2 pr-4 font-mono text-xs">_gid</td><td className="py-2 pr-4">Analytics</td><td className="py-2 pr-4">Distinzione delle sessioni per l&apos;analisi (GA4)</td><td className="py-2">24 ore</td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Come gestire le tue preferenze</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Puoi rivedere e modificare le tue preferenze in qualsiasi momento riaprendo il banner di consenso tramite
            il pulsante &quot;Preferenze Cookie&quot; disponibile nel footer del sito. Puoi anche bloccare i cookie
            direttamente nelle impostazioni del browser, anche se cio potrebbe compromettere le funzionalita del sito.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Documenti correlati</h2>
          <p className="text-muted-foreground leading-relaxed">
            Consulta anche la nostra{' '}
            <Link href={`/${locale}/privacy`} className="text-primary underline underline-offset-2 hover:text-primary-hover">Informativa sulla Privacy</Link>{' '}
            e i{' '}
            <Link href={`/${locale}/terms`} className="text-primary underline underline-offset-2 hover:text-primary-hover">Termini di Utilizzo</Link>.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Contatti</h2>
          <p className="text-muted-foreground leading-relaxed">
            Domande relative al trattamento dei cookie possono essere inviate a{' '}
            <a href="mailto:privacidade@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">privacidade@inboundforge.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}

function CookiesEsES({ locale }: { locale: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" lang="es-ES">
      <LegalVersionHeader doc="cookies" locale="es-ES" />
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">Politica de Cookies</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <p className="text-muted-foreground leading-relaxed">
          Ultima actualizacion: abril de 2026. Esta politica describe como Inbound Forge utiliza cookies y tecnologias
          similares, conforme a la Ley General de Proteccion de Datos (LGPD &mdash; Ley 13.709/2018) y a la regulacion
          europea aplicable cuando el acceso ocurre desde la Union Europea.
        </p>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Que son las cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            Las cookies son pequenos archivos de texto almacenados en tu navegador cuando visitas un sitio. Permiten
            que el sitio recuerde informacion sobre tu visita, haciendo la navegacion mas eficiente y personalizada.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Categorias de cookies</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Funcionales (siempre activas):</strong> indispensables para el funcionamiento tecnico del sitio, el mantenimiento de la sesion autenticada y las preferencias de idioma. No requieren consentimiento por basarse en base contractual / interes legitimo.</li>
            <li><strong>Analytics:</strong> datos de navegacion anonimizados mediante Google Analytics 4 con IP anonimizada. Recopilados solo con consentimiento explicito.</li>
            <li><strong>Marketing:</strong> personalizacion de contenido y medicion de campanas. Recopilados solo con consentimiento explicito.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Cookies utilizadas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-foreground">
                  <th className="py-2 pr-4">Cookie</th>
                  <th className="py-2 pr-4">Categoria</th>
                  <th className="py-2 pr-4">Finalidad</th>
                  <th className="py-2">Retencion</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-xs">if_session</td><td className="py-2 pr-4">Funcional</td><td className="py-2 pr-4">Mantener la sesion autenticada</td><td className="py-2">Sesion</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-xs">lgpd_consent</td><td className="py-2 pr-4">Funcional</td><td className="py-2 pr-4">Almacenar preferencias de consentimiento</td><td className="py-2">12 meses</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-xs">_ga, _ga_*</td><td className="py-2 pr-4">Analytics</td><td className="py-2 pr-4">Identificacion anonimizada de visitantes (GA4)</td><td className="py-2">14 meses</td></tr>
                <tr><td className="py-2 pr-4 font-mono text-xs">_gid</td><td className="py-2 pr-4">Analytics</td><td className="py-2 pr-4">Distincion de sesiones para analisis (GA4)</td><td className="py-2">24 horas</td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Como gestionar tus preferencias</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Puedes revisar y cambiar tus preferencias en cualquier momento reabriendo el banner de consentimiento
            mediante el boton &quot;Preferencias de Cookies&quot; disponible en el pie del sitio. Tambien puedes
            bloquear cookies directamente en la configuracion de tu navegador, aunque esto puede afectar funcionalidades del sitio.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Documentos relacionados</h2>
          <p className="text-muted-foreground leading-relaxed">
            Consulta tambien nuestra{' '}
            <Link href={`/${locale}/privacy`} className="text-primary underline underline-offset-2 hover:text-primary-hover">Politica de Privacidad</Link>{' '}
            y los{' '}
            <Link href={`/${locale}/terms`} className="text-primary underline underline-offset-2 hover:text-primary-hover">Terminos de Uso</Link>.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Contacto</h2>
          <p className="text-muted-foreground leading-relaxed">
            Las dudas relacionadas con el tratamiento de cookies pueden enviarse a{' '}
            <a href="mailto:privacidade@inboundforge.com" className="text-primary underline underline-offset-2 hover:text-primary-hover">privacidade@inboundforge.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}
