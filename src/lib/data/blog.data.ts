// Data layer com React.cache() para deduplicação de requests
// Resolve: generateMetadata + page component chamando a mesma query Prisma duas vezes
// Rastreabilidade: NEXT-DF-001

import { cache } from 'react'
import { blogService } from '@/lib/services/blog.service'

/**
 * findBySlug deduplicado por request.
 * generateMetadata e o page component chamam esta função — React.cache() garante
 * que a query Prisma execute apenas uma vez por request, mesmo com chamadas múltiplas.
 */
export const findBlogPostBySlug = cache(blogService.findBySlug)

/**
 * listAllTags deduplicado por request.
 * Usado por TagNavigation renderizado em blog/page e tags/[tag]/page —
 * React.cache() evita query duplicada quando múltiplos componentes chamam em paralelo.
 */
export const listBlogTags = cache(blogService.listAllTags)
