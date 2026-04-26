# SEO & Metadata Audit — Inbound Forge

**Projeto:** Inbound Forge (Multi-idioma: pt-BR, en-US, it-IT, es-ES)  
**Data Auditoria:** 2026-04-05  
**Config:** `.claude/projects/inbound-forge.json`  

---

## 📊 Executive Summary

| Categoria | Status | Prioridade |
|-----------|--------|-----------|
| Metadata API | 🔴 CRÍTICO | BLOQUEADOR |
| Open Graph / Twitter | 🟡 PARCIAL | ALTO |
| Canonical / hreflang | 🟡 PARCIAL | ALTO |
| Robots / Indexação | 🟢 BOM | MÉDIO |
| Structured Data | 🟢 BOM | MÉDIO |
| URL Strategy | 🟡 PARCIAL | MÉDIO |

**Verdict:** Projeto tem fundação sólida (robots.ts, sitemap.ts, JSON-LD para blog), mas **bloqueadores críticos de SEO impõem imediata ação**.

---

## 🔍 Análise Detalhada

### 1.1 Metadata API — 🔴 CRÍTICO

#### Issue 1: `robots: 'noindex, nofollow'` no layout raiz

**Arquivo:** `src/app/layout.tsx:39`  
**Problema:**
```tsx
export const metadata: Metadata = {
  // ...
  robots: 'noindex, nofollow',  // ❌ BLOQUEIA TUDO
  // ...
}
```

**Impacto:** Site inteiro está bloqueado de indexação, mesmo com robots.ts permitindo. Metadata da página **sobrescreve** robots.txt.

**Solução:** Remover ou condicionalizar por `NODE_ENV`:
```tsx
robots: process.env.NODE_ENV === 'production' ? 'index, follow' : 'noindex, nofollow',
```

#### Issue 2: Falta de `metadataBase`

**Problema:** Nenhum `metadataBase` definido no layout raiz.  
**Impacto:** OG images, canonical e alternates com URLs relativas **não geram URLs absolutas**. Google/redes sociais rejeitam.

**Solução:** Adicionar ao root layout:
```tsx
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://inbound-forge.vercel.app'),
  // ...
}
```

#### Issue 3: Descrição genérica

**Atual:** `'Ferramenta pessoal de inbound marketing automatizado'` (53 chars)  
**Bom:** 50-160 chars ✓ (está OK, mas poderia ser mais descritiva)  
**Sugestão:** `'Inbound Forge — Ferramenta de inbound marketing B2B automatizado: CRM, automação de leads e relatórios de conversão.'` (128 chars)

#### Audit Score: 1/5 ⚠️

---

### 1.2 Open Graph & Twitter Cards — 🟡 PARCIAL

#### Issue 1: OG ausente no root layout

**Problema:** Raiz não define openGraph. Apenas blog pages definem.  
**Impacto:** Homepage redireciona (sem metadata), página de login com título mas sem OG.

**Páginas com OG:** ✓ Blog posts, `/blog` listing  
**Páginas SEM OG:** ❌ Root (redirect), `/login`, `/privacy` (? verificar)

#### Issue 2: Twitter cards incompletos

**Blog page (`/blog`):**
```tsx
twitter: {
  card: 'summary',
  title: '...',
  description: '...',
}
```

**Problema:** Sem `twitter:image`. Recomendação: usar `summary_large_image` com imagem 1200x675.

#### Issue 3: OG images dinâmicas (blog posts)

**Status:** ✓ Implementado corretamente
- Route: `app/api/og/blog/[slug]/route.tsx`
- Dimensões: 1200x630
- Cache: Configurado com max-age

#### Audit Score: 3/5 ⚠️

---

### 1.3 Canonical & hreflang — 🟡 PARCIAL

#### Blog posts: ✓ Excelente

**Arquivo:** `src/app/[locale]/blog/[slug]/page.tsx:40-52`
```tsx
alternates: {
  'pt-BR': `${baseUrl}/pt-BR/blog/${slug}`,
  'en-US': `${baseUrl}/en-US/blog/${slug}`,
  'it-IT': `${baseUrl}/it-IT/blog/${slug}`,
  'es-ES': `${baseUrl}/es-ES/blog/${slug}`,
}
```

**Falta:** `x-default` hreflang (fallback para locale padrão)

