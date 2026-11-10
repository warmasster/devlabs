---
titulo: Cómo aprender DevOps desde cero, la ruta paso a paso
corto: Cómo aprender DevOps
descripcion: Qué aprender primero, qué dejar para después y cuánto se tarda. La ruta completa de Linux a Kubernetes, con lo que tienes que saber hacer en cada paso.
fecha: 2026-11-07
categoria: DevOps
orden: 1
destacado: si
comando: echo "hola, devops"
relacionados: que-es-devops, comandos-basicos-linux, terminal-shell-consola
---

DevOps no es una herramienta ni un título. Es una forma de trabajar donde quien escribe el software también se ocupa de que llegue a producción y siga vivo. Para trabajar así hace falta saber un poco de muchas cosas, y en un orden concreto.

La mayoría de la gente empieza por el final. Instala Kubernetes, sigue un tutorial, copia comandos y a la semana no recuerda nada. Lo que falla no es Kubernetes. Es que debajo hay Linux, redes y procesos, y sin eso cada error es un misterio.

Esta es la ruta que sigue el [temario de relavops](/temario). Cada paso se apoya en el anterior.

## El orden importa más que las herramientas

Las herramientas cambian cada pocos años. Lo de debajo casi no cambia. Un contenedor de hoy sigue siendo un proceso de Linux con unos límites. Un fallo de DNS de hoy se arregla igual que hace veinte años.

Por eso la ruta va de abajo arriba.

1. **Linux y la terminal.** Moverte, leer ficheros, permisos y procesos.
2. **Bash.** Automatizar lo que haces a mano.
3. **Git.** Guardar el trabajo y colaborar.
4. **Administrar un servidor.** Usuarios, servicios, logs, discos y SSH.
5. **Redes.** IP, puertos, DNS, rutas y cortafuegos.
6. **Contenedores.** Qué son por dentro y cómo construir imágenes buenas.
7. **Llevar a producción.** CI/CD, proxies, TLS, métricas y alertas.
8. **Kubernetes.** Cuando de verdad hace falta.
9. **SRE.** Mantenerlo todo vivo cuando falla.

## Paso 1. La terminal de Linux

La mayoría de los servidores del mundo corren Linux, y casi todo se hace desde la terminal. Va primero porque todo lo demás pasa por ahí.

Esto es lo que tienes que saber hacer antes de seguir.

- Moverte por carpetas con `cd`, `ls` y `pwd` sin pensarlo.
- Leer ficheros y logs con `cat`, `less`, `head` y `tail -f`.
- Entender una línea de `ls -l` y cambiar permisos con `chmod`.
- Ver qué procesos corren y parar uno.
- Encadenar comandos con tuberías, como `grep error app.log | wc -l`.
- Editar un fichero en el servidor con vim o nano.

Hay una guía para cada punto. Empieza por los [comandos básicos de Linux](/blog/comandos-basicos-linux) y sigue con los [permisos](/blog/permisos-linux-chmod), las [tuberías](/blog/tuberias-redirecciones-linux) y [grep](/blog/grep-expresiones-regulares).

## Paso 2. Bash para no repetir

Si haces algo dos veces a mano, la tercera lo escribes en un script. Bash es el pegamento de todo lo demás. Los pipelines de CI, los Dockerfile y los arranques de los contenedores están llenos de Bash.

No hace falta ser un experto. Sí hace falta saber variables, condiciones, bucles, códigos de salida y por qué un script empieza con `set -euo pipefail`. Lo tienes en [Bash scripting desde cero](/blog/bash-scripting-desde-cero).

## Paso 3. Git

Todo lo que hagas a partir de aquí vive en un repositorio. El código, la configuración de los servidores y la infraestructura. Para empezar basta con saber hacer commits, ramas, merge y trabajar con un remoto. La guía es [Git básico](/blog/git-basico).

## Paso 4. Administrar un servidor de verdad

Ahora toca cuidar una máquina entera. Crear usuarios con sudo, instalar paquetes, escribir un servicio de systemd que se reinicia solo, leer el journal, montar discos y entrar por SSH con claves.

Aquí aprendes la diferencia entre que algo funcione y que siga funcionando mañana. Un servicio sin reinicio automático, unos logs que llenan el disco o un backup que nunca se ha restaurado son los fallos de siempre.

## Paso 5. Redes

Es el paso que más gente se salta y el que más falta hace. Cuando algo no conecta, la causa casi siempre es de red. Una IP mal puesta, un puerto cerrado, una ruta que falta o el DNS.

