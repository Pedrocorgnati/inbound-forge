// Design tokens — Paleta Indigo Stripe
// Usar em animações, gráficos e contextos onde CSS variables não são acessíveis
// Para componentes React, preferir classes Tailwind que referenciam as CSS variables

export const COLORS = {
  light: {
    primary: '#4F46E5',
    primaryHover: '#4338CA',
    primaryLight: '#EEF2FF',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    surfaceRaised: '#FFFFFF',
    border: '#E5E7EB',
    borderStrong: '#D1D5DB',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
  },
  dark: {
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    primaryLight: '#312E81',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceRaised: '#334155',
    border: '#334155',
    borderStrong: '#475569',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    success: '#10B981',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  },
} as const

export const TYPOGRAPHY = {
  fontSans: 'var(--font-inter)',
  fontMono: 'var(--font-jetbrains-mono)',
  sizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
} as const

export const SPACING = {
  sidebar: {
    widthExpanded: '240px',
    widthCollapsed: '64px',
  },
  header: {
    height: '64px',
  },
  content: {
    maxWidth: '1280px',
    padding: '1.5rem',
  },
} as const
