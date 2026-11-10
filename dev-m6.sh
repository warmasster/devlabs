#!/usr/bin/env bash
# Desarrollo contra la instalación "relavops-m6": para el servicio y lanza labd leyendo web y labs
# desde disco (para ver cambios sin reinstalar). Al terminar: systemctl start relavops.
#   CUENTAS=http://localhost:8787 bash dev-m6.sh   con las cuentas (cuentas/, npm run dev) delante
set -euo pipefail
cd "$(dirname "$0")"
export MSYS_NO_PATHCONV=1
R=/mnt/c/Users/Fernando/Desktop/cursodevops
# La distro se llamaba devlabs-m6 antes del cambio de nombre. Si no se ha renombrado, se usa esa.
D=${DISTRO:-relavops-m6}
wsl.exe -l -q | tr -d '\0\r' | grep -qx "$D" || D=devlabs-m6
powershell -NoProfile -File build.ps1 -SinWeb | tail -1
wsl.exe -d $D -u root -- sh -c 'systemctl stop relavops devlabs 2>/dev/null; pkill -x labd; true'
sleep 0.5
exec wsl.exe -d $D -u root -- env RELAVOPS_NODO_SECRETO=${NODO_SECRETO:-local} $R/dist/labd -labs $R/labs -web $R/web/dist ${CUENTAS:+-cuentas $CUENTAS -nodo pc-desarrollo}
