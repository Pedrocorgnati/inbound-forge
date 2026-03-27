#!/bin/bash
# check-env-completeness.sh — Verifica variáveis de ambiente obrigatórias
# Rastreabilidade: INFRA-001, TASK-5/ST004
# Uso: bash scripts/check-env-completeness.sh

set -euo pipefail

# Variáveis obrigatórias em produção (INFRA-001)
REQUIRED_VARS=(
  "DATABASE_URL"
  "NEXTAUTH_SECRET"
  "NEXTAUTH_URL"
  "UPSTASH_REDIS_REST_URL"
  "UPSTASH_REDIS_REST_TOKEN"
  "PII_ENCRYPTION_KEY"
  "ANTHROPIC_API_KEY"
  "IDEOGRAM_API_KEY"
  "SENTRY_DSN"
)

# Variáveis obrigatórias somente em produção (NODE_ENV=production)
PRODUCTION_VARS=(
  "INTERNAL_HEALTH_SECRET"
  "WORKER_AUTH_TOKEN"
)

MISSING=()

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR:-}" ]; then
    MISSING+=("$VAR")
  fi
done

# Verificações adicionais em produção
if [ "${NODE_ENV:-development}" = "production" ]; then
  for VAR in "${PRODUCTION_VARS[@]}"; do
    if [ -z "${!VAR:-}" ]; then
      MISSING+=("$VAR (produção)")
    fi
  done
fi

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "ERRO: Variáveis de ambiente obrigatórias não configuradas:"
  printf '  - %s\n' "${MISSING[@]}"
  echo ""
  echo "Consultar .env.example para documentação de cada variável."
  exit 1
fi

echo "OK: Todas as variáveis obrigatórias configuradas"
