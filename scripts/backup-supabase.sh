#!/usr/bin/env bash
# Intake-Review TASK-10 ST002 (CL-OP-011/012/013)
# Snapshot logico mensal do Postgres Supabase para bucket privado `backups`.
# Executado via GitHub Actions no 1o dia do mes.
# Fallback para GitHub Release se upload para Supabase Storage falhar.
#
# Env vars necessarias:
#   SUPABASE_DATABASE_URL   — connection string postgres com role service_role
#   SUPABASE_URL            — https://<project>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY
#   GH_TOKEN                — para fallback gh release (opcional)

set -euo pipefail

: "${SUPABASE_DATABASE_URL:?SUPABASE_DATABASE_URL nao definido}"
: "${SUPABASE_URL:?SUPABASE_URL nao definido}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY nao definido}"

BUCKET="${BACKUP_BUCKET:-backups}"
RETENTION_MONTHS="${BACKUP_RETENTION_MONTHS:-12}"
STAMP="$(date -u +%Y-%m)"
DUMP_FILE="/tmp/supabase-${STAMP}.dump"
REMOTE_PATH="monthly/${STAMP}.dump"

log() { printf '[backup-supabase] %s\n' "$*"; }

cleanup() {
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

log "gerando dump custom format em $DUMP_FILE"
pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --dbname="$SUPABASE_DATABASE_URL" \
  --file="$DUMP_FILE"

DUMP_SIZE=$(stat -c '%s' "$DUMP_FILE" 2>/dev/null || stat -f '%z' "$DUMP_FILE")
log "dump size: ${DUMP_SIZE} bytes"

if [[ "$DUMP_SIZE" -lt 1024 ]]; then
  log "ERRO: dump menor que 1KB — provavelmente falhou"
  exit 2
fi

log "upload para Supabase Storage bucket=$BUCKET path=$REMOTE_PATH"
UPLOAD_STATUS=$(curl -sS -o /tmp/upload-response.json -w '%{http_code}' \
  -X POST \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/octet-stream" \
  -H "x-upsert: true" \
  --data-binary "@${DUMP_FILE}" \
  "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${REMOTE_PATH}" || echo "000")

if [[ "$UPLOAD_STATUS" =~ ^2 ]]; then
  log "upload OK (HTTP $UPLOAD_STATUS)"
else
  log "upload falhou (HTTP $UPLOAD_STATUS). resposta:"
  cat /tmp/upload-response.json || true

  # Fallback: GitHub Release
  if command -v gh >/dev/null 2>&1 && [[ -n "${GH_TOKEN:-}" ]]; then
    log "tentando fallback via gh release create backup-${STAMP}"
    gh release create "backup-${STAMP}" \
      --title "DB Backup ${STAMP}" \
      --notes "Snapshot mensal automatico gerado pelo workflow monthly-backup (fallback). Tamanho: ${DUMP_SIZE} bytes." \
      "${DUMP_FILE}#supabase-${STAMP}.dump"
    log "fallback gh release OK"
  else
    log "ERRO: upload falhou e nenhum fallback disponivel (gh CLI ou GH_TOKEN ausente)"
    exit 3
  fi
fi

# Cleanup de snapshots antigos (> RETENTION_MONTHS)
log "cleanup: listando arquivos antigos no bucket (retencao=${RETENTION_MONTHS} meses)"
LIST_JSON=$(curl -sS \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"prefix":"monthly/","limit":100,"sortBy":{"column":"name","order":"asc"}}' \
  "${SUPABASE_URL}/storage/v1/object/list/${BUCKET}")

# Calcula cutoff: hoje - RETENTION_MONTHS meses
CUTOFF_STAMP=$(date -u -d "-${RETENTION_MONTHS} month" +%Y-%m 2>/dev/null \
  || date -u -v"-${RETENTION_MONTHS}m" +%Y-%m)
log "cutoff: ${CUTOFF_STAMP} (arquivos monthly/<${CUTOFF_STAMP}.dump serao deletados)"

echo "$LIST_JSON" | python3 -c '
import json, sys, os
data = json.load(sys.stdin)
cutoff = os.environ.get("CUTOFF_STAMP", "")
for obj in data if isinstance(data, list) else []:
    name = obj.get("name", "")
    if not name.endswith(".dump"):
        continue
    stamp = name.replace(".dump", "")
    if stamp < cutoff:
        print(name)
' | while read -r OLD_NAME; do
  [[ -z "$OLD_NAME" ]] && continue
  log "deletando antigo: monthly/${OLD_NAME}"
  curl -sS -X DELETE \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    "${SUPABASE_URL}/storage/v1/object/${BUCKET}/monthly/${OLD_NAME}" \
    || log "WARNING: falha deletando ${OLD_NAME}"
done

log "backup ${STAMP} concluido"