Lo mínimo es entender [qué es una IP, un puerto y ping](/blog/ip-puertos-ping), saber [calcular subredes](/blog/subnetting-calcular-subredes) y manejar `ip`, `ss`, `dig`, `curl` y `tcpdump`. Con esas cinco herramientas se depura casi todo.

## Paso 6. Contenedores

Con Linux y redes claros, los contenedores dejan de ser magia. Un contenedor es un proceso aislado con namespaces y limitado con cgroups. Lo explica la guía de [contenedores y máquinas virtuales](/blog/docker-vs-maquina-virtual).

Lo que importa aquí es construir imágenes pequeñas y seguras, entender las redes y los volúmenes de Docker y levantar varios servicios con Docker Compose.

## Paso 7. Llevar a producción

Esto es DevOps en el día a día. Un `git push` que pasa los tests, construye la imagen, la despliega y te avisa si algo va mal.

Las piezas son un proxy con TLS automático, un pipeline de CI/CD, infraestructura como código, métricas con Prometheus, logs centralizados y alertas que no despiertan en vano. Y un plan para volver atrás en menos de cinco minutos.

## Paso 8. Kubernetes

Kubernetes reparte contenedores entre muchas máquinas y los mantiene vivos. Es potente y también complicado. Merece la pena cuando ya tienes muchos servicios, varios equipos o muchas máquinas.

Llegar aquí con todo lo anterior cambia la experiencia. Un pod en CrashLoopBackOff es un proceso que se muere al arrancar, y eso ya sabes depurarlo. Un Service que no responde es un problema de red, y eso también.

## Paso 9. SRE

La última etapa es mantener sistemas grandes vivos. Incidentes, postmortems, alta disponibilidad, rendimiento y capacidad. Es el trabajo de los equipos de SRE, y la guía de [qué es DevOps](/blog/que-es-devops) cuenta en qué se diferencia.

## Cuánto se tarda

Depende de las horas. Con una o dos horas al día, esta es una referencia razonable.

| Etapa | Tiempo aproximado |
| --- | --- |
| Terminal, Bash y Git | 1 a 2 meses |
| Administrar Linux | 1 a 2 meses |
| Redes | 1 a 2 meses |
| Contenedores | 1 mes |
| Producción, CI/CD y monitorización | 2 a 3 meses |
| Kubernetes | 2 meses |

En total, entre ocho meses y un año para tener una base sólida. No hace falta acabarlo todo para buscar el primer trabajo. Con Linux, redes, Docker y un pipeline de CI ya hay puestos de entrada.

## Cómo practicar sin romper nada

Leer no basta. Lo que se queda es lo que haces con las manos, sobre todo cuando algo se rompe y lo arreglas tú.

Tienes tres opciones.

- **Una máquina virtual en tu ordenador.** Es gratis y es tuya, pero hay que instalarla, y cuando la rompes toca empezar de nuevo.
- **Un servidor barato en la nube.** Es real, pero cuesta dinero y tiene que estar seguro desde el primer día.
- **Un curso con máquinas incluidas.** Es lo que hace relavops, y es gratis. Cada lección abre un Linux real al lado del texto, comprueba lo que escribes y al final te rompe el lab para que lo arregles.

Elijas la que elijas, haz cada comando de cada guía. Y rompe cosas a propósito. Borra un fichero de configuración, para un servicio, cambia una ruta. Arreglarlo es donde se aprende.

## Preguntas frecuentes

### ¿Se puede aprender DevOps sin saber programar?

Sí. Para empezar basta con Bash, que se aprende en el paso 2. Más adelante viene bien leer Python o Go, pero no hace falta ser desarrollador.

### ¿Qué se aprende primero, Docker o Linux?

Linux. Docker usa piezas de Linux por debajo, y sin conocerlas cada error de Docker parece un misterio.

### ¿Hace falta una carrera para trabajar en DevOps?

No. Ayuda tener una base de informática, como un ciclo de ASIR o SMR, pero en una entrevista lo que más cuenta es lo que sabes hacer. Un repositorio con tus scripts, tus Dockerfile y tu pipeline vale mucho.

### ¿Qué certificaciones sirven?

Las de Linux (LFCS o RHCSA) y la de Kubernetes (CKA) son de las más valoradas porque son exámenes prácticos. Para la nube, las de nivel asociado de AWS o Azure. Ninguna sustituye a la práctica.
