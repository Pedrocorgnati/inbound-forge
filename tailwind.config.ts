import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Theme-sensitive tokens — reference CSS variables so .dark {} overrides apply automatically
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: '#4338CA',
          active: '#3730A3',
          light: 'var(--color-primary-light)',
          'light-hover': '#E0E7FF',
        },
        secondary: {
          DEFAULT: '#6366F1',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        // Semantic colors — intentionally static (no dark mode variant)
        success: {
          DEFAULT: '#059669',
          foreground: '#FFFFFF',
          bg: '#D1FAE5',
          text: '#065F46',
        },
        warning: {
          DEFAULT: '#D97706',
          foreground: '#FFFFFF',
          bg: '#FEF3C7',
          text: '#92400E',
        },
        danger: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
          bg: '#FEE2E2',
          text: '#991B1B',
          hover: '#B91C1C',
        },
        info: {
          DEFAULT: '#0284C7',
          foreground: '#FFFFFF',
          bg: '#DBEAFE',
          text: '#1E40AF',
        },
        error: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
          bg: '#FEF2F2',
          text: '#991B1B',
        },
        instagram: {
          bg: '#FCE7F3',
          text: '#9D174D',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1rem',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'slide-in-left': 'slide-in-left 150ms ease-out',
        'fade-in': 'fade-in 150ms ease-out',
      },
    },
  },
  plugins: [],
}

export default config
