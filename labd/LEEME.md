# labd/

Un solo binario en Go que lo hace todo en la máquina del alumno. Sirve la web, mantiene labs en caliente, abre terminales por WebSocket y comprueba lo que pasa dentro de cada lab. Habla con Docker por su socket, sin SDK.

| Fichero | Qué hace |
| --- | --- |
| `main.go` | Arranque, rutas HTTP y API. |
| `labs.go` | Lee los `lab.yaml`. Aquí están los tipos (`LabSpec`, `NodoSpec`, `Sonda`, `RedSpec`…). |
| `pool.go` | Crea y destruye instancias. Contenedores, red propia por instancia y topologías de red (un par veth por enlace). Pone los límites de cada nodo y mantiene el pool en caliente. |
| `disco.go` | Vigila el disco que ocupa cada lab y cierra el que se pasa. |
| `session.go` | La sesión de un alumno. Rondas de comprobaciones y sondas, boss y pistas. |
| `vigia.go`, `vigia.sh` | El vigía de cada nodo, que ejecuta las rondas dentro del lab sin un `docker exec` por script. |
| `term.go`, `pty.go` | Terminales. Un PTY de verdad por nodo que sobrevive a cerrar la pestaña. Aquí se detecta el aviso del prompt. |
| `cuentas.go` | Con `-cuentas`, pide entrar. Comprueba el pase que firma el Worker de cuentas y le pasa sus rutas. |
| `latido.go` | Con `-cuentas` y el secreto del nodo, cuenta cada 10 s al panel de admin cómo está el servidor y hace sus órdenes. |
| `metricas.go` | CPU, RAM, disco y carga del servidor (de /proc) y lo que gasta cada sesión (de su cgroup). |
| `capture.go` | Captura de paquetes con tcpdump para el muestrario M2. |
| `docker.go` | Cliente mínimo de la API de Docker (exec, attach, resize). |

## API

| Método y ruta | Hace |
| --- | --- |
| `GET /api/labs` | Lista los labs. |
| `POST /api/labs/{id}/sesion` | Da un lab al alumno. Devuelve la sesión con nodos, misión, progreso y el último valor de cada sonda. |
| `GET /api/sesion/{sid}` | Estado de una sesión. |
| `DELETE /api/sesion/{sid}` | La cierra y devuelve el lab. |
| `POST /api/sesion/{sid}/boss?fallo=` | Rompe el lab con un fallo al azar, o con el pedido. |
| `POST /api/sesion/{sid}/pista` | Siguiente pista del boss. Resta XP. |
| `POST /api/sesion/{sid}/accion/{nombre}` | Ejecuta una acción del `lab.yaml` y lanza una ronda de sondas. |
| `GET /ws/term?s=&n=&c=&r=` | La terminal de un nodo (`n`), con sus columnas y filas. |
| `GET /ws/eventos?s=` | Eventos de la sesión. `estado` al conectar, y luego `paso`, `sonda`, `boss` y `paquete`. |

## Rondas

Una **ronda** ejecuta las sondas, las comprobaciones de los pasos que faltan y las del boss si está activo. Un paso que pasa se anuncia una sola vez. Una sonda solo se anuncia si su salida cambia.

| Cuándo hay ronda | Qué lleva | Retraso |
| --- | --- | --- |
| Vuelve el prompt (aviso de la shell) | todo | ninguno |
| Enter en una terminal | todo | 150 ms, y se anula si antes llega el aviso del prompt |
| Reloj, cada 1 s con sondas y cada 2 s sin ellas | las sondas, y además los pasos y el boss si hace 3 s o más de la última ronda completa | ninguno |
| Al conectar los eventos y tras una acción | todo | 150 ms |

El reloj solo corre mientras alguien tiene la lección abierta. Los pasos van más espaciados en el reloj porque solo cambian cuando el alumno hace algo, y eso ya dispara su propia ronda.

### El aviso del prompt

labd abre cada shell con `PROMPT_COMMAND=printf '\033]6973;\007'`. Es una secuencia OSC que xterm.js ignora. Cuando labd la ve pasar por el PTY, el comando acaba de terminar y lanza una ronda en el acto.

Si una shell nunca la manda (el alumno cambió `PROMPT_COMMAND`, o entró con `su -`), se hace lo de antes, que es esperar 120 ms de silencio tras el Enter. Los labs que ponen su propio `PROMPT_COMMAND` deben acabarlo con ese mismo `printf` (ver labs/LEEME.md).

### El vigía

Cada `docker exec` cuesta unos 30 ms de CPU del servidor, entre dockerd, containerd y runc. Con uno por sonda y por paso cada segundo, un alumno con una lección abierta gastaba un tercio de núcleo.

Por eso labd deja en cada nodo un **vigía**, `sh /usr/lib/relavops/vigia` (en `/tmp` si no puede escribir ahí). Es un `docker exec` que no termina. labd le manda una vez el texto de cada script y, en cada ronda, la lista de los que tocan. El vigía los ejecuta uno detrás de otro en subshells y devuelve la salida y el código de cada uno. El protocolo está explicado al principio de `vigia.sh`.

