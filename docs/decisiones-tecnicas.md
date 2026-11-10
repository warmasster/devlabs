# Decisiones técnicas del muestrario

2 nov 2026 · lo que se eligió, por qué y con qué números. Todo lo medido está en el muestrario (M1–M6) y se puede repetir.

## En 30 segundos

- **Terminal:** xterm.js 6 con WebGL. Pasa la batería entera (13/13) con 1,2 ms de tecla→eco. ghostty-web 0.4 llega a 12/13, pero solo con cuatro parches nuestros; se revisa cuando salga libghostty estable.
- **Motores:** Docker Engine + **crun**, **Sysbox** para contenedores de sistema, **Containerlab** para topologías y **Firecracker** para microVMs. Los cuatro funcionan en esta máquina con Windows 11, dentro de WSL2.
- **"VM de Docker" más rápida:** en Linux, ninguna (nativo). En Windows, una **distro WSL2 propia con Docker Engine nativo**, no Docker Desktop. En Mac, **Lima con vz + virtiofs** (OrbStack es más rápido pero no es libre).
- **Pasarela y orquestador:** un solo binario Go (`labd`, 9 MB, unos 12 MB de RAM) que habla con la API de Docker por su socket, sin SDK.
- **Comprobaciones:** 9–17 ms cada una. El llega en cuanto el comando termina.

## Criterios del muestrario: resultado

| Pieza | Criterio | Resultado medido | |
| --- | --- | --- | --- |
| M1 Terminal | Pasa la batería y no se nota retardo | xterm.js 13/13 (incluidos scroll del historial, recargar la página y copiar/pegar con clic derecho), tecla→eco 1,2 ms. ghostty-web 12/13 (falla pasar de vim a nano). | con xterm.js |
| M2 Lección | Animación a partir de paquetes reales; menos de 1 MB sin voz | Los 8 paquetes reales del ping (ARP, ICMP, TTL 64→63), con 3 predicciones intercaladas. Pesa **163 KB** comprimida, terminal incluida. | |
| M3 Lab con boss | Cada paso se valida en menos de 1 s; arranca en menos de 3 s | entre 13 y 172 ms tras acabar el comando; cada comprobación tarda 8–16 ms. Lab asignado en 50 ms desde el pool y en 0,8–1,0 s en frío. OSPF converge en unos 4 s (es tiempo del protocolo, no de la validación). Los 4 bosses se reconocen al arreglarlos: en 0,8 s, o en 7,5 s cuando OSPF tiene que rehacer la adyacencia. | |
| M4 Voces | Eliges a ciegas; sin "reseteo"; texto sincronizado | 11 muestras de 4 modelos, con resaltado palabra a palabra (Whisper + alineación con el texto). Falta tu elección. | tu turno |
| M5 Densidad | Números reales para requisitos y precio | Medidos los 4 motores, más la hibernación de microVM (tablas abajo). | |
| M6 Self-host | De cero a primer lab en menos de 10 min | **2 min 51 s** en Windows 11 con una distro WSL nueva. Ubuntu ya estaba en la caché de WSL: en un equipo que nunca lo haya bajado, súmale esa descarga (unos 350 MB). | (Linux/Windows; Mac sin probar) |

## El stack, capa por capa

