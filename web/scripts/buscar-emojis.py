"""Lista los emojis que queden en el proyecto (para cumplir la regla: ni uno en la interfaz).
Uso: python web/scripts/buscar-emojis.py [--resumen]"""
import re
import sys
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U00002B00-\U00002BFF\U0001F900-\U0001F9FF←-⇿⌀-⏿①-⓿■-◿️‍]"
)
# Flechas y símbolos tipográficos que no son emojis: se permiten.
PERMITIDOS = set("←→↑↓↔")
CARPETAS = ["web/src", "web/index.html", "web/m1.html", "web/m2.html", "web/m3.html", "web/m4.html", "web/m5.html",
            "web/m6.html", "web/disenos.html", "web/juegos.html", "web/juego.html", "imagenes", "labs", "juegos"]
EXCLUIR = ["prueba-utf8"]  # el fichero de M1 que prueba que la terminal SABE dibujar emojis

total = Counter()
for c in CARPETAS:
    p = RAIZ / c
    ficheros = [p] if p.is_file() else [f for f in p.rglob("*") if f.is_file() and f.suffix in {".ts", ".html", ".css", ".json", ".yaml", ".sh", ""}]
    for f in ficheros:
        try:
            lineas = f.read_text(encoding="utf-8").splitlines()
        except UnicodeDecodeError:
            continue
        for n, l in enumerate(lineas, 1):
            if any(e in l for e in EXCLUIR):
                continue
            hallados = [ch for ch in EMOJI.findall(l) if ch not in PERMITIDOS and ch not in "️‍"]
            if hallados:
                total[str(f.relative_to(RAIZ))] += len(hallados)
                if "--resumen" not in sys.argv:
                    print(f"{f.relative_to(RAIZ)}:{n}: {''.join(hallados)}")
print(f"\n{sum(total.values())} emojis en {len(total)} ficheros")
for f, n in total.most_common():
    print(f"  {n:4} {f}")
