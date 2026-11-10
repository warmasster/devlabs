# relavops · muestrario

Seis piezas de demostración (M1 a M6) de la plataforma de labs DevOps, y encima el curso. **El índice del proyecto está en [index.md](index.md).**
Las decisiones y las incoherencias resueltas están en [docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md).

| Pieza | Qué es | Dónde |
| --- | --- | --- |
| M1 | Terminal nativa (PTY real) + batería automática | `web/m1`, `web/tests/m1.spec.ts`, `labs/m1-terminal` |
| M2 | Lección "¿qué pasa al hacer ping?" con paquetes reales | `web/m2`, `web/src/diagrama.ts`, `labs/m2-ping` |
| M3 | Lab OSPF con misión, XP y boss con fallos al azar | `web/m3`, `labs/m3-routing` |
| M4 | Prueba de voces a ciegas | `web/m4`, `voces/` |
| M5 | Densidad y coste medidos | `web/m5`, `densidad/medir.sh` |
| M6 | Instalador de un comando | `instalador/` |

## El curso

El curso entero (lecciones, labs, widgets y cómo encaja todo) está en [index.md](index.md). Empieza por ahí.

## Arquitectura en una línea

`labd` (Go, un binario): web + API + pool de labs en caliente + pasarela WebSocket↔PTY + comprobaciones + captura de paquetes. Por debajo usa Docker Engine con crun, Sysbox y Firecracker. Ningún lab corre con `--privileged` ni sale a Internet ([labd/LEEME.md](labd/LEEME.md#aislamiento-de-los-labs)). Las cuentas van aparte, en un Worker de Cloudflare con D1 ([cuentas/](cuentas/LEEME.md)). Publicado en https://relavops.org ([instalador/LEEME-vps.md](instalador/LEEME-vps.md)).

## Usarlo

**Windows 11** (crea una distro WSL2 propia llamada `relavops`):

```
powershell -ExecutionPolicy Bypass -File instalador\install.ps1 -Abrir
```

**Linux:** `sudo bash instalador/install.sh` · **Mac:** `limactl start --name relavops instalador/lima-relavops.yaml` (sin probar).

Luego abre http://localhost:8080.

## Desarrollar (Windows + WSL)

```
bash dev.sh              # compila web + labd y lo relanza en la distro relavops (web y labs desde disco)
bash dev.sh --imagenes   # además reconstruye las imágenes de los labs
cd web && npx playwright test   # batería M1 en xterm.js y ghostty-web (usa Edge del sistema)
```

## Repetir las mediciones

- **M1:** `cd web && npx playwright test` → `web/public/resultados/m1-*.json`
- **M2 (captura grabada):** `cd web && node scripts/grabar-captura.mjs`
- **M4:** `voces/preparar.sh`, `voces/instalar-modelos.sh` y `voces/generar.sh` (en WSL o Linux, con GPU NVIDIA)
- **M5:** `sudo bash densidad/medir.sh web/public/densidad/resultados.json`
- **M6:** `instalador\install.ps1 -Nombre relavops-prueba` en una distro nueva

## Limpiar

- Labs que hayan quedado vivos: los borra `labd` al arrancar.
- Todo: `wsl --unregister relavops`. Esto borra la distro, los modelos de voz (unos 16 GB) y las imágenes.
