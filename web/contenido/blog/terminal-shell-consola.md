---
titulo: Terminal, shell y consola, qué es cada cosa y los atajos que ahorran horas
titulo_seo: Terminal, shell y consola en Linux, diferencias y atajos
corto: Terminal, shell y consola
descripcion: La diferencia entre terminal, shell, consola y TTY explicada fácil, cómo leer el prompt y los atajos de teclado de Bash que más tiempo ahorran.
fecha: 2026-11-07
categoria: Linux
modulo: 0.2
orden: 12
comando: echo $SHELL
relacionados: comandos-basicos-linux, bash-scripting-desde-cero, como-salir-de-vim
---

Se usan como si fueran lo mismo, pero son piezas distintas. La terminal es la ventana. La shell es el programa que entiende lo que escribes. La consola y el TTY son la forma antigua y la forma del kernel de nombrar esa conexión.

## La terminal

La terminal es el programa que pinta la ventana, recoge las teclas y enseña el texto. Windows Terminal, GNOME Terminal, iTerm2 o la que sale en el navegador en relavops. No entiende ningún comando. Solo pasa lo que escribes a otro programa y pinta lo que ese programa le devuelve.

## La shell

La shell es ese otro programa. Lee la línea que escribes, la interpreta, busca el comando y lo ejecuta. También maneja las variables, las [tuberías](/blog/tuberias-redirecciones-linux) y los scripts.

La más común en Linux es Bash. Hay otras, como zsh (la de macOS) o fish.

```bash
echo $SHELL     # tu shell por defecto
echo $0         # la shell que estás usando ahora
```

## Consola, TTY y PTY

Son palabras de cuando los ordenadores se usaban con terminales físicas, un teclado y una pantalla conectados por un cable.

- **Consola.** La pantalla y el teclado conectados directamente a la máquina. Hoy, lo que ves si enchufas un monitor al servidor.
- **TTY.** Viene de teletipo. Es el dispositivo del kernel que conecta una terminal con los programas. Las consolas de texto de Linux son `/dev/tty1`, `/dev/tty2` y siguientes.
- **PTY.** Una pseudoterminal. Un TTY de mentira que crea un programa, como la ventana de la terminal o SSH. Sale como `/dev/pts/0`.

```bash
$ tty
/dev/pts/0
```

Cuando entras por SSH a un servidor, el servidor crea un PTY, arranca una shell conectada a él y manda por la red todo lo que sale hasta tu terminal.

## El prompt

El prompt es el texto que sale antes del cursor. Te dice quién eres, en qué máquina estás y en qué carpeta.

```text
ana@web01:/var/log$
```

| Trozo | Qué es |
| --- | --- |
| `ana` | Tu usuario |
| `web01` | El nombre de la máquina |
| `/var/log` | La carpeta en la que estás. `~` es tu carpeta personal |
| `$` | Eres un usuario normal. Si sale `#`, eres root |

Mira siempre el prompt antes de un comando peligroso. Con varias terminales abiertas, es fácil escribir en el servidor equivocado.

## Los atajos que más tiempo ahorran

Estos funcionan en Bash y en casi cualquier programa que lee líneas.

| Atajo | Qué hace |
| --- | --- |
| `Tab` | Completa el nombre de un comando, fichero o carpeta |
| `Tab Tab` | Enseña todas las opciones si hay varias |
| `Ctrl+C` | Para el comando que está corriendo |
| `Ctrl+D` | Cierra la entrada. En una shell vacía, sale |
| `Ctrl+R` | Busca en el historial. Púlsalo otra vez para ir más atrás |
| `↑` y `↓` | El comando anterior y el siguiente |
| `Ctrl+A` y `Ctrl+E` | Al principio y al final de la línea |
| `Ctrl+W` | Borra la palabra de antes del cursor |
| `Ctrl+U` | Borra desde el cursor hasta el principio |
| `Ctrl+L` | Limpia la pantalla |
| `!!` | Repite el último comando, como en `sudo !!` |

`Tab` es el más importante. No solo ahorra teclas, evita errores. Si al pulsarlo no se completa, es que el fichero no existe o no está donde crees.

> En una terminal dentro del navegador, `Ctrl+W` puede cerrar la pestaña. Las terminales de relavops tienen un botón de pantalla completa para que esos atajos lleguen a la shell.

## Preguntas frecuentes

### ¿Qué diferencia hay entre terminal y shell?

La terminal es la ventana que enseña el texto. La shell es el programa que entiende y ejecuta los comandos. Puedes cambiar de terminal sin cambiar de shell, y al revés.

### ¿Qué es Bash?

La shell más usada en Linux. Su nombre viene de Bourne Again Shell, porque sustituyó a la shell de Bourne, la clásica de Unix.

### ¿Qué significan el $ y el # del prompt?

`$` indica que eres un usuario normal. `#` indica que eres root, el administrador, y que puedes romper cualquier cosa.

### ¿Cómo paro un comando que no termina?

Con `Ctrl+C`. Si no responde, `Ctrl+\` manda una señal más fuerte. Y desde otra terminal siempre puedes usar `kill`.
