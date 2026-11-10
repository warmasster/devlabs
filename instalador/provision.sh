#!/usr/bin/env bash
# Prepara un host Linux (o la distro WSL "relavops") con los motores de laboratorio:
#   Docker Engine + crun, Sysbox y Firecracker.
# Es idempotente: se puede lanzar las veces que haga falta.
#
# Las versiones van fijadas y cada descarga se comprueba con su SHA-256. Antes se bajaba "la última"
# de GitHub sin comprobar nada: un cambio de versión podía romper los labs, o colarse un binario malo.
# Para subir una versión, cambia la versión y sus dos sumas (amd64 y arm64) a la vez.
# Las topologías de red ya no usan containerlab (labd las monta solo, sin --privileged).
set -euo pipefail

log() { printf '\033[1;36m[provision %(%H:%M:%S)T]\033[0m %s\n' -1 "$*"; }
need_root() { [ "$(id -u)" = 0 ] || { echo "Ejecuta como root" >&2; exit 1; }; }
need_root
export DEBIAN_FRONTEND=noninteractive
ARCH=$(dpkg --print-architecture)           # amd64 / arm64
UARCH=$(uname -m)                           # x86_64 / aarch64
T0=$(date +%s)

CRUN=1.30.1
CRUN_SHA_amd64=86d1e6a0e76945975d3aebfab39cbc6a26eea15f1c3fc66b6776d19e5dc346a0
CRUN_SHA_arm64=0ef30b0fbb494dc9c5303d46b091a84e27cb8ac99c985123fb1eb339854b69ea
SYSBOX=0.7.1
SYSBOX_SHA_amd64=9d6d5484f980d0a17f86c492c1262015c2afb66280bdb97215b79fde6a0261c5
SYSBOX_SHA_arm64=04ca894ae0b53f0fa54eaacc173ce40363c9a95ea5450f773716a84ef650a69b
FIRECRACKER=v1.17.0
FIRECRACKER_SHA_x86_64=06094a1108ae9e82aa4c23a775aa92758f53f1175d422270d9d6162cb9ade558
FIRECRACKER_SHA_aarch64=e351ebe4f7a16b5873bbd51005d2e6767103cff4d5ebc829df2d3f95a93e2256

# bajar URL FICHERO SUMA: descarga y comprueba la suma. Si no cuadra, borra el fichero y para.
bajar() {
  curl -fsSL -o "$2" "$1"
  if ! echo "$3  $2" | sha256sum -c --status; then
    rm -f "$2"
    echo "La descarga de $1 no tiene la suma esperada. No instalo nada." >&2
    exit 1
  fi
}
suma() { eval "echo \${$1_SHA_$2:-}"; }

# En WSL: que el PATH de Windows (docker.exe de Docker Desktop, etc.) no se cuele.
if grep -qi microsoft /proc/sys/kernel/osrelease; then
  export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
  if ! grep -q appendWindowsPath /etc/wsl.conf 2>/dev/null; then
    printf '[boot]\nsystemd=true\n\n[interop]\nappendWindowsPath=false\n' > /etc/wsl.conf
  fi
fi

log "Paquetes base"
apt-get update -qq
apt-get install -y -qq ca-certificates curl jq gnupg tmux crun iproute2 tcpdump \
  zstd uidmap acl e2fsprogs squashfs-tools >/dev/null

# crun de las distros LTS suele ir por detrás de la especificación OCI de Docker:
# usamos el binario estático oficial.
if [ "$(/usr/local/bin/crun --version 2>/dev/null | awk '/crun version/{print $3}')" != "$CRUN" ]; then
  log "crun $CRUN (runtime OCI en C: arranca más rápido y gasta menos que runc)"
  bajar "https://github.com/containers/crun/releases/download/${CRUN}/crun-${CRUN}-linux-${ARCH}" /tmp/crun "$(suma CRUN "$ARCH")"
  install -m 0755 /tmp/crun /usr/local/bin/crun
  rm -f /tmp/crun
fi

if [ ! -x /usr/bin/docker ]; then
  log "Docker Engine (repo oficial)"
  install -m 0755 -d /etc/apt/keyrings
  . /etc/os-release
  curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$ARCH signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$ID $VERSION_CODENAME stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
fi

