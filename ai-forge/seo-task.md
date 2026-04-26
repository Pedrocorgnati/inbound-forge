# SEO Tasks — Inbound Forge

**Auditoria:** `ai-forge/seo-audit.md`  
**Status:** Pendente  
**Total Tasks:** 10  
**Bloqueadores:** T001, T002  

---

## T001 – Remover robots: 'noindex, nofollow'

**Tipo:** SEQUENTIAL | BLOCKER  
**Dependências:** None  
**Status:** ⏳ PENDING  

**Arquivos:**
- Modificar: `src/app/layout.tsx` (linha 39)

**Descrição:**
Root layout estabelece `robots: 'noindex, nofollow'` globalmente, bloqueando indexação de tudo. Em produção deve ser `'index, follow'`; em dev/staging pode ser `'noindex'`.

**Critérios de Aceite:**
1. Verificar `npm run build` sem erros
2. HTML gerado em produção tem `<meta name="robots" content="index, follow">`
3. Em dev (.env.local NODE_ENV=development) tem `noindex, nofollow`
4. Testar com `NEXT_PUBLIC_BASE_URL=https://example.com npm run build`

**Comandos:**
```bash
cd output/workspace/inbound-forge
npm run build  # Deve compilar
grep -r "robots" .next/server  # Verificar conteúdo gerado
```

**Estimativa:** 0.25h

---

## T002 – Adicionar metadataBase ao root layout

**Tipo:** SEQUENTIAL | BLOCKER  
**Dependências:** None  
**Status:** ⏳ PENDING  

**Arquivos:**
- Modificar: `src/app/layout.tsx` (dentro do export const metadata)

**Descrição:**
Sem `metadataBase`, URLs de Open Graph, canonical e Twitter image serão relativas e inválidas. Necessário pra social previews e SEO.

