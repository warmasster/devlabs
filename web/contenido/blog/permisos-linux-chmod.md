---
titulo: Permisos en Linux, chmod, chown y el 755 explicados
corto: Permisos en Linux
descripcion: Cómo funcionan los permisos en Linux. Leer una línea de ls -l, usar chmod con números y letras, cambiar el dueño con chown, la umask y los permisos especiales.
fecha: 2026-11-07
categoria: Linux
modulo: 0.4
orden: 4
comando: chmod 640 config.yml
relacionados: calculadora-chmod, sistema-ficheros-linux, comandos-basicos-linux
---

En Linux cada fichero tiene un dueño, un grupo y tres juegos de permisos. Con eso se decide quién puede leerlo, quién puede cambiarlo y quién puede ejecutarlo. Es lo primero que mira el sistema cada vez que alguien abre un fichero.

## Leer una línea de ls -l

```bash
$ ls -l despliegue.sh
-rwxr-x--- 1 ana devops 1204 nov  7 10:12 despliegue.sh
```

Lo importante son los diez primeros caracteres, el dueño y el grupo.

| Trozo | Qué es |
| --- | --- |
| `-` | El tipo. Un guion es un fichero normal, una d es una carpeta y una l es un enlace |
| `rwx` | Lo que puede hacer el dueño |
| `r-x` | Lo que puede hacer el grupo |
| `---` | Lo que pueden hacer los demás |
| `ana` | El dueño |
| `devops` | El grupo |

Así que Ana puede leer, cambiar y ejecutar el script. Los del grupo devops pueden leerlo y ejecutarlo. El resto no puede ni abrirlo.

## Qué significa cada letra

| Letra | En un fichero | En una carpeta |
| --- | --- | --- |
| r | Leer lo que tiene | Ver qué hay dentro |
| w | Cambiarlo | Crear, borrar y renombrar lo de dentro |
| x | Ejecutarlo como programa | Entrar y llegar a lo de dentro |

Lo de las carpetas sorprende. Para borrar un fichero no hace falta permiso sobre el fichero. Hace falta w y x en la carpeta donde está.

## Quién es quién

Cuando abres un fichero, Linux te mira en este orden y se queda con el primero que encaja.

1. Si eres el dueño, valen los permisos del dueño.
2. Si no, y estás en el grupo del fichero, valen los del grupo.
3. Si no, valen los de los demás.

De ahí sale algo curioso. Si el dueño tiene menos permisos que el grupo, el dueño tiene menos, aunque también esté en el grupo. Root se salta casi todo esto.

## chmod con números

Cada juego de permisos se escribe como una cifra. Leer vale 4, escribir vale 2 y ejecutar vale 1, y se suman.

| Cifra | Letras |
| --- | --- |
| 7 | `rwx` |
| 6 | `rw-` |
| 5 | `r-x` |
| 4 | `r--` |
| 0 | `---` |

Son tres cifras, una por cada juego. El dueño, el grupo y los demás.

```bash
chmod 755 despliegue.sh   # rwxr-xr-x
chmod 644 index.html      # rw-r--r--
chmod 600 id_ed25519      # rw-------
chmod 750 /srv/backups    # rwxr-x---
```

Si no quieres sumar, la [calculadora de chmod](/herramientas/calculadora-chmod) lo hace por ti y te explica lo que significa cada número.

## chmod con letras

Con letras cambias solo lo que dices y dejas el resto como estaba. Se escribe quién, qué operación y qué permiso.

- Quién es `u` (el dueño), `g` (el grupo), `o` (los demás) o `a` (todos).
- La operación es `+` (añadir), `-` (quitar) o `=` (dejar exactamente así).

```bash
chmod u+x script.sh        # el dueño puede ejecutarlo
chmod go-w informe.txt     # el grupo y los demás ya no pueden cambiarlo
chmod o= secreto.txt       # los demás, nada
chmod u=rw,g=r,o= app.env  # igual que chmod 640
```

Para una carpeta entera, `-R` lo aplica a todo lo de dentro. Con una X mayúscula, la x se pone solo a las carpetas y a lo que ya era ejecutable.

```bash
chmod -R u=rwX,g=rX,o= /srv/web
```

## chown, cambiar el dueño

`chown` cambia de quién es un fichero. Solo root puede cambiar el dueño, así que casi siempre va con `sudo`.

```bash
sudo chown ana fichero            # el dueño pasa a ser ana
sudo chown ana:web fichero        # dueño ana y grupo web
sudo chown :web fichero           # solo el grupo
sudo chown -R www-data:www-data /var/www
```

Muchos errores de «Permission denied» no se arreglan con chmod sino con chown. El fichero tiene buenos permisos, pero es de otro usuario.

## umask, los permisos de lo nuevo

Cuando creas un fichero, no sale con 777. Sale con lo que deja la umask, una máscara que quita permisos.

```bash
$ umask
0022
$ touch nuevo.txt && ls -l nuevo.txt
-rw-r--r-- 1 ana ana 0 nov  7 10:30 nuevo.txt
```

Los ficheros parten de 666 y las carpetas de 777. La umask 022 quita la w al grupo y a los demás. Por eso salen 644 y 755. Con `umask 027`, los demás se quedan sin nada.

## Los permisos especiales

Hay tres más. Se escriben como una cuarta cifra delante.

- **setuid (4).** El programa corre con los permisos de su dueño. Así `passwd` puede escribir en `/etc/shadow` aunque lo lance un usuario normal. En `ls -l` sale una s en el sitio de la x del dueño.
- **setgid (2).** En una carpeta, lo que se crea dentro hereda el grupo de la carpeta. Viene muy bien para carpetas de equipo.
- **sticky bit (1).** En una carpeta, cada uno solo puede borrar lo suyo. Lo tiene `/tmp`, y por eso sale una t al final.

```bash
$ ls -ld /tmp
drwxrwxrwt 12 root root 4096 nov  7 10:00 /tmp
$ sudo chmod 2775 /srv/equipo   # carpeta de equipo con setgid
```

## Errores típicos

- **chmod 777 para que funcione.** Lo arregla hoy y abre un agujero mañana. Mira primero de quién es el fichero.
- **Un script que da «Permission denied».** Le falta la x. Se arregla con `chmod u+x script.sh`.
- **SSH no acepta tu clave.** Tu clave privada o tu carpeta `~/.ssh` tienen demasiados permisos. SSH quiere 600 en la clave y 700 en la carpeta.
- **No puedes entrar en una carpeta que puedes leer.** Le falta la x.

## Preguntas frecuentes

### ¿Qué significa chmod 777?

Que todos pueden leer, cambiar y ejecutar el fichero. Casi nunca es buena idea, porque cualquier usuario o programa de la máquina puede cambiarlo.

### ¿Qué permisos debe tener una clave SSH privada?

600, es decir `rw-------`. Y la carpeta `~/.ssh`, 700. Con más permisos, SSH se niega a usarla.

### ¿Cómo veo los permisos en número?

Con `stat -c '%a %n' fichero`. Te da algo como `644 fichero`.

### ¿Qué diferencia hay entre chmod y chown?

chmod decide qué se puede hacer con el fichero. chown decide de quién es.
