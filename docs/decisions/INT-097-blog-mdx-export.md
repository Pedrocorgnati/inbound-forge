# INT-097: Blog MDX Export — Won't MVP

**Rastreabilidade:** INT-097
**Data:** 2026-03-26
**Owner:** Pedro Corgnati
**Data de revisão:** 2026-06-01
**Status:** DECIDIDO — Won't MVP. Implementar quando atingir 20+ artigos publicados.

---

## Contexto

Análise da feature de exportação de artigos do blog para formato MDX para uso em
sistemas de publicação externos (ex: Next.js blog com Contentlayer/Velite).

---

## Decisão: Won't MVP

**Razões:**

1. **Complexidade desnecessária no MVP:** O parser HTML→MDX requer `rehype-stringify`, `remark-mdx` e
   tratamento especial de componentes React embutidos. Adiciona ~2h de implementação para feature
   sem demanda imediata.

2. **Nenhum fluxo crítico depende do MDX export:** Todos os artigos publicados via module-11
   já funcionam com o formato HTML/Markdown armazenado no Prisma (`Post.content`). O blog
   funciona independentemente desta feature.

3. **Threshold de viabilidade não atingido:** A feature tem valor apenas quando há artigos
   suficientes para exportar e reutilizar. Com 0-20 artigos, o custo-benefício não justifica.

---

## Spec Técnica — Para Implementação Pós-MVP

### Threshold de Ativação

Implementar quando: `prisma.post.count({ where: { status: 'PUBLISHED' } }) >= 20`

### Endpoint

```
GET /api/v1/blog/articles/[slug]/export?format=mdx
```

**Response:** `Content-Type: text/mdx; charset=utf-8` com download do arquivo.

### Stack Técnica

```typescript
// Dependências a adicionar quando implementar
import rehypeParse from 'rehype-parse'
import rehypeStringify from 'rehype-stringify'
import remarkMdx from 'remark-mdx'
import { unified } from 'unified'

async function htmlToMdx(html: string, meta: PostMeta): Promise<string> {
  // 1. Parse HTML → HAST
  // 2. Transform HAST → MDAST
  // 3. Add MDX frontmatter
  // 4. Stringify para MDX
}
```

### Frontmatter MDX

```mdx
---
title: "{post.title}"
description: "{post.excerpt}"
publishedAt: "{post.publishedAt}"
slug: "{post.slug}"
tags: {post.tags}
canonical: "https://inbound-forge.app/blog/{post.slug}"
---
```

### Componentes a Preservar

- Imagens: `<img>` → `<Image src=... alt=... />`
- Links externos: `<a href>` → `<ExternalLink>`
- Callouts: `<blockquote>` → `<Callout>`

---

## Integração com Reutilização de Conteúdo

Quando implementar, conectar ao fluxo:
1. Operador acessa `/blog/articles/[slug]`
2. Botão "Exportar MDX" chama endpoint
3. Download automático de `{slug}.mdx`
4. Arquivo pronto para uso em outros sistemas

---

## Data de Revisão

**2026-06-01** — verificar contagem de artigos e decidir se implementar.
