// /[locale]/(protected)/content/[pieceId]/history
// Intake-Review TASK-16 ST002 (CL-CS-036).

import ContentHistoryClient from './ContentHistoryClient'

interface PageProps {
  params: Promise<{ locale: string; pieceId: string }>
}

export default async function Page({ params }: PageProps) {
  const { pieceId } = await params
  return <ContentHistoryClient pieceId={pieceId} />
}
