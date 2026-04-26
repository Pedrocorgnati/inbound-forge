export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  KNOWLEDGE: '/knowledge',
  CONTENT: '/content',
  CALENDAR: '/calendar',
  BLOG: '/blog-manage',
  BLOG_PUBLIC: '/blog',
  LEADS: '/leads',
  ANALYTICS: '/analytics',
  HEALTH: '/health',
  ASSETS: '/assets',
  SOURCES: '/sources',
  ONBOARDING: '/onboarding',
  PRIVACY: '/privacy',
  TERMS: '/terms',
} as const

export const PUBLIC_ROUTES = [ROUTES.LOGIN, ROUTES.BLOG_PUBLIC]

export const API_ROUTES = {
  HEALTH: '/api/v1/health',
  AUTH_SESSION: '/api/auth/session',
  AUTH_CHECK_LOCK: '/api/auth/check-lock',
  AUTH_LOGOUT: '/api/auth/logout',
  THEMES: '/api/v1/themes',
  KNOWLEDGE: '/api/v1/knowledge',
  CONTENT: '/api/v1/content',
  IMAGES: '/api/v1/images',
  POSTS: '/api/v1/posts',
  BLOG: '/api/v1/blog',
  LEADS: '/api/v1/leads',
  ANALYTICS: '/api/v1/analytics',
  UTM_GENERATE: '/api/v1/utm/generate',
} as const
