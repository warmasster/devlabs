---
titulo: Git básico, commits, ramas y merge sin miedo
corto: Git básico
descripcion: Qué es Git y cómo usarlo de verdad. Los comandos del día a día, cómo funcionan las ramas, cómo resolver un conflicto y cómo deshacer errores sin perder trabajo.
fecha: 2026-11-07
categoria: Git
modulo: 0.9
orden: 9
comando: git commit -m "Primer commit"
relacionados: bash-scripting-desde-cero, que-es-devops, aprender-devops-desde-cero
---

Git guarda la historia de un proyecto. Cada vez que haces un commit, guarda una foto de tus ficheros con un mensaje. Puedes volver a cualquier foto, trabajar en varias cosas a la vez con ramas y juntar el trabajo de mucha gente.

En DevOps, Git no es solo para el código. La configuración de los servidores, los pipelines y la infraestructura también viven en un repositorio.

## Las tres zonas

Para entender Git hay que saber que un cambio pasa por tres sitios.

1. **La carpeta de trabajo.** Donde editas los ficheros.
2. **El área de preparación (staging).** Lo que has elegido para el próximo commit, con `git add`.
3. **El repositorio.** Los commits guardados, con `git commit`.

La zona del medio es la que confunde al principio. Sirve para elegir qué cambios van juntos. Si has tocado tres ficheros pero solo dos tienen que ver, añades esos dos y haces un commit con sentido.

## Empezar

```bash
git config --global user.name "Ana García"
git config --global user.email "ana@ejemplo.com"

git init mi-proyecto                                # un repositorio nuevo
git clone https://github.com/usuario/proyecto.git   # o copiar uno que ya existe
```

## El ciclo de cada día

```bash
git status                     # qué ha cambiado
git diff                       # los cambios, línea a línea
git add nginx.conf             # preparar un fichero
git add -p                     # preparar trozo a trozo, preguntando
git commit -m "Sube el límite de subida a 20 MB"
git log --oneline --graph      # la historia, en corto
```

`git status` es el comando que más vas a escribir. Te dice en qué rama estás, qué has cambiado y qué está preparado. Ante la duda, `git status`.

Un buen mensaje de commit dice qué cambia, en una línea corta, y por qué si no es evidente. «Arregla cosas» no ayuda a nadie dentro de seis meses.

## Ramas

Una rama es una línea de trabajo aparte. Creas una, haces tus cambios ahí y la rama principal no se entera hasta que tú quieras.

```bash
git switch -c limite-subida   # crea la rama y se pasa a ella
# ... cambios y commits ...
git switch main               # vuelve a la principal
git merge limite-subida       # junta la rama en main
git branch -d limite-subida   # borra la rama, ya no hace falta
```

Por dentro, una rama es solo un puntero a un commit. Crearla es instantáneo y no copia nada. Por eso en Git se usan ramas para todo.

## Conflictos

Si dos ramas cambian la misma línea, Git no sabe con cuál quedarse y te lo pregunta. El fichero queda así.

```text
<<<<<<< HEAD
client_max_body_size 20M;
=======
client_max_body_size 50M;
>>>>>>> limite-subida
```

Arriba está lo de tu rama y abajo lo de la que juntas. Para resolverlo, deja el fichero como debe quedar, borra las marcas y termina el merge.

```bash
git add nginx.conf
git commit
```

Si te lías, `git merge --abort` deja todo como antes de empezar.

## Trabajar con un remoto

Un remoto es una copia del repositorio en otro sitio, como GitHub, GitLab o un servidor tuyo.

```bash
git remote -v                       # a qué remotos está conectado
git push -u origin limite-subida    # sube tu rama
git pull                            # baja y junta lo nuevo del remoto
git fetch                           # baja lo nuevo sin juntarlo
```

En los equipos, lo normal es no tocar `main` directamente. Subes tu rama, abres una pull request (o merge request), alguien la revisa, pasan los tests y entonces se junta.

## Deshacer sin perder nada

| Quieres | Escribe |
| --- | --- |
| Tirar los cambios de un fichero que no has preparado | `git restore fichero` |
| Sacar un fichero del área de preparación | `git restore --staged fichero` |
| Cambiar el mensaje del último commit, antes de subirlo | `git commit --amend` |
| Deshacer un commit que ya está en el remoto | `git revert ID` |
| Guardar los cambios a medias para luego | `git stash` y después `git stash pop` |
| Encontrar un commit que creías perdido | `git reflog` |

`git revert` crea un commit nuevo que hace lo contrario. Es la forma segura de deshacer algo que otros ya tienen. `git reset --hard` borra commits y cambios sin preguntar, así que úsalo solo si sabes lo que haces.

> Nunca subas contraseñas ni claves a un repositorio. Aunque las borres en el commit siguiente, siguen en la historia. Usa un fichero `.gitignore` para dejarlas fuera desde el principio.

## Preguntas frecuentes

### ¿Qué diferencia hay entre Git y GitHub?

Git es el programa que guarda la historia, y funciona en tu ordenador sin internet. GitHub es una web donde se guardan repositorios de Git para compartirlos. GitLab y Forgejo hacen lo mismo.

### ¿Qué diferencia hay entre git pull y git fetch?

`git fetch` baja los commits nuevos del remoto pero no toca tu rama. `git pull` hace un fetch y luego los junta con tu rama.

### ¿Qué diferencia hay entre merge y rebase?

Los dos juntan ramas. `merge` crea un commit que une las dos historias. `rebase` vuelve a poner tus commits encima de la otra rama, como si hubieras empezado después. Rebase deja una historia más limpia, pero no lo uses en ramas que otros ya tienen.

### ¿Cómo deshago el último commit?

Si no lo has subido, `git reset --soft HEAD~1` lo deshace y deja los cambios preparados. Si ya está en el remoto, usa `git revert HEAD`.
