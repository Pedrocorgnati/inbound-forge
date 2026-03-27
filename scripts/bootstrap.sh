#!/usr/bin/env bash
# bootstrap.sh — Setup completo do ambiente local
# Gerado por /dev-bootstrap-create (SystemForge)
# Uso: ./scripts/bootstrap.sh [--reset] [--health]
set -euo pipefail

# === Cores ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[bootstrap]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[erro]${NC} $*" >&2; }

# === Pre-requisitos ===
check_prereqs() {
  log "Verificando pre-requisitos..."
  local missing=()

  command -v git >/dev/null 2>&1 || missing+=("git")
  command -v node >/dev/null 2>&1 || missing+=("node")
  command -v npm >/dev/null 2>&1 || missing+=("npm")
  command -v docker >/dev/null 2>&1 || missing+=("docker")
  command -v docker >/dev/null 2>&1 && \
    docker compose version >/dev/null 2>&1 || missing+=("docker compose")

  if [ ${#missing[@]} -gt 0 ]; then
    err "Faltando: ${missing[*]}"
    err "Instale os pre-requisitos acima e tente novamente."
    exit 1
  fi
  ok "Pre-requisitos verificados"
}

# === .env ===
ensure_env() {
  log "Configurando ambiente..."
  if [ -f .env ]; then
    ok ".env ja existe"
    return
  fi

  if [ -f .env.example ]; then
    cp .env.example .env
    ok ".env criado a partir de .env.example"
    warn "IMPORTANTE: Revise .env e preencha valores sensiveis (DATABASE_URL, SUPABASE_*, etc)"
    warn "Pressione ENTER para continuar..."
    read -r
  else
    warn ".env nao encontrado e sem template"
    warn "Crie .env manualmente com as variaveis necessarias"
  fi
}

# === Dependencias ===
install_deps() {
  log "Instalando dependencias npm..."
  npm install
  ok "Dependencias instaladas"
}

# === Prisma generate ===
prisma_setup() {
  log "Configurando Prisma..."
  npx prisma generate
  ok "Prisma gerado"
}

# === Docker ===
start_services() {
  log "Subindo servicos Docker..."
  docker compose up -d

  log "Aguardando servicos ficarem saudaveis (max 60s)..."
  local max_wait=60
  local waited=0

  while [ $waited -lt $max_wait ]; do
    # Verificar se os containers estao rodando
    if docker compose ps --format json 2>/dev/null | grep -q '"State":"running"'; then
      ok "Servicos Docker rodando"
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
  done

  warn "Timeout esperando servicos ficarem healthy (${max_wait}s)"
  warn "Verifique com: docker compose ps"
  return 0  # Nao bloqueia — pode estar usando Supabase cloud
}

stop_services() {
  log "Parando servicos Docker..."
  docker compose down
  ok "Servicos parados"
}

# === Migrations ===
run_migrations() {
  log "Executando migrations Prisma..."
  npx prisma migrate deploy
  ok "Migrations aplicadas"
}

# === Seeds ===
run_seeds() {
  log "Executando seeds..."
  npm run db:seed
  ok "Seeds aplicados"
}

# === Health Check (leve) ===
check_health() {
  log "Verificando saude do ambiente..."
  local errors=0

  # .env
  if [ -f .env ]; then
    ok ".env presente"
  else
    warn ".env ausente"
    errors=$((errors + 1))
  fi

  # node_modules
  if [ -d node_modules ]; then
    ok "node_modules instalado"
  else
    warn "node_modules ausente"
    errors=$((errors + 1))
  fi

  # Docker
  if docker compose ps --status running 2>/dev/null | grep -q "running"; then
    ok "Containers Docker rodando"
  else
    warn "Nenhum container rodando (pode estar usando Supabase cloud)"
  fi

  # Prisma cliente
  if [ -d node_modules/.prisma/client ]; then
    ok "Prisma cliente gerado"
  else
    warn "Prisma cliente nao gerado — execute: npx prisma generate"
    errors=$((errors + 1))
  fi

  echo ""
  if [ $errors -eq 0 ]; then
    ok "Ambiente saudavel!"
  else
    warn "$errors problema(s) encontrado(s) — revise acima"
  fi
}

# === Resumo ===
show_summary() {
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  BOOTSTRAP COMPLETO — inbound-forge${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  Proximos passos:"
  echo ""
  echo "  1. Iniciar dev server:"
  echo "     npm run dev          (ou: make dev)"
  echo "     Acesse: http://localhost:3000"
  echo ""
  echo "  2. Gerenciar servicos:"
  echo "     docker compose ps    (listar containers)"
  echo "     docker compose down  (parar tudo)"
  echo ""
  echo "  3. Rodar testes:"
  echo "     npm test             (testes unitarios)"
  echo "     npm run test:integration  (testes de integracao)"
  echo "     npm run test:all     (todos)"
  echo ""
  echo "  4. Resetar ambiente:"
  echo "     ./scripts/bootstrap.sh --reset   (ou: make reset)"
  echo ""
  echo "  5. Health check:"
  echo "     ./scripts/bootstrap.sh --health  (verificar saude)"
  echo ""
}

# === Reset ===
do_reset() {
  warn "Resetando ambiente (remover containers, volumes, node_modules, cache)..."
  echo ""

  docker compose down -v 2>/dev/null || true
  rm -rf node_modules .next dist build 2>/dev/null || true
  rm -f .env 2>/dev/null || true

  ok "Ambiente limpo"
  echo ""
  do_setup
}

# === Setup principal ===
do_setup() {
  log "Iniciando bootstrap de inbound-forge..."
  echo ""

  check_prereqs
  ensure_env
  install_deps
  prisma_setup
  start_services
  run_migrations
  run_seeds
  check_health
  show_summary
}

# === Entrypoint ===
cd "$(dirname "${BASH_SOURCE[0]}")/.."

case "${1:-}" in
  --reset) do_reset ;;
  --health) check_health ;;
  *) do_setup ;;
esac
