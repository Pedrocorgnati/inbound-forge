#!/bin/bash
# Backup manual do banco de dados — Inbound Forge
# Criado por: auto-flow execute (module-1/TASK-3/ST006)
#
# Requisitos:
#   - pg_dump instalado localmente
#   - DATABASE_URL configurado em .env.local (DIRECT_URL preferível para backup)
#   - PGPASSWORD não necessário se using URL completa
#
# Uso:
#   ./scripts/backup.sh
#   ./scripts/backup.sh [output_dir]
#
# Estratégia de backup:
#   - Automático: Supabase backup diário retido por 7 dias (plano gratuito)
#   - Manual: Este script — executar ANTES de migrations em produção
#   - Armazenamento: ./backups/ (ignorado pelo git)

set -euo pipefail

# Carregar .env.local se existir
if [ -f ".env.local" ]; then
  # shellcheck disable=SC1091
  source <(grep -v '^#' .env.local | grep -E '^[A-Z_]+=')
fi

# Usar DIRECT_URL para backup (conexão direta, não via pooler)
BACKUP_DB_URL="${DIRECT_URL:-${DATABASE_URL:-}}"

if [ -z "$BACKUP_DB_URL" ]; then
  echo "❌ ERRO: DIRECT_URL ou DATABASE_URL deve estar configurado"
  echo "   Copie .env.example para .env.local e preencha os valores"
  exit 1
fi

# Diretório de saída (padrão: ./backups/)
BACKUP_DIR="${1:-./backups}"
mkdir -p "$BACKUP_DIR"

# Nome do arquivo com timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/inbound_forge_${TIMESTAMP}.sql.gz"

echo "📦 Iniciando backup: $BACKUP_FILE"
echo "   Banco: ${BACKUP_DB_URL%%@*}@[redacted]"

# Executar backup com gzip
pg_dump "$BACKUP_DB_URL" \
  --no-password \
  --format=plain \
  --no-acl \
  --no-owner | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "✅ Backup concluído!"
echo "   Arquivo: $BACKUP_FILE"
echo "   Tamanho: $BACKUP_SIZE"
echo ""
echo "💡 Para restaurar:"
echo "   gunzip -c $BACKUP_FILE | psql \$DIRECT_URL"
