/**
 * Seed de Blog Articles — Inbound Forge (Dev)
 * Cobre: BlogArticle (todos os ArticleStatus), BlogArticleVersion (versionamento)
 * Idempotente via upsert por id.
 */
import type { PrismaClient } from '@prisma/client'

export async function seedBlog(prisma: PrismaClient): Promise<void> {
  const now = new Date()
  const past = (days: number) => new Date(now.getTime() - days * 86400000)
  const future = (days: number) => new Date(now.getTime() + days * 86400000)

  // Busca um ContentPiece PUBLISHED para associar ao artigo publicado
  const publishedPiece = await prisma.contentPiece.findFirst({
    where: { status: 'PUBLISHED' },
  })

  // ── BlogArticles (todos os ArticleStatus) ────────────────────────────────
  const articlesData = [
    // DRAFT — em escrita
    {
      id: 'dev-blog-001',
      contentPieceId: null,
      slug: 'sistema-inbound-do-zero-pmes',
      title: 'Como criar um sistema de inbound marketing do zero para PMEs',
      excerpt: 'Um guia prático para pequenas e médias empresas que querem gerar leads previsíveis sem depender de anúncios pagos.',
      body: `# Como criar um sistema de inbound marketing do zero para PMEs

## Introdução

A maioria das PMEs brasileiras ainda depende quase exclusivamente de indicações para gerar novos clientes. Esse modelo é insustentável a longo prazo.

## O que é inbound marketing

Inbound marketing é a estratégia de atrair potenciais clientes através de conteúdo relevante, em vez de interrompê-los com publicidade.

## Passo a passo para PMEs

### 1. Defina seu ICP (Ideal Customer Profile)
[Conteúdo em desenvolvimento...]`,
      metaTitle: 'Sistema de Inbound Marketing do Zero para PMEs | Inbound Forge',
      metaDescription: 'Aprenda a criar um sistema de geração de leads previsível para sua PME sem depender de anúncios pagos. Guia prático passo a passo.',
      tags: ['inbound', 'PME', 'leads', 'marketing', 'B2B'],
      status: 'DRAFT' as const,
      authorName: 'Pedro Corgnati',
      ctaType: 'CONTACT_FORM' as const,
      ctaLabel: 'Agende uma conversa gratuita',
      ctaUrl: 'https://inboundforge.dev/contato',
      currentVersion: 1,
    },
    // REVIEW — aguardando aprovação
    {
      id: 'dev-blog-002',
      contentPieceId: null,
      slug: 'como-reduzir-cac-conteudo-organico',
      title: 'Como reduzir seu CAC em 40% usando conteúdo orgânico',
      excerpt: 'Case real de consultora B2B que substituiu tráfego pago por inbound estruturado e reduziu seu custo de aquisição em 40% em 6 meses.',
      body: `# Como reduzir seu CAC em 40% usando conteúdo orgânico

## O problema

CAC (Custo de Aquisição de Cliente) elevado é um dos maiores gargalos para SaaS e consultorias B2B.

## O case

Uma consultora de TI que atendia médias empresas industriais tinha um CAC de R$ 8.400. Após 6 meses de inbound estruturado, esse número caiu para R$ 5.040 — redução de 40%.

## O que mudou

1. Blog com artigos focados nas dores do ICP
2. LinkedIn orgânico com cadência semanal
3. Funil de nutrição por email
4. Rastreamento de atribuição (first-touch)

## Métricas finais

- CAC: -40%
- Ciclo de venda: -30%
- Leads qualificados/mês: +180%`,
      metaTitle: 'Como Reduzir o CAC com Conteúdo Orgânico | Inbound Forge',
      metaDescription: 'Descubra como uma consultora B2B reduziu seu CAC em 40% usando inbound marketing estruturado. Case real com números.',
      canonicalUrl: 'https://inboundforge.dev/blog/como-reduzir-cac-conteudo-organico',
      tags: ['CAC', 'inbound', 'case', 'B2B', 'marketing'],
      status: 'REVIEW' as const,
      authorName: 'Pedro Corgnati',
      ctaType: 'WHATSAPP' as const,
      ctaLabel: 'Quero reduzir meu CAC também',
      currentVersion: 2,
    },
    // PUBLISHED — live
    {
      id: 'dev-blog-003',
      contentPieceId: publishedPiece?.id ?? null,
      slug: 'linkedin-consultores-autoridade-90-dias',
      title: 'LinkedIn para consultores: do zero à autoridade em 90 dias',
      excerpt: 'Passo a passo testado para consultores independentes construírem autoridade real no LinkedIn sem postar todo dia.',
      body: `# LinkedIn para consultores: do zero à autoridade em 90 dias

## Por que LinkedIn para consultores?

LinkedIn é o único canal onde seus clientes ideais (decisores B2B) estão ativamente buscando fornecedores e parceiros.

## A estratégia em 3 fases

### Fase 1 (Dias 1-30): Fundação
- Otimize seu perfil com foco no ICP
- Defina os 3 temas principais do seu posicionamento
- Conecte-se com 50 potenciais clientes qualificados

### Fase 2 (Dias 31-60): Consistência
- Publique 2x por semana (carrossel + post de texto)
- Responda todos os comentários em 24h
- Engaje em posts dos seus ICPs

### Fase 3 (Dias 61-90): Conversão
- Crie 1 conteúdo de conversão por mês
- Adicione CTA suave nos posts de maior engajamento
- Meça: leads gerados, conversas iniciadas, propostas enviadas

## Resultados esperados

Consultores que seguem essa estratégia sistematicamente geram entre 2 e 5 reuniões qualificadas por mês organicamente.`,
      metaTitle: 'LinkedIn para Consultores: Autoridade em 90 Dias | Inbound Forge',
      metaDescription: 'Estratégia testada para consultores construírem autoridade no LinkedIn em 90 dias e gerar reuniões qualificadas organicamente.',
      canonicalUrl: 'https://inboundforge.dev/blog/linkedin-consultores-autoridade-90-dias',
      schemaTypes: ['BlogPosting', 'HowTo'],
      hreflang: { 'pt-BR': '/blog/linkedin-consultores-autoridade-90-dias', 'en': '/en/blog/linkedin-for-consultants' },
      tags: ['LinkedIn', 'consultores', 'autoridade', 'B2B', 'orgânico'],
      status: 'PUBLISHED' as const,
      authorName: 'Pedro Corgnati',
      jsonLd: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: 'LinkedIn para consultores: do zero à autoridade em 90 dias',
        author: { '@type': 'Person', name: 'Pedro Corgnati' },
      }),
      ctaType: 'CONTACT_FORM' as const,
      ctaLabel: 'Quero uma estratégia personalizada',
      ctaUrl: 'https://inboundforge.dev/contato',
      currentVersion: 3,
      approvedBy: 'pedro@inboundforge.dev',
      approvedAt: past(5),
      publishedAt: past(3),
    },
    // ARCHIVED — publicado mas arquivado
    {
      id: 'dev-blog-004',
      contentPieceId: null,
      slug: 'ferramentas-inbound-2024-archived',
      title: 'As 10 melhores ferramentas de inbound marketing em 2024',
      excerpt: 'Lista atualizada das principais ferramentas para automação de marketing, CRM e analytics usadas por times de inbound.',
      body: `# As 10 melhores ferramentas de inbound marketing em 2024

*Este artigo foi arquivado. Veja a versão atualizada para 2026.*

[Conteúdo arquivado]`,
      metaTitle: 'Ferramentas de Inbound 2024 [ARQUIVADO]',
      metaDescription: 'Este artigo foi arquivado.',
      tags: ['ferramentas', 'inbound', 'automação'],
      status: 'ARCHIVED' as const,
      authorName: 'Pedro Corgnati',
      currentVersion: 1,
      publishedAt: past(120),
    },
  ]

  for (const article of articlesData) {
    await prisma.blogArticle.upsert({
      where: { id: article.id },
      update: {},
      create: article,
    })
  }
  console.log(`  ✓ BlogArticles: ${articlesData.length} (DRAFT, REVIEW, PUBLISHED, ARCHIVED)`)

  // ── BlogArticleVersions ─────────────────────────────────────────────────
  const versionsData = [
    // dev-blog-002 — REVIEW (versão 1 e 2)
    {
      id: 'dev-blog-ver-001',
      articleId: 'dev-blog-002',
      versionNumber: 1,
      title: 'Como reduzir seu CAC usando conteúdo orgânico',
      body: '<p>Versão inicial — rascunho.</p>',
      changeNote: 'Versão inicial',
      createdAt: past(10),
    },
    {
      id: 'dev-blog-ver-002',
      articleId: 'dev-blog-002',
      versionNumber: 2,
      title: 'Como reduzir seu CAC em 40% usando conteúdo orgânico',
      body: '<p>Versão revisada com dados do case real e métricas atualizadas.</p>',
      changeNote: 'Adicionados dados do case e métricas finais',
      createdAt: past(5),
    },
    // dev-blog-003 — PUBLISHED (versões 1, 2 e 3)
    {
      id: 'dev-blog-ver-003',
      articleId: 'dev-blog-003',
      versionNumber: 1,
      title: 'LinkedIn para consultores: guia rápido',
      body: '<p>Versão inicial curta.</p>',
      changeNote: 'Versão inicial',
      createdAt: past(15),
    },
    {
      id: 'dev-blog-ver-004',
      articleId: 'dev-blog-003',
      versionNumber: 2,
      title: 'LinkedIn para consultores: do zero à autoridade em 90 dias',
      body: '<p>Versão expandida com as 3 fases detalhadas.</p>',
      changeNote: 'Expansão com estratégia de 3 fases',
      createdAt: past(8),
    },
    {
      id: 'dev-blog-ver-005',
      articleId: 'dev-blog-003',
      versionNumber: 3,
      title: 'LinkedIn para consultores: do zero à autoridade em 90 dias',
      body: '<p>Versão final com SEO otimizado e schema markup.</p>',
      changeNote: 'Otimização SEO + hreflang + schema markup',
      createdAt: past(5),
    },
  ]

  for (const version of versionsData) {
    await prisma.blogArticleVersion.upsert({
      where: {
        id: version.id,
      },
      update: {},
      create: version,
    })
  }
  console.log(`  ✓ BlogArticleVersions: ${versionsData.length}`)
}
