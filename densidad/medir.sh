#!/usr/bin/env bash
# M5 · Densidad y coste: cuánta RAM, disco y tiempo de arranque gasta cada motor de lab.
# Arranca N instancias de cada motor, espera a que se asienten y mide en el host.
# Uso (root, en el host de labs):  bash medir.sh [salida.json]
set -uo pipefail
OUT=${1:-$(dirname "$0")/resultados.json}
W=/var/lib/relavops/bench
mkdir -p $W
N_SIMPLE=${N_SIMPLE:-20} N_SISTEMA=${N_SISTEMA:-6} N_TOPO=${N_TOPO:-6} N_VM=${N_VM:-10}
LABS=$(cd "$(dirname "$0")/../labs" && pwd)

log() { printf '\033[1;35m[m5 %(%H:%M:%S)T]\033[0m %s\n' -1 "$*" >&2; }
ms() { date +%s%3N; }
mem_usada_mb() { awk '/MemTotal/{t=$2} /MemAvailable/{a=$2} END{printf "%d", (t-a)/1024}' /proc/meminfo; }
asentar() { sync; echo 3 > /proc/sys/vm/drop_caches; sleep "${1:-15}"; }
mediana() { sort -n | awk '{a[NR]=$1} END{print (NR%2)? a[(NR+1)/2] : int((a[NR/2]+a[NR/2+1])/2)}'; }

limpiar() {
  docker ps -aq --filter label=relavops.bench | xargs -r docker rm -f >/dev/null 2>&1
  for t in $W/topo-*/topo.clab.yml; do [ -f "$t" ] && containerlab destroy -t "$t" --cleanup >/dev/null 2>&1; done
  pkill -x firecracker 2>/dev/null; sleep 1
  for d in $(dmsetup ls 2>/dev/null | awk '/^bvm/{print $1}'); do dmsetup remove "$d"; done
  losetup -a | awk -F: '/bench/{print $1}' | xargs -r -n1 losetup -d
  rm -rf $W/topo-* $W/vm-*
}
trap limpiar EXIT
limpiar
log "Base: $(mem_usada_mb) MB usados, $(nproc) CPU, $(awk '/MemTotal/{printf "%.1f", $2/1048576}' /proc/meminfo) GB totales"

# ---------- 1. Contenedor simple (crun): bash + tmux con sesión abierta ----------
medir_simple() {
  log "Contenedor simple × $N_SIMPLE"
  asentar 5; local m0=$(mem_usada_mb) ts=()
  for i in $(seq $N_SIMPLE); do
    local t=$(ms)
    docker run -d --label relavops.bench=1 --name bs-$i --network none --memory 256m --pids-limit 256 relavops/base:1 >/dev/null
    docker exec bs-$i tmux -L relavops -f /etc/relavops/tmux.conf new-session -d -s main >/dev/null
    ts+=($(( $(ms) - t )))
  done
  asentar 15; local m1=$(mem_usada_mb)
  local cg=$(for i in $(seq $N_SIMPLE); do cat /sys/fs/cgroup/system.slice/docker-$(docker inspect -f '{{.Id}}' bs-$i).scope/memory.current 2>/dev/null; done | mediana)
  local disco=$(docker ps -s --filter label=relavops.bench --format '{{.Size}}' | head -1)
  local arr=$(printf '%s\n' "${ts[@]}" | mediana)
  docker ps -aq --filter label=relavops.bench | xargs -r docker rm -f >/dev/null
  printf '{"motor":"contenedor","n":%d,"ram_total_mb":%d,"ram_por_lab_mb":%.1f,"cgroup_mediana_mb":%.1f,"arranque_ms":%d,"disco_escrito":"%s"}' \
    $N_SIMPLE $((m1-m0)) "$(echo "($m1-$m0)/$N_SIMPLE" | bc -l)" "$(echo "$cg/1048576" | bc -l)" $arr "$disco"
}

