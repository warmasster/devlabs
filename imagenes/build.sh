#!/usr/bin/env bash
# Construye las imágenes de los labs. Se ejecuta en el host de labs (o en la distro WSL).
set -euo pipefail
cd "$(dirname "$0")"
cp base/tmux.conf frr/tmux.conf
docker build -q -t relavops/base:1 base
docker build -q -t relavops/frr:1 frr
docker build -q -t relavops/juego:1 juego
# La de Docker dentro de Sysbox lleva alpine dentro, para que su lab no necesite Internet.
docker pull -q alpine:3.22 >/dev/null
docker tag alpine:3.22 alpine:latest
docker save -o dind/alpine.tar alpine:latest
docker build -q -t relavops/dind:1 dind
rm -f dind/alpine.tar
docker images --format '{{.Repository}}:{{.Tag}}  {{.Size}}' | grep relavops/
