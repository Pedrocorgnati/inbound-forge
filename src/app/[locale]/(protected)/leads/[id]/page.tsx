import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { LeadDetailClient } from '@/components/leads/LeadDetailClient'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { company: true },
  })

  if (!lead) {
    return { title: 'Lead nao encontrado | Inbound Forge' }
  }

  const company = lead.company ?? 'Lead'
  return {
    title: `${company} | Leads | Inbound Forge`,
  }
}

export default function LeadDetailPage() {
  return <LeadDetailClient />
}
