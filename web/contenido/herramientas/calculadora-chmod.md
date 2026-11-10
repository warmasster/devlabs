---
titulo: Calculadora de permisos chmod
titulo_seo: Calculadora chmod online, permisos de Linux en número y letras
corto: Calculadora chmod
descripcion: Marca los permisos y te da el número de chmod, las letras de ls -l y lo que significa cada uno. Para ficheros y carpetas, con setuid, setgid y sticky bit.
fecha: 2026-11-07
categoria: Herramienta
modulo: 0.4
script: chmod
orden: 1
comando: chmod 755 despliegue.sh
relacionados: permisos-linux-chmod, sistema-ficheros-linux, comandos-basicos-linux
---

<div class="hr" id="chmod">
<div class="hr-fila">
<div class="hr-campo"><label for="ch-oct">En número</label><input type="text" id="ch-oct" value="755" inputmode="numeric" maxlength="4" autocomplete="off" spellcheck="false" /></div>
<div class="hr-campo"><label for="ch-sim">En letras</label><input type="text" id="ch-sim" value="rwxr-xr-x" maxlength="10" autocomplete="off" spellcheck="false" /></div>
</div>
<div class="hr-rejilla" role="group" aria-label="Permisos de cada uno">
<span></span><span>Leer</span><span>Escribir</span><span>Ejecutar</span><span></span>
<span class="quien">Propietario</span><label class="hr-caja"><input type="checkbox" data-b="256" aria-label="El propietario puede leer" checked />r</label><label class="hr-caja"><input type="checkbox" data-b="128" aria-label="El propietario puede escribir" checked />w</label><label class="hr-caja"><input type="checkbox" data-b="64" aria-label="El propietario puede ejecutar" checked />x</label><b id="ch-u">7</b>
<span class="quien">Grupo</span><label class="hr-caja"><input type="checkbox" data-b="32" aria-label="El grupo puede leer" checked />r</label><label class="hr-caja"><input type="checkbox" data-b="16" aria-label="El grupo puede escribir" />w</label><label class="hr-caja"><input type="checkbox" data-b="8" aria-label="El grupo puede ejecutar" checked />x</label><b id="ch-g">5</b>
<span class="quien">Los demás</span><label class="hr-caja"><input type="checkbox" data-b="4" aria-label="Los demás pueden leer" checked />r</label><label class="hr-caja"><input type="checkbox" data-b="2" aria-label="Los demás pueden escribir" />w</label><label class="hr-caja"><input type="checkbox" data-b="1" aria-label="Los demás pueden ejecutar" checked />x</label><b id="ch-o">5</b>
</div>
<div class="hr-especiales">
<label><input type="checkbox" data-b="2048" /> setuid (4)</label>
<label><input type="checkbox" data-b="1024" /> setgid (2)</label>
<label><input type="checkbox" data-b="512" /> sticky (1)</label>
<label><input type="checkbox" id="ch-dir" /> Es una carpeta</label>
</div>
<div class="hr-salida">
<div><span>Comando</span><b class="menta" id="ch-cmd">chmod 755 fichero</b></div>
<div><span>Con letras</span><b id="ch-cmd2">chmod u=rwx,g=rx,o=rx fichero</b></div>
<div><span>Así sale en ls -l</span><b id="ch-ls">-rwxr-xr-x</b></div>
</div>
<p class="hr-explica" id="ch-explica">El propietario puede leerlo, cambiarlo y ejecutarlo. El grupo puede leerlo y ejecutarlo. Los demás pueden leerlo y ejecutarlo.</p>
<div class="hr-aviso" id="ch-aviso" role="status"></div>
<div class="hr-botones" role="group" aria-label="Ejemplos">
<button type="button" data-p="644" data-dir="no">644</button><button type="button" data-p="755" data-dir="no">755</button><button type="button" data-p="600" data-dir="no">600</button><button type="button" data-p="700" data-dir="si">700</button><button type="button" data-p="664" data-dir="no">664</button><button type="button" data-p="775" data-dir="si">775</button><button type="button" data-p="2775" data-dir="si">2775</button><button type="button" data-p="1777" data-dir="si">1777</button><button type="button" data-p="4755" data-dir="no">4755</button><button type="button" data-p="777" data-dir="no">777</button>
</div>
</div>

Escribe el número, escribe las letras o marca las casillas. Las tres cosas van a la vez. El número queda en la dirección de la página, así que puedes pasar el enlace con los permisos ya puestos.

## Cómo se lee el número de chmod

Cada cifra es un grupo de personas. La primera es el propietario, la segunda el grupo del fichero y la tercera todos los demás.