#### Blog listing (`/blog`): ✓ Bom

**Arquivo:** `src/app/[locale]/blog/page.tsx:35-42`
```tsx
alternates: {
  canonical: `${baseUrl}/${locale}/blog`,
  languages: {
    'pt-BR': `${baseUrl}/pt-BR/blog`,
    'en-US': `${baseUrl}/en-US/blog`,
    'it-IT': `${baseUrl}/it-IT/blog`,
    'es-ES': `${baseUrl}/es-ES/blog`,
  },
}
```

**Falta:** `x-default`

#### Outras páginas: ❌ Falta alternates

**Páginas:**
- `/login`
- `/privacy`
- `/dashboard` (protegida, OK sem canonícal público)

**Problema:** Sem canonical/alternates explícitos. Devem estar definidas.

#### Audit Score: 2.5/5

---

### 1.4 Robots & Indexação — 🟢 BOM

#### robots.ts: ✓ Bem implementado

**Arquivo:** `src/app/robots.ts`
```tsx
return {
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: [
      '/api/',
      '/(dashboard)/',
      '/[locale]/(protected)/',
    ],
  },
  sitemap: `${siteUrl}/sitemap.xml`,
}
```

**Status:**
- ✓ Bloqueia APIs
- ✓ Bloqueia rotas protegidas
- ✓ Referencia sitemap
- ✓ Fallback para Vercel URL se env não configurado

#### sitemap.ts: ✓ Bem implementado

**Arquivo:** `src/app/sitemap.ts`
```tsx
return [
  { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
  { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ...blogEntries,
]
```

**Status:**
- ✓ Inclui homepage
- ✓ Inclui /blog
- ✓ Inclui todos os artigos publicados com lastModified dinâmico
- ✓ Error handling (fallback se BD indisponível)
- ✓ Dinamicamente revalidado

**Falta:** `/privacy` e outras páginas públicas (opcional mas recomendado)

#### Viewport & Favicon: ✓

**Arquivo:** `src/app/layout.tsx:18-27`
```tsx
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [...],
}
```

#### Audit Score: 4.5/5

---

### 1.5 Structured Data (JSON-LD) — 🟢 BOM

#### Blog posts: ✓ Excelente

**Arquivo:** `src/lib/seo/json-ld.ts`

Schemas implementados:
1. **BlogPosting** — Sempre (artigos)
2. **BreadcrumbList** — Sempre (3 níveis)
3. **FAQPage** — Se detecta padrão `**Pergunta?**\nResposta`
4. **HowTo** — Se detecta passos numerados `1. Passo...`

**Atributos:**
- ✓ headline, description, image
- ✓ author (Person)
- ✓ publisher (Organization)
- ✓ datePublished, dateModified
- ✓ mainEntityOfPage
- ✓ E-E-A-T: reviewedAt (approvedAt)

#### Rich Results Test Readiness: ✓ Pronto

Schemas validam sem erros.

#### Falta: Organization/WebSite no root

**Recomendado:** Adicionar schema global ao root layout:
```tsx
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Inbound Forge",
  "url": "https://inbound-forge.vercel.app",
  "logo": "https://inbound-forge.vercel.app/logo.png",
  "description": "...",
  "sameAs": ["https://linkedin.com/company/inbound-forge"]
}
```

#### Audit Score: 4/5

---

### 1.6 URL Strategy & Verificação — 🟡 PARCIAL

#### Slugs: ✓ Bom

Blog posts usam slugs descritivos: `/pt-BR/blog/{slug}`

#### Trailing slash: ✓ Consistente

Configuração Next.js padrão (sem trailing slash).

#### Query parameters: ⚠️

Blog pagination: `/blog?page=2` — Recomendação: canonicalizar para `/blog` (página 1 é canonical).

Implementação atual em `blog/page.tsx`:
```tsx
alternates: {
  canonical: `${baseUrl}/${locale}/blog`,  // ✓ Correto — ignora ?page
  languages: { ... }
}
```

✓ **Está correto!**

#### Verification meta tags: ❌ Ausentes

Faltam meta tags para:
- Google Search Console
- Bing Webmaster Tools
- Meta (Facebook) domain verification

**Local esperado:** `src/app/layout.tsx` ou via Vercel settings.

