# labs/

Un lab por carpeta. Cada carpeta tiene un `lab.yaml` y, si es una topología, los ficheros que esta necesite. `labd` los lee todos al arrancar. Si cambias un `lab.yaml`, reinicia `labd`.

Para ver cómo se usa un lab desde una lección, mira [../web/src/curso/lecciones/LEEME.md](../web/src/curso/lecciones/LEEME.md).

## Tipos de lab

| Prefijo | Para qué | Ejemplo |
| --- | --- | --- |
| `n0-Xa-…`, `n0-Xb-…` | **Lab de lección.** Va pegado a la lección X. Tiene sondas para los widgets y una misión que hace de puertas entre pasos. Sin boss. | `n0-1b-red` |
| `n0-X-…` | **Lab de práctica.** Se usa al final de la lección X, con su misión y su boss. | `n0-1-maquina` |
| `n0-0-tutorial` | Lección y práctica a la vez, con un boss facilito. | |
| `m1-…`, `m2-…`, `m3-…` | Del muestrario. | |
| `j-…` | Juegos de examen final. Los genera `juegos/generar.py`. | |

## Formato de `lab.yaml`

```yaml
id: n0-1b-red                 # igual que la carpeta
titulo: Tres máquinas en red  # lo ve el alumno arriba del panel
motor: contenedor             # contenedor | sistema (Sysbox) | topologia (nodos unidos por cables veth)
pool: 1                       # cuántos se tienen arrancados de antemano
red: { subred: 10.0.0.0/24 }  # opcional. Red propia y aislada para esta instancia
nodos:
  - nombre: web               # nombre de la máquina y de su terminal
    rol: servidor web         # se ve en su tarjeta
    ip: 10.0.0.20             # opcional, con red propia
    imagen: relavops/base:1
    memoria: 192m               # sin swap. Si no se pone, 256m
    cpus: 0.5                   # si no se pone, 1
    caps: [NET_ADMIN]         # opcional, para que pueda cambiar sus IPs
    tmpfs: { /datos: 64m }    # opcional, un disco pequeño que se llena de verdad
preparar:                     # se ejecuta al crear el lab, como root, con sh -c
  - { nodo: web, script: "…" }
sondas:                       # ver abajo
  - { id: puertos@web, nodo: web, script: "…" }
acciones:                     # botones que la lección puede pulsar (widget boton-lab)
  tragon: [{ nodo: servidor, script: "…" }]
mision:                       # pasos que labd comprueba solos
  - id: puerto
    titulo: Abrir el 8080 en web
    texto: "`nc -lk 8080`"
    xp: 15
    check: { nodo: web, script: "ss -tlnH | grep -q ':8080 '" }   # sale con 0 = hecho
boss:                         # solo en labs de práctica
  titulo: El proceso fantasma
  texto: …
  xp: 60
  check: [{ nodo: servidor, script: "test -x /run/boss-check.sh && /run/boss-check.sh" }]
  fallos:                     # se elige uno al azar al empezar el boss
    - id: cpu
      romper: [{ nodo: servidor, script: "… y escribe /run/boss-check.sh" }]
      pistas: [{ coste: 5, texto: "…" }]
      solucion: lo que se le enseña al ganar
```

## Sondas

Una sonda es un script corto que `labd` ejecuta en cada ronda, que es al volver el prompt, tras cada Enter y cada segundo (ver labd/LEEME.md). Si su salida cambia, se la manda a la lección como evento `sonda`. Así la lección ve lo que pasa en la máquina sin que el alumno haga nada especial.

Hay nombres con convenio. Los widgets los buscan por ese nombre.

| Id | Devuelve | Lo usa |
| --- | --- | --- |
| `ultimo@NODO` | la última línea del historial de bash | widget `ultimo` |
| `rc@NODO` | el código de salida del último comando (necesita el `PROMPT_COMMAND` de abajo) | `codigo-salida` |
| `puertos@NODO` | los puertos TCP abiertos, separados por espacios | tarjeta de la máquina y `puertos` |
| `ram@NODO` | `usados total` en MB | tarjeta de la máquina |
| `icmp@NODO` | `pings recibidos, pings enviados, conexiones TCP aceptadas` | `red` |
| `cat@NODO` | lo que enseñó el último `cat` sencillo | `fichero` |

