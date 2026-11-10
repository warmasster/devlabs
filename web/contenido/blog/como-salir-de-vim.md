---
titulo: Cómo salir de vim, y lo mínimo para editar sin sufrir
titulo_seo: Cómo salir de vim (y lo mínimo para editar sin sufrir)
corto: Cómo salir de vim
descripcion: Cómo salir de vim guardando o sin guardar, por qué no te deja escribir y las pocas órdenes que bastan para editar un fichero de configuración en un servidor.
fecha: 2026-11-07
categoria: Linux
modulo: 0.7
orden: 7
comando: :wq
relacionados: comandos-basicos-linux, terminal-shell-consola, bash-scripting-desde-cero
---

Para salir de vim, pulsa `Esc` y escribe una de estas órdenes. Luego pulsa Enter.

| Escribe | Qué hace |
| --- | --- |
| `:q` | Sale si no has cambiado nada |
| `:wq` | Guarda y sale |
| `:x` | Guarda y sale, y solo escribe si hay cambios |
| `:q!` | Sale sin guardar y tira los cambios |
| `ZZ` | Guarda y sale, sin pulsar Enter |

Si al escribir `:q` te dice `E37: No write since last change`, es que has cambiado algo. Decide si quieres guardar (`:wq`) o tirar los cambios (`:q!`).

## Por qué vim no se comporta como un editor normal

Vim tiene modos. Al abrirlo estás en el modo normal, donde cada tecla es una orden. La `x` borra un carácter, `dd` borra una línea y la `u` deshace. Por eso, si empiezas a escribir sin más, pasan cosas raras.

| Modo | Para qué | Cómo se entra |
| --- | --- | --- |
| Normal | Moverse y dar órdenes | `Esc` desde cualquier otro |
| Inserción | Escribir texto | `i` |
| Comandos | Guardar, salir, buscar y reemplazar | `:` desde el normal |
| Visual | Seleccionar | `v` |

Abajo a la izquierda, vim te dice el modo. Si pone `-- INSERT --`, lo que tecleas se escribe. Si no pone nada, estás en el normal.

La regla que lo arregla todo. Si no sabes dónde estás, pulsa `Esc` un par de veces y vuelves al modo normal.

## Lo mínimo para editar un fichero

Con esta secuencia editas cualquier fichero de configuración.

```text
vim /etc/ssh/sshd_config    abre el fichero
/PermitRootLogin            busca el texto (n salta al siguiente)
i                           pasa a escribir antes del cursor
Esc                         vuelve al modo normal
:wq                         guarda y sale
```

Y estas órdenes del modo normal ahorran mucho.

| Tecla | Qué hace |
| --- | --- |
| `i` y `a` | Escribir antes o después del cursor |
| `o` | Abrir una línea nueva debajo y escribir en ella |
| `x` | Borrar el carácter del cursor |
| `dd` | Borrar (cortar) la línea entera |
| `yy` | Copiar la línea |
| `p` | Pegar debajo |
| `u` | Deshacer |
| `Ctrl+R` | Rehacer |
| `gg` y `G` | Ir al principio o al final del fichero |
| `:42` | Ir a la línea 42 |
| `/texto` | Buscar hacia abajo |

## Buscar y reemplazar

```text
:%s/viejo/nuevo/g      cambia todas las veces en todo el fichero
:%s/viejo/nuevo/gc     igual, pero pregunta en cada una
```

El `%` es todo el fichero, la `g` es todas las veces en cada línea y la `c` es confirmar.

## Si al guardar te dice que no tienes permiso

Has abierto un fichero de root sin `sudo`. No hace falta perder los cambios. Escribe esto.

```text
:w !sudo tee %
```

Pide tu contraseña y guarda el fichero como root. Vim te avisará de que el fichero ha cambiado, y luego sales con `:q!`. La próxima vez, ábrelo con `sudoedit` o con `sudo vim`.

## Y si prefieres nano

`nano` es más sencillo. Escribes directamente y abajo tienes las teclas.

| Tecla | Qué hace |
| --- | --- |
| `Ctrl+O` | Guardar |
| `Ctrl+X` | Salir |
| `Ctrl+W` | Buscar |
| `Ctrl+K` | Cortar la línea |
| `Ctrl+U` | Pegar |

Merece la pena aprender lo básico de vim igualmente. Está en casi todos los servidores, también en los que no traen nano.

## Preguntas frecuentes

### ¿Cómo salgo de vim sin guardar?

Pulsa `Esc`, escribe `:q!` y pulsa Enter. Sales y se tiran los cambios.

### ¿Cómo guardo y salgo de vim?

Pulsa `Esc`, escribe `:wq` y pulsa Enter. También vale `ZZ`.

### ¿Por qué no puedo escribir en vim?

Porque estás en el modo normal, donde las teclas son órdenes. Pulsa `i` para escribir y `Esc` para volver.

### ¿Cómo deshago un cambio en vim?

En el modo normal, `u` deshace y `Ctrl+R` rehace.

### ¿Qué diferencia hay entre vi y vim?

vi es el editor original. vim es una versión mejorada (vi improved). En muchos sistemas, el comando `vi` abre vim.
