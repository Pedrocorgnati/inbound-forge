#!/bin/bash
# validate-openapi.sh — Valida openapi.yaml com Redocly CLI
# Rastreabilidade: API-001, TASK-3/ST001
set -e

OPENAPI_FILE="docs/openapi.yaml"

if [ ! -f "$OPENAPI_FILE" ]; then
  echo "ERRO: $OPENAPI_FILE não encontrado"
  exit 1
fi

echo "Validando $OPENAPI_FILE..."
npx @redocly/cli lint "$OPENAPI_FILE" --format=stylish

# Contar paths
PATH_COUNT=$(grep -c "^  /" "$OPENAPI_FILE" 2>/dev/null || echo "0")
echo "Paths encontrados: $PATH_COUNT"

if [ "$PATH_COUNT" -lt 47 ]; then
  echo "AVISO: Esperado >= 47 paths, encontrado $PATH_COUNT"
fi

echo "OK: openapi.yaml validado com sucesso"
