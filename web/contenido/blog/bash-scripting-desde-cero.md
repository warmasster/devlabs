---
titulo: Bash scripting desde cero, tu primer script bien hecho
corto: Bash scripting desde cero
descripcion: Cómo escribir scripts de Bash que no fallan en silencio. Variables, comillas, condiciones, bucles, funciones, códigos de salida y por qué empezar con set -euo pipefail.
fecha: 2026-11-07
categoria: Linux
modulo: 0.8
orden: 8
comando: ./backup.sh /srv/web
relacionados: tuberias-redirecciones-linux, grep-expresiones-regulares, git-basico
---

Un script de Bash es un fichero con los mismos comandos que escribirías en la terminal, uno detrás de otro. Si haces algo dos veces a mano, la tercera merece un script. Esta guía va de cero a un script que podrías dejar en un servidor sin miedo.

## El primer script

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Hola, $USER. Hoy es $(date +%A)."
```

Guárdalo como `hola.sh`, dale permiso de ejecución y lánzalo.

```bash
chmod +x hola.sh
./hola.sh
```

La primera línea, el shebang, dice con qué programa se ejecuta el fichero. El `./` hace falta porque la carpeta actual no está en el PATH, la lista de carpetas donde la shell busca programas.

## set -euo pipefail

Por defecto, Bash sigue adelante aunque un comando falle. Un `cd` que no encuentra la carpeta seguido de un `rm -rf *` borra lo que no era. Estas tres opciones lo cambian.

| Opción | Qué hace |
| --- | --- |
| `-e` | Si un comando falla, el script para |
| `-u` | Usar una variable que no existe es un error, no un texto vacío |
| `-o pipefail` | Una tubería falla si falla cualquier comando, no solo el último |

Ponlas siempre al principio. Te ahorran los fallos más caros.

## Variables y comillas

```bash
nombre="ana"             # sin espacios alrededor del =
echo "Hola, $nombre"     # con comillas dobles se sustituye
echo 'Hola, $nombre'     # con simples, se escribe tal cual
hoy=$(date +%F)          # guarda la salida de un comando
echo "${nombre}_${hoy}.tar.gz"
```

Pon siempre las variables entre comillas dobles, como en `"$fichero"`. Sin comillas, un nombre con espacios se parte en dos y el comando recibe argumentos que no esperabas.

## Argumentos

| Variable | Qué tiene |
| --- | --- |
| `$0` | El nombre del script |
| `$1`, `$2`... | El primer argumento, el segundo... |
| `$#` | Cuántos argumentos hay |
| `"$@"` | Todos los argumentos, cada uno por separado |
| `$?` | El código de salida del último comando |

```bash
#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Uso: $0 CARPETA" >&2
  exit 1
fi
carpeta=$1
```

El `>&2` manda el mensaje por stderr, el canal de los errores. Lo explica la guía de [tuberías y redirecciones](/blog/tuberias-redirecciones-linux).

## Códigos de salida

Cada comando acaba con un número. Un 0 es que ha ido bien y cualquier otro es un error. `if` no mira si algo es verdad. Mira si el comando ha devuelto 0.

```bash
if grep -q "ERROR" app.log; then
  echo "Hay errores"
fi

ping -c1 db >/dev/null && echo "db contesta" || echo "db no contesta"
```

Tu script también devuelve un código con `exit`. Usa 0 si ha ido bien y otro número si no. Así otros scripts, cron o un pipeline de CI saben si ha fallado.

## Condiciones

```bash
if [[ -f /etc/nginx/nginx.conf ]]; then echo "existe el fichero"; fi
if [[ -d /srv/backups ]]; then echo "existe la carpeta"; fi
if [[ "$entorno" == "prod" ]]; then echo "cuidado"; fi
if (( uso > 90 )); then echo "disco casi lleno"; fi
```

| Prueba | Es verdad si |
| --- | --- |
| `-f fichero` | Existe y es un fichero |
| `-d carpeta` | Existe y es una carpeta |
| `-z "$var"` | La variable está vacía |
| `"$a" == "$b"` | Los textos son iguales |
| `(( a > b ))` | Comparación de números |

En Bash, usa `[[ ]]`. Se lleva mejor que el `[ ]` antiguo con los textos vacíos y los espacios.

## Bucles

```bash
for f in /var/log/*.log; do
  echo "$f ocupa $(du -h "$f" | cut -f1)"
done

while IFS=: read -r usuario _ uid _; do
  (( uid >= 1000 )) && echo "$usuario"
done < /etc/passwd
```

El segundo bucle lee `/etc/passwd` línea a línea, corta por los dos puntos y saca los usuarios normales.

## Funciones

```bash
log() {
  echo "[$(date +%T)] $*" >&2
}

log "Empieza el backup"
```

Las funciones devuelven códigos de salida como cualquier comando. Para devolver un texto, se imprime con `echo` y se recoge con `$( )`.

## Un script completo, backup con rotación

```bash
#!/usr/bin/env bash
# Copia una carpeta en un .tar.gz con la fecha y deja solo las 7 copias más nuevas.
set -euo pipefail

origen=${1:?Uso: backup.sh CARPETA [DESTINO]}
destino=${2:-/srv/backups}
nombre=$(basename "$origen")
fecha=$(date +%F_%H%M)

log() { echo "[$(date +%T)] $*" >&2; }

[[ -d "$origen" ]] || { log "No existe $origen"; exit 1; }
mkdir -p "$destino"

fichero="$destino/${nombre}_$fecha.tar.gz"
tar -czf "$fichero" -C "$(dirname "$origen")" "$nombre"
log "Copia hecha en $fichero"

# Borra las copias de esta carpeta que sobran y deja las 7 más nuevas
ls -1t "$destino/${nombre}"_*.tar.gz | tail -n +8 | xargs -r -d '\n' rm --
log "Quedan $(ls -1 "$destino/${nombre}"_*.tar.gz | wc -l) copias"
```

Fíjate en tres cosas. `${1:?...}` corta el script con un mensaje si falta el argumento. `${2:-/srv/backups}` pone un valor por defecto. Y todas las rutas van entre comillas.

Para que corra cada noche a las 3, una línea en `crontab -e` basta.

```text
0 3 * * * /usr/local/bin/backup.sh /srv/web
```

Antes de dejar un script en un servidor, pásalo por ShellCheck (`shellcheck backup.sh`). Encuentra comillas que faltan y errores típicos que Bash no avisa.

## Preguntas frecuentes

### ¿Qué es el shebang?

La primera línea del script, la que empieza por `#!`. Dice qué programa tiene que leer el fichero. Con `#!/usr/bin/env bash` se usa el Bash que haya en el PATH.

### ¿Cuál es la diferencia entre [ ] y [[ ]]?

`[ ]` es el comando `test` de toda la vida y funciona en cualquier shell. `[[ ]]` es de Bash, se lleva mejor con los textos vacíos y los espacios, y deja usar patrones y `&&` dentro.

### ¿Cómo depuro un script de Bash?

Lánzalo con `bash -x script.sh`. Enseña cada comando, con las variables ya sustituidas, antes de ejecutarlo.

### ¿Por qué mi script funciona en la terminal y no en cron?

Porque cron arranca con un PATH mínimo y sin tus variables. Usa rutas completas o define el PATH al principio del script, y manda la salida a un fichero para ver qué ha pasado.
