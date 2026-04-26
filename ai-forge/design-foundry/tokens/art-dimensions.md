# Dimensoes Oficiais — Templates de Arte

Rastreabilidade: Intake Review TASK-3 (CL-065, CL-066)

Fonte unica: `workers/image-worker/src/templates/dimensions.ts`
Espelho Next.js: `src/lib/image-dimensions.ts`

Qualquer mudanca nas dimensoes abaixo exige atualizacao simultanea dos dois
arquivos e re-seed da tabela `image_templates` (via `prisma/seed-image-templates.ts`).

## Canais oficiais

| Preset             | Dimensao (px) | Aspect | Canal                                           | Racional                                                                 |
|--------------------|---------------|--------|-------------------------------------------------|--------------------------------------------------------------------------|
| `OG_BLOG`          | 1200x630      | 1.91:1 | Blog, LinkedIn link preview, Twitter OG         | Padrao OG oficial — evita recorte no Twitter/LinkedIn.                   |
| `TWITTER_OG`       | 1200x630      | 1.91:1 | Twitter/X OG                                    | Mesmo preset do OG_BLOG.                                                 |
| `LINKEDIN_OG`      | 1200x627      | 1.91:1 | LinkedIn OG oficial                             | Variante LinkedIn (altura 627). OG_BLOG tambem aceito.                   |
| `INSTAGRAM_FEED`   | 1080x1350     | 4:5    | Instagram Feed portrait                         | Ratio 4:5 oficial — ocupa a maior area vertical permitida no feed.       |
| `INSTAGRAM_SQUARE` | 1080x1080     | 1:1    | Instagram Carousel, fallback quadrado           | Compatibilidade maxima; ideal para slides de carrossel.                  |
| `INSTAGRAM_REEL`   | 1080x1920     | 9:16   | Reels, Stories                                  | 9:16 oficial para tela cheia vertical.                                   |
| `VIDEO_COVER`      | 1080x1080     | 1:1    | Thumbnails Reels / YouTube                      | Square para thumbnail que precisa de crop simetrico.                     |
| `BACKSTAGE`        | 1080x1080     | 1:1    | Instagram bastidor/meta                         | Square com paleta propria para conteudo auxiliar.                        |

## Regras duras

- **Nao hardcodear** width/height em templates. Importe de `./dimensions.ts`.
- **Channel guard:** `validateDimension('instagram', { w: 1200, h: 630 })` deve
  lancar `InvalidDimensionError`. `validateDimension('instagram', { w: 1080, h: 1350 })`
  deve retornar `true`.
- **Seed idempotente:** `seedImageTemplates` faz upsert por `id` (`mvp-<channel>`).
  Campanhas especificas podem criar ImageTemplate adicionais com `id` proprio,
  mas **nao devem sobrescrever** os rows `mvp-*`.
- **Sincronia com ImageType enum:** ao adicionar um novo tipo de template no
  Prisma, adicione tambem um preset em `TEMPLATE_DIMENSIONS` e o mapeamento
  em `TEMPLATE_TYPE_TO_DIMENSION`.

## Referencias

- Instagram Business API — [Aspect Ratio & File Specs](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media)
- Twitter/X — [Summary Card with Large Image](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image)
- LinkedIn — [OG image spec](https://www.linkedin.com/post-inspector/inspect/)
