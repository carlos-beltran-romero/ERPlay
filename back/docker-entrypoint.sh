#!/bin/sh
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
  value="${RUN_DB_SEED:-false}" 
  value=$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')
  case "$value" in
    1|true|yes|on) return 0 ;;
    *) return 1 ;;
  esac
}


mysql_base_args() {
  args="-h${DB_HOST} -P${DB_PORT} -u${DB_USER} --protocol=tcp"
  if [ -n "${DB_PASSWORD:-}" ]; then
    args="${args} --password=${DB_PASSWORD}"
  fi
  printf '%s' "$args"
}

mysql_query_scalar() {
  base_args="$(mysql_base_args)"
  mysql -N -s $base_args "${DB_NAME}" -e "$1" 2>/dev/null || true
}

sql_escape() {
  printf "%s" "$1" | sed "s/\\\\/\\\\\\\\/g; s/'/\\\\'/g"
}

create_default_admin() {
  ADMIN_EMAIL="${ADMIN_EMAIL:-erplay.supervisor@gmail.com}"
  ADMIN_NAME="${ADMIN_NAME:-ERPlay}"
  ADMIN_LASTNAME="${ADMIN_LASTNAME:-Supervisor}"
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-localAdmin2025}"
  ADMIN_ROLE="${ADMIN_ROLE:-supervisor}"

  echo "Verificando usuario admin por defecto (${ADMIN_EMAIL})..."

  EMAIL_ESCAPED="$(sql_escape "$ADMIN_EMAIL")"
  EXISTING_SUPERVISOR="$(mysql_query_scalar "SELECT COUNT(*) FROM users WHERE email='${EMAIL_ESCAPED}';")"
  [ -n "$EXISTING_SUPERVISOR" ] || EXISTING_SUPERVISOR="0"

  if [ "$EXISTING_SUPERVISOR" -gt 0 ] 2>/dev/null; then
    echo "Ya existe un usuario con ese email. No se crea admin por defecto."
    return 0
  fi

  echo "Creando admin por defecto sin seed..."


  ADMIN_HASH="$(ADMIN_PASSWORD="$ADMIN_PASSWORD" node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10));")"
  if [ -z "$ADMIN_HASH" ]; then
    echo "No se pudo generar hash de contraseña para el admin." >&2
    return 1
  fi

  NAME_ESCAPED="$(sql_escape "$ADMIN_NAME")"
  LASTNAME_ESCAPED="$(sql_escape "$ADMIN_LASTNAME")"
  HASH_ESCAPED="$(sql_escape "$ADMIN_HASH")"
  ROLE_ESCAPED="$(sql_escape "$ADMIN_ROLE")"

  base_args="$(mysql_base_args)"
  if mysql $base_args "$DB_NAME" -e "INSERT INTO users (id, name, lastName, email, passwordHash, role) VALUES (UUID(), '${NAME_ESCAPED}', '${LASTNAME_ESCAPED}', '${EMAIL_ESCAPED}', '${HASH_ESCAPED}', '${ROLE_ESCAPED}');"; then
    echo "Admin por defecto creado correctamente."
  else
    echo "No se pudo crear el admin por defecto." >&2
  fi
}

wait_for_db

echo "Ejecutando migraciones de base de datos..."
if ! npm run migration:run:js; then
  echo "Fallo al ejecutar las migraciones." >&2
  exit 1
fi

if should_seed; then
  echo "RUN_DB_SEED=true → comprobando si la BD ya tiene usuarios..."
  EXISTEN_USUARIOS="$(mysql_query_scalar "SELECT COUNT(*) FROM users;")"
  [ -n "$EXISTEN_USUARIOS" ] || EXISTEN_USUARIOS="0"

  if [ "$EXISTEN_USUARIOS" -gt 0 ] 2>/dev/null; then
    echo "La BD ya tiene datos. No se ejecuta la seed."
  else
    echo "La BD está vacía → ejecutando seed..."
    base_args="$(mysql_base_args)"
    if ! mysql $base_args "$DB_NAME" < erplay.sql; then
      echo "Fallo al ejecutar erplay.sql." >&2
      exit 1
    fi
    echo "erplay.sql ejecutado correctamente."
  fi
else
  echo "RUN_DB_SEED desactivado; sin seed en base de datos."
  create_default_admin
fi

echo "Arrancando aplicación Node..."
exec node dist/index.js
