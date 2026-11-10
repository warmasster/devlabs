#!/usr/bin/env bash
# Prepara la máquina de síntesis de voz (se ejecuta una vez, en Linux/WSL con GPU NVIDIA).
# Solo hace falta para generar el audio al publicar; reproducirlo no necesita nada de esto.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ffmpeg espeak-ng git build-essential python3-dev >/dev/null
if ! command -v uv >/dev/null; then
  curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh >/dev/null
fi
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
uv --version
ffmpeg -version | head -1
