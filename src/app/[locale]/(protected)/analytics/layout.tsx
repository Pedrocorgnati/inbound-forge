// FE-01: layout do segmento analytics — envolve as 5 rotas (index + channels +
// themes + learning + asov) com a tab-bar AnalyticsSubNav, dando navegacao
// bidirecional e eliminando a orfandade das sub-paginas. Herda force-dynamic do
// layout pai (protected).
import { AnalyticsSubNav } from '@/components/analytics/AnalyticsSubNav'

interface AnalyticsLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function AnalyticsLayout({ children, params }: AnalyticsLayoutProps) {
  const { locale } = await params
  return (
    <div className="space-y-6">
      <AnalyticsSubNav locale={locale} />
      {children}
    </div>
  )
}