- Corre dentro del contenedor, con sus límites de CPU y memoria y sus permisos. No se usa `nsenter` desde fuera porque el script correría con todos los permisos del servidor, y el alumno, que es root en su lab, podría cambiar los programas que ejecuta.
- Si una ronda tarda más de 4 s o el vigía muere (el alumno lo mata, por ejemplo), esa ronda se hace con un `docker exec` por script y la siguiente abre otro vigía. Si uno recién abierto falla, se deja de intentar 30 s. Si muere tres veces en un minuto, se deja de abrir durante un minuto, y mientras tanto las rondas con `docker exec` van como mucho cada 2 s. Así matarlo en bucle no gasta CPU del servidor.
- El alumno lo ve en `ps aux`. La lección 0.1 lo explica y las sondas de procesos lo filtran.

Medido en la lección 0.3 (6 sondas y 21 pasos) con la lección abierta y sin teclear nada.

| Cómo | CPU del servidor |
| --- | --- |
| Un `docker exec` por script, todo cada segundo | 300 ms por segundo |
| Vigía, todo cada segundo | 66 ms por segundo |
| Vigía, pasos cada 3 s en las rondas del reloj | 30 ms por segundo |

Con un comando rápido, el ✓ llega unos 25 ms después del Enter.

## Aislamiento de los labs

Quien abre un lab es root dentro. Eso no le deja tocar el servidor ni los labs de otros.

- **Sin --privileged.** Los contenedores llevan las capacidades de Docker por defecto. Los nodos de las topologías tienen además `NET_ADMIN`, que solo sirve dentro de su propio espacio de red. Antes las topologías las montaba containerlab, que arranca todo con `--privileged`, y desde un nodo se podía montar el disco del servidor. Ahora labd crea cada nodo sin red y une cada enlace con un par veth (`pool.go`).
- **Sin Internet ni servidor.** Ningún nodo va en una red de Docker. Los de un lab con `red` se enchufan con un cable veth a un switch propio de su instancia, en un espacio de red aparte y sin IP. No llegan a Internet ni al servidor, y dos alumnos con el mismo lab (y la misma subred) no se ven. Antes era una red de Docker `--internal`: solo cabía un alumno a la vez por lab con red, y desde el lab se llegaba al servidor por la IP del bridge. labd no acepta `red: bridge` ni `host`.
- **Con topes.** Cada nodo lleva memoria sin swap (256 MB si el lab.yaml no dice otra cosa), CPU, 512 procesos, ficheros de 2 GB como mucho y sin logs en el disco del servidor. Todos los labs juntos van en `relavops-labs.slice`, con su tope de RAM y CPU. El disco lo vigila `disco.go`.
- **Sysbox** (el juego de contenedores) mete además al nodo en su propio espacio de usuarios. Root dentro es un usuario sin permisos fuera.
- Un lab no ve a los demás. Cada instancia tiene su red, y los nodos sin red solo tienen `lo`.

`pruebas/aislamiento.mjs` lo comprueba en cada tipo de lab.

## Cuentas

Con `-cuentas URL-DEL-WORKER`, todo pide entrar salvo `/entrar` y sus ficheros. Las cuentas no viven aquí. Las lleva el Worker de Cloudflare de [cuentas/](../cuentas/LEEME.md), que al entrar deja la galleta `rv_t` con un **pase** firmado con Ed25519 (id, nombre, rol y caducidad de una hora).

- labd pide la clave pública a `/api/cuenta/clave-publica` al arrancar (reintenta cada 5 s) y luego cada hora. Con ella comprueba la firma en cada petición, sin base de datos ni llamadas fuera.
- Sin pase, la API y las terminales dan 401. Las páginas mandan a `/entrar`, o a `/api/cuenta/renovar` si hay sesión (`rv_s`) y solo ha caducado el pase.
- La raíz `/` es la portada pública (`inicio.html`), con cuenta o sin ella.
- Las direcciones van sin `.html`. `/curso` sirve `curso.html`, y `/curso.html` redirige a `/curso` (301), así los enlaces viejos siguen valiendo.
- `/admin` es solo para admins y `/profe` para profes y admins. Los datos de esas páginas los protege además el Worker.
- Cada sesión de lab es de su cuenta. Otra cuenta no puede verla ni abrir sus terminales, aunque sepa el id. El admin sí.
- El límite por persona y el de sesiones nuevas por minuto van por cuenta, no por IP.
- Si el admin cambia el rol de alguien, el Worker deja la orden `renovar` en el latido. labd deja de aceptar los pases de esa persona dados antes del cambio (el pase lleva `iat`, cuándo se dio), y su página pide otro al Worker con su sesión, ya con el rol nuevo.
- Las rutas del Worker (`/api/cuenta/`, `/api/clases`, `/api/admin/`, `/api/nodos/`) labd se las pasa al Worker de `-cuentas`, con la IP del alumno en `X-Relavops-Ip` y el secreto del nodo para que el Worker se fíe. Con el DNS en la nube naranja de Cloudflare, esas rutas las coge el Worker antes y no llegan aquí. Si una vuelve a entrar ya pasada, labd corta con 508 para no dar vueltas.