| Capa | Elegido | Descartado o plan B | Por qué (medido aquí) |
| --- | --- | --- | --- |
| Terminal en el navegador | **xterm.js 6** + WebGL + Unicode 11 | ghostty-web 0.4 | xterm.js: 13/13 pruebas, tecla→eco p50 1,2 ms. ghostty-web: unos 4 ms y 11/12 con parches (ver abajo). Peso: 87 KB frente a 187 KB comprimidos. |
| Persistencia de la sesión | **PTY reconectable en labd**: la shell vive mientras dura la sesión y labd guarda su último MB de salida; al reconectar se reenvía | tmux invisible en medio (primer intento, descartado) | tmux redibujaba la pantalla y las líneas nunca llegaban al historial del navegador: sin scroll (lo detectó Fernando). Sin tmux, el historial (20.000 líneas en xterm.js), la rueda (3 líneas por muesca), la selección y el ratón son los nativos. Al repintar el historial se descartan las respuestas automáticas del terminal a preguntas antiguas de vim o htop; si no, llegaban a la shell como basura (`rgb:0b0b/…`). |
| Transporte | WebSocket binario sin compresión | — | 0,7–0,8 ms de ida y vuelta en local. Pegar 3000 líneas (170 KB) llega con md5 idéntico. |
| Pasarela + orquestador | **Go, API de Docker en crudo** (exec con PTY por *hijack*) | SDK de Docker, node-pty | Un binario de 9 MB sin dependencias pesadas. El SDK de Docker cambió de módulo en 2025 y arrastra mucho. |
| Runtime OCI | **crun 1.30** (binario oficial) | runc | El crun de Ubuntu 24.04 (1.14) es demasiado viejo para Docker 29 y falla con "unknown version specified". Con `docker run` la diferencia de arranque es pequeña (≈0,3 s ambos): crun gana en memoria y en `exec`. |
| Contenedor de sistema | **Sysbox 0.7.1** | **Incus** (plan B) | systemd listo en 2,4 s; Docker dentro sin `--privileged`; root del lab = UID 100000 en el host. Riesgo: desde que Docker compró Nestybox (2022), el mantenimiento es "best effort". Incus (contenedores de sistema + VMs, muy activo) es la salida si Sysbox se estanca. |
| Topologías de red | **Containerlab 0.82** | — | M3 (2 routers FRR + 2 hosts) despliega en 0,9–1,0 s en frío. Un router FRR ocupa unos 24 MiB. Ojo: lanza los nodos como `--privileged` (ver incoherencias). |
| MicroVM | **Firecracker 1.17** | Cloud Hypervisor, QEMU microvm | Dentro de WSL2 (virtualización anidada): Ubuntu con systemd arranca en 1,3 s y ocupa 113 MB. Snapshot en 245 ms y **restauración en 11 ms** (20 MB al despertar, porque carga la memoria según la usa). Cloud Hypervisor sería el plan B si hace falta virtiofs o hotplug. |
| Disco por alumno (microVM) | **Snapshot de device-mapper** sobre una imagen base de solo lectura | copiar la imagen de 1 GB | Cada VM arrancada ocupa **1 MB** propio. Es lo mismo que la capa superior de OverlayFS, pero a nivel de bloque. |
| Comprobaciones | `exec` por la API, lanzadas al pulsar Enter **y** cuando la salida se calla 120 ms | sondeo cada pocos segundos | 9–17 ms por comprobación. Con un comando largo (`ping -c2`) el llega al acabar, no 2 s después. |
| Eventos en vivo | **En el propio labd** (WebSocket) | NATS | En self-host todo está en un binario. NATS solo tiene sentido cuando el cloud reparta labs entre varios hosts. |
| Captura para diagramas | `tcpdump -Q out` en cada interfaz → eventos | — | Cada salto se ve una vez. Como cada tcpdump es un flujo aparte, se ordena por la marca de tiempo del kernel. |
| Web del muestrario | Vite + TypeScript sin framework, gzip en labd | — | M2 completa (lección + terminal) pesa 163 KB comprimida. El producto puede seguir con SvelteKit; aquí no hacía falta. |
| Voz | Generada al publicar con GPU, Opus 24 kbit/s | TTS en vivo | 30–50 s de audio caben en 98–176 KB. La elección es tuya en M4 (abajo, los datos). |

### ghostty-web 0.4: lo que encontramos

1. `attachCustomKeyEventHandler` funciona **al revés** que en xterm.js (`true` = "ya lo gestiono yo"). Con la misma función, la terminal se tragaba todas las teclas.
2. **Pierde la tecla Alt**: Alt+B llega como `b`, así que Alt+B y Alt+F de readline no funcionan. Parche: mandamos `ESC`+tecla nosotros.
3. **Cancela todos los `beforeinput`**: no llega el texto que entra sin tecla física (panel de emojis, dictado, teclado en pantalla, algunos IME). Parche: lo recogemos nosotros.
4. El clic de ratón dentro de htop no llega: queda como fallo abierto.
5. `viewportY` se cuenta desde abajo, no desde arriba.
6. La opción `scrollback` se la pasa a Ghostty, que la cuenta **en bytes**: con 10.000 solo guardaba unas 750 líneas. Hay que darle bytes (10 MB).
7. `write('', callback)` no llama al callback.

Con los parches 1–3 y 6 pasa 12/13. Además, ghostty-web no quita la selección al copiar ni al escribir; lo hacemos nosotros para que el clic derecho pegue. Es prometedor (el parser de Ghostty es mejor con escrituras complejas), pero hoy es más frágil que xterm.js.

