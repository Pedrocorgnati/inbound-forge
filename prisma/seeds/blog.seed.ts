/**
 * Seed de Blog Articles — Inbound Forge (Dev)
 * Atualizado: 2026-04-07 — Artigos sobre software sob medida / SystemForge
 *
 * Cobre: BlogArticle (todos os ArticleStatus), BlogArticleVersion (versionamento)
 * Artigos otimizados para SEO com foco em atrair decisores de PMEs brasileiras.
 * Idempotente via upsert por id.
 */
import type { PrismaClient } from '@prisma/client'

export async function seedBlog(prisma: PrismaClient): Promise<void> {
  const now = new Date()
  const past = (days: number) => new Date(now.getTime() - days * 86400000)

  const publishedPiece = await prisma.contentPiece.findFirst({
    where: { status: 'PUBLISHED' },
  })

  // ── BlogArticles (todos os ArticleStatus) ────────────────────────────────
  const articlesData = [
    // DRAFT — guia de custos (alta intenção comercial)
    {
      id: 'dev-blog-001',
      contentPieceId: null,
      slug: 'quanto-custa-software-personalizado-2026',
      title: 'Quanto custa um software personalizado em 2026: guia com valores reais',
      excerpt: 'Guia transparente com faixas de preço reais para MVPs, sistemas médios e plataformas complexas no mercado brasileiro.',
      body: `# Quanto custa um software personalizado em 2026

## A pergunta que todo empresário faz (e ninguém responde direito)

"Quanto custa um software personalizado?" é a pergunta mais pesquisada por decisores de PMEs que sentem que planilhas e ferramentas genéricas não dão mais conta. A resposta honesta é: depende — mas não precisa ser um mistério.

O mercado global de software personalizado atingiu USD 53 bilhões em 2025, com projeção de USD 334 bilhões até 2034 (CAGR 22,71%). No Brasil, o setor de TI cresceu 9,5% em 2025, acima da média global, impulsionado pela desvalorização do Real que tornou soluções locais mais competitivas que SaaS importado.

## Faixas de preço reais (mercado brasileiro, 2026)

### MVP / Protótipo funcional
**R$ 20.000 – R$ 50.000** | 30-60 dias

Ideal para: startups validando produto, empresas testando uma automação específica.

Inclui: 10-15 telas, autenticação básica, 1-2 integrações, deploy em produção. Suficiente para provar que o conceito funciona e começar a gerar valor.

Exemplo real: startup fintech que precisava validar gestão financeira para PMEs. MVP em 45 dias, captou R$ 500k em rodada seed com o produto funcionando.

### Sistema médio (gestão, CRM, pedidos)
**R$ 80.000 – R$ 200.000** | 3-6 meses

Ideal para: distribuidoras, clínicas, escritórios, construtoras que precisam de sistema operacional completo.

Inclui: 25-40 telas, dashboards, relatórios, integrações com ERP/contabilidade, app responsivo, controle de acesso por perfil.

Exemplo real: distribuidora de alimentos que trocou WhatsApp + planilha por sistema de pedidos. Faturamento cresceu 35% em 6 meses.

### Plataforma complexa
**R$ 200.000+** | 6-12 meses

Ideal para: marketplaces, plataformas SaaS multi-tenant, sistemas com IA embarcada.

Inclui: 40+ telas, arquitetura escalável, multi-tenant, APIs públicas, analytics avançado.

## A conta que ninguém faz: quanto custa NÃO ter

Antes de olhar o preço do software, calcule:

- **Horas de retrabalho/semana** × custo/hora da equipe × 52 semanas
- **Pedidos perdidos/mês** × ticket médio × 12 meses
- **Assinaturas SaaS desconectadas** × 12 meses (TCO de SaaS supera software personalizado em 2-3 anos — Forrester 2024)

Uma distribuidora perdia R$ 30 mil/mês em pedidos perdidos por WhatsApp. O sistema custou R$ 45 mil. ROI em 45 dias.

## Metodologia que evita surpresas: documentation-first

35% dos projetos de software fracassam por escopo mal definido (CHAOS Report 2024). A metodologia SystemForge documenta TUDO antes de codificar: requisitos, user stories, arquitetura, contratos de API.

Resultado: escopo claro, preço fixo, entrega previsível.

## Próximo passo

Se você quer entender quanto custaria automatizar o processo que mais dói na sua empresa, agende um diagnóstico gratuito de 30 minutos.`,
      metaTitle: 'Quanto Custa Software Personalizado em 2026 — Valores Reais | Pedro Corgnati',
      metaDescription: 'Guia transparente com preços reais de software personalizado no Brasil: MVP (R$20-50k), sistema médio (R$80-200k), plataforma complexa (R$200k+). Cases e ROI.',
      tags: ['custos', 'software personalizado', 'PME', 'investimento', 'ROI', 'preços'],
      status: 'DRAFT' as const,
      authorName: 'Pedro Corgnati',
      ctaType: 'WHATSAPP' as const,
      ctaLabel: 'Agendar diagnóstico gratuito',
      ctaUrl: 'https://wa.me/5547999999999?text=Oi%20Pedro%2C%20li%20o%20artigo%20sobre%20custos%20e%20quero%20entender%20quanto%20custaria%20para%20o%20meu%20caso',
      currentVersion: 1,
    },
    // REVIEW — case clínica (bottom of funnel)
    {
      id: 'dev-blog-002',
      contentPieceId: null,
      slug: 'case-clinica-fisioterapia-reduziu-noshow-40-porcento',
      title: 'Case: como uma clínica de fisioterapia reduziu no-show em 40% com sistema próprio',
      excerpt: 'Caso real de clínica que substituiu agendamento manual por sistema com lembretes automatizados e recuperou 3h/dia da recepção.',
      body: `# Case: clínica de fisioterapia reduziu no-show em 40%

## O problema

Uma clínica de fisioterapia com 8 profissionais e 120 atendimentos/dia enfrentava:

- **35% de no-show** (pacientes que faltam sem avisar)
- Recepcionista gastava **3 horas/dia** ligando para confirmar
- Cancelamentos de última hora sem preenchimento automático
- Agenda em papel + WhatsApp pessoal dos fisioterapeutas

O custo do no-show: cada falta representava R$ 120 não faturados. Com 42 faltas/dia (35% de 120), a clínica perdia **R$ 5.040/dia** ou **R$ 100.800/mês** em receita potencial.

## A solução

Sistema web com:
- Agendamento online acessível pelo paciente (link compartilhável)
- Lembrete automático via WhatsApp 24h e 2h antes da consulta
- Confirmação com 1 clique (botão no WhatsApp)
- Lista de espera automática: cancelamento → próximo da fila é notificado
- Dashboard com taxa de no-show por profissional e horário

## Resultados em 90 dias

| Métrica | Antes | Depois | Variação |
|---------|-------|--------|----------|
| No-show | 35% | 21% | **-40%** |
| Tempo de confirmação/dia | 3h | 15min | **-92%** |
| Receita recuperada/mês | — | R$ 16.800 | — |
| ROI | — | — | **4 meses** |

## O que fez a diferença

Não foi tecnologia sofisticada. Foi automação cirúrgica no ponto que mais doía: o lembrete. Estudos mostram que lembretes via WhatsApp têm taxa de abertura acima de 90%, contra 15-25% de SMS e 20-30% de email.

## Metodologia

Projeto desenvolvido com metodologia documentation-first (SystemForge):
1. Entrevista de diagnóstico (1 sessão de 1h)
2. Documentação completa antes do código
3. MVP funcional em 30 dias
4. Iteração baseada em dados reais da clínica`,
      metaTitle: 'Case: Clínica Reduziu No-Show em 40% com Sistema Próprio | Pedro Corgnati',
      metaDescription: 'Caso real: clínica de fisioterapia substituiu agendamento manual por sistema com lembretes automatizados. No-show caiu 40%, recepção recuperou 3h/dia.',
      canonicalUrl: 'https://corgnati.com/blog/case-clinica-fisioterapia-reduziu-noshow-40-porcento',
      tags: ['case', 'saúde', 'clínica', 'agendamento', 'automação', 'resultados'],
      status: 'REVIEW' as const,
      authorName: 'Pedro Corgnati',
      ctaType: 'WHATSAPP' as const,
      ctaLabel: 'Quero resultado parecido na minha clínica',
      currentVersion: 2,
    },
    // PUBLISHED — build vs buy
    {
      id: 'dev-blog-003',
      contentPieceId: publishedPiece?.id ?? null,
      slug: 'construir-vs-comprar-software-quando-saas-nao-resolve',
      title: 'Construir vs. Comprar: quando SaaS genérico para de resolver e começa a atrapalhar',
      excerpt: 'Framework de decisão para PMEs que estão entre manter ferramentas genéricas e investir em software personalizado.',
      body: `# Construir vs. Comprar: quando SaaS genérico para de resolver

## O dilema real

Toda empresa começa com ferramentas prontas. E está certo: Salesforce, Pipedrive, Trello, Google Sheets resolvem os primeiros anos.

O problema aparece quando:
- Você tem **5+ ferramentas SaaS** que não se integram
- Paga **R$ 3 mil+/mês** em assinaturas que resolvem 60% do que precisa
- Sua equipe gasta tempo **adaptando processos** à ferramenta (em vez do contrário)
- Dados críticos estão em **silos separados**

## Quando COMPRAR SaaS faz sentido

✅ Sua necessidade é padrão (email, chat, documentos)
✅ O processo é comum a qualquer empresa do seu porte
✅ Equipe menor que 10 pessoas
✅ Custo total de assinaturas < R$ 2 mil/mês
✅ Não precisa de integração entre sistemas

## Quando CONSTRUIR faz sentido

✅ Seu processo é único e gera vantagem competitiva
✅ 5+ ferramentas desconectadas gerando retrabalho
✅ TCO de SaaS supera R$ 3 mil/mês (R$ 36 mil/ano)
✅ Dados em silos impedindo visão unificada
✅ Crescimento travado por limitação de ferramenta
✅ Regulação exige controle específico (LGPD, ANVISA, etc.)

## A matemática que surpreende

Segundo Forrester (2024), 78% do TCO (Total Cost of Ownership) de software acumula-se APÓS a implantação. Isso significa que o SaaS "barato" de R$ 500/mês pode custar mais que um software personalizado em 2-3 anos quando você soma:

- Assinatura mensal × 36 meses
- Customizações e integrações paliativas
- Tempo da equipe adaptando processos
- Dados perdidos ou duplicados entre ferramentas

## Framework de decisão em 5 perguntas

1. Quantas ferramentas SaaS sua equipe usa diariamente?
2. Quanto tempo/semana é gasto transferindo dados entre elas?
3. Qual o custo total mensal de todas as assinaturas?
4. Existe algum processo que é seu diferencial e que a ferramenta genérica limita?
5. Em 2 anos, essas ferramentas vão suportar o dobro de volume?

Se respondeu "5+" na pergunta 1 e "não" na pergunta 5, provavelmente já passou do ponto de virada.

## Próximo passo

Ofereço um diagnóstico gratuito de 30 minutos onde mapeamos suas ferramentas atuais e calculamos se faz sentido construir. Sem compromisso.`,
      metaTitle: 'Construir vs. Comprar Software: Framework de Decisão para PMEs | Pedro Corgnati',
      metaDescription: 'Framework prático para decidir entre SaaS genérico e software personalizado. Inclui 5 perguntas-chave e cálculo de TCO para PMEs brasileiras.',
      canonicalUrl: 'https://corgnati.com/blog/construir-vs-comprar-software-quando-saas-nao-resolve',
      schemaTypes: ['BlogPosting', 'HowTo'],
      hreflang: { 'pt-BR': '/blog/construir-vs-comprar-software-quando-saas-nao-resolve', 'en': '/en/blog/build-vs-buy-software' },
      tags: ['build vs buy', 'SaaS', 'software personalizado', 'TCO', 'decisão', 'PME'],
      status: 'PUBLISHED' as const,
      authorName: 'Pedro Corgnati',
      jsonLd: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: 'Construir vs. Comprar: quando SaaS genérico para de resolver',
        author: { '@type': 'Person', name: 'Pedro Corgnati' },
        publisher: { '@type': 'Organization', name: 'SystemForge' },
      }),
      ctaType: 'WHATSAPP' as const,
      ctaLabel: 'Diagnóstico gratuito: construir ou comprar?',
      ctaUrl: 'https://wa.me/5547999999999?text=Oi%20Pedro%2C%20li%20o%20artigo%20Build%20vs%20Buy%20e%20quero%20fazer%20o%20diagn%C3%B3stico',
      currentVersion: 3,
      approvedBy: 'pedro@corgnati.com',
      approvedAt: past(5),
      publishedAt: past(3),
    },
    // ARCHIVED — artigo antigo sobre ferramentas
    {
      id: 'dev-blog-004',
      contentPieceId: null,
      slug: 'ferramentas-gestao-pme-2024-archived',
      title: 'Melhores ferramentas de gestão para PMEs em 2024',
      excerpt: 'Lista comparativa de ERPs e CRMs para pequenas empresas. Artigo arquivado — veja a versão atualizada.',
      body: `# Melhores ferramentas de gestão para PMEs em 2024

*Este artigo foi arquivado. O mercado mudou significativamente. Veja nosso guia atualizado: "Construir vs. Comprar".*

[Conteúdo arquivado]`,
      metaTitle: 'Ferramentas de Gestão PME 2024 [ARQUIVADO]',
      metaDescription: 'Este artigo foi arquivado. Veja a versão atualizada.',
      tags: ['ferramentas', 'gestão', 'PME', 'ERP', 'CRM'],
      status: 'ARCHIVED' as const,
      authorName: 'Pedro Corgnati',
      currentVersion: 1,
      publishedAt: past(180),
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
      title: 'Case: clínica reduziu no-show com agendamento digital',
      body: '<p>Versão inicial — rascunho sem métricas detalhadas.</p>',
      changeNote: 'Versão inicial do case',
      createdAt: past(10),
    },
    {
      id: 'dev-blog-ver-002',
      articleId: 'dev-blog-002',
      versionNumber: 2,
      title: 'Case: como uma clínica de fisioterapia reduziu no-show em 40% com sistema próprio',
      body: '<p>Versão revisada com tabela de métricas, dados de ROI e seção de metodologia.</p>',
      changeNote: 'Adicionados dados quantitativos, tabela comparativa e seção SystemForge',
      createdAt: past(5),
    },
    // dev-blog-003 — PUBLISHED (versões 1, 2 e 3)
    {
      id: 'dev-blog-ver-003',
      articleId: 'dev-blog-003',
      versionNumber: 1,
      title: 'Build vs Buy: quando comprar SaaS e quando desenvolver',
      body: '<p>Versão inicial genérica sem framework de decisão.</p>',
      changeNote: 'Versão inicial',
      createdAt: past(15),
    },
    {
      id: 'dev-blog-ver-004',
      articleId: 'dev-blog-003',
      versionNumber: 2,
      title: 'Construir vs. Comprar: quando SaaS genérico para de resolver',
      body: '<p>Versão expandida com framework de 5 perguntas e cálculo de TCO.</p>',
      changeNote: 'Framework de decisão + dados Forrester TCO',
      createdAt: past(8),
    },
    {
      id: 'dev-blog-ver-005',
      articleId: 'dev-blog-003',
      versionNumber: 3,
      title: 'Construir vs. Comprar: quando SaaS genérico para de resolver e começa a atrapalhar',
      body: '<p>Versão final com SEO otimizado, schema markup, hreflang e CTA revisado.</p>',
      changeNote: 'SEO + schema + hreflang + CTA WhatsApp com mensagem contextualizada',
      createdAt: past(5),
    },
  ]

  for (const version of versionsData) {
    await prisma.blogArticleVersion.upsert({
      where: { id: version.id },
      update: {},
      create: version,
    })
  }
  console.log(`  ✓ BlogArticleVersions: ${versionsData.length}`)
}
