#!/usr/bin/env bash
# Un entorno Python aislado por modelo (sus dependencias chocan entre sí).
set -euo pipefail
B=/opt/voces
mkdir -p $B
export UV_LINK_MODE=hardlink UV_CACHE_DIR=/opt/voces/.uv-cache HF_HOME=/opt/voces/hf
mk() { # nombre python paquetes...
  local n=$1 py=$2; shift 2
  [ -x $B/$n/bin/python ] || uv venv -q --python "$py" $B/$n
  echo "== $n"; uv pip install -q --python $B/$n/bin/python "$@"
}
mk kokoro 3.11 "kokoro>=0.9.4" soundfile
mk chatterbox 3.11 chatterbox-tts soundfile
mk qwen 3.12 qwen-tts soundfile
mk pocket 3.12 pocket-tts soundfile --extra-index-url https://download.pytorch.org/whl/cpu
mk alinear 3.12 faster-whisper
for n in kokoro chatterbox qwen pocket alinear; do
  echo "$n: $($B/$n/bin/python -c 'import torch,sys;print(torch.__version__, torch.cuda.is_available())' 2>/dev/null || echo sin-torch)"
done
du -sh $B
