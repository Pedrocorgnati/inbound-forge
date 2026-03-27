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
        // Primary — Indigo Stripe
        primary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          active: '#3730A3',
          light: '#EEF2FF',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#6366F1',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#C7D2FE',
          foreground: '#312E81',
        },
        // Backgrounds
        background: '#FFFFFF',
        surface: {
          DEFAULT: '#F9FAFB',
          raised: '#F3F4F6',
        },
        // Text
        foreground: '#111827',
        // Muted
        muted: {
          DEFAULT: '#F3F4F6',
          foreground: '#9CA3AF',
        },
        // Border
        border: '#E5E7EB',
        // Semantic
        success: {
          DEFAULT: '#059669',
          foreground: '#FFFFFF',
          bg: '#D1FAE5',
        },
        warning: {
          DEFAULT: '#D97706',
          foreground: '#FFFFFF',
          bg: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
          bg: '#FEE2E2',
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        info: {
          DEFAULT: '#0284C7',
          foreground: '#FFFFFF',
          bg: '#DBEAFE',
        },
        // Error alias
        error: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
          bg: '#FEF2F2',
        },
        // Input
        input: '#E5E7EB',
        ring: '#4F46E5',
        // Card
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#111827',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#111827',
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
