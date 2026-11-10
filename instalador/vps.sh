#!/usr/bin/env bash
# Publica relavops en un VPS con su dominio y HTTPS, con las cuentas del Worker de Cloudflare (cuentas/).
#
#   bash instalador/vps.sh      (como root, desde la copia subida)
#
# Sube antes al VPS dist/labd, instalador/ (con instalador/secretos/nodo.env) e imagenes/.
#
# Hace lo mismo que install.sh, deja labd escuchando solo en 127.0.0.1, pidiendo cuenta y mandando su
# latido al panel de admin, y pone Caddy delante. Caddy saca el certificado de Let's Encrypt en cuanto
# el dominio apunta a esta IP. Hasta entonces lo reintenta solo, no hay que volver a lanzar nada.
# Si había una instalación de antes del cambio de nombre (servicio devlabs), la para y se queda con su estado.
#
# Variables:
#   DOMINIO       relavops.org por defecto
#   TAMBIEN       otros dominios que sirven lo mismo, separados por espacios (p. ej. el de antes mientras cambia el DNS)
#   REDIRIGE      otros dominios que mandan a DOMINIO con una redirección permanente
#   CUENTAS       el Worker de cuentas (por defecto su dirección workers.dev, que no depende del DNS)
#   NODO          nombre de este servidor en el panel (por defecto, el de la máquina)
#   NODO_SECRETO  si no, se lee de instalador/secretos/nodo.env (lo deja cuentas/scripts/claves.mjs)
#
# Se puede lanzar las veces que haga falta. Para actualizar labd basta con volver a lanzarlo.
set -euo pipefail
DOMINIO=${DOMINIO:-relavops.org}
TAMBIEN=${TAMBIEN:-}
REDIRIGE=${REDIRIGE:-lab.crafthosts.org www.relavops.org} # el dominio de antes y el www, a la dirección buena
CUENTAS=${CUENTAS:-https://relavops-cuentas.ferndohm99emf.workers.dev}
ORIGEN=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
log() { printf '\033[1;35m[vps]\033[0m %s\n' "$*"; }
[ "$(id -u)" = 0 ] || { echo "Ejecuta como root" >&2; exit 1; }

NODO=${NODO:-$(hostname | tr 'A-Z' 'a-z' | tr -c 'a-z0-9-\n' '-' | cut -c1-40)}
if [ -z "${NODO_SECRETO:-}" ] && [ -f "$ORIGEN/instalador/secretos/nodo.env" ]; then
  NODO_SECRETO=$(sed -n 's/^RELAVOPS_NODO_SECRETO=//p' "$ORIGEN/instalador/secretos/nodo.env")
fi
if [ -z "${NODO_SECRETO:-}" ] && [ -f /etc/relavops/labd.env ]; then
  NODO_SECRETO=$(sed -n 's/^RELAVOPS_NODO_SECRETO=//p' /etc/relavops/labd.env)
fi
[ -n "${NODO_SECRETO:-}" ] || log "Aviso: sin NODO_SECRETO. labd funciona, pero este servidor no sale en el panel de admin."

# Antes de instalar, para que labd no llegue a escuchar abierto hacia fuera ni un momento.
log "labd solo en local, con las cuentas de $CUENTAS, como nodo $NODO"
install -d -m 0700 /etc/relavops
( umask 077; printf 'RELAVOPS_NODO_SECRETO=%s\n' "${NODO_SECRETO:-}" > /etc/relavops/labd.env )
mkdir -p /etc/systemd/system/relavops.service.d
cat > /etc/systemd/system/relavops.service.d/vps.conf <<EOF
[Service]
EnvironmentFile=/etc/relavops/labd.env
ExecStart=
ExecStart=/usr/local/bin/labd -addr 127.0.0.1:8080 -estado /var/lib/relavops -cuentas $CUENTAS -nodo $NODO -max-sesiones 30 -max-por-persona 3 -dura-sesion 2h -abandono 10m -max-nuevas-min 8 -cgroup-labs relavops-labs.slice -tope-fichero 2G -disco-lab 2G -disco-libre 3G
EOF

# Todos los labs van en un mismo cgroup con tope de memoria y CPU. Por muchos labs que haya y por mucho
# que gasten, a labd, Caddy, Docker y el SSH les queda siempre algo. Se deja 700 MB y un cuarto de núcleo.
RAM_MB=$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)
LABS_MB=$(( RAM_MB > 1400 ? RAM_MB - 700 : RAM_MB * 1 / 2 ))
CPU_LABS=$(( $(nproc) * 100 - 25 ))
log "Los labs, juntos, como mucho ${LABS_MB} MB de RAM y ${CPU_LABS} % de CPU"
cat > /etc/systemd/system/relavops-labs.slice <<EOF
[Unit]
Description=relavops: todos los labs juntos

[Slice]
MemoryMax=${LABS_MB}M
MemorySwapMax=0
CPUQuota=${CPU_LABS}%
TasksMax=8000
EOF
systemctl daemon-reload

log "Instalación de relavops"
bash "$ORIGEN/instalador/install.sh"

if ! command -v caddy >/dev/null; then
  log "Caddy (HTTPS automático)"
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gnupg >/dev/null
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy >/dev/null
fi

log "Caddy para $DOMINIO${TAMBIEN:+ y $TAMBIEN}"
SITIOS=$(echo "$DOMINIO $TAMBIEN" | xargs | sed 's/ /, /g')
cat > /etc/caddy/Caddyfile <<EOF
# Lo escribe instalador/vps.sh. Las terminales van por WebSocket y Caddy las pasa sin tocar nada.
# Caddy pone en X-Forwarded-For la IP de verdad. Cf-Connecting-Ip la podría escribir cualquiera, fuera.
$SITIOS {
	reverse_proxy 127.0.0.1:8080 {
		header_up -Cf-Connecting-Ip
	}
}
EOF
for d in $REDIRIGE; do
  cat >> /etc/caddy/Caddyfile <<EOF

$d {
	redir https://$DOMINIO{uri} permanent
}
EOF
done
# Si falta memoria, que el kernel no elija a Caddy.
mkdir -p /etc/systemd/system/caddy.service.d
printf '[Service]\nOOMScoreAdjust=-800\n' > /etc/systemd/system/caddy.service.d/relavops.conf
systemctl daemon-reload
systemctl enable caddy >/dev/null 2>&1
# reload no corta las conexiones abiertas (las terminales). restart solo si Caddy no estaba en marcha.
systemctl reload caddy 2>/dev/null || systemctl restart caddy

# Si el cortafuegos ya está activo, se abren la web y HTTPS. No se activa aquí para no dejar fuera el SSH.
if command -v ufw >/dev/null && ufw status | grep -q 'Status: active'; then
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
fi

IP=$(curl -fs4 https://ifconfig.me || true)
log "Listo. Apunta $DOMINIO (registro A) a ${IP:-la IP de este servidor} y abre https://$DOMINIO"