log "Docker: crun como runtime por defecto, overlay2, logs con límite"
mkdir -p /etc/docker
cat > /etc/docker/daemon.json.new <<'JSON'
{
  "default-runtime": "crun",
  "runtimes": { "crun": { "path": "/usr/local/bin/crun" } },
  "storage-driver": "overlay2",
  "log-driver": "local",
  "log-opts": { "max-size": "5m", "max-file": "2" },
  "features": { "buildkit": true }
}
JSON
antes=$(sha256sum /etc/docker/daemon.json 2>/dev/null || true)
if ! cmp -s /etc/docker/daemon.json.new /etc/docker/daemon.json 2>/dev/null; then
  # Sysbox añade su runtime al instalarse; lo conservamos si ya estaba.
  if [ -f /etc/docker/daemon.json ] && jq -e '.runtimes["sysbox-runc"]' /etc/docker/daemon.json >/dev/null 2>&1; then
    jq -s '.[0] * .[1]' /etc/docker/daemon.json /etc/docker/daemon.json.new > /etc/docker/daemon.json.tmp
    mv /etc/docker/daemon.json.tmp /etc/docker/daemon.json
  else
    cp /etc/docker/daemon.json.new /etc/docker/daemon.json
  fi
fi
rm -f /etc/docker/daemon.json.new
systemctl enable --now docker >/dev/null 2>&1
# Reiniciar Docker tira todos los labs abiertos. Solo si su configuración ha cambiado de verdad.
if [ "$antes" != "$(sha256sum /etc/docker/daemon.json)" ]; then systemctl restart docker; fi

if ! command -v sysbox-runc >/dev/null; then
  log "Sysbox $SYSBOX (contenedores de sistema sin --privileged)"
  bajar "https://downloads.nestybox.com/sysbox/releases/v${SYSBOX}/sysbox-ce_${SYSBOX}-0.linux_${ARCH}.deb" /tmp/sysbox.deb "$(suma SYSBOX "$ARCH")"
  # Sysbox exige que no haya contenedores corriendo al instalarse.
  docker ps -q | xargs -r docker stop >/dev/null
  apt-get install -y -qq /tmp/sysbox.deb >/dev/null || { log "AVISO: Sysbox no se pudo instalar"; }
  rm -f /tmp/sysbox.deb
fi

if ! command -v firecracker >/dev/null; then
  log "Firecracker $FIRECRACKER (microVMs)"
  FC=$FIRECRACKER
  bajar "https://github.com/firecracker-microvm/firecracker/releases/download/${FC}/firecracker-${FC}-${UARCH}.tgz" /tmp/fc.tgz "$(suma FIRECRACKER "$UARCH")"
  tar -xzf /tmp/fc.tgz -C /tmp && rm -f /tmp/fc.tgz
  install -m 0755 "/tmp/release-${FC}-${UARCH}/firecracker-${FC}-${UARCH}" /usr/local/bin/firecracker
  install -m 0755 "/tmp/release-${FC}-${UARCH}/jailer-${FC}-${UARCH}" /usr/local/bin/jailer
  rm -rf "/tmp/release-${FC}-${UARCH}"
fi

# KVM para microVMs: accesible por el grupo kvm.
if [ -e /dev/kvm ]; then chgrp kvm /dev/kvm && chmod 660 /dev/kvm; KVM=sí; else KVM=no; fi

# tc netem (retardo, jitter y pérdida reales): lo usan los juegos para los "debuffs".
modprobe sch_netem 2>/dev/null || true
echo sch_netem > /etc/modules-load.d/relavops.conf

# Ajustes del kernel que necesitan muchos labs a la vez.
cat > /etc/sysctl.d/90-relavops.conf <<'EOF'
fs.inotify.max_user_instances = 8192
fs.inotify.max_user_watches = 1048576
kernel.pid_max = 4194304
net.ipv4.ip_forward = 1
vm.overcommit_memory = 1
kernel.keys.maxkeys = 20000
EOF
sysctl -q --system || true

log "Listo en $(( $(date +%s) - T0 )) s"
printf '  docker      %s\n' "$(docker version --format '{{.Server.Version}}' 2>/dev/null)"
printf '  runtimes    %s\n' "$(docker info --format '{{range $k,$v := .Runtimes}}{{$k}} {{end}}' 2>/dev/null)"
printf '  sysbox      %s\n' "$(sysbox-runc --version 2>/dev/null | awk '/version/{print $2; exit}' || echo no)"
printf '  firecracker %s\n' "$(firecracker --version 2>/dev/null | head -1)"
printf '  kvm         %s\n' "$KVM"
