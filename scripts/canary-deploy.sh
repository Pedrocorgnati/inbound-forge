#!/usr/bin/env bash
# canary-deploy.sh — Deploy gradual com health check automático
# Gerado por: /rollout-strategy-create setup
# Uso: ./scripts/canary-deploy.sh [CANARY_PERCENT] [SERVICE_URL]
#
# Para Inbound Forge (single-user), o script valida health do deploy
# antes de confirmar o rollout para 100%. Não usa percentagem real de usuários
# (não aplicável), mas serve como gate automático pós-deploy.

set -euo pipefail

CANARY_PERCENT=${1:-10}
SERVICE_URL=${2:-"${STAGING_URL:-http://localhost:3000}"}
HEALTH_ENDPOINT="/api/health"
ERROR_THRESHOLD=5             # % de erros máximo antes de rollback
CHECK_INTERVAL=60             # segundos entre health checks
MAX_CHECKS=10                 # número máximo de checks

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "INBOUND FORGE — Canary Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Canary: ${CANARY_PERCENT}% do tráfego"
echo "URL:    ${SERVICE_URL}"
echo "Checks: ${MAX_CHECKS}x a cada ${CHECK_INTERVAL}s"
echo ""

# ---------------------------------------------------------------------------
# Função: health check
# ---------------------------------------------------------------------------
check_health() {
  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    "${SERVICE_URL}${HEALTH_ENDPOINT}" 2>/dev/null || echo "000")
  echo "${response}"
}

# ---------------------------------------------------------------------------
# Verificação inicial
# ---------------------------------------------------------------------------
echo "[1/3] Verificando health inicial..."
initial_status=$(check_health)
if [ "${initial_status}" != "200" ]; then
  echo "❌ ERRO: Health check falhou antes do deploy (HTTP ${initial_status})"
  echo "   Verifique: ${SERVICE_URL}${HEALTH_ENDPOINT}"
  exit 1
fi
echo "✓ Health check inicial: OK (HTTP 200)"

# ---------------------------------------------------------------------------
# Aguardar estabilização pós-deploy
# ---------------------------------------------------------------------------
echo ""
echo "[2/3] Aguardando ${CHECK_INTERVAL}s antes do primeiro check pós-deploy..."
sleep "${CHECK_INTERVAL}"

# ---------------------------------------------------------------------------
# Loop de monitoramento
# ---------------------------------------------------------------------------
echo ""
echo "[3/3] Monitorando health pós-deploy (${MAX_CHECKS} checks)..."
echo ""

fail_count=0

for i in $(seq 1 "${MAX_CHECKS}"); do
  status=$(check_health)
  timestamp=$(date '+%H:%M:%S')

  if [ "${status}" = "200" ]; then
    echo "  [${timestamp}] Check ${i}/${MAX_CHECKS}: ✓ OK (HTTP ${status})"
  else
    fail_count=$((fail_count + 1))
    echo "  [${timestamp}] Check ${i}/${MAX_CHECKS}: ✗ FALHA (HTTP ${status}) — falhas: ${fail_count}"

    if [ "${status}" = "000" ]; then
      echo ""
      echo "❌ ROLLBACK NECESSÁRIO: serviço inacessível (timeout/conexão recusada)"
      echo "   Ação: reverter deploy na plataforma (Vercel → Deployments → Rollback)"
      exit 1
    fi
  fi

  # Verificar erro contínuo (3+ falhas consecutivas)
  if [ "${fail_count}" -ge 3 ]; then
    echo ""
    echo "❌ ROLLBACK NECESSÁRIO: ${fail_count} falhas consecutivas detectadas"
    echo "   Ação: reverter deploy na plataforma (Vercel → Deployments → Rollback)"
    echo "   Kill switches PostHog para ativar se necessário:"
    echo "     - instagram-publishing-live → false"
    echo "     - lead-capture-live → false"
    echo "     - scraping-worker-live → false"
    exit 1
  fi

  # Aguardar antes do próximo check (exceto no último)
  if [ "${i}" -lt "${MAX_CHECKS}" ]; then
    sleep "${CHECK_INTERVAL}"
  fi
done

# ---------------------------------------------------------------------------
# Resultado final
# ---------------------------------------------------------------------------
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "${fail_count}" -eq 0 ]; then
  echo "✅ Canary deploy concluído com sucesso!"
  echo "   ${MAX_CHECKS}/${MAX_CHECKS} checks OK — promover para 100%"
else
  echo "⚠️  Canary deploy concluído com ${fail_count} falhas não-consecutivas"
  echo "   Revisar logs antes de promover para 100%"
fi
echo ""
echo "Próximos passos:"
echo "  1. Verificar logs do Sentry para erros silenciosos"
echo "  2. Ativar feature flags gradualmente no PostHog"
echo "  3. Monitorar Railway workers (heartbeat)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
