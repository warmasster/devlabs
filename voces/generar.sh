#!/usr/bin/env bash
# Genera todas las muestras de M4 y las deja listas para la web (web/public/voces).
# Requiere voces/preparar.sh e instalar-modelos.sh. Tarda unos minutos con GPU.
set -uo pipefail
cd "$(dirname "$0")"
export HF_HOME=/opt/voces/hf PYTHONWARNINGS=ignore TOKENIZERS_PARALLELISM=false
WAV=/opt/voces/salida
mkdir -p $WAV
command -v sox >/dev/null || apt-get install -y -qq sox libsox-fmt-all >/dev/null
# Chatterbox V3 (con el parámetro t3_model) solo está en el repositorio, no en PyPI.
/opt/voces/chatterbox/bin/python -c "import inspect; from chatterbox.mtl_tts import ChatterboxMultilingualTTS as M; assert 't3_model' in str(inspect.signature(M.from_pretrained))" 2>/dev/null \
  || uv pip install -q --python /opt/voces/chatterbox/bin/python "git+https://github.com/resemble-ai/chatterbox"
for m in ${MODELOS:-kokoro pocket qwen chatterbox chatterbox-es}; do
  env=$m; [ $m = chatterbox-es ] && env=chatterbox
  echo "=== $m"
  /opt/voces/$env/bin/python sintetizar.py $m $WAV 2>&1 | grep -vE 'Warning|warn\(|^\s*$|it/s\]|s/it\]' | tail -6
done
echo "=== empaquetar"
/opt/voces/alinear/bin/python empaquetar.py $WAV ../web/public/voces