## Densidad medida (M5)

En esta máquina (i5-14400F, 16 GB para la VM de WSL2). Se arrancan N labs de cada motor a la vez y se mide la RAM que el host deja de tener disponible, **con el lab en reposo y la sesión abierta**. Un alumno ejecutando cosas gasta más: estos números son el suelo, no el techo.

| Motor | RAM por lab | Arranque en frío | Disco propio | Caben en 8 GB | Caben en 16 GB |
| --- | --- | --- | --- | --- | --- |
| Contenedor simple (crun) | 9,7 MB | 180 ms | ~0 (solo lo que escribe) | 583 | 1300 |
| Contenedor de sistema (Sysbox, systemd + Docker) | 40,8 MB | 1,7 s | 276 KB | 138 | 309 |
| Topología M3 (4 nodos, 2 FRR) | 54,2 MB | 0,66 s | ~160 KB | 104 | 232 |
| MicroVM (Firecracker, 256 MiB, Ubuntu + systemd) | 113 MB | 1,3 s | 1 MB | 50 | 111 |

"Caben" = (RAM − 1,5 GB) × 85 % / RAM por lab. **Requisitos mínimos propuestos para el self-host personal:** 8 GB de RAM (cualquier nivel cabe de sobra para un alumno) y 20 GB de disco (imágenes base, unos 2 GB). La página M5 tiene una calculadora de coste por alumno para el cloud.

## Voces medidas (M4)

Mismo párrafo, dos versiones (texto tal cual y guion hablado), sintetizado por párrafo entero en una RTX 4060. Inteligibilidad = cuánto del texto recupera Whisper medium al transcribir (es orientativa: penaliza las siglas y las IP leídas de otra forma).

| Modelo | Velocidad de síntesis | Inteligibilidad (tal cual / guion) | Nota |
| --- | --- | --- | --- |
| Kokoro-82M | 35–43× tiempo real (frase a frase: 4×) | 85 % / 79 % | El más rápido con diferencia. |
| Chatterbox V3 afinado **es-ES** | ~1× | **90 %** / 77 % | El afinado para español de España mejora mucho al genérico. Marca de agua inaudible. |
| Chatterbox V3 genérico | ~1× | 77 % / 67 % | — |
| Qwen3-TTS 1.7B VoiceDesign | 0,4× (sin flash-attn) | 82 % / 76 % | Voz diseñada por descripción; el más lento, pero da igual al generarse al publicar. |
| Pocket TTS (`spanish_24l`, voz lola) | ~1× **en CPU** | 69 % / 79 % | Sin GPU: es el respaldo para el self-host y el texto no pregenerado. |

La decisión es tuya: elige a ciegas en M4 y luego pulsa "Revelar".

## La "VM de Docker" más rápida en cada sistema

| Sistema | Elegido | Por qué | Alternativas |
| --- | --- | --- | --- |
| Linux | **Nativo**, sin VM | Única opción con todo directo: Sysbox, Containerlab y KVM. | — |
| Windows 11 | **Distro WSL2 propia ("relavops") con Docker Engine nativo** | Medido aquí: kernel 6.18, systemd, cgroups v2 y **`/dev/kvm` con virtualización anidada**, así que corren hasta las microVMs Firecracker. No toca las distros del usuario y se borra con `wsl --unregister relavops`. | **Docker Desktop**: su VM no admite instalar Sysbox ni da KVM, y pesa más en reposo. Hyper-V a mano: más lento de montar y sin ventaja. |
| Windows 10 | Igual, pero **sin microVMs** | Windows 10 no expone la virtualización anidada en WSL2, así que esos módulos quedan "solo cloud". | — |
| Mac (Apple Silicon) | **Lima con `vmType: vz` + virtiofs** | Libre, se puede programar y usa el hipervisor nativo de Apple. Virtualización anidada solo en M3 o posterior con macOS 15+. | **OrbStack**: el más rápido en las comparativas, pero es propietario y de pago para uso comercial. Colima es Lima con otra interfaz. Docker Desktop: el más pesado. **Sin probar todavía en Mac.** |
| Cloud gestionado | **Servidores bare-metal** | KVM sin anidar y más RAM por euro que las instancias de cloud público. | — |

## Incoherencias del plan y del temario, resueltas

