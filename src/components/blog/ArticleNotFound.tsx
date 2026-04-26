import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

interface ArticleNotFoundProps {
  locale?: string
}

export function ArticleNotFound({ locale = 'pt-BR' }: ArticleNotFoundProps) {
  return (
    <div
      data-testid="article-not-found"
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <FileQuestion className="h-16 w-16 text-muted-foreground" />
      <h2 className="mt-6 text-xl font-semibold text-foreground">
        Artigo não encontrado
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        O artigo que você procura não existe ou foi removido. Veja outros artigos no nosso blog.
      </p>
      <Link
        href={`/${locale}/blog`}
        className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Voltar ao blog
      </Link>
    </div>
  )
}