Dentro de cada cifra se suman tres valores. Leer vale 4, escribir vale 2 y ejecutar vale 1. Así salen todas las combinaciones del 0 al 7.

| Cifra | Letras | Qué deja hacer |
| --- | --- | --- |
| 7 | `rwx` | Leer, escribir y ejecutar |
| 6 | `rw-` | Leer y escribir |
| 5 | `r-x` | Leer y ejecutar |
| 4 | `r--` | Solo leer |
| 3 | `-wx` | Escribir y ejecutar, casi nunca tiene sentido |
| 2 | `-w-` | Solo escribir, casi nunca tiene sentido |
| 1 | `--x` | Solo ejecutar |
| 0 | `---` | Nada |

Por ejemplo, 754 es 7 para el propietario (4+2+1), 5 para el grupo (4+1) y 4 para los demás.

## Los permisos que vas a usar casi siempre

| Número | Letras | Para qué |
| --- | --- | --- |
| 644 | `rw-r--r--` | Ficheros normales. Tú escribes y el resto lee |
| 755 | `rwxr-xr-x` | Scripts, programas y carpetas |
| 600 | `rw-------` | Secretos, como una clave SSH privada |
| 700 | `rwx------` | Tu carpeta `~/.ssh` o una carpeta privada |
| 664 | `rw-rw-r--` | Ficheros que edita un equipo |
| 775 | `rwxrwxr-x` | Carpetas de equipo |
| 2775 | `rwxrwsr-x` | Carpeta de equipo donde todo hereda el grupo |
| 1777 | `rwxrwxrwt` | Como `/tmp`. Todos escriben y cada uno borra lo suyo |

## Qué significa cada permiso en una carpeta

En un fichero, r es leerlo, w es cambiarlo y x es ejecutarlo. En una carpeta cambia.

- **r** deja ver qué hay dentro con `ls`.
- **w** deja crear, borrar y renombrar ficheros dentro.
- **x** deja entrar con `cd` y llegar a lo que hay dentro.

Una carpeta con r y sin x es rara. Ves los nombres pero no puedes abrir nada. Por eso las carpetas casi siempre llevan x donde llevan r.

## La cuarta cifra

Si el número tiene cuatro cifras, la primera son los permisos especiales. También se suman.

- **4, setuid.** Un programa corre con los permisos de su propietario. Es lo que hace `passwd`, que necesita escribir en `/etc/shadow`.
- **2, setgid.** En una carpeta, lo que se crea dentro hereda su grupo. En un programa, corre con el grupo del fichero.
- **1, sticky bit.** En una carpeta, cada uno solo puede borrar lo suyo. Es lo que tiene `/tmp`.

En `ls -l` salen como una s o una t en el sitio de la x. Si sale en mayúscula (S o T), el permiso especial está puesto pero la x no.

## Cómo usarlo en la terminal

```bash
chmod 755 despliegue.sh        # con el número
chmod u+x despliegue.sh        # añade x solo al propietario
chmod go-w informe.txt         # quita w al grupo y a los demás
chmod -R u=rwX,go=rX web/      # carpetas con x, ficheros sin ella
ls -l despliegue.sh            # para ver cómo ha quedado
```

La X mayúscula del cuarto ejemplo pone x solo a las carpetas y a lo que ya era ejecutable. Así no conviertes todos los ficheros en programas.

> Si te piden `chmod 777` para que algo funcione, casi siempre el problema es otro. Mira primero de quién es el fichero con `ls -l` y arregla el propietario con `chown` o el grupo. La explicación larga está en [permisos en Linux](/blog/permisos-linux-chmod).

## Preguntas frecuentes

### ¿Qué significa chmod 755?

Que el propietario puede leer, escribir y ejecutar (7), y el grupo y los demás pueden leer y ejecutar (5 y 5). Es lo normal para scripts y carpetas.

### ¿Qué significa chmod 644?

Que el propietario puede leer y escribir (6), y el resto solo leer (4). Es lo normal para ficheros que no son programas.

### ¿Por qué no se debe usar chmod 777?

Porque deja que cualquier usuario de la máquina cambie el fichero. Si es un script que ejecuta otro usuario, quien lo cambie puede meter su propio código. En una web, es una puerta abierta.

### ¿Cuál es la diferencia entre chmod y chown?

chmod cambia qué se puede hacer con un fichero. chown cambia de quién es. Muchas veces lo que falla es el dueño, no los permisos.

### ¿Por qué chmod 755 no quita el setgid de una carpeta?

Porque GNU chmod deja como estaban el setuid y el setgid de las carpetas cuando le das un número normal. Para quitarlos, usa letras, como en `chmod g-s carpeta`, o un número de cinco cifras, como en `chmod 00755 carpeta`.
