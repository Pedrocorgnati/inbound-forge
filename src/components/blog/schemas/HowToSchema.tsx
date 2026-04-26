/**
 * HowTo JSON-LD — Intake Review TASK-7 ST003 (CL-154).
 * Aceita `howToSteps` no formato armazenado em BlogArticle.howToSteps.
 */
import { JsonLdScript } from '@/components/blog/JsonLdScript'

export interface HowToStep {
  name?: string
  text: string
  image?: string
  url?: string
}

interface Props {
  name: string
  description?: string
  steps: HowToStep[]
  totalTime?: string
}

export function HowToSchema({ name, description, steps, totalTime }: Props) {
  if (!steps?.length) return null
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    totalTime,
    step: steps.map((s, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: s.name ?? `Passo ${idx + 1}`,
      text: s.text,
      image: s.image,
      url: s.url,
    })),
  }
  return <JsonLdScript schemas={[schema]} />
}

export default HowToSchema
