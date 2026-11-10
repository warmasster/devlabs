---
titulo: Comandos básicos de Linux, los 40 que vas a usar de verdad
corto: Comandos básicos de Linux
descripcion: Los comandos de Linux que se usan cada día en un servidor, agrupados por tarea y con ejemplos reales. Ficheros, permisos, procesos, red, discos y búsquedas.
fecha: 2026-11-07
categoria: Linux
modulo: 0.0
orden: 3
comando: ls -la /etc
relacionados: sistema-ficheros-linux, permisos-linux-chmod, tuberias-redirecciones-linux
---

Linux tiene miles de comandos, pero en un servidor se usan unos cuarenta. Esta es esa lista, agrupada por lo que quieres hacer y con el ejemplo que vas a escribir de verdad.

Cada comando se escribe en la terminal y se pulsa Enter. Si no tienes claro qué es la terminal o el prompt, empieza por [terminal, shell y consola](/blog/terminal-shell-consola).

## Cómo leer un comando

Un comando tiene tres partes. El nombre del programa, las opciones y los argumentos.

```bash
ls -l /etc
```

Aquí `ls` es el programa, `-l` es una opción (lista larga) y `/etc` es el argumento (la carpeta que quieres ver). Las opciones cortas llevan un guion y se pueden juntar, así que `ls -l -a` y `ls -la` son lo mismo. Las largas llevan dos, como `--help`.

## Moverse por las carpetas

| Comando | Qué hace |
| --- | --- |
| `pwd` | Dice en qué carpeta estás |
| `ls` | Lista lo que hay en la carpeta |
| `ls -la` | Lista todo, con detalles y con los ficheros ocultos |
| `cd /var/log` | Entra en una carpeta |
| `cd ..` | Sube una carpeta |
| `cd` | Vuelve a tu carpeta personal |
| `cd -` | Vuelve a la carpeta de antes |

Los ficheros que empiezan por punto, como `.bashrc`, están ocultos. Solo salen con `ls -a`.

## Ficheros y carpetas

| Comando | Qué hace |
| --- | --- |
| `touch notas.txt` | Crea un fichero vacío |
| `mkdir -p app/config` | Crea una carpeta, y las de antes si faltan |
| `cp origen destino` | Copia un fichero |
| `cp -r carpeta copia` | Copia una carpeta entera |
| `mv viejo nuevo` | Mueve o renombra |
| `rm fichero` | Borra un fichero |
| `rm -r carpeta` | Borra una carpeta con todo lo de dentro |
| `ln -s destino enlace` | Crea un enlace simbólico |

> `rm` no tiene papelera. Lo que borras no vuelve. Antes de un `rm -r`, haz un `ls` de lo mismo para ver qué se va a llevar.

## Leer ficheros

| Comando | Qué hace |
| --- | --- |
| `cat fichero` | Enseña el fichero entero |
| `less fichero` | Lo abre para leer con calma. Se sale con q |
| `head -n 20 fichero` | Las 20 primeras líneas |
| `tail -n 20 fichero` | Las 20 últimas |
| `tail -f app.log` | Sigue el fichero mientras crece. Se para con Ctrl+C |
| `wc -l fichero` | Cuenta las líneas |

`tail -f` es el comando para mirar un log en directo mientras reproduces un fallo.

## Buscar

| Comando | Qué hace |
| --- | --- |
| `grep error app.log` | Las líneas que contienen «error» |
| `grep -ri timeout /etc` | Busca en todas las carpetas, sin mirar mayúsculas |
| `find /var -name "*.log"` | Busca ficheros por nombre |
| `find . -size +100M` | Ficheros de más de 100 MB |
| `which python3` | Dónde está un programa |

`grep` da para mucho más. Lo tienes en [grep y expresiones regulares](/blog/grep-expresiones-regulares).

## Permisos y usuarios

| Comando | Qué hace |
| --- | --- |
| `whoami` | Con qué usuario estás |
| `id` | Tu usuario y tus grupos |
| `chmod 755 script.sh` | Cambia los permisos |
| `chown ana:web fichero` | Cambia el dueño y el grupo |
| `sudo comando` | Ejecuta como administrador |

Los números de `chmod` se explican en [permisos en Linux](/blog/permisos-linux-chmod), y hay una [calculadora de chmod](/herramientas/calculadora-chmod) para no tener que sumar.

## Procesos y servicios

| Comando | Qué hace |
| --- | --- |
| `ps aux` | Todos los procesos de la máquina |
| `top` o `htop` | Los procesos en directo, ordenados por CPU |
| `kill 1234` | Pide al proceso 1234 que termine |
| `kill -9 1234` | Lo para en seco |
| `pgrep -a nginx` | Busca procesos por nombre |
| `systemctl status nginx` | Cómo está un servicio |
| `journalctl -u nginx -f` | Los logs de un servicio, en directo |

Prueba siempre `kill` a secas antes que `kill -9`. El primero deja que el programa cierre bien sus ficheros.

## Disco y memoria

| Comando | Qué hace |
| --- | --- |
| `df -h` | Cuánto espacio queda en cada disco |
| `du -sh *` | Cuánto ocupa cada cosa de la carpeta |
| `free -h` | Cuánta RAM se usa y cuánta queda |
| `uptime` | Cuánto lleva encendida y la carga |

Si `df -h` dice que el disco está lleno, `sudo du -sh /var/* | sort -h` te dice quién se lo come.

## Red

| Comando | Qué hace |
| --- | --- |
| `ip addr` | Las IP de la máquina |
| `ping -c 3 ejemplo.com` | Comprueba si otra máquina contesta |
| `ss -tln` | Qué puertos están escuchando. Con `sudo` y `-p`, también qué programa |
| `curl -I https://ejemplo.com` | Pide una web y enseña las cabeceras |
| `dig ejemplo.com` | Pregunta al DNS |
| `ssh usuario@servidor` | Entra en otra máquina |

Lo que significan una IP, un puerto y el ping está en [IP, puertos y ping](/blog/ip-puertos-ping).

## Ayuda

| Comando | Qué hace |
| --- | --- |
| `man ls` | El manual completo de un comando. Se sale con q |
| `ls --help` | La ayuda corta |
| `history` | Los últimos comandos que escribiste |

Con `Ctrl+R` buscas en tu historial. Escribe un trozo de un comando viejo y sale solo.

## Preguntas frecuentes

### ¿Cuáles son los comandos más básicos de Linux?

`pwd`, `ls`, `cd`, `cat`, `cp`, `mv`, `rm`, `mkdir` y `grep`. Con esos nueve ya te mueves por un servidor y lees lo que pasa.

### ¿Cómo veo los ficheros ocultos?

Con `ls -a`. Los ficheros ocultos son los que empiezan por un punto.

### ¿Cómo salgo de un comando que no termina?

Con `Ctrl+C`. Si estás en un visor como `less` o `man`, se sale con la tecla q. Si es vim, mira [cómo salir de vim](/blog/como-salir-de-vim).

### ¿Qué diferencia hay entre kill y kill -9?

`kill` manda la señal TERM, que pide al programa que termine y le deja recoger. `kill -9` manda KILL, que lo para en seco. Usa `-9` solo si el primero no funciona.
