---
titulo: El sistema de ficheros de Linux, qué hay en /etc, /var y compañía
corto: Sistema de ficheros de Linux
descripcion: Cómo se organizan las carpetas de Linux y para qué sirve cada una. Rutas absolutas y relativas, inodos y la diferencia entre enlaces duros y simbólicos.
fecha: 2026-11-07
categoria: Linux
modulo: 0.3
orden: 10
comando: ls /
relacionados: comandos-basicos-linux, permisos-linux-chmod, terminal-shell-consola
---

En Linux no hay C ni D. Todo cuelga de una sola carpeta, la raíz, que se escribe `/`. Los discos, los USB y hasta algunos datos del kernel aparecen como carpetas dentro de ese árbol.

## El árbol de carpetas

Si escribes `ls /` en casi cualquier Linux, salen las mismas carpetas. Siguen un estándar que se llama FHS (Filesystem Hierarchy Standard), y conocerlo te dice dónde buscar cada cosa.

| Carpeta | Qué hay |
| --- | --- |
| `/etc` | La configuración del sistema y de los programas |
| `/var` | Datos que cambian, como logs, colas y bases de datos |
| `/var/log` | Los logs |
| `/home` | Las carpetas de los usuarios |
| `/root` | La carpeta del usuario root |
| `/usr` | Los programas instalados y sus ficheros |
| `/usr/bin` | Los comandos, como `ls`, `grep` o `python3` |
| `/usr/local` | Lo que instalas tú a mano, fuera del gestor de paquetes |
| `/opt` | Programas de terceros que van en su propia carpeta |
| `/tmp` | Ficheros temporales. Puede vaciarse al reiniciar |
| `/dev` | Los dispositivos, como discos y terminales |
| `/proc` | Información de los procesos y del kernel, generada al vuelo |
| `/sys` | El hardware y los controladores, también al vuelo |
| `/boot` | Lo que hace falta para arrancar, como el kernel |
| `/srv` | Datos que sirve la máquina, como una web |
| `/mnt` y `/media` | Donde se montan discos y USB |

Con esto ya sabes dónde mirar. Si un servicio no arranca, su configuración está en `/etc` y sus logs en `/var/log` o en `journalctl`. Si el disco se llena, casi siempre es culpa de algo en `/var`.

## Rutas absolutas y relativas

Una ruta absoluta empieza por `/` y vale desde cualquier sitio. Una relativa parte de la carpeta en la que estás.

```bash
cd /var/log          # absoluta
cd nginx             # relativa, entra en /var/log/nginx
cat ../syslog        # .. es la carpeta de arriba
./script.sh          # . es la carpeta actual
cd ~                 # ~ es tu carpeta personal
```

## Todo es un fichero

En Linux casi todo se maneja como un fichero. Un disco es `/dev/sda`. La terminal en la que escribes es otro, y te lo dice el comando `tty`. Y en `/proc` puedes leer datos del sistema con `cat`.

```bash
cat /proc/cpuinfo     # la CPU
cat /proc/meminfo     # la memoria
cat /proc/1/cmdline   # con qué comando arrancó el proceso 1
```

Esos ficheros no están en el disco. El kernel los genera cuando los lees.

## Inodos

El nombre de un fichero no es el fichero. Los datos y la información del fichero (dueño, permisos, tamaño y fechas) cuelgan de un inodo, que tiene un número. La carpeta solo guarda una lista de nombres con el número de inodo de cada uno.

```bash
$ ls -i notas.txt
1312843 notas.txt
$ stat notas.txt
```

Esto explica dos cosas raras. Un disco se puede llenar teniendo espacio libre, si se acaban los inodos (`df -i` lo enseña). Y renombrar un fichero gigante es instantáneo, porque solo cambia la lista de la carpeta.

## Enlaces duros y simbólicos

| | Enlace duro | Enlace simbólico |
| --- | --- | --- |
| Se crea con | `ln original enlace` | `ln -s original enlace` |
| Qué es | Otro nombre para el mismo inodo | Un fichero pequeño que guarda una ruta |
| Si borras el original | El enlace sigue teniendo los datos | El enlace se queda roto |
| Carpetas | No se puede | Sí |
| Entre discos distintos | No se puede | Sí |

```bash
$ sudo ln -s /etc/nginx/sites-available/web /etc/nginx/sites-enabled/web
$ ls -l /etc/nginx/sites-enabled/
lrwxrwxrwx 1 root root 30 nov  7 10:00 web -> /etc/nginx/sites-available/web
```

Los simbólicos son los que más vas a ver. Nginx los usa para activar sitios, y muchas versiones de un programa se cambian moviendo un enlace.

Un fichero se borra de verdad cuando no le queda ningún nombre y ningún programa lo tiene abierto. Por eso, si borras un log que un programa sigue escribiendo, el disco no se libera hasta que reinicias el programa. `sudo lsof +L1` te enseña esos ficheros borrados que siguen ocupando.

## Preguntas frecuentes

### ¿Qué hay en /etc?

La configuración. Cada programa suele tener su fichero o su carpeta, como `/etc/ssh/sshd_config` o `/etc/nginx/`.

### ¿Dónde están los logs en Linux?

En `/var/log`. En los sistemas con systemd, muchos servicios guardan sus logs en el journal, que se lee con `journalctl`.

### ¿Qué diferencia hay entre /bin y /usr/bin?

Antes eran carpetas separadas. En las distribuciones actuales, `/bin` es un enlace a `/usr/bin`, así que es lo mismo.

### ¿Cómo sé qué ocupa más en el disco?

Con `sudo du -xsh /* 2>/dev/null | sort -h` ves cuánto ocupa cada carpeta de la raíz, y luego bajas por la que más ocupe. `ncdu` hace lo mismo de forma interactiva.