| # | Incoherencia | Decisión |
| --- | --- | --- |
| 1 | "Cocoro" aparece como modelo desconocido, pero Kokoro ya estaba en la tabla. | **Es Kokoro.** Decisión cerrada; Kokoro entra en M4 como referencia. |
| 2 | Sysbox y Containerlab solo van en Linux, pero el self-host promete un comando y menos de 10 min en cualquier portátil. | **Windows:** `install.ps1` crea su propia distro WSL2 (medido en M6: ver abajo). **Mac:** plantilla de Lima. El mismo `install.sh` corre en los tres sitios. |
| 3 | "Firecracker necesita KVM: servidor físico o virtualización anidada" daba a entender que en un portátil no se puede. | **Windows 11 sí puede**: WSL2 expone `/dev/kvm` anidado (comprobado). Mac M3+ con macOS 15 también. Solo Windows 10 y Macs anteriores quedan en "solo cloud". |
| 4 | El módulo **1.6** (LVM y RAID con dispositivos loop) está en "contenedor de sistema", pero dentro de Sysbox no hay dispositivos loop (comprobado), y device-mapper y md no están aislados por namespaces: tocarlos es tocar el kernel del host. | **1.6 pasa a microVM**, igual que **1.10** (auditd no está aislado por namespaces) y el side-quest de arranque (GRUB, initramfs). |
| 5 | El módulo **6.12** (Cilium con eBPF) va en contenedores de sistema, pero eBPF carga programas en el kernel del host, y el plan dice "todo lo que toca el kernel, en microVM". | Los nodos del clúster de **6.12 van en microVM**. El resto del nivel 6 sigue en contenedores de sistema con flannel. |
| 6 | **Containerlab lanza todos los nodos `--privileged`** (comprobado), y el plan dice "nunca `--privileged`". | Self-host personal: aceptable (es tu máquina). **Cloud:** la topología de cada alumno corre **dentro de su propio contenedor Sysbox** (Containerlab dentro) o de una microVM, así el "privileged" queda encerrado en su espacio de usuarios. |
| 7 | M6 dice "`curl … \| sh` o `docker compose up`". | **Solo script.** Sysbox, Containerlab y KVM se instalan en el host, y eso no lo puede hacer un compose. |
| 8 | NATS en el stack para self-host. | **Fuera del self-host**: los eventos van por el propio labd. NATS solo cuando el cloud tenga varios hosts de labs. |
| 9 | Hibernar contenedores con CRIU. | CRIU con Docker es experimental y frágil. **Contenedores:** congelar (cgroup freezer) y, tras más inactividad, parar el lab y guardar solo su capa superior (se conservan los ficheros, no los procesos). **MicroVMs:** snapshot de Firecracker (256 MB de memoria, 30 MB con zstd, vuelve en 11 ms). |
| 10 | "Cada paso se valida en menos de 1 s", pero OSPF con temporizadores por defecto tarda hasta 40 s en converger (la elección de DR espera el *dead interval*). | Los labs ajustan los protocolos para que respondan al momento: en M3, enlace punto a punto y hellos de 1 s, y converge en 1–2 s. Es una regla de diseño de labs, no un parche. |
| 11 | "El lab arranca en menos de 3 s **desde un pool en caliente**": con pool es trivial (0–16 ms). | El criterio se endurece: **menos de 3 s también en frío**. M3 en frío: 0,9–1,0 s. |
| 12 | "Validar en menos de 1 s" con comandos que tardan más que eso (`ping -c2` tarda 1 s). | Se mide **desde que el comando termina**: el se lanza cuando la salida se calla 120 ms. |
| 13 | La imagen slim de Debian quita las páginas `man`, y el nivel 0 enseña `man`. | La imagen base reinstala los paquetes con sus páginas de manual: pasa de 357 a 476 MB, pero es una capa que se comparte entre todos los alumnos. |
| 14 | tmux para la persistencia frente a tmux como contenido del temario, y además rompía el scroll del historial. | **La plataforma ya no usa tmux**: la persistencia la da labd con un PTY reconectable. El tmux del alumno es solo contenido del temario. |
| 15 | Fase 1 (niveles 0–2, self-host personal) incluye el 1.6, que ahora es microVM. | En Linux y Windows 11 no cambia nada. En Mac antiguo y Windows 10, el 1.6 queda en "solo cloud" o con una variante en contenedor sin RAID real. |
| 16 | Kokoro "resetea" en cada punto. | Se debe a sintetizar frase a frase (es la muestra "Kokoro · frase a frase" de M4). Ahora todos los modelos sintetizan por párrafo. |

