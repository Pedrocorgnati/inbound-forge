// Data layer com React.cache() para deduplicação de requests
// Resolve: generateMetadata + page component chamando getLead duas vezes
// Rastreabilidade: NEXT-DF-002

import { cache } from 'react'
import { prisma } from '@/lib/prisma'

/**
 * getLead deduplicado por request.
 * generateMetadata e LeadDetailPage chamam esta função — React.cache() garante
 * que a query Prisma execute apenas uma vez por request.
 */
export const getLead = cache(async (id: string) => {
  return prisma.lead.findUnique({
    where: { id },
    select: { id: true, name: true, company: true, funnelStage: true, channel: true, notes: true },
  })
})