Sin `-cuentas` no se pide nada, como en local y en las pruebas.

## Latido

Con `-cuentas` y la variable `RELAVOPS_NODO_SECRETO`, labd manda cada 10 s a `/api/nodos/latido` una foto del servidor. Lleva CPU, RAM, disco, carga, los labs en caliente, los límites y cada sesión abierta con su usuario, su lab, sus pasos y lo que gasta. También las sesiones cerradas desde el latido anterior, con su CPU total, su pico de RAM y por qué se cerraron. De ahí salen las métricas del panel de admin.

- El nombre del servidor es `-nodo` (por defecto, el de la máquina). Con varios servidores, cada uno el suyo.
- Lo que gasta cada sesión se lee de los ficheros `cpu.stat` y `memory.current` del cgroup de cada contenedor. Cuesta microsegundos. Se cuenta desde que la sesión es del alumno, no lo que gastó calentándose en el pool.
- La respuesta trae las órdenes del panel. `cerrar` cierra una sesión (la lección enseña que la ha cerrado el admin). `expulsar` cierra las de un usuario y rechaza su pase hasta que caduque.
- Si el Worker no responde, las sesiones cerradas esperan al siguiente latido (hasta 2000).

## Límites de sesiones

Por defecto no hay ninguno, salvo cerrar las abandonadas a los 20 minutos. Así no molestan en local ni en las pruebas. En el VPS se activan con opciones de labd.

| Opción | En el VPS | Qué hace |
| --- | --- | --- |
| `-max-sesiones` | 30 | Sesiones abiertas a la vez en todo el servidor. Con el tope, abrir otra da 503 y la lección dice que están todas ocupadas. |
| `-max-por-persona` | 3 | Por cuenta (sin cuentas, por IP). Al abrir una más se cierra la más antigua de esa persona. |
| `-dura-sesion` | 2h | Vida máxima. 5 minutos antes la lección avisa, y al llegar la cierra. |
| `-max-nuevas-min` | 8 | Sesiones nuevas por persona y minuto. Reutilizar la suya no cuenta. Al pasarse da 429 y la lección pide esperar un minuto. Frena a quien entra y sale sin parar. |
| `-abandono` | 10m | Sin pestañas ni terminales conectadas durante ese tiempo, se cierra. |
| `-cgroup-labs` | relavops-labs.slice | Mete todos los labs en un mismo cgroup. vps.sh le pone tope de RAM y CPU, para que a labd, Caddy y Docker les quede siempre algo. |
| `-tope-fichero` | 2G | Tamaño máximo de un fichero dentro de un lab (`ulimit -f`). Uno más grande falla al momento. |
| `-disco-lab` | 2G | Disco que puede ocupar un lab abierto. Se mide cada 30 s y el que se pasa se cierra (motivo `disco`). |
| `-disco-libre` | 3G | Si el disco de Docker baja de esto (se mira cada 2 s), se cierra en el acto el lab que más ocupa. |

Al cerrar una sesión, labd manda el evento `cerrada` con el motivo (`otra`, `tiempo`, `abandono`, `admin`, `expulsado` o `disco`). Si la página pierde la conexión y labd dice que la sesión ya no existe, la propia página se pone el motivo `perdida` y deja de reconectar. La lección tapa la terminal y ofrece abrir una máquina nueva (`web/src/curso/nucleo/panel-lab.ts`). La persona es su cuenta. Sin `-cuentas`, se reconoce por su IP, que labd lee de `X-Forwarded-For` solo cuando la conexión llega desde la propia máquina (Caddy). Coge la última IP de la lista, que es la que pone Caddy. Las de antes y `Cf-Connecting-Ip` las puede escribir cualquiera, así que no se usan.

## En un VPS

`bash instalador/vps.sh` como root, desde la copia subida (`dist/labd`, `instalador/` e `imagenes/`). Instala todo, deja labd en 127.0.0.1:8080 con `-cuentas` (el Worker en workers.dev), el latido y los límites de la tabla de arriba, y pone Caddy delante con HTTPS. Con cuentas, la raíz es la portada y `-inicio` no se usa. Los pasos, en [instalador/LEEME-vps.md](../instalador/LEEME-vps.md). Se publica en https://relavops.org.

## Compilar

`powershell -File build.ps1` desde la raíz compila la web y labd para Linux en `dist/labd`, con la fecha como versión. `bash dev-m6.sh` además lo lanza en la distro de WSL leyendo web y labs desde disco. Con `CUENTAS=http://IP:8787 bash dev-m6.sh`, contra el Worker de cuentas en local.
