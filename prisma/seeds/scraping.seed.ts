/**
 * Scraping Seed — Dev
 * TASK-0 ST004 / module-6-scraping-worker
 *
 * 5 fontes B2B curadas para desenvolvimento local.
 * Idempotente via upsert por (operatorId, url).
 * INT-136: NÃO incluir LinkedIn, Facebook ou redes sociais fechadas.
 */
import type { PrismaClient } from '@prisma/client'
import { upsertOperator } from './helpers'

const CURATED_SOURCES = [
  {
    name: 'Hacker News — Ask HN',
    url: 'https://news.ycombinator.com/ask',
    selector: '.comment-tree .commtext',
    crawlFrequency: 'daily',
    isProtected: false,
  },
  {
    name: 'Reddit r/smallbusiness',
    url: 'https://www.reddit.com/r/smallbusiness/new.json',
    selector: null,
    crawlFrequency: 'daily',
    isProtected: false,
  },
  {
    name: 'G2 Reviews — ERP Category',
    url: 'https://www.g2.com/categories/erp-systems',
    selector: '.review-text',
    crawlFrequency: 'weekly',
    isProtected: false,
  },
  {
    name: 'Product Hunt — B2B SaaS',
    url: 'https://www.producthunt.com/topics/saas',
    selector: '.comment-content',
    crawlFrequency: 'daily',
    isProtected: false,
  },
  {
    name: 'Stack Overflow — Business Intelligence',
    url: 'https://stackoverflow.com/questions/tagged/business-intelligence',
    selector: '.js-post-body',
    crawlFrequency: 'daily',
    isProtected: false,
  },
]

export async function seedScraping(prisma: PrismaClient) {
  console.log('🌱 [SCRAPING] Iniciando seed de fontes de scraping...')

  const operator = await upsertOperator(prisma, 'pedro@inboundforge.dev')

  const sources = await Promise.all(
    CURATED_SOURCES.map((source) =>
      prisma.source.upsert({
        where: {
          operatorId_url: {
            operatorId: operator.id,
            url: source.url,
          },
        },
        update: {
          name: source.name,
          selector: source.selector,
          crawlFrequency: source.crawlFrequency,
          isActive: true,
        },
        create: {
          operatorId: operator.id,
          name: source.name,
          url: source.url,
          selector: source.selector,
          crawlFrequency: source.crawlFrequency,
          isActive: true,
          isProtected: source.isProtected,
        },
      })
    )
  )

  console.log(`  ✓ Fontes criadas/atualizadas: ${sources.length}`)
  sources.forEach((s) => console.log(`    - ${s.name} (${s.url})`))

  return sources
}
