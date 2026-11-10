---
titulo: Tuberías y redirecciones en Linux, de | a 2>&1
corto: Tuberías y redirecciones
descripcion: Qué son stdin, stdout y stderr, cómo encadenar comandos con | y cómo mandar la salida a un fichero con >, >>, 2> y 2>&1. Con ejemplos para analizar logs.
fecha: 2026-11-07
categoria: Linux
modulo: 0.5
orden: 5
comando: grep 404 access.log | sort | uniq -c
relacionados: grep-expresiones-regulares, comandos-basicos-linux, bash-scripting-desde-cero
---

La idea más útil de la terminal de Linux es que los comandos se pueden enchufar entre ellos. La salida de uno entra en el siguiente. Con cuatro comandos pequeños respondes preguntas que en otro sitio pedirían un programa.

```bash
cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -5
```

Esa línea saca las cinco IP que más han visitado una web. Al final de esta guía la vas a entender entera.

## Los tres canales de un programa

Todo programa que arranca en Linux tiene tres canales abiertos.

| Canal | Número | Qué lleva | Por defecto |
| --- | --- | --- | --- |
| stdin | 0 | Lo que entra | El teclado |
| stdout | 1 | La salida normal | La pantalla |
| stderr | 2 | Los errores | También la pantalla |

Como stdout y stderr van los dos a la pantalla, parecen lo mismo. No lo son, y eso permite separarlos.

## La tubería |

El símbolo `|` conecta la salida normal de un comando con la entrada del siguiente.

```bash
ls /etc | wc -l              # cuántas cosas hay en /etc
ps aux | grep nginx          # solo los procesos de nginx
cat access.log | grep 500    # las líneas con un 500
```

Los comandos de una tubería corren a la vez. El segundo va leyendo mientras el primero escribe. Por eso `tail -f app.log | grep error` te enseña los errores según llegan.

## Mandar la salida a un fichero

| Escribes | Qué pasa |
| --- | --- |
| `comando > f.txt` | La salida va al fichero. Si ya existía, lo vacía antes |
| `comando >> f.txt` | La salida se añade al final del fichero |
| `comando 2> err.txt` | Solo los errores van al fichero |
| `comando > f.txt 2>&1` | La salida y los errores van al mismo fichero |
| `comando &> f.txt` | Lo mismo, más corto. Solo en Bash |
| `comando < f.txt` | El fichero entra por stdin |
| `comando > /dev/null` | La salida se tira |

> Cuidado con `>`. Si te equivocas de fichero, lo vacías sin aviso. Con `set -o noclobber`, Bash se niega a pisar un fichero que ya existe.

## Qué significa 2>&1

Es la redirección que más cuesta leer. Dice «manda el canal 2 (los errores) al mismo sitio que el canal 1 (la salida)». El `&` indica que 1 es un canal y no un fichero llamado «1».

El orden importa, porque las redirecciones se leen de izquierda a derecha.

```bash
comando > todo.log 2>&1    # bien, los dos van a todo.log
comando 2>&1 > todo.log    # los errores siguen saliendo por pantalla
```

En la segunda, cuando se hace `2>&1`, el canal 1 todavía apunta a la pantalla. Los errores se quedan ahí y solo la salida normal va al fichero.

Un uso típico es tirar los errores de permiso de `find`.

```bash
find / -name "*.conf" 2>/dev/null
```

## Comandos que van bien en tuberías

| Comando | Qué hace |
| --- | --- |
| `grep texto` | Deja pasar las líneas que tienen el texto |
| `grep -v texto` | Deja pasar las que no lo tienen |
| `sort` | Ordena las líneas |
| `sort -rn` | Ordena por número, de mayor a menor |
| `uniq -c` | Junta líneas iguales seguidas y las cuenta |
| `wc -l` | Cuenta las líneas |
| `head -n 5` | Las 5 primeras |
| `cut -d' ' -f1` | El primer campo, cortando por espacios |
| `awk '{print $9}'` | El campo 9 |
| `tr a-z A-Z` | Cambia unos caracteres por otros |
| `tee copia.txt` | Deja pasar la salida y además la guarda en un fichero |

`uniq` solo junta líneas iguales que estén seguidas. Por eso casi siempre va detrás de `sort`.

## Un ejemplo de verdad, interrogar un log

Un log de Nginx tiene una línea por visita. La IP va en el campo 1, la página en el 7 y el código de respuesta en el 9.

```text
203.0.113.7 - - [07/Nov/2026:10:12:01 +0000] "GET /login HTTP/1.1" 404 153 "-" "curl/8.5"
```

Las preguntas de siempre se responden así.

```bash
# Cuántas visitas hay
wc -l < access.log

# Cuántas respuestas de cada código
awk '{print $9}' access.log | sort | uniq -c | sort -rn

# Las cinco IP que más piden
cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -5

# Las páginas que más 404 dan
awk '$9 == 404 {print $7}' access.log | sort | uniq -c | sort -rn | head
```

Lee la de las IP por partes. `cut` saca la IP de cada línea, `sort` pone juntas las iguales, `uniq -c` las cuenta, `sort -rn` pone arriba la que más tiene y `head -5` se queda con cinco.

## Preguntas frecuentes

### ¿Qué diferencia hay entre > y >>?

`>` vacía el fichero y escribe desde cero. `>>` añade al final y respeta lo que había.

### ¿Qué es /dev/null?

Un fichero especial que se traga todo lo que le mandas. Sirve para tirar una salida que no quieres ver.

### ¿Para qué sirve tee?

Para ver la salida y guardarla a la vez. Con `sudo tee` también se escribe en ficheros de root, como en `echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward`.

### ¿Por qué siguen saliendo errores en pantalla aunque use una tubería?

Porque la tubería solo lleva stdout. Los errores van por stderr y salen directos a la pantalla. Para meterlos en la tubería, usa `2>&1 |` o, en Bash, `|&`.
