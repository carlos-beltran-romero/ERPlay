#!/bin/sh
# POSIX-safe
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
  value="${RUN_DB_SEED:-false}"   # por defecto false
  value=$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')
  case "$value" in
    1|true|yes|on) return 0 ;;
    *)             return 1 ;;
  esac
}

wait_for_db

echo "Ejecutando migraciones de base de datos..."
if ! npm run migration:run:js; then
  echo "Fallo al ejecutar las migraciones." >&2
  exit 1
fi

if should_seed; then
  echo "RUN_DB_SEED=true → comprobando si la BD ya tiene usuarios..."

  # Obtenemos el número de usuarios; si falla el comando, asumimos 0
  EXISTEN_USUARIOS=$(
    mysql -N -s \
      -h"$DB_HOST" -P"$DB_PORT" \
      -u"$DB_USER" -p"$DB_PASSWORD" \
      "$DB_NAME" \
      -e "SELECT COUNT(*) FROM users;" 2>/dev/null \
    || echo "0"
  )


  case "$EXISTEN_USUARIOS" in
    '' ) EXISTEN_USUARIOS=0 ;;
  esac

  if [ "$EXISTEN_USUARIOS" -gt 0 ]; then
    echo "La BD ya tiene datos. No se ejecuta la seed."
  else
    echo "La BD está vacía → ejecutando seed..."
    if ! mysql \
      -h"$DB_HOST" -P"$DB_PORT" \
      -u"$DB_USER" -p"$DB_PASSWORD" \
      "$DB_NAME" < erplay.sql; then
      echo "Fallo al ejecutar erplay.sql." >&2
      exit 1
    fi
    echo "erplay.sql ejecutado correctamente."
  fi
else
  echo "RUN_DB_SEED desactivado; Sin seed en base de datos."
fi

echo "Arrancando aplicación Node..."
exec node dist/index.js
