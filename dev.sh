#!/usr/bin/env bash
# Desarrollo en Windows: recompila (web + labd, y las imágenes con --imagenes) y relanza labd
# dentro de la distro WSL "relavops", sirviendo web y labs desde disco. Se queda en primer plano.
set -euo pipefail
cd "$(dirname "$0")"
export MSYS_NO_PATHCONV=1
R=/mnt/c/Users/Fernando/Desktop/cursodevops
# La distro se llamaba devlabs antes del cambio de nombre. Si no se ha renombrado, se usa esa.
D=${DISTRO:-relavops}
wsl.exe -l -q | tr -d '\0\r' | grep -qx "$D" || D=devlabs
[ "${1:-}" = "--imagenes" ] && wsl.exe -d $D -u root -- bash $R/imagenes/build.sh
powershell -NoProfile -File build.ps1 | tail -1
wsl.exe -d $D -u root -- pkill -x labd || true
sleep 0.5
exec wsl.exe -d $D -u root -- env RELAVOPS_NODO_SECRETO=${NODO_SECRETO:-local} $R/dist/labd -labs $R/labs -web $R/web/dist ${CUENTAS:+-cuentas $CUENTAS -nodo pc-desarrollo}
