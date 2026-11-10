"""Sustituye los emojis del proyecto por iconos Lucide (una sola vez).
- HTML fuera de <script>:  <i data-ic="nombre"></i>
- TypeScript y <script>:    «ic:nombre»   (src/iconos.ts lo convierte en SVG al pintarse)
- Favicons con emoji:       /favicon.svg
Uso: python web/scripts/convertir-emojis.py
"""
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
MAPA = {
    "🧑‍💻": "user-round", "🧑‍🚒": "user-round", "🧑‍🔧": "user-round", "🧑‍🚀": "user-round", "🧑‍🔬": "user-round",
    "❚❚": "pause",
    "👹": "ghost", "✅": "circle-check", "🛡": "shield", "▶": "play", "🧑": "user-round", "💀": "skull", "☠": "skull", "🎁": "gift",
    "🔥": "flame", "✓": "check", "💡": "lightbulb", "🏆": "trophy", "⚠": "triangle-alert", "🛒": "shopping-cart", "🏁": "flag",
    "🔓": "lock-open", "🔒": "lock", "↺": "rotate-ccw", "↻": "rotate-cw", "★": "star", "⭐": "star", "👀": "eye", "🙈": "eye-off",
    "🏰": "castle", "📦": "package", "📉": "trending-down", "📈": "trending-up", "💻": "terminal", "🐌": "snail", "🗳": "vote",
    "📡": "radar", "🎮": "gamepad-2", "🎨": "palette", "⛶": "maximize", "✨": "sparkles", "🗝": "key-round", "🌐": "globe",
    "🦹": "bug", "⚖": "scale", "🔧": "wrench", "❌": "circle-x", "🌡": "thermometer", "🧟": "biohazard", "🐳": "container",
    "🌊": "waves", "💥": "zap", "⚡": "zap", "🧪": "flask-conical", "⌨": "keyboard", "🎧": "headphones", "📊": "chart-column",
    "⚔": "swords", "📋": "clipboard", "❤": "heart", "✗": "x", "🤔": "circle-help", "👉": "arrow-right", "⬜": "square",
    "🥋": "award", "🔊": "volume-2", "🧹": "brush", "⏱": "timer", "🚀": "rocket", "⚙": "cog", "🧠": "brain", "💽": "hard-drive",
    "📍": "map-pin", "🚫": "ban", "🌫": "cloud-fog", "🗺": "map", "🧱": "brick-wall", "👑": "crown", "✍": "pen-line",
    "◀": "chevron-left", "🐧": "terminal", "🪟": "app-window", "🍎": "apple", "🙂": "smile", "😤": "angry", "🔬": "flask-conical",
    "📡": "radar",
}
CLAVES = sorted(MAPA, key=len, reverse=True)
PATRON = re.compile("(" + "|".join(re.escape(k) for k in CLAVES) + ")️?")


def a_token(t: str) -> str:
    return PATRON.sub(lambda m: f"«ic:{MAPA[m.group(1)]}»", t)


def a_html(t: str) -> str:
    return PATRON.sub(lambda m: f'<i data-ic="{MAPA[m.group(1)]}"></i>', t)


def html(t: str) -> str:
    t = re.sub(r'<link rel="icon" href="data:image/svg\+xml,[^"]*" />', '<link rel="icon" href="/favicon.svg" />', t)
    partes = re.split(r"(<script\b.*?</script>)", t, flags=re.S)
    return "".join(a_token(p) if p.startswith("<script") else a_html(p) for p in partes)


cambiados = 0
for f in list(RAIZ.glob("*.html")) + list((RAIZ / "src").rglob("*.ts")):
    if f.name == "iconos.ts":
        continue
    orig = f.read_text(encoding="utf-8")
    nuevo = html(orig) if f.suffix == ".html" else a_token(orig)
    if nuevo != orig:
        f.write_text(nuevo, encoding="utf-8", newline="\n")
        cambiados += 1
        print("convertido", f.relative_to(RAIZ))
print(cambiados, "ficheros")
