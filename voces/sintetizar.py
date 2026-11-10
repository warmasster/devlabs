"""Genera los clips de la prueba de voces (M4) con un modelo concreto.

Uso:  /opt/voces/<modelo>/bin/python sintetizar.py <modelo> <dir_salida>
Modelos: kokoro, chatterbox, chatterbox-es, qwen, pocket
Cada clip se sintetiza por párrafo entero (no frase a frase), salvo la referencia
"kokoro-frases", que reproduce lo habitual hoy: frase a frase y pegando trozos.
"""
import json
import re
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf

modelo, salida = sys.argv[1], Path(sys.argv[2])
salida.mkdir(parents=True, exist_ok=True)
T = json.loads((Path(__file__).parent / "textos.json").read_text(encoding="utf-8"))
frases = lambda s: [f for f in re.split(r"(?<=[.!?»:])\s+", s) if f.strip()]
info = {}


def guardar(nombre, audio, sr, t0):
    audio = np.asarray(audio, dtype=np.float32).squeeze()
    sf.write(salida / f"{nombre}.wav", audio, sr)
    dur = len(audio) / sr
    seg = time.time() - t0
    info[nombre] = {"duracion_s": round(dur, 2), "sintesis_s": round(seg, 2), "rtf": round(dur / seg, 2), "sr": sr}
    print(f"{nombre}: {dur:.1f} s de audio en {seg:.1f} s ({dur / seg:.1f}x tiempo real)", flush=True)


if modelo == "kokoro":
    from kokoro import KPipeline

    pipe = KPipeline(lang_code="e", repo_id="hexgrad/Kokoro-82M")
    voz = "ef_dora"
    # Referencia: lo habitual, frase a frase y pegando (la entonación arranca de cero en cada trozo).
    t0 = time.time()
    trozos = []
    for f in frases(T["tal_cual"]):
        trozos += [a.numpy() for _, _, a in pipe(f, voice=voz)]
        trozos.append(np.zeros(int(24000 * 0.25), dtype=np.float32))
    guardar("kokoro-frases-tal_cual", np.concatenate(trozos), 24000, t0)
    for v in ("tal_cual", "guion"):
        t0 = time.time()
        audio = np.concatenate([a.numpy() for _, _, a in pipe(T[v], voice=voz, split_pattern=r"\n\n+")])
        guardar(f"kokoro-{v}", audio, 24000, t0)

elif modelo in ("chatterbox", "chatterbox-es"):
    import torch
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    m = ChatterboxMultilingualTTS.from_pretrained(device="cuda", t3_model="v3")
    if modelo == "chatterbox-es":
        # Afinado para español de España: se sustituye el T3 por el del paquete es-ES.
        from huggingface_hub import hf_hub_download
        from safetensors.torch import load_file

        ruta = hf_hub_download("ResembleAI/Chatterbox-Multilingual-es-es", "t3_es_es.safetensors")
        faltan, sobran = m.t3.load_state_dict(load_file(ruta), strict=False)
        print(f"T3 es-ES cargado (faltan {len(faltan)}, sobran {len(sobran)})", flush=True)
    for v in ("tal_cual", "guion"):
        t0 = time.time()
        with torch.inference_mode():
            wav = m.generate(T[v], language_id="es", exaggeration=0.7, cfg_weight=0.4)
        guardar(f"{modelo}-{v}", wav.cpu().numpy(), m.sr, t0)

elif modelo == "qwen":
    import torch
    from qwen_tts import Qwen3TTSModel

    m = Qwen3TTSModel.from_pretrained(
        "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", device_map="cuda:0", dtype=torch.bfloat16, attn_implementation="sdpa"
    )
    for v in ("tal_cual", "guion"):
        t0 = time.time()
        wavs, sr = m.generate_voice_design(text=T[v], language="Spanish", instruct=T["estilo"])
        guardar(f"qwen-{v}", wavs[0], sr, t0)

elif modelo == "pocket":
    from pocket_tts import TTSModel

    m = TTSModel.load_model(language="spanish_24l")  # variante de 24 capas: más calidad, algo más lenta
    voz = m.get_state_for_audio_prompt("lola")
    for v in ("tal_cual", "guion"):
        t0 = time.time()
        audio = m.generate_audio(voz, T[v])
        guardar(f"pocket-{v}", audio.numpy(), m.sample_rate, t0)

else:
    sys.exit(f"modelo desconocido: {modelo}")

(salida / f"info-{modelo}.json").write_text(json.dumps(info, indent=1), encoding="utf-8")
