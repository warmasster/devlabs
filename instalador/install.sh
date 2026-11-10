#!/usr/bin/env bash
# relavops · instalador de un comando para Linux (y lo que usan por debajo Windows/WSL y Mac/Lima).
#
#   curl -fsSL https://relavops.org/install.sh | sudo sh        (cuando haya release publicada)
#   sudo bash instalador/install.sh                                (desde una copia del repo)
#
# Qué hace: instala los motores (Docker+crun, Sysbox, Firecracker), construye las imágenes de los
# labs, instala labd como servicio y espera a tener el primer lab caliente.
# labd escucha solo en esta máquina (127.0.0.1) y sin cuentas: cualquiera que llegue a él abre shells.
# En Windows (WSL) y Mac (Lima) el navegador llega igual por localhost. RELAVOPS_ESCUCHA cambia la
# dirección (p. ej. 0.0.0.0, para un aula), pero entonces cualquiera en esa red puede usar los labs.
set -euo pipefail
PUERTO=${RELAVOPS_PUERTO:-8080}
ESCUCHA=${RELAVOPS_ESCUCHA:-127.0.0.1}
T0=$(date +%s)
log() { printf '\033[1;32m[relavops %3ss]\033[0m %s\n' $(( $(date +%s) - T0 )) "$*"; }
# Cronómetro por fases: queda en /var/lib/relavops/publico/instalacion/ y se ve en la página M6.
FASES=""; MARCA=$T0; FASE=""
fase() {
  local ahora=$(date +%s)
  [ -n "$FASE" ] && FASES="$FASES${FASES:+,}{\"nombre\":\"$FASE\",\"s\":$((ahora - MARCA))}"
  FASE="$1"; MARCA=$ahora
  [ -n "$1" ] && log "$1"
  return 0
}
[ "$(id -u)" = 0 ] || { echo "Ejecuta con sudo/root" >&2; exit 1; }
[ "$(uname -s)" = Linux ] || { echo "Necesita Linux (en Windows usa install.ps1, en Mac la plantilla de Lima)" >&2; exit 1; }
# En WSL, que no se cuele el docker.exe de Windows del PATH.
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Origen: la carpeta del repo (o del paquete descargado) en la que está este script.
ORIGEN=${RELAVOPS_ORIGEN:-$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)}
[ -x "$ORIGEN/dist/labd" ] || { echo "No encuentro $ORIGEN/dist/labd (¿has compilado con build.ps1?)" >&2; exit 1; }

# Todo lo lento (motores e imágenes) se hace con lo que haya funcionando. El cambio de servicio va al
# final y dura segundos. Reiniciar labd cierra los labs abiertos, así que antes se espera a que no haya.
fase "Motores (Docker, crun, Sysbox, Firecracker)"
bash "$ORIGEN/instalador/provision.sh" | sed 's/^/      /'

fase "Imágenes de los labs"
if [ -f "$ORIGEN/dist/imagenes.tar.zst" ]; then
  zstd -dc "$ORIGEN/dist/imagenes.tar.zst" | docker load -q
else
  bash "$ORIGEN/imagenes/build.sh" | sed 's/^/      /'
fi

# Labs abiertos ahora mismo en el labd que esté funcionando (el de antes o el viejo devlabs).
abiertos() { curl -fs -m 3 "http://127.0.0.1:$PUERTO/api/estado" 2>/dev/null | sed -n 's/.*"sesiones":\([0-9]*\).*/\1/p'; }
n=$(abiertos); n=${n:-0}
if [ "$n" -gt 0 ] && [ "${FORZAR:-0}" != 1 ]; then
  fase "Espero a que se cierren $n labs abiertos (FORZAR=1 para no esperar)"
  for i in $(seq 1 120); do
    sleep 15
    n=$(abiertos); n=${n:-0}
    [ "$n" -eq 0 ] && break
  done
  [ "$n" -eq 0 ] || { echo "Siguen $n labs abiertos tras 30 minutos. No he cambiado el servicio. Lanza otra vez más tarde, o con FORZAR=1." >&2; exit 1; }
fi

# Instalación de antes del cambio de nombre (devlabs). Se para justo antes de arrancar la nueva y se aprovecha su estado.
if [ -f /etc/systemd/system/devlabs.service ]; then
  log "Paro la instalación vieja (devlabs)"
  systemctl disable --now devlabs >/dev/null 2>&1 || true
  rm -rf /etc/systemd/system/devlabs.service /etc/systemd/system/devlabs.service.d
  systemctl daemon-reload
fi
if [ -d /var/lib/devlabs ] && [ ! -e /var/lib/relavops ]; then mv /var/lib/devlabs /var/lib/relavops; fi
rm -f /var/lib/relavops/acceso.json # el usuario único de antes. Ahora hay cuentas (cuentas/)

fase "Servicio labd"
install -m 0755 "$ORIGEN/dist/labd" /usr/local/bin/labd
cat > /etc/systemd/system/relavops.service <<UNIT
[Unit]
Description=relavops (labs DevOps en el navegador)
After=docker.service
Requires=docker.service

[Service]
ExecStart=/usr/local/bin/labd -addr $ESCUCHA:$PUERTO -estado /var/lib/relavops
Restart=always
RestartSec=2
# Si falta memoria, que el kernel mate antes un proceso de un lab que labd.
OOMScoreAdjust=-800

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable relavops >/dev/null 2>&1
systemctl restart relavops

fase "Primer lab caliente"
for i in $(seq 1 120); do
  if curl -fs "http://localhost:$PUERTO/api/estado" 2>/dev/null | grep -q '"m1-terminal":[1-9]'; then
    fase ""
    # Las imágenes con el nombre de antes ya no las usa nadie. Fuera, que el disco de un VPS es justo.
    docker images --format '{{.Repository}}:{{.Tag}}' | grep '^devlabs/' | xargs -r docker rmi -f >/dev/null 2>&1 || true
    mkdir -p /var/lib/relavops/publico/instalacion
    printf '{"fases":[%s],"total_s":%d}\n' "$FASES" $(( $(date +%s) - T0 )) > /var/lib/relavops/publico/instalacion/fases-linux.json
    log "Listo. Abre http://localhost:$PUERTO"
    echo "RELAVOPS_LISTO_EN=$(( $(date +%s) - T0 ))"
    exit 0
  fi
  sleep 1
done
echo "labd no arrancó; mira: journalctl -u relavops -n 50" >&2
exit 1
