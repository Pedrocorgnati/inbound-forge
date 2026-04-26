/**
 * Scraping Seed — Dev
 * TASK-0 ST004 / module-6-scraping-worker
 * Atualizado: 2026-04-07 — Fontes brasileiras para encontrar PMEs com dores operacionais
 *
 * 8 fontes curadas para desenvolvimento local.
 * Foco: fóruns, comunidades e marketplaces onde PMEs brasileiras
 * expressam dores operacionais resolúveis com software sob medida.
 * Idempotente via upsert por (operatorId, url).
 * INT-136: NÃO incluir LinkedIn, Facebook ou redes sociais fechadas.
 */
import type { PrismaClient } from '@prisma/client'
import { upsertOperator } from './helpers'

const CURATED_SOURCES = [
  {
    name: 'Reddit r/brdev — Desenvolvedores brasileiros',
    url: 'https://www.reddit.com/r/brdev/new.json',
    selector: null,
    crawlFrequency: 'daily',
    isProtected: false,
  },
  {
    name: 'Reddit r/empreendedorismo — Empreendedores BR',
    url: 'https://www.reddit.com/r/empreendedorismo/new.json',
    selector: null,
    crawlFrequency: 'daily',
    isProtected: false,
  },
  {
    name: 'Hacker News — Ask HN (startups e B2B)',
    url: 'https://news.ycombinator.com/ask',
    selector: '.comment-tree .commtext',
    crawlFrequency: 'daily',
    isProtected: false,
  },
  {
    name: '99Freelas — Projetos de software sob medida',
    url: 'https://www.99freelas.com.br/projects?category=web-mobile-software',
    selector: '.project-description',
    crawlFrequency: 'daily',
    isProtected: false,
  },
  {
    name: 'Workana — Projetos de desenvolvimento Brasil',
    url: 'https://www.workana.com/jobs?category=it-programming&language=pt',
    selector: '.project-header',
    crawlFrequency: 'daily',
    isProtected: false,
  },
  {
    name: 'Sebrae — Artigos sobre digitalização PME',
    url: 'https://sebrae.com.br/sites/PortalSebrae/artigos',
    selector: '.article-content',
    crawlFrequency: 'weekly',
    isProtected: false,
  },
  {
    name: 'Product Hunt — B2B SaaS e ferramentas',
    url: 'https://www.producthunt.com/topics/saas',
    selector: '.comment-content',
    crawlFrequency: 'daily',
    isProtected: false,
  },
  {
    name: 'G2 Reviews — CRM e ERP (dores em avaliações)',
    url: 'https://www.g2.com/categories/crm',
    selector: '.review-text',
    crawlFrequency: 'weekly',
    isProtected: false,
  },
]

export async function seedScraping(prisma: PrismaClient) {
  console.log('🌱 [SCRAPING] Iniciando seed de fontes — foco mercado brasileiro...')

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