## Cambios que propongo al temario

- 1.6 Discos y almacenamiento → motor **microVM**.
- 1.10 Hardening (auditd) → **microVM** para la parte de auditd.
- Side-quest de arranque de Linux → **microVM**.
- 6.12 Red en K8s y service mesh → nodos en **microVM**.
- Tabla de motores: añadir "Containerlab dentro de Sysbox (cloud)".

## Exámenes finales: juegos en contenedores reales (pruebas de concepto)

Cada sección acaba con un juego en vez de un test. Todo es real: el lag es `tc netem`, el atacante es un `ssh` de verdad, el disco se llena de verdad. Se juegan en `/juegos.html`.

| Juego | Sección | Mecánica | Qué es real |
| --- | --- | --- | --- |
| La persecución | Nivel 2 · Redes | Un boss te persigue por un mapa de 7 servidores. Huyes saltando con `ssh`. Donde pisa mete lag/jitter, te corta la sesión si te pilla, algunos servidores te borran una IP al entrar y los cofres dan comandos nuevos (`escudo`, `radar`) o niebla. | Tu posición sale de tus conexiones ssh reales (`ss`). El lag es `tc netem` en las interfaces. La captura mata tu `sshd`. La IP se borra con `ip addr del`. |
| Disco en llamas | Nivel 0 · Linux | 3 olas de un proceso que llena `/var/log`, cada vez más escondido: renombrado, carpeta oculta, fichero borrado pero abierto. | Un tmpfs de 256 MB que se llena de verdad. Procesos reales con `exec -a`. |
| Asedio | Nivel 1 · Administración | Fuerza bruta contra `sshd`, llave trasera en `authorized_keys` y cambio de IP si le bloqueas. | `sshpass` + `ssh` reales desde otro contenedor. Bloquear con `iptables` funciona de verdad. |
| DNS envenenado | Nivel 2 · DNS | Envenenan `/etc/hosts`, `resolv.conf` y el registro de dnsmasq. | dnsmasq y `curl` reales. Las ventas son peticiones reales. |
| Balanceador bajo fuego | Nivel 3 · Proxies | Nginx con 3 backends: apagan uno, meten 1,5 s de latencia en otro, borran la página de otro y tumban nginx. | El SLO se mide con `curl` reales cada segundo. |
| Contenedores rebeldes | Nivel 4 · Contenedores | Minero de CPU, tragón de RAM y zombi con `restart: always`, dentro de Docker. | Docker dentro de Sysbox. La temperatura sale de `docker stats`. |
| Quórum | Nivel 7 · Distribuidos | 3 etcd; el boss parte la red con `iptables` y mata miembros. Sin mayoría no hay escrituras. | etcd real con Raft. Cada segundo se intenta escribir de verdad. |

**Cómo está hecho:** un motor común en la web (mapa dibujado a mano, HUD de vida, puntos, buffs/debuffs, narrador y terminal xterm.js) y un "director de juego" por juego. Cada segundo, el director mira el estado real del lab y actúa a través de `POST /api/sesion/{id}/exec` en labd, que solo existe para los labs marcados como `juego`. Las topologías las genera `juegos/generar.py`. Las 7 arrancan y funcionan (prueba automática en `web/tests/juegos.spec.ts`).

**Límites de la prueba de concepto:**
- **El director corre en el navegador**, así que un alumno listo podría hacer trampa llamando a la API. En el producto, el director vive en labd y el navegador solo recibe eventos.
- Las olas y los ataques son pocos y fijos. El siguiente paso es generarlos al azar por dificultad.
- **Boss "Contenedores rebeldes":** la red del contenedor de sistema está en modo `bridge`, porque descarga `alpine`. En el cloud iría por la caché de registry.

## Voz

Elegida por ti: **Kokoro**, generada por párrafo (no frase a frase). Se integrará más adelante; las demás muestras de M4 quedan como referencia.

## Lo que queda abierto

- Licencia de la plataforma y del contenido.
- Probar el instalador de Mac (Lima) en un Mac real.
- ghostty-web: volver a probarlo cuando salga libghostty estable.
- El clic de ratón dentro de htop con ghostty-web.
