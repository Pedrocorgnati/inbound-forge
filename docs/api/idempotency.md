# Idempotência da API (TAREFA-019)

## Objetivo

Garantir que mutations críticas possam ser reenviadas com segurança (retry de
rede, duplo clique, reprocessamento de fila) sem causar efeito colateral
duplicado. O cliente envia uma chave única por operação e o servidor garante
execução no máximo uma vez dentro da janela de 24h, devolvendo a mesma resposta
em tentativas repetidas.

## Cabeçalho `Idempotency-Key`

- **Obrigatório** em todos os endpoints adotantes (ver lista abaixo).
- **Formato:** UUID v7 (gerado pelo cliente). UUID v7 é ordenável no tempo e
  reduz colisões.
- Regex de validação: `^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (case-insensitive).
- Ausente -> `400` com `ERR-060`.
- Inválido (não UUID v7) -> `400` com `ERR-061`.

## Escopo da chave

A chave efetiva no store é composta por:

```
idem:v1:{userId}:{method}:{pathname}:{Idempotency-Key}
```

- `userId` = `user.id` em rotas autenticadas; `public` em rotas anônimas.
- `method` + `pathname` evitam replay cruzado entre recursos distintos (a mesma
  chave em `POST /posts/A/approve` e `POST /posts/B/approve` não colide).
- Em rotas públicas o escopo `public` é seguro porque a chave UUID v7 é gerada
  pelo cliente; não há colisão cruzada possível entre usuários anônimos.

## Janela de replay (24h) e header `Idempotent-Replayed`

- Respostas concluídas ficam cacheadas por **24 horas** (`IDEMPOTENCY_RESPONSE_TTL`).
- Reenvio com a **mesma chave + mesmo corpo** dentro da janela devolve a resposta
  cacheada (status e body originais) com o header `Idempotent-Replayed: true`.
- A primeira execução bem-sucedida devolve `Idempotent-Replayed: false`.

## Fingerprint do corpo e conflito (409)

O servidor calcula um fingerprint `SHA-256` de `method + pathname + body`.

- **Mesma chave + corpo divergente** -> `409` com `ERR-062`. A mutation **não** é
  re-executada (proteção contra reuso indevido de chave).
- **Requisição concorrente** com a mesma chave/corpo ainda em processamento ->
  `409` com `ERR-063` (marcador `pending` atômico via `SET NX`).

## Disponibilidade do store (503)

- O store é backed por Upstash Redis.
- Se o Redis estiver indisponível, o endpoint responde `503` com `ERR-064`.
- **Não há bypass silencioso:** a mutation nunca executa sem a garantia de
  idempotência ativa.

## Cache apenas de respostas 2xx

- Somente respostas `2xx` são cacheadas para replay.
- Respostas de erro (`4xx`/`5xx` do handler) **liberam** a chave, permitindo
  retry legítimo da mutation com a mesma chave.

## Endpoints adotantes (7)

| Método | Rota | Escopo |
|--------|------|--------|
| POST | `/api/v1/posts/[id]/approve` | `user.id` |
| POST | `/api/v1/posts/[id]/publish` | `user.id` |
| POST | `/api/v1/content/[pieceId]/approve` | `user.id` |
| POST | `/api/v1/leads/[id]/reveal` | `user.id` (PII / LGPD) |
| DELETE | `/api/v1/jobs/[jobId]` | `user.id` (GET não afetado) |
| POST | `/api/v1/diagnostico` | `public` (formulário anônimo) |
| POST | `/api/blog-articles/[id]/approve` | `user.id` |

## Códigos de erro

| Código | HTTP | Significado |
|--------|------|-------------|
| `ERR-060` | 400 | Idempotency-Key ausente no cabeçalho |
| `ERR-061` | 400 | Idempotency-Key inválido (esperado UUID v7) |
| `ERR-062` | 409 | Conflito de idempotência — corpo divergente para a mesma chave |
| `ERR-063` | 409 | Requisição idempotente ainda em processamento |
| `ERR-064` | 503 | Serviço de idempotência indisponível |

## Exemplo (curl)

```bash
curl -X POST https://app.example.com/api/v1/posts/01HXYZ.../approve \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 0190a8e2-7b3c-7a1f-b9c4-2f6d8e1a3c5b" \
  --cookie "sb-access-token=..." \
  -d '{}'
```

Reenviar a mesma requisição (mesma chave + mesmo corpo) dentro de 24h devolve a
resposta original com `Idempotent-Replayed: true`.
