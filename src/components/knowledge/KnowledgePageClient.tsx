'use client'

import { KnowledgeTabs } from './knowledge-tabs'

interface KnowledgePageClientProps {
  activeTab: string
  locale: string
}

// fix REPROVADO (finding TASK-015): a barra de busca global era ligada a KnowledgeTabs
// que DESCARTAVA os filtros (`filters: _filters`), entao nao buscava nada (Zero
// Silencio). Cada lista (Cases/Pains/Patterns/Objections) agora tem busca textual
// propria e funcional, tornando a barra global redundante. Removida para evitar um
// controle morto.
export function KnowledgePageClient({ activeTab, locale }: KnowledgePageClientProps) {
  return (
    <div className="space-y-4">
      <KnowledgeTabs activeTab={activeTab} locale={locale} />
    </div>
  )
}
