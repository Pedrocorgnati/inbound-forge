import { redirect } from 'next/navigation'

// M10.16: /rss.xml → redireciona para o feed canonico em pt-BR
export function GET() {
  redirect('/pt-BR/blog/rss.xml')
}
