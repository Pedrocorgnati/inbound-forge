// module-9: Satori Template Props Types
// Rastreabilidade: TASK-2, FEAT-creative-generation-005
// CRÍTICO: Todas as props devem ser primitivas (sem hooks, sem estado)

export interface TemplateBaseProps {
  headline:              string
  subheadline?:          string
  backgroundImageUrl?:   string   // URL pré-carregada como base64 — NÃO carregar dentro do template
  brandColor?:           string   // default: #4F46E5
  logoUrl?:              string
}

export interface CarouselTemplateProps extends TemplateBaseProps {
  slideNumber:  number
  totalSlides:  number
  bodyText:     string
}

export interface StaticLandscapeTemplateProps extends TemplateBaseProps {
  bodyText?: string
  ctaText?:  string
}

export interface StaticPortraitTemplateProps extends TemplateBaseProps {
  bodyText?: string
}

export interface VideoCoverTemplateProps extends TemplateBaseProps {
  showPlayIcon?: boolean
}

export interface BeforeAfterTemplateProps extends TemplateBaseProps {
  beforeText:   string
  afterText:    string
  beforeLabel?: string  // default: 'Antes'
  afterLabel?:  string  // default: 'Depois'
}

export interface ErrorCardProps extends TemplateBaseProps {
  errorDescription: string
  impactText:       string
}

export interface SolutionCardProps extends TemplateBaseProps {
  solutionPoints: string[]  // max 3 pontos
  ctaText?:       string
}

export interface BackstageCardProps extends TemplateBaseProps {
  bodyText?: string
}