# ---------- 2. Contenedor de sistema (Sysbox): systemd + Docker dentro ----------
medir_sistema() {
  log "Contenedor de sistema (Sysbox, systemd + dockerd) × $N_SISTEMA"
  asentar 5; local m0=$(mem_usada_mb) ts=()
  for i in $(seq $N_SISTEMA); do
    local t=$(ms)
    docker run -d --label relavops.bench=1 --name bsys-$i --runtime sysbox-runc --memory 2g nestybox/ubuntu-noble-systemd-docker >/dev/null
    for k in $(seq 150); do docker exec bsys-$i docker info >/dev/null 2>&1 && break; sleep 0.2; done
    ts+=($(( $(ms) - t )))
  done
  asentar 20; local m1=$(mem_usada_mb)
  local cg=$(for i in $(seq $N_SISTEMA); do cat /sys/fs/cgroup/system.slice/docker-$(docker inspect -f '{{.Id}}' bsys-$i).scope/memory.current 2>/dev/null; done | mediana)
  local disco=$(docker ps -s --filter label=relavops.bench --format '{{.Size}}' | head -1)
  local arr=$(printf '%s\n' "${ts[@]}" | mediana)
  docker ps -aq --filter label=relavops.bench | xargs -r docker rm -f >/dev/null
  printf '{"motor":"sistema","n":%d,"ram_total_mb":%d,"ram_por_lab_mb":%.1f,"cgroup_mediana_mb":%.1f,"arranque_ms":%d,"disco_escrito":"%s"}' \
    $N_SISTEMA $((m1-m0)) "$(echo "($m1-$m0)/$N_SISTEMA" | bc -l)" "$(echo "$cg/1048576" | bc -l)" $arr "$disco"
}

