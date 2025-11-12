#!/bin/sh
# POSIX-safe: sin 'pipefail'
set -eu

wait_for_db() {
  if [ -z "${DB_HOST:-}" ] || [ -z "${DB_PORT:-}" ]; then
    return 0
  fi

  echo "Esperando a la base de datos en ${DB_HOST}:${DB_PORT}..."
  for i in $(seq 1 60); do
    if nc -z "$DB_HOST" "$DB_PORT" >/dev/null 2>&1; then
      echo "Base de datos disponible."
      return 0
    fi
    sleep 2
  done

  echo "No se pudo conectar con la base de datos tras esperar 120s." >&2
  exit 1
}

should_seed() {
  value="${RUN_DB_SEED:-true}"
  value=$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')
  case "$value" in
    1|true|yes|on) return 0 ;;
    *)             return 1 ;;
  esac
}

wait_for_db

if should_seed; then
  echo "Ejecutando semilla de base de datos..."
  node dist/seeds/seed.js || { echo "Fallo al ejecutar la semilla." >&2; exit 1; }
else
  echo "RUN_DB_SEED desactivado; se omite la semilla."
fi

exec node dist/index.js
