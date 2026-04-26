# Next.js Components — Task List
> Gerado por: `/nextjs:nextjs-components`
> Data: 2026-04-06
> Projeto: inbound-forge

---

## Achados da Auditoria

### next/image ✅
- `<img>` nativos: **nenhum** — todos já usam `<Image>` ✅
- `fill + sizes` corretos em: ArticleCard, AssetCard, AssetBackgroundPicker, ImagePreviewPanel, TemplateAssetPreview ✅
- `unoptimized` corretamente em blob URLs: ArtPreview, TemplateAssetPreview ✅
- `priority` no logo da tela de login (above-the-fold) e no AssetPreviewModal ✅
- `remotePatterns` cobre `*.supabase.co` ✅
- `formats: ['image/avif', 'image/webp']` ✅

### next/link ✅ (após correções)
- Todos os links internos usam `<Link>` ✅
- Sem `<a>` filho dentro de `<Link>` ✅
- CaseCard, CaseList, LeadsList, LeadCard: `router.push` em botões de navegação simples → corrigido com `<Button asChild><Link>` ✅
- EmptyState: adicionado `ctaHref` prop para navegação sem router.push ✅

### next/font ✅
- `Inter` carregado via `next/font/google` com `display: 'swap'`, subset `latin`, CSS var `--font-inter` ✅
- Sem `<link>` externo para Google Fonts ✅
- CSS var aplicada no `<body>` do `RootLayout` ✅

### next/script ✅
- `GA4Script.tsx` usa `<Script strategy="afterInteractive">` com `id` em ambos os scripts ✅
- `JsonLdScript.tsx` usa `<script type="application/ld+json">` nativo — correto para Server Component/structured data ✅

### next.config.mjs ✅ (após correções)
- `remotePatterns` configurado para Supabase ✅
- `formats: ['image/avif', 'image/webp']` ✅
- `deviceSizes` e `imageSizes` alinhados aos breakpoints Tailwind ✅

---

## Tasks (Rodada Anterior — já executadas)

### T001 – Adicionar `images.formats` no next.config.mjs ✅ COMPLETED
### T002 – Adicionar `id` ao Script loader do GA4 ✅ COMPLETED
### T003 – `window.open` com flags de segurança em AssetBackgroundPicker ✅ COMPLETED

---

## Tasks (Rodada Atual — executadas em 2026-04-06)

### T004 – Melhorar `sizes` em `AssetPreviewModal.tsx`
**Status:** COMPLETED
**Arquivos modificados:** `src/components/asset-library/AssetPreviewModal.tsx`
**Alteração:** `sizes="640px"` → `sizes="(max-width: 640px) 100vw, 640px"`
**Impacto:** Browser seleciona srcset correto em viewports < 640px.

---

### T005 – Substituir `router.push` por `<Link>` em botões de navegação simples
**Status:** COMPLETED
**Arquivos modificados:**
- `src/components/knowledge/CaseCard.tsx` — botão Editar: `useRouter` removido, `<Button asChild><Link href={...}>` adicionado
- `src/components/knowledge/CaseList.tsx` — botão "Novo Case": `useRouter` removido, `<Button asChild><Link>` + `ctaHref` no EmptyState
- `src/components/leads/LeadsList.tsx` — botão "Novo Lead": `useRouter` removido, `<Button asChild><Link>` + `ctaHref` no EmptyState; `LeadCard` recebe `editHref` em vez de `onEdit` com router.push
- `src/components/leads/LeadCard.tsx` — novo prop `editHref?: string`, renderiza `<Button asChild><Link>` quando fornecido
- `src/components/shared/empty-state.tsx` — novo prop `ctaHref?: string`, renderiza `<Button asChild><Link>` quando fornecido
**Impacto:** Ctrl+Click funciona, prefetch ativo, semântica HTML correta.

---

### T006 – Adicionar `deviceSizes` e `imageSizes` em `next.config.mjs`
**Status:** COMPLETED
**Arquivos modificados:** `next.config.mjs`
**Alteração:** Arrays adicionados alinhados aos breakpoints Tailwind (640/750/828/1080/1200/1920 para `deviceSizes`; 16/32/48/64/96/128/256/384 para `imageSizes`).
**Impacto:** Redução de variantes desnecessárias geradas pelo Image Optimizer.

---

## Notas (fora de escopo)

- `tailwind.config.ts` declara `var(--font-jetbrains-mono)` para `font-mono` mas nenhuma fonte JetBrains é carregada via `next/font` → config morta, tratar em `/nextjs:architecture` ou `/nextjs:hardcodes`.
- `router.push` restante (login-form, session-expired-banner, CaseForm, LeadDetailClient etc.) ocorrem pós-ação assíncrona — correto, não cabem em `<Link>`.