#### Audit Score: 3/5

---

### 1.7 Locale & Multi-idioma — 🟡 PARCIAL

#### i18n Setup: ✓

**Framework:** `next-intl`  
**Suporte:** pt-BR, en-US, it-IT, es-ES (4 locales)

**Arquivo:** `src/app/[locale]/layout.tsx`
```tsx
export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params
  return <div lang={locale}>{children}</div>
}
```

✓ **Correto!** Cada página renderiza com `lang` correto.

#### hreflang: 🟡 Parcial

- ✓ Blog posts (com x-default? **NÃO**)
- ✓ Blog listing (com x-default? **NÃO**)
- ❌ Outras páginas públicas

**Issue:** Sem `x-default` em nenhuma página. Necessário para multi-idioma global.

#### Audit Score: 3/5

---

## 📋 Task List — Phase 3: Execução

### Bloqueadores (CRÍTICO — impede indexação)

#### T001 – Remover robots: 'noindex, nofollow'
**Tipo:** SEQUENTIAL  
**Dependências:** None  
**Arquivos:**
- Modificar: `src/app/layout.tsx`

**Descrição:** Root layout bloqueia indexação. Remover ou condicionalizar por NODE_ENV.

**Critérios de Aceite:**
- Metadata robots padrão é `'index, follow'` em produção
- Em dev/staging é `'noindex, nofollow'`
- Build passa sem erros

**Estimativa:** 0.25h

---

#### T002 – Adicionar metadataBase ao root layout
**Tipo:** SEQUENTIAL  
**Dependências:** None  
**Arquivos:**
- Modificar: `src/app/layout.tsx`

**Descrição:** Sem metadataBase, URLs de OG/Twitter serão relativas (inválidas).

**Critérios de Aceite:**
- metadataBase = URL(NEXT_PUBLIC_BASE_URL)
- BUILD: `NEXT_PUBLIC_BASE_URL=https://test.com npm run build` gera URLs absolutas no OG
- Verificar gerado HTML tem og:image com domínio completo

**Estimativa:** 0.25h

---

### Altos (SEO alta visibilidade)

#### T003 – Adicionar x-default hreflang
**Tipo:** PARALLEL-GROUP-1  
**Dependências:** T002  
**Arquivos:**
- Modificar: `src/app/[locale]/blog/[slug]/page.tsx`
- Modificar: `src/app/[locale]/blog/page.tsx`
- Modificar: `src/app/[locale]/privacy/page.tsx` (se existir metadata)

**Descrição:** Sem x-default, Google não sabe qual locale é fallback para usuários sem preferência.

**Critérios de Aceite:**
- Blog post: alternates contém `'x-default': ${baseUrl}/en-US/blog/${slug}`
- Blog listing: alternates contém `'x-default': ${baseUrl}/en-US/blog`
- Mesma pattern para privacy e outras públicas

**Estimativa:** 0.5h

---

#### T004 – Adicionar OG global ao root layout
**Tipo:** PARALLEL-GROUP-1  
**Dependências:** T002  
**Arquivos:**
- Modificar: `src/app/layout.tsx`

**Descrição:** Root layout não define openGraph. Necessário para social preview de páginas que não herdam.

**Critérios de Aceite:**
- openGraph com title, description, type: 'website', url, siteName, images [1200x630]
- Usar NEXT_PUBLIC_SITE_NAME e NEXT_PUBLIC_BASE_URL
- Fallback para padrão se envs não configurados

**Estimativa:** 0.5h

---

#### T005 – Aprimorar Twitter cards
**Tipo:** PARALLEL-GROUP-1  
**Dependências:** T002  
**Arquivos:**
- Modificar: `src/app/layout.tsx` (adicionar twitter global)
- Modificar: `src/app/[locale]/blog/page.tsx` (adicionar twitter.image)

**Descrição:** Twitter cards incompletos — faltam images e summary_large_image.

**Critérios de Aceite:**
- Root: twitter { card, site, creator (opcional), description }
- Blog page: twitter.image = OG image, card = 'summary_large_image'
- Blog post: twitter.image = api/og URL

**Estimativa:** 0.5h

---

