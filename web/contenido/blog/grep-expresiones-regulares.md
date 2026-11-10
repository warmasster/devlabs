---
titulo: grep y expresiones regulares para buscar en logs
corto: grep y expresiones regulares
descripcion: Cómo usar grep con sus opciones más útiles y cómo escribir expresiones regulares para encontrar IPs, fechas y errores en logs. Con una chuleta de regex.
fecha: 2026-11-07
categoria: Linux
modulo: 0.6
orden: 6
comando: grep -E '" 5[0-9]{2} ' access.log
relacionados: tuberias-redirecciones-linux, comandos-basicos-linux, bash-scripting-desde-cero
---

`grep` busca líneas que contienen un texto. Es el comando que más se usa para leer logs, y con expresiones regulares se convierte en un buscador de patrones. Ya no buscas «404». Buscas «cualquier número de tres cifras que empiece por 5».

## grep en lo básico

```bash
grep error app.log               # las líneas con "error"
grep -i error app.log            # sin mirar mayúsculas (Error, ERROR...)
grep -v debug app.log            # las que NO tienen "debug"
grep -c error app.log            # cuántas líneas lo tienen
grep -n error app.log            # con el número de línea
grep -r "listen 80" /etc/nginx   # en todos los ficheros de una carpeta
grep -l TODO *.py                # solo el nombre de los ficheros que lo tienen
grep -w root /etc/passwd         # "root" como palabra entera
```

Para ver el contexto de un error, `-A` añade líneas de después, `-B` de antes y `-C` de los dos lados.

```bash
grep -C 3 "OutOfMemory" app.log
```

## Qué es una expresión regular

Una expresión regular (regex) es un patrón que describe un texto. En vez de decir el texto exacto, dices cómo es. «Tres cifras», «una palabra al principio de la línea», «algo con forma de IP».

Con `grep -E` usas las expresiones regulares extendidas, que son las más cómodas. Ponlas siempre entre comillas simples para que la shell no toque nada.

## La chuleta

| Patrón | Significa | Ejemplo |
| --- | --- | --- |
| `.` | Un carácter cualquiera | `c.sa` encaja con casa y cosa |
| `[abc]` | Uno de esos caracteres | `[cp]asa` encaja con casa y pasa |
| `[0-9]` | Una cifra | `v[0-9]` encaja con v1 y v8 |
| `[^0-9]` | Cualquier cosa menos una cifra | |
| `*` | Lo anterior, cero o más veces | `ab*c` encaja con ac y abbbc |
| `+` | Lo anterior, una o más veces | `[0-9]+` encaja con 7 y 2026 |
| `?` | Lo anterior, una vez o ninguna | `https?` encaja con http y https |
| `{3}` | Lo anterior, tres veces justas | `[0-9]{3}` encaja con 404 |
| `{2,4}` | Entre dos y cuatro veces | |
| `^` | El principio de la línea | `^ERROR` |
| `$` | El final de la línea | `\.conf$` |
| `\|` | Una cosa u otra | `error\|fatal` |
| `( )` | Agrupa | `(ab)+` encaja con ab y abab |
| `\.` | Un punto de verdad | `\.log$` |

El punto es el que más líos da. Sin la barra, `.` es «cualquier carácter», así que el patrón `192.168.1.1` también encaja con `192x168y1z1`. Para buscar un punto de verdad se escribe `\.`.

## Patrones que vas a usar

```bash
# Errores 5xx en un log de Nginx (el código va justo después de la petición, entre comillas)
grep -E '" 5[0-9]{2} ' access.log

# Líneas que empiezan por ERROR o FATAL
grep -E '^(ERROR|FATAL)' app.log

# Algo con forma de IP
grep -Eo '([0-9]{1,3}\.){3}[0-9]{1,3}' auth.log

# Fechas como 2026-11-07
grep -E '[0-9]{4}-[0-9]{2}-[0-9]{2}' app.log

# Intentos de SSH fallidos, contados por IP
grep 'Failed password' /var/log/auth.log | grep -Eo 'from [0-9.]+' | sort | uniq -c | sort -rn

# Un fichero de configuración sin comentarios ni líneas vacías
grep -Ev '^\s*(#|$)' /etc/ssh/sshd_config
```

La opción `-o` enseña solo el trozo que encaja, no la línea entera. Junto con [las tuberías](/blog/tuberias-redirecciones-linux), sirve para extraer y contar.

> El patrón de IP de arriba también acepta 999.999.999.999. Para buscar en logs vale de sobra. Validar que una IP es correcta pide un patrón mucho más largo, y casi nunca compensa.

## grep, egrep y grep -P

- `grep` a secas usa expresiones regulares básicas. Ahí `+`, `?`, `|` y las llaves necesitan una barra delante para funcionar.
- `grep -E` usa las extendidas. Es lo mismo que el viejo `egrep`, que ya está obsoleto.
- `grep -P` usa las de Perl, con extras como `\d` para una cifra. No está en todas las máquinas.

Si dudas, usa `grep -E`.

## Preguntas frecuentes

### ¿Cómo busco una palabra en todos los ficheros de una carpeta?

Con `grep -r palabra carpeta/`. Añade `-i` para no mirar mayúsculas y `-l` para ver solo qué ficheros la tienen.

### ¿Cómo hago que grep no distinga mayúsculas?

Con la opción `-i`, como en `grep -i error app.log`.

### ¿Cómo busco varias palabras a la vez?

Con `grep -E 'error|fallo|fatal'`, o repitiendo `-e`, como en `grep -e error -e fallo`.

### ¿Qué diferencia hay entre el asterisco de la shell y el de una regex?

En la shell, `*.log` significa «cualquier nombre que acabe en .log». En una regex, `*` significa «lo de antes, cero o más veces». Por eso los patrones van entre comillas, para que la shell no los cambie antes de que lleguen a grep.