Cualquier otro id vale para los widgets que reciben `sonda: 'id'`, como `fichero`, `estado`, `medidor`, `contador`, `procesos`, `arbol`, `inodos`, `rwx`, `git-zonas` o `git-grafo`.

Reglas para que funcionen bien.

- Que sean rápidas, de pocos milisegundos. Corren cada segundo y el vigía las ejecuta una detrás de otra, así que una lenta retrasa a todas.
- Que solo **lean**. Nunca vuelvas a ejecutar lo que escribió el alumno, ni con `eval`. La sonda `cat@` de los labs de lección enseña cómo hacerlo sin riesgo.
- Si buscas un proceso, no uses `pgrep -f` ni `grep` con el nombre. El propio script de la comprobación lleva ese texto y se encuentra a sí mismo. Usa `ps -eo stat=,args= | awk '$2 == "sleep" && $3 == "200"'`.
- Una lista de procesos solo enseña los que llevan **1 segundo o más** vivos (`ps -eo pid=,etimes=,stat=,args=` y `$2 >= 1`). Si no, los procesos de las propias sondas y los comandos rápidos entran y salen cada segundo y la lista baila.
- Los programas que la lección pide lanzar (como `ocupado` o `tragon`) se instalan en `preparar` como scripts con nombre propio, para que el alumno los lance él mismo con `&`.
- Los procesos muertos salen como zombis (estado Z) un momento. Fíltralos con `$1 !~ /^Z/`.
- Dentro de cada nodo vive el vigía de labd, `sh /usr/lib/relavops/vigia`. Una lista de procesos lo quita con `$5 !~ /relavops[/]vigia$/`. Las comprobaciones que buscan `bash` no lo ven, porque es un `sh`. Un boss no debe matar procesos `sh` a lo loco.

## Trucos que se repiten

- **Código de salida en vivo.** En `preparar`, añade esta línea a `/etc/bash.bashrc` con un heredoc (`cat >> /etc/bash.bashrc <<'EOF'`). Cualquier `n0-Xa` lo tiene.
  ```
  PROMPT_COMMAND='echo $? > /run/.rc; history -a; printf "\033]6973;\007"'
  ```
  El `printf` del final avisa a labd de que ha vuelto el prompt. Sin él, el ✓ tarda unos 270 ms en vez de 25. Si un lab pone su propio `PROMPT_COMMAND`, que acabe siempre así.
- **CPU que el alumno satura a propósito.** Dale al nodo pocas `cpus` (`0.25` en `n0-1a-cuerpo`), o cada alumno en ese paso se come un núcleo entero del servidor. El medidor de CPU mide contra `/sys/fs/cgroup/cpu.max`, así que sigue llegando al 100 %.
- **Responder preguntas.** El script `responde clave valor` guarda en `/root/.respuestas/clave` y la comprobación lo compara con la verdad.
- **Bosses con varios fallos.** Cada fallo escribe su propio `/run/boss-check.sh` al romper el lab, y el check del boss solo lo ejecuta. Así cada fallo se comprueba a su manera.
- **free cuenta la RAM de la máquina.** Dentro de un contenedor, `free` enseña la del ordenador anfitrión. Los labs de la lección 0.1 instalan un `free` que lee el límite del cgroup.
- **PID 1.** En las imágenes de relavops es `maquina` (`imagenes/base/maquina`). Recoge a los procesos que mueren y no termina nunca, así un `pkill sleep` o un `kill -9 -1` del alumno no apaga la máquina. Lo anuncian con la etiqueta `relavops.init=maquina`. Con otra imagen, labd pone `--init` y el PID 1 es `docker-init`, que recoge igual pero termina si muere el proceso principal. Una imagen nueva que parta de `relavops/base:1` y cambie el CMD tiene que acabar con `exec /usr/local/bin/maquina`, como hace `imagenes/juego/bin/arranque`.

## Probar un lab

Con `labd` en marcha, `node pruebas/labs-leccion.mjs n0-1b-red` resuelve la misión dentro del lab y comprueba que se valida y que las sondas llegan. Para los de práctica, `pruebas/labs-practica.mjs`, que además prueba cada fallo del boss. Las soluciones están dentro de esos scripts. Si añades un lab, añade su solución ahí.
