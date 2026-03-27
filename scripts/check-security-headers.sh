#!/bin/bash
# check-security-headers.sh
# Verifica presence de security headers HTTP obrigatórios (SEC-003)
# Uso: bash scripts/check-security-headers.sh [URL]
# Exemplo: bash scripts/check-security-headers.sh http://localhost:3000/pt-BR/login

set -euo pipefail

URL=${1:-http://localhost:3000/pt-BR/login}
echo "Verificando security headers em: $URL"
echo "---"

HEADERS=$(curl -sI "$URL" 2>/dev/null)
if [ -z "$HEADERS" ]; then
  echo "❌ Erro: não foi possível conectar em $URL"
  exit 1
fi

PASS=0
FAIL=0

check_header() {
  local name="$1"
  local pattern="$2"
  if echo "$HEADERS" | grep -qi "$pattern"; then
    echo "✓ $name"
    PASS=$((PASS + 1))
  else
    echo "✗ $name  AUSENTE"
    FAIL=$((FAIL + 1))
  fi
}

check_header "X-Frame-Options"          "x-frame-options"
check_header "X-Content-Type-Options"   "x-content-type-options"
check_header "Referrer-Policy"          "referrer-policy"
check_header "Content-Security-Policy"  "content-security-policy"
check_header "Permissions-Policy"       "permissions-policy"

echo "---"
echo "Resultado: $PASS OK / $FAIL ausentes"

if [ $FAIL -eq 0 ]; then
  echo "✅ Todos os security headers presentes"
  exit 0
else
  echo "❌ $FAIL header(s) ausente(s) — verificar middleware.ts e next.config.mjs"
  exit 1
fi
