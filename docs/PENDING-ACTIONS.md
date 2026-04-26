# PENDING-ACTIONS — Inbound Forge

Acoes manuais que requerem intervencao fora do scope do codigo automatizado.

---

## TASK-6: TikTok Content Posting API

| Item | Descricao | Responsavel |
|------|-----------|-------------|
| App TikTok approval | Submeter app TikTok para auditoria de Content Posting API em https://developers.tiktok.com → Manage Apps. Ate aprovacao, posts sao publicados como `SELF_ONLY`. | Operador |
| Modelo `OperatorIntegration` | Criar migracao `add_operator_integration_credentials` para persistencia de tokens OAuth (atualmente em Redis com TTL). | Dev |
| Variaveis de ambiente | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` — configurar em Vercel dashboard. | DevOps |

---

## TASK-7: YouTube Shorts

| Item | Descricao | Responsavel |
|------|-----------|-------------|
| Renderer FFmpeg | Implementar `src/workers/media/shorts-renderer.ts` com fluent-ffmpeg + assets em `src/lib/templates/shorts/`. Requer: intro.mp4, outro.mp4, fontes, soundtrack royalty-free. | Equipe Media |
| Upload chunked | Completar upload resumavel em `youtube-channel.ts` (TODO marcado). | Dev |
| Variaveis de ambiente | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` — configurar em GCP + Vercel. | DevOps |

---

## TASK-9: Railway Publishing Worker

| Item | Descricao | Responsavel |
|------|-----------|-------------|
| Criar servico Railway | Criar servico `publishing-worker` no Railway dashboard apontando para `apps/publishing-worker/Dockerfile`. | DevOps |
| Variaveis de ambiente Railway | Configurar `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DATABASE_URL`, `SENTRY_DSN` isolados por servico. | DevOps |
| Channel registry | Implementar `channelRegistry` em `apps/publishing-worker/src/main.ts` (TODO marcado) apos TASK-6 validada em prod. | Dev |
| Rollback | Em caso de falha: revert `railway.toml` para versao anterior e `railway rollback --service publishing-worker`. | DevOps |
| INFRA.md | Atualizar topologia com diagrama dos dois servicos. | Dev |
