"""Empaqueta los clips de M4: volumen normalizado, Opus 24 kbit/s y tiempos palabra a palabra.

Uso:  /opt/voces/alinear/bin/python empaquetar.py <dir_wav> <dir_web>
- Normaliza a -16 LUFS y codifica en Opus (WebM) a 24 kbit/s con ffmpeg.
- Transcribe con Whisper (marcas de tiempo por palabra) y las alinea con el texto original,
  para resaltar el texto sincronizado con el audio.
- Escribe <dir_web>/voces.json con todo lo que necesita la página de escucha a ciegas.
"""
import difflib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

wavs, web = Path(sys.argv[1]), Path(sys.argv[2])
web.mkdir(parents=True, exist_ok=True)
T = json.loads((Path(__file__).parent / "textos.json").read_text(encoding="utf-8"))
info = {}
for f in wavs.glob("info-*.json"):
    info.update(json.loads(f.read_text(encoding="utf-8")))

MODELOS = {
    "kokoro-frases": ("Kokoro-82M · frase a frase (lo de ahora)", "Apache 2.0"),
    "kokoro": ("Kokoro-82M · párrafo entero", "Apache 2.0"),
    "chatterbox": ("Chatterbox Multilingual V3", "MIT · marca de agua"),
    "chatterbox-es": ("Chatterbox V3 afinado es-ES", "MIT · marca de agua"),
    "qwen": ("Qwen3-TTS 1.7B VoiceDesign", "Apache 2.0"),
    "pocket": ("Pocket TTS (CPU) · voz lola", "MIT · licencia por voz"),
}


def norm(w: str) -> str:
    w = unicodedata.normalize("NFD", w.lower())
    return re.sub(r"[^a-z0-9ñ]", "", "".join(c for c in w if unicodedata.category(c) != "Mn"))


def alinear(texto: str, oidas: list) -> list:
    """Asigna a cada palabra del texto original el tiempo de la palabra oída que le corresponde."""
    orig = texto.split()
    a = [norm(w) for w in orig]
    b = [norm(w.word) for w in oidas]
    tiempos = [None] * len(orig)
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                tiempos[i1 + k] = (oidas[j1 + k].start, oidas[j1 + k].end)
        elif op == "replace" and j2 > j1:
            t0, t1 = oidas[j1].start, oidas[j2 - 1].end
            n = i2 - i1
            for k in range(n):
                tiempos[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
    # huecos: interpolar entre vecinos
    for i, t in enumerate(tiempos):
        if t is None:
            prev = next((tiempos[k][1] for k in range(i - 1, -1, -1) if tiempos[k]), 0.0)
            sig = next((tiempos[k][0] for k in range(i + 1, len(tiempos)) if tiempos[k]), prev + 0.3)
            tiempos[i] = (prev, max(prev, sig))
    return [{"w": w, "t0": round(t[0], 2), "t1": round(t[1], 2)} for w, t in zip(orig, tiempos)]


whisper = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=12)
clips = []
for wav in sorted(wavs.glob("*.wav")):
    nombre = wav.stem
    version = "tal_cual" if nombre.endswith("tal_cual") else "guion"
    base = nombre.removesuffix("-" + version)
    salida = web / f"{nombre}.webm"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
         "-ar", "48000", "-ac", "1", "-c:a", "libopus", "-b:a", "24k", "-application", "voip", str(salida)],
        check=True,
    )
    # Audio a 16 kHz mono con ffmpeg (evita el choque de versiones entre faster-whisper y PyAV).
    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(wav), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    segs, _ = whisper.transcribe(np.frombuffer(pcm, dtype=np.float32), language="es", word_timestamps=True, initial_prompt="ping, ARP, MAC, TTL, router, gateway, Ethernet.", vad_filter=False, condition_on_previous_text=False)
    oidas = [w for s in segs for w in (s.words or [])]
    texto = T[version]
    palabras = alinear(texto, oidas)
    acierto = difflib.SequenceMatcher(None, [norm(w) for w in texto.split()], [norm(w.word) for w in oidas]).ratio()
    nombre_modelo, licencia = MODELOS.get(base, (base, ""))
    clips.append({
        "id": nombre, "modelo": nombre_modelo, "base": base, "version": version, "licencia": licencia,
        "archivo": f"voces/{salida.name}", "kb": round(salida.stat().st_size / 1024, 1),
        "inteligibilidad": round(acierto, 3), "oido": "".join(w.word for w in oidas).strip(),
        "palabras": palabras, **info.get(nombre, {}),
    })
    print(f"{nombre}: {salida.stat().st_size / 1024:.0f} KB, inteligibilidad (Whisper) {acierto:.0%}", flush=True)

(web / "voces.json").write_text(
    json.dumps({"textos": {"tal_cual": T["tal_cual"], "guion": T["guion"]}, "estilo": T["estilo"], "clips": clips}, ensure_ascii=False, indent=1),
    encoding="utf-8",
)