# ---------- 3. Topología (Containerlab): el lab M3 entero, 2 routers FRR + 2 hosts ----------
medir_topo() {
  log "Topología M3 (4 nodos) × $N_TOPO"
  asentar 5; local m0=$(mem_usada_mb) ts=()
  for i in $(seq $N_TOPO); do
    local d=$W/topo-$i; mkdir -p $d; cp -r $LABS/m3-routing/* $d/
    python3 - "$d" "$i" <<'PY'
import sys, yaml, json
d, i = sys.argv[1], sys.argv[2]
spec = yaml.safe_load(open(f"{d}/lab.yaml"))
yaml.safe_dump({"name": f"bench{i}", "mgmt": {"network": "none"}, "topology": spec["topologia"]}, open(f"{d}/topo.clab.yml", "w"))
PY
    local t=$(ms)
    containerlab deploy -t $d/topo.clab.yml --reconfigure --log-level error >/dev/null 2>&1
    for k in $(seq 50); do docker exec clab-bench$i-r1 vtysh -c 'show version' >/dev/null 2>&1 && break; sleep 0.2; done
    ts+=($(( $(ms) - t )))
  done
  asentar 15; local m1=$(mem_usada_mb)
  local arr=$(printf '%s\n' "${ts[@]}" | mediana)
  local disco=$(docker ps -s --filter name=clab-bench1- --format '{{.Size}}' | tr '\n' ' ')
  for i in $(seq $N_TOPO); do containerlab destroy -t $W/topo-$i/topo.clab.yml --cleanup >/dev/null 2>&1; done
  printf '{"motor":"topologia","n":%d,"nodos_por_lab":4,"ram_total_mb":%d,"ram_por_lab_mb":%.1f,"arranque_ms":%d,"disco_escrito":"%s"}' \
    $N_TOPO $((m1-m0)) "$(echo "($m1-$m0)/$N_TOPO" | bc -l)" $arr "$disco"
}

# ---------- 4. MicroVM (Firecracker): kernel propio, Ubuntu con systemd, 256 MiB ----------
preparar_vm() {
  local fc=$W/fc; mkdir -p $fc
  if [ ! -f $fc/vmlinux ] || [ ! -f $fc/rootfs.ext4 ]; then
    log "Descargando kernel y rootfs de la CI de Firecracker"
    # La CI publica kernel y rootfs por versión, y las últimas tardan en tenerlos: se busca hacia atrás.
    local v lista mayor=$(firecracker --version | head -1 | grep -oE 'v1\.[0-9]+' | cut -d. -f2)
    for m in $(seq $mayor -1 10); do
      v=v1.$m
      lista=$(curl -fsSL "https://s3.amazonaws.com/spec.ccfc.min/?prefix=firecracker-ci/$v/x86_64/&list-type=2")
      echo "$lista" | grep -q "ubuntu-.*squashfs" && break
    done
    local kern=$(echo "$lista" | grep -oE "firecracker-ci/$v/x86_64/vmlinux-[0-9]+\.[0-9]+\.[0-9]+" | sort -V | tail -1)
    local sq=$(echo "$lista" | grep -oE "firecracker-ci/$v/x86_64/ubuntu-[0-9]+\.[0-9]+\.squashfs" | sort -V | tail -1)
    curl -fsSL -o $fc/vmlinux "https://s3.amazonaws.com/spec.ccfc.min/$kern"
    curl -fsSL -o $fc/rootfs.squashfs "https://s3.amazonaws.com/spec.ccfc.min/$sq"
    rm -rf $fc/root && unsquashfs -q -d $fc/root $fc/rootfs.squashfs >/dev/null 2>&1
    truncate -s 1G $fc/rootfs.ext4 && mkfs.ext4 -q -d $fc/root -F $fc/rootfs.ext4
    rm -rf $fc/root
    echo "$kern $sq" > $fc/origen.txt
  fi
  BASE_LOOP=$(losetup -f --show -r $fc/rootfs.ext4)
  SECT=$(blockdev --getsz $BASE_LOOP)
}

arrancar_vm() { # $1 = índice ; disco CoW con device-mapper sobre la base de solo lectura
  local i=$1 d=$W/vm-$1; mkdir -p $d
  truncate -s 512M $d/cow.img
  local cl=$(losetup -f --show $d/cow.img)
  dmsetup create bvm$i --table "0 $SECT snapshot $BASE_LOOP $cl N 8"
  cat > $d/vm.json <<JSON
{ "boot-source": { "kernel_image_path": "$W/fc/vmlinux", "boot_args": "console=ttyS0 reboot=k panic=1 pci=off quiet" },
  "drives": [ { "drive_id": "rootfs", "path_on_host": "/dev/mapper/bvm$i", "is_root_device": true, "is_read_only": false } ],
  "machine-config": { "vcpu_count": 1, "mem_size_mib": 256 } }
JSON
  rm -f $d/api.sock
  firecracker --api-sock $d/api.sock --config-file $d/vm.json > $d/consola.log 2>&1 &
  echo $! > $d/pid
}

medir_vm() {
  [ -e /dev/kvm ] || { printf '{"motor":"microvm","error":"sin /dev/kvm"}'; return; }
  command -v dmsetup >/dev/null || apt-get install -y -qq dmsetup >/dev/null
  preparar_vm >&2   # sus mensajes no deben mezclarse con el JSON
  log "MicroVM Firecracker (256 MiB, systemd) × $N_VM"
  asentar 5; local m0=$(mem_usada_mb) ts=()
  for i in $(seq $N_VM); do
    local t=$(ms)
    arrancar_vm $i
    for k in $(seq 300); do grep -qE 'login:|Reached target' $W/vm-$i/consola.log 2>/dev/null && break; sleep 0.05; done
    ts+=($(( $(ms) - t )))
  done
  asentar 20; local m1=$(mem_usada_mb)
  local rss=$(for i in $(seq $N_VM); do ps -o rss= -p $(cat $W/vm-$i/pid); done | mediana)
  local cow=$(du -k $W/vm-1/cow.img | cut -f1)
  local arr=$(printf '%s\n' "${ts[@]}" | mediana)

  # Hibernar y restaurar la VM 1 con snapshot de Firecracker
  local s=$W/vm-1 sock=$W/vm-1/api.sock
  curl -s --unix-socket $sock -X PATCH http://l/vm -d '{"state":"Paused"}' >/dev/null
  local t=$(ms)
  curl -s --unix-socket $sock -X PUT http://l/snapshot/create -d "{\"snapshot_type\":\"Full\",\"snapshot_path\":\"$s/snap\",\"mem_file_path\":\"$s/mem\"}" >/dev/null
  local snap_ms=$(( $(ms) - t ))
  kill $(cat $s/pid); sleep 0.5
  local mem_mb=$(du -m $s/mem | cut -f1)
  zstd -q -1 -f $s/mem -o $s/mem.zst; local memz_mb=$(du -m $s/mem.zst | cut -f1)
  rm -f $s/api2.sock
  firecracker --api-sock $s/api2.sock > $s/consola2.log 2>&1 &
  local pid2=$!; for k in $(seq 100); do [ -S $s/api2.sock ] && break; sleep 0.02; done
  t=$(ms)
  curl -s --unix-socket $s/api2.sock -X PUT http://l/snapshot/load -d "{\"snapshot_path\":\"$s/snap\",\"mem_backend\":{\"backend_type\":\"File\",\"backend_path\":\"$s/mem\"},\"resume_vm\":true}" >/dev/null
  local rest_ms=$(( $(ms) - t ))
  sleep 1; local rss2=$(ps -o rss= -p $pid2)
  printf '{"motor":"microvm","n":%d,"mem_invitado_mb":256,"ram_total_mb":%d,"ram_por_lab_mb":%.1f,"rss_mediana_mb":%.1f,"arranque_ms":%d,"disco_cow_mb":%.1f,"snapshot_ms":%d,"snapshot_mem_mb":%d,"snapshot_mem_zstd_mb":%d,"restaurar_ms":%d,"rss_tras_restaurar_mb":%.1f,"origen":"%s"}' \
    $N_VM $((m1-m0)) "$(echo "($m1-$m0)/$N_VM" | bc -l)" "$(echo "$rss/1024" | bc -l)" $arr "$(echo "$cow/1024" | bc -l)" \
    $snap_ms $mem_mb $memz_mb $rest_ms "$(echo "$rss2/1024" | bc -l)" "$(cat $W/fc/origen.txt)"
}

command -v bc >/dev/null || apt-get install -y -qq bc >/dev/null
python3 -c 'import yaml' 2>/dev/null || apt-get install -y -qq python3-yaml >/dev/null
docker image inspect nestybox/ubuntu-noble-systemd-docker >/dev/null 2>&1 || docker pull -q nestybox/ubuntu-noble-systemd-docker >/dev/null

MOTORES=${MOTORES:-"simple sistema topo vm"}
R=""
for m in $MOTORES; do r=$(medir_$m); log "$r"; R="$R${R:+, }$r"; done
if [ -f "$OUT" ] && [ "$MOTORES" != "simple sistema topo vm" ]; then
  # Medición parcial: se sustituyen solo los motores medidos ahora.
  python3 - "$OUT" "[$R]" <<'PY2'
import json, sys
d = json.load(open(sys.argv[1])); nuevos = json.loads(sys.argv[2])
hechos = {n["motor"] for n in nuevos}
d["motores"] = [m for m in d["motores"] if m["motor"] not in hechos] + nuevos
json.dump(d, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
PY2
  log "Actualizado $OUT"; exit 0
fi
cat > "$OUT" <<JSON
{ "fecha": "$(date -Iseconds)",
  "host": { "cpus": $(nproc), "ram_gb": $(awk '/MemTotal/{printf "%.1f", $2/1048576}' /proc/meminfo), "kernel": "$(uname -r)",
            "cpu": "$(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs)", "entorno": "WSL2 sobre Windows 11 (virtualización anidada para Firecracker)" },
  "motores": [ $R ] }
JSON
log "Resultados en $OUT"
cat "$OUT"
