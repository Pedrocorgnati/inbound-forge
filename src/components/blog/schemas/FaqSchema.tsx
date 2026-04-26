/**
 * FAQPage JSON-LD — Intake Review TASK-7 ST002 (CL-153).
 */
import { JsonLdScript } from '@/components/blog/JsonLdScript'

export interface FaqItem {
  question: string
  answer: string
}

export function FaqSchema({ faqs }: { faqs: FaqItem[] }) {
  if (!faqs?.length) return null
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
  return <JsonLdScript schemas={[schema]} />
}

export default FaqSchema
