#!/usr/bin/env bash
# Actualiza labd en una instalación existente (sin reinstalar motores ni imágenes). Corta unos segundos.
# Reiniciar labd cierra los labs abiertos, así que antes espera a que no haya ninguno (hasta 30 minutos).
# Uso: sudo bash instalador/actualizar.sh        FORZAR=1 para no esperar
set -euo pipefail
ORIGEN=$(cd "$(dirname "$0")/.." && pwd)
PUERTO=${RELAVOPS_PUERTO:-8080}
abiertos() { curl -fs -m 3 "http://127.0.0.1:$PUERTO/api/estado" 2>/dev/null | sed -n 's/.*"sesiones":\([0-9]*\).*/\1/p'; }
n=$(abiertos); n=${n:-0}
if [ "$n" -gt 0 ] && [ "${FORZAR:-0}" != 1 ]; then
  echo "Hay $n labs abiertos. Espero a que se cierren (FORZAR=1 para no esperar)…"
  for i in $(seq 1 120); do
    sleep 15
    n=$(abiertos); n=${n:-0}
    [ "$n" -eq 0 ] && break
  done
  [ "$n" -eq 0 ] || { echo "Siguen $n labs abiertos tras 30 minutos. No he tocado nada." >&2; exit 1; }
fi
install -m 0755 "$ORIGEN/dist/labd" /usr/local/bin/labd
systemctl restart relavops
for i in $(seq 90); do
  curl -fs "localhost:$PUERTO/api/estado" | grep -q '"m1-terminal":[1-9]' && break
  sleep 1
done
curl -s "localhost:$PUERTO/api/estado"; echo
