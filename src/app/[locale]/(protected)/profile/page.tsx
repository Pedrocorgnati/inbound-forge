/**
 * loop 05-27 TAREFA-026: /profile foi consolidado em /settings/account
 * (caminho UNICO do perfil do operador). Ver ADR-0010-profile-namespace.
 * Esta rota agora e apenas um alias permanente (HTTP 308) para o canonico.
 */
import { permanentRedirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface ProfilePageProps {
  params: Promise<{ locale: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params
  permanentRedirect(`/${locale}/settings/account`)
}
