# MOBILE-GUIDE — Inbound Forge

**Stack:** Next.js 14 + Tailwind CSS
**Target:** responsive-web (desktop-primary, mobile-ready)
**Gerado:** 2026-03-25

---

## 1. Breakpoints Tailwind

| Breakpoint | Pixel | Uso |
|------------|-------|-----|
| (default) | 0–639px | Mobile portrait |
| `sm:` | 640px | Mobile landscape |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Large desktop |

---

## 2. Touch Targets (WCAG 2.5.8)

**Regra:** todos os elementos interativos devem ter `min-h-[44px]` (44px = mínimo WCAG 2.5.8).

```tsx
// Correto
<button className="min-h-[44px] min-w-[44px] px-4">Ação</button>
<input className="min-h-[44px] h-11 px-3" />

// Incorreto
<button className="h-8 px-2">Ação pequena</button>
```

**Componentes que já aplicam `min-h-[44px]`:**
- `<Button>` → `min-h-[44px]` via Tailwind
- `login-form.tsx` → todos os inputs e botão com `min-h-[44px]`
- `session-expired-banner.tsx` → botões com `min-h-[44px]`

---

## 3. Layout Mobile-First

### Página de Login
```tsx
// Centralizado, max-w-sm em mobile
<main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
  <div className="w-full max-w-sm">
    ...
  </div>
</main>
```

### App Shell / Dashboard
- Sidebar colapsável em mobile (`lg:w-64`, mobile: bottom drawer ou slide-over)
- Header fixo no topo em mobile
- Conteúdo principal com padding `px-4 lg:px-8`

---

## 4. Padrões de Formulário Mobile

```tsx
// Input com touch target adequado
<input
  className="flex min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm"
  type="email"
  autoComplete="email"
  inputMode="email"  // teclado email em mobile
/>

// Select nativo (melhor UX em mobile)
<select className="min-h-[44px] w-full px-3 py-2 rounded-md border">
  ...
</select>
```

---

## 5. Telas com UI Identificadas

| Módulo | Tela | Notas Mobile |
|--------|------|--------------|
| module-3 | /login | max-w-sm, centralizado ✅ |
| module-4 | /dashboard, /themes, /blog, /content, /calendar, /leads, /analytics | sidebar colapsável |
| module-5 | /knowledge | cards empilhados em mobile |
| module-7 | /themes | tabela → cards em mobile |
| module-8 | /content | editor responsivo |
| module-10 | /assets | galeria grid 1→2→3 colunas |
| module-11 | /blog | reading width max-w-3xl |
| module-12 | /calendar | calendar view scroll horizontal em mobile |
| module-13 | /leads | tabela → cards em mobile |
| module-14 | /analytics | charts responsivos |
| module-15 | /settings | wizard vertical em mobile |

---

## 6. Acessibilidade Mobile

- `autoFocus` nos primeiros inputs de formulários
- `inputMode` adequado: `email`, `numeric`, `url`, `search`
- `autocomplete` em todos os inputs de formulário
- `prefers-reduced-motion`: spinner com `motion-reduce:animate-none`
- Evitar hover-only interactions (sem equivalente touch)

---

## 7. Performance Mobile

- Imagens com `next/image` e `sizes` responsivo
- Fontes com `font-display: swap` via next/font
- Code splitting por rota (automático no App Router)
- CSS crítico inline (automático no Next.js)

---

## 8. Componentes Mobile Wrapper

Os componentes existentes já são mobile-ready. Não foram criados wrappers dedicados pois:
- `<Button>` já tem `min-h-[44px]`
- Inputs já têm altura mínima de 44px
- Layout usa classes responsive do Tailwind

---

*Gerado por /auto-flow execute (pre-step mobile-first)*