#### T006 – Adicionar metadata a páginas públicas sem OG
**Tipo:** PARALLEL-GROUP-2  
**Dependências:** T002  
**Arquivos:**
- Modificar: `src/app/[locale]/login/page.tsx`
- Modificar: `src/app/[locale]/privacy/page.tsx` (ou similar)

**Descrição:** Login e privacy não têm openGraph/canonical/alternates.

**Critérios de Aceite:**
- Login: title, description, robots: 'noindex' (não precisa OG)
- Privacy: title, description, robots: 'index, follow', openGraph, canonical, alternates com x-default
- Ambas têm metadataBase propagado do root

**Estimativa:** 0.75h

---

#### T007 – Adicionar Organization/WebSite schema global
**Tipo:** PARALLEL-GROUP-2  
**Dependências:** None  
**Arquivos:**
- Criar: `src/lib/seo/site-schema.ts`
- Modificar: `src/app/layout.tsx`

**Descrição:** JSON-LD global Organization + WebSite com SearchAction beneficia SEO.

**Critérios de Aceite:**
- Schema retorna Organization (name, url, logo, description, sameAs)
- Schema retorna WebSite (name, url, potentialAction: SearchAction)
- Renderizado no head via `<JsonLdScript>`
- Rich Results Test valida sem erros

**Estimativa:** 1h

---

### Médios (SEO otimização)

#### T008 – Adicionar más páginas públicas ao sitemap
**Tipo:** SEQUENTIAL  
**Dependências:** None  
**Arquivos:**
- Modificar: `src/app/sitemap.ts`

**Descrição:** Sitemap inclui apenas homepage e blog. Faltam `/privacy` e outras públicas.

**Critérios de Aceite:**
- `/privacy` adicionada com priority 0.7, changeFrequency 'monthly'
- Página 404 customizada (opcional) com priority 0.3
- Teste: `npm run build && grep privacy .next/static/*/sitemap.xml`

**Estimativa:** 0.25h

---

#### T009 – Documentar verification meta tags
**Tipo:** SEQUENTIAL  
**Dependências:** None  
**Arquivos:**
- Criar: `output/docs/inbound-forge/SEO-VERIFICATION.md`

**Descrição:** Instruções para configurar Google Search Console, Bing Webmaster, Meta verification.

**Critérios de Aceite:**
- Documento descreve onde adicionar meta tags
- Links para consoles oficiais
- Sugestão: usar Vercel dashboard para gerenciar verificações

**Estimativa:** 0.25h

---

#### T010 – Environment validation para NEXT_PUBLIC_BASE_URL
**Tipo:** SEQUENTIAL  
**Dependências:** None  
**Arquivos:**
- Modificar: `src/lib/utils/env.ts` (ou criar `src/seo/env.ts`)

**Descrição:** Se NEXT_PUBLIC_BASE_URL não estiver configurado, OG/metadata falham silenciosamente.

**Critérios de Aceite:**
- Validation função checa NEXT_PUBLIC_BASE_URL is valid URL
- Lança erro em build se inválido
- Fallback documentado (padrão Vercel)

**Estimativa:** 0.5h

---

## 🎯 Checklist Final

- [ ] T001: robots removido em produção
- [ ] T002: metadataBase adicionado
- [ ] T003: x-default hreflang em blog
- [ ] T004: openGraph global no root
- [ ] T005: Twitter cards completos
- [ ] T006: Metadata em login/privacy
- [ ] T007: Organization/WebSite schema
- [ ] T008: Páginas adicionadas ao sitemap
- [ ] T009: SEO-VERIFICATION.md documentado
- [ ] T010: Env validation implementada

---

## 📊 Impacto Estimado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Indexação | 0% (bloqueada) | ~95% (blog + home + public) |
| Social preview | Quebrado (sem OG global) | ✓ Completo |
| hreflang coverage | Parcial (blog yes, outros no) | ✓ 100% (com x-default) |
| Structured data | Blog ✓, Org ❌ | Blog ✓, Org ✓ |
| Core Web Vitals | N/A (não indexado) | ✓ Monitorável |

---

## 🔗 Referências

- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Tags](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [hreflang Implementation](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Schema.org Structured Data](https://schema.org/)
- [Rich Results Test](https://search.google.com/test/rich-results)

---

**Próximo passo:** Execute `/auto-flow nextjs:seo` ou inicie tasks sequencialmente com `/execute-task T001`.