**Critérios de Aceite:**
1. `metadataBase = new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://inbound-forge.vercel.app')`
2. Build test: `NEXT_PUBLIC_BASE_URL=https://test.example.com npm run build`
3. HTML gerado contém `og:image` com URL **absoluta** (https://test.example.com/...)
4. Nenhum erro de Next.js durante build

**Dica:**
```tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || 'https://inbound-forge.vercel.app'
  ),
  // resto da metadata...
}
```

**Estimativa:** 0.25h

---

## T003 – Adicionar x-default hreflang

**Tipo:** PARALLEL-GROUP-1  
**Dependências:** T002  
**Status:** ⏳ PENDING  

**Arquivos:**
- Modificar: `src/app/[locale]/blog/[slug]/page.tsx` (generateMetadata, linha ~40)
- Modificar: `src/app/[locale]/blog/page.tsx` (generateMetadata, linha ~35)
- Modificar: `src/app/[locale]/privacy/page.tsx` (se existir + tiver metadata)

**Descrição:**
Blog posts e listing têm hreflang para 4 idiomas, mas falta `x-default`. Google usa x-default como fallback para usuários sem preferência de idioma.

**Critérios de Aceite:**
1. Blog post alternates inclui: `'x-default': ${baseUrl}/en-US/blog/${slug}`
2. Blog listing alternates inclui: `'x-default': ${baseUrl}/en-US/blog`
3. Privacy (se aplicável) também tem x-default
4. Build sem erros, HTML gerado contém `<link rel="alternate" hreflang="x-default" ...>`

**Padrão:**
```tsx
alternates: {
  'pt-BR': `${baseUrl}/pt-BR/blog/${slug}`,
  'en-US': `${baseUrl}/en-US/blog/${slug}`,
  'it-IT': `${baseUrl}/it-IT/blog/${slug}`,
  'es-ES': `${baseUrl}/es-ES/blog/${slug}`,
  'x-default': `${baseUrl}/en-US/blog/${slug}`, // 👈 ADICIONAR
}
```

**Estimativa:** 0.5h

---

## T004 – Adicionar openGraph global ao root layout

**Tipo:** PARALLEL-GROUP-1  
**Dependências:** T002  
**Status:** ⏳ PENDING  

**Arquivos:**
- Modificar: `src/app/layout.tsx` (export const metadata)

**Descrição:**
Root layout apenas define título e descrição. Sem openGraph global, páginas herdadas (login, etc) não terão social preview.

**Critérios de Aceite:**
1. openGraph tem: type, url, siteName, title, description, images (1200x630)
2. Images array tem `{ url, width: 1200, height: 630, alt }`
3. Usar NEXT_PUBLIC_SITE_NAME e NEXT_PUBLIC_BASE_URL
4. Build: `NEXT_PUBLIC_BASE_URL=https://test.com npm run build`
5. HTML contém `<meta property="og:image" content="https://test.com/images/og-default.png">`

**Padrão:**
```tsx
openGraph: {
  type: 'website',
  url: process.env.NEXT_PUBLIC_BASE_URL,
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'Inbound Forge',
  title: 'Inbound Forge',
  description: '...',
  images: [
    {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/images/og-default.png`,
      width: 1200,
      height: 630,
      alt: 'Inbound Forge',
    },
  ],
},
```

**Estimativa:** 0.5h

---

## T005 – Aprimorar Twitter Cards

**Tipo:** PARALLEL-GROUP-1  
**Dependências:** T002, T004  
**Status:** ⏳ PENDING  

**Arquivos:**
- Modificar: `src/app/layout.tsx` (adicionar twitter global)
- Modificar: `src/app/[locale]/blog/page.tsx` (adicionar twitter.image)
- Verificar: `src/app/[locale]/blog/[slug]/page.tsx` (já tem? confirmar)

**Descrição:**
Twitter cards incompletos. Faltam imagens e card type apropriado (summary_large_image vs summary).

**Critérios de Aceite:**
1. Root layout tem: `twitter: { card, site, creator?, description }`
2. Blog page tem: `twitter.card = 'summary_large_image'`, `twitter.image = og image URL`
3. Blog post tem: twitter.image = api/og URL
4. Build sem erros
5. [Twitter Card Validator](https://cards-dev.twitter.com/validator) aceita URLs

**Padrão (root):**
```tsx
twitter: {
  card: 'summary_large_image',
  site: '@inbound_forge', // ou @seu-handle
  creator: '@author-name',
  description: '...',
},
```

**Padrão (página específica):**
```tsx
twitter: {
  card: 'summary_large_image',
  title: '...',
  description: '...',
  image: ogImageUrl,
},
```

**Estimativa:** 0.5h

---

## T006 – Adicionar metadata a páginas públicas

**Tipo:** PARALLEL-GROUP-2  
**Dependências:** T002, T004, T005  
**Status:** ⏳ PENDING  

**Arquivos:**
- Modificar: `src/app/[locale]/login/page.tsx`
- Modificar: `src/app/[locale]/privacy/page.tsx` (se existir)
- Verificar: outras páginas públicas (contact, about, etc)

**Descrição:**
Login e privacy pages não têm metadata explícita ou têm incompleta (robots, canonical, alternates).

**Critérios de Aceite:**

**Login:**
1. Metadata com title, description
2. `robots: 'noindex, nofollow'` (não precisa ser indexada)
3. Nenhum openGraph/canonical obrigatório (página privada)
4. Build sem erros

**Privacy:**
1. Metadata com title descritivo, description (50-160 chars)
2. `robots: 'index, follow'` (é pública)
3. openGraph com type 'website'
4. canonical
5. alternates com 4 locales + x-default
6. Build sem erros

**Padrão (Privacy):**
```tsx
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  
  return {
    title: 'Privacy Policy — Inbound Forge',
    description: 'Nossa política de privacidade e proteção de dados...',
    robots: 'index, follow',
    openGraph: {
      title: 'Privacy Policy',
      description: '...',
      type: 'website',
      url: `${baseUrl}/${locale}/privacy`,
      siteName: 'Inbound Forge',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/privacy`,
      languages: {
        'pt-BR': `${baseUrl}/pt-BR/privacy`,
        'en-US': `${baseUrl}/en-US/privacy`,
        'it-IT': `${baseUrl}/it-IT/privacy`,
        'es-ES': `${baseUrl}/es-ES/privacy`,
        'x-default': `${baseUrl}/en-US/privacy`,
      },
    },
  }
}
```

**Estimativa:** 0.75h

---

## T007 – Adicionar Organization/WebSite schema global

**Tipo:** PARALLEL-GROUP-2  
**Dependências:** None  
**Status:** ⏳ PENDING  

**Arquivos:**
- Criar: `src/lib/seo/site-schema.ts` (nova)
- Modificar: `src/app/layout.tsx` (importar + usar `<JsonLdScript>`)
- Reutilizar: `src/components/blog/JsonLdScript.tsx` se existir

**Descrição:**
JSON-LD global de Organization e WebSite (com SearchAction) melhora SEO e aparência em Google.

**Critérios de Aceite:**
1. site-schema.ts exporta `buildSiteSchema()` que retorna array de schemas (Organization, WebSite)
2. Root layout importa e renderiza em `<JsonLdScript>`
3. Build: verificar HTML contém `<script type="application/ld+json">`
4. [Rich Results Test](https://search.google.com/test/rich-results) valida sem erros

**Padrão (site-schema.ts):**
```tsx
export function buildSiteSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://inbound-forge.vercel.app'
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Inbound Forge'
  
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteName,
      url: baseUrl,
      logo: `${baseUrl}/logo.png`,
      description: '...',
      sameAs: [
        'https://linkedin.com/company/inbound-forge',
        'https://twitter.com/inbound_forge',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: baseUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${baseUrl}/blog?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ]
}
```

**Padrão (layout.tsx):**
```tsx
import { buildSiteSchema } from '@/lib/seo/site-schema'
import { JsonLdScript } from '@/components/blog/JsonLdScript'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <JsonLdScript data={buildSiteSchema()} />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**Estimativa:** 1h

---

## T008 – Adicionar páginas públicas ao sitemap

**Tipo:** SEQUENTIAL  
**Dependências:** None  
**Status:** ⏳ PENDING  

**Arquivos:**
- Modificar: `src/app/sitemap.ts`

**Descrição:**
Sitemap atual inclui apenas homepage e blog. Deve adicionar `/privacy` e outras páginas públicas.

**Critérios de Aceite:**
1. `/privacy` adicionada com priority 0.7, changeFrequency 'monthly'
2. Nenhuma página protegida incluída
3. Build: `npm run build && grep privacy .next/static/**/sitemap.xml` retorna resultado
4. Teste offline: Lighthouse ou [XML Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)

**Padrão:**
```tsx
const extraPages: MetadataRoute.Sitemap = [
  {
    url: `${siteUrl}/privacy`,
    lastModified: new Date('2026-04-05'),
    changeFrequency: 'monthly',
    priority: 0.7,
  },
]

return [
  // ...homepage, /blog...
  ...extraPages,
  ...blogEntries,
]
```

**Estimativa:** 0.25h

---

## T009 – Documentar verification meta tags

**Tipo:** SEQUENTIAL  
**Dependências:** None  
**Status:** ⏳ PENDING  

**Arquivos:**
- Criar: `output/docs/inbound-forge/SEO-VERIFICATION.md` (nova)

**Descrição:**
Instruções para registrar site em Google Search Console, Bing Webmaster Tools e Meta, necessário para monitorar performance de SEO.

**Critérios de Aceite:**
1. Documento descreve 3 métodos: DNS, meta tag, HTML file upload
2. Recomendação: usar Vercel domain verification (mais fácil)
3. Links para consoles: GSearch, Bing, Meta
4. Instruções pós-verificação (sitemaps, robots.txt, monitoramento)

**Estrutura:**
```markdown
# SEO Verification — Inbound Forge

## Google Search Console

1. Ir para https://search.google.com/search-console
2. Clicar "Add Property"
3. Escolher domínio ou URL prefix
4. Método recomendado: DNS (via Vercel)
5. ...

## Bing Webmaster Tools

1. https://www.bing.com/webmasters
2. ...

## Meta Domain Verification

1. ...

## Pós-verificação

- Upload robots.txt
- Submit sitemap.xml
- Monitor Coverage Reports
```

**Estimativa:** 0.25h

---

## T010 – Environment validation para NEXT_PUBLIC_BASE_URL

**Tipo:** SEQUENTIAL  
**Dependências:** None  
**Status:** ⏳ PENDING  

**Arquivos:**
- Modificar: `src/lib/utils/env.ts` (ou criar `src/seo/env.ts`)
- Modificar: `src/app/layout.tsx` (validar no render)

**Descrição:**
Se NEXT_PUBLIC_BASE_URL não estiver configurado, OG/metadata/robots.ts falham silenciosamente com URLs quebradas.

**Critérios de Aceite:**
1. Função `validateSeoEnv()` checa NEXT_PUBLIC_BASE_URL é URL válida
2. Se inválido, lança erro legível em build
3. Fallback documentado: Se vazio, usar 'https://inbound-forge.vercel.app'
4. Teste: DELETE NEXT_PUBLIC_BASE_URL e rodar `npm run build` → deve avisar

**Padrão:**
```tsx
// src/seo/env.ts
export function validateSeoEnv() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  
  if (!baseUrl) {
    console.warn('[SEO] NEXT_PUBLIC_BASE_URL não configurado, usando fallback Vercel')
    return 'https://inbound-forge.vercel.app'
  }
  
  try {
    new URL(baseUrl)
    return baseUrl
  } catch {
    throw new Error(`[SEO] NEXT_PUBLIC_BASE_URL inválido: ${baseUrl}`)
  }
}
```

**Uso (layout.tsx):**
```tsx
const seoBaseUrl = validateSeoEnv()

export const metadata: Metadata = {
  metadataBase: new URL(seoBaseUrl),
  // ...
}
```

**Estimativa:** 0.5h

---

## 📊 Status Summary

| Task | Prioridade | Dependências | Est. |
|------|-----------|--------------|------|
| T001 | 🔴 CRÍTICO | None | 0.25h |
| T002 | 🔴 CRÍTICO | None | 0.25h |
| T003 | 🟠 ALTO | T002 | 0.5h |
| T004 | 🟠 ALTO | T002 | 0.5h |
| T005 | 🟠 ALTO | T002, T004 | 0.5h |
| T006 | 🟠 ALTO | T002, T004, T005 | 0.75h |
| T007 | 🟡 MÉDIO | None | 1h |
| T008 | 🟡 MÉDIO | None | 0.25h |
| T009 | 🟡 MÉDIO | None | 0.25h |
| T010 | 🟡 MÉDIO | None | 0.5h |

**Total Estimado:** 4.75h (parallelizável para ~3h com execução concorrente)

---

## 🚀 Próximos Passos

1. Execute T001 + T002 (bloqueadores)
2. Paralelizar T003-T006
3. Sequenciar T008-T010

```bash
# Exemplo:
/execute-task T001  # Começa com os bloqueadores
/execute-task T002
# Em paralelo:
/execute-task T003 &
/execute-task T004 &
/execute-task T005 &
# ...restante
```

Após todas: `/codex-plugin:review` para validação final de SEO.
