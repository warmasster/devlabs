# Los vídeos, uno a uno

Los 20 vídeos de la fase 1 y los dos de apoyo. La estrategia está en [LEEME.md](LEEME.md).

Cómo leer cada ficha.

- **Gancho** es el texto del primer fotograma. **Otro gancho** es el de reserva.
- **Pasos** son lo que se escribe en la terminal y, entre comillas, el subtítulo que sale.
- **Por comprobar** es lo que hay que probar a mano en local antes de grabar. Los guiones están escritos leyendo los `lab.yaml`, no ejecutándolos. Si la máquina hace otra cosa, cambia el guion.
- Los bosses tienen varias averías y sale una al azar. La ficha dice cuál se graba.

## Calendario

| | Lunes | Martes | Miércoles | Jueves | Viernes |
| --- | --- | --- | --- | --- | --- |
| **16 a 20 nov** | 1. Borro este Linux | 2. Ataque en curso | 3. Salir de vim | 4. Permission denied | 5. El desastre del viernes |
| **23 a 27 nov** | 6. chmod sin chmod | 7. Tres números | 8. El proceso fantasma | 9. La leo antes de pegarla | 10. Linux olvida mi nombre |
| **30 nov a 4 dic** | 11. Una /26 | 12. Quién llena el disco | 13. Dos enlaces | 14. La IA contra el boss | 15. Ctrl+R |
| **7 a 11 dic** | 16. La variable vacía | 17. Mañana hay auditoría | 18. Cuatro comandos | 19. La contraseña en el repo | 20. kill -9 |

Las series. **R** Rómpelo, **B** El boss, **C** Un comando, **IA** La IA y tú.

---

## 0. Cómo se hace este vídeo (fijado)

**Serie** IA · **Se publica** el día 16, antes que el 1, y se fija en el perfil

**Gancho** «Este vídeo lo ha grabado un programa. La máquina es de verdad.»

**Pasos**
1. Se ve la lección con su terminal. «Esto es una lección de relavops.»
2. `hostname` y `uname -a`. «A la derecha hay un Linux real, solo para ti.»
3. `touch hola` y el paso de la lección se marca solo. «La lección mira la máquina y sabe si lo has hecho.»
4. «Los vídeos de esta cuenta los prepara una persona con una IA.»
5. «Todo lo que ves lo puedes repetir tú en la misma lección.»

**Cierre** «relavops.org. Gratis. Con máquinas de verdad.»

**Por comprobar** Qué paso de la 0.0 se marca con un comando tan corto.

---

## Semana 1, del 16 al 20 de noviembre

### 1. Borro este Linux

**Serie** R · **Lección** 0.3, sistema de ficheros

**Gancho** «Voy a borrar este Linux entero. Es una máquina de verdad.»
**Otro gancho** «El comando que nunca vas a escribir en tu ordenador.»

**Pasos**
1. `rm -rf /` y Linux contesta que es peligroso. «Linux se niega. Hay que insistir.»
2. `rm -rf / --no-preserve-root` y la pantalla se llena de errores. «Ahora sí.»
3. `ls` y sale que no existe. «ls ya no está. Era un fichero y lo he borrado.»
4. `echo *` y sí contesta. «echo sigue vivo. No es un fichero, vive dentro de la shell.»
5. Se pide una máquina limpia y `ls` vuelve a funcionar. «Máquina nueva en un momento.»

**Cierre** «Aquí puedes romperlo. Guárdalo y ábrelo en el ordenador. relavops.org»

**Descripción** Qué pasa de verdad cuando borras un Linux entero. Grabado en una máquina real de relavops, que para eso están. #linux #terminal #devops #asir #smr

**Por comprobar** Que el `rm` de la imagen se niega sin la opción. Qué le pasa a la terminal y al panel de la lección cuando se borra el vigía del nodo. Cómo se llama y dónde está el botón de máquina limpia.

### 2. Ataque en curso

**Serie** B · **Lección** 0.5, texto y tuberías · **Avería** combined

**Gancho** «Alguien está probando contraseñas contra este servidor. Su IP está en este log.»
**Otro gancho** «Un log de 6000 líneas y un atacante dentro.»

**Pasos**
1. `wc -l` sobre el log de nginx. «6000 líneas. No se leen. Se filtran.»
2. `grep 'POST /login' access.log | head -3`. «Primero, solo los intentos de entrar.»
3. Se añade `| awk '$9 == 401 {print $1}'`. «Me quedo con los que fallan y con su IP.»
4. Se añade `| sort | uniq -c | sort -rn | head -3`. «Cuento y ordeno.»
5. «La IP con más tráfico del log era un cliente. Si bloqueas esa, la lías.»
6. `responde atacante` con la IP. Boss derrotado y 60 XP.

**Cierre** «Es el boss de la lección 0.5. relavops.org»

**Descripción** El boss de la lección 0.5. Encontrar al atacante en un log de 6000 líneas con cuatro comandos encadenados. #linux #ciberseguridad #devops #asir #terminal

**Por comprobar** El nombre exacto del fichero de log. Que la tubería entera cabe en 45 columnas o se parte en dos líneas.

### 3. Salir de vim

**Serie** C · **Lección** 0.7, editores · **Manda a** `/blog/como-salir-de-vim`, que en el móvil se lee bien

**Gancho** «Has abierto vim sin querer. Así se sale.»
**Otro gancho** «Llevas diez minutos dentro de vim. Sales en tres segundos.»

**Pasos**
1. `vim notas.txt` y se aporrean teclas. La pantalla hace cosas raras. «Nada de lo que pulsas hace lo que esperas.»
2. `Esc`. «Esc, por si estabas escribiendo.»
3. `:q!` y Enter. «:q! y Enter. Sales sin guardar.»
4. Se vuelve a entrar, se escribe una línea y `:wq`. «Con :wq guardas y sales.»

**Cierre** «La guía entera está en relavops.org/blog»

**Descripción** Salir de vim sin cerrar la ventana. Esc, :q! y Enter. #vim #linux #terminal #programacion #asir

### 4. Permission denied

**Serie** IA · **Lección** 0.4, permisos · **Avería** directorio

Guion abierto. Primero se hace la pregunta de verdad y luego se escribe el resto.

**Gancho** «Le pregunto a una IA por este Permission denied. Pego lo que diga en una máquina de verdad.»

**Pasos previstos**
1. El backup falla con Permission denied. «El backup de esta noche no ha arrancado.»
2. La pregunta, como la haría alguien con prisa. «Mi script da Permission denied, cómo lo arreglo.»
3. Se pega lo que conteste, tal cual, y se vuelve a lanzar el backup.
4. Si sigue fallando. «La IA no ve tu máquina. Ha contestado lo más probable.»
5. `namei -l /opt/backup/backup.sh`. «Este comando enseña cada tramo de la ruta.» La carpeta está cerrada para todos menos root.
6. Se le pasa esa salida a la IA y la segunda respuesta se pega. El backup arranca.

**Cierre** «La segunda pregunta la has podido hacer porque sabías qué mirar. relavops.org»

**Si la IA acierta a la primera** El vídeo cuenta por qué acierta y qué habría pasado con `chmod 777`, que el boss prohíbe.

**Por comprobar** Todo, porque depende de la respuesta. Se enseña la respuesta real, sin retocar.

### 5. El desastre del viernes

**Serie** B · **Lección** 0.9, Git · **Avería** conflicto · **Se publica** el viernes a las 17:55

**Gancho** «Viernes, seis menos cinco. Git rechaza tu push.»
**Otro gancho** «Tu compañera ha subido antes que tú. Y habéis tocado la misma línea.»

**Pasos**
1. `git push` y sale rechazado. «El remoto tiene un commit que tú no tienes.»
2. `git pull` y sale CONFLICT. «Las dos habéis cambiado el horario.»
3. Se abre `index.html` con las marcas `<<<<<<<` y `>>>>>>>`. «Git no elige por ti. Te enseña las dos versiones.»
4. Se deja una línea con los días y las horas. «Me quedo con lo de las dos.»
5. `git add`, `git commit` y `git push`. Boss derrotado y 80 XP.

**Cierre** «Nunca push --force sobre el trabajo de otra persona. relavops.org»

**Descripción** El boss de la lección 0.9. Un conflicto de Git a cinco minutos de irte a casa. #git #programacion #devops #daw #asir

**Por comprobar** Cuánto dura la edición a mano. Si pasa de seis segundos, se acelera ese trozo.

---

## Semana 2, del 23 al 27 de noviembre

### 6. chmod sin chmod

**Serie** R · **Lección** 0.4, permisos

**Gancho** «Le quito el permiso de ejecución a chmod. Ahora no puedo devolvérselo.»
**Otro gancho** «El comando que arregla los permisos se ha quedado sin permisos.»

**Pasos**
1. `chmod -x /usr/bin/chmod`. «Hecho. chmod ya no se puede ejecutar.»
2. `chmod +x /usr/bin/chmod` y sale Permission denied. «Y para arreglarlo necesito chmod.»
3. «Ni siendo root. Sin ninguna x, nadie lo ejecuta.»
4. `python3 -c 'import os; os.chmod("/usr/bin/chmod", 0o755)'`. «chmod el programa está roto. chmod la función del sistema, no.»
5. `chmod --version` contesta. «Arreglado.»

**Cierre** «Pruébalo tú. Aquí no rompes nada tuyo. relavops.org»

**Descripción** Si le quitas el permiso de ejecución a chmod, chmod no puede arreglarse solo. Hay salida. #linux #terminal #sysadmin #asir #devops

**Por comprobar** Que la imagen trae python3 y dónde está chmod. Que el comando de Python cabe en pantalla. Si no, se guarda antes en un fichero.

### 7. Tres números

**Serie** C · **Lección** 0.4, permisos · **Manda a** `/herramientas/calculadora-chmod`

**Gancho** «Tres números y sabes quién puede tocar un fichero.»
**Otro gancho** «¿Qué permisos da chmod 640? Tienes cinco segundos.»

**Pasos**
1. `ls -l informe.txt` y sale `-rw-r-----`. «Tres grupos. El dueño, su grupo y el resto.»
2. «r vale 4, w vale 2 y x vale 1. Se suman.»
3. Se marca `rw-` 6, `r--` 4 y `---` 0. «640. El dueño lee y escribe, el grupo lee y el resto nada.»
4. `chmod 640 informe.txt`.
5. `chmod 777` sobre otro fichero. «777 es todo para todos. Casi nunca es la respuesta.»

**Cierre** «La calculadora está en relavops.org/herramientas. Sin cuenta.»

**Descripción** Los permisos de Linux en tres números. r es 4, w es 2 y x es 1. #linux #asir #smr #examen #terminal

**Por comprobar** Si queda mejor grabado en la calculadora que en la terminal. La calculadora ya es vertical.

### 8. El proceso fantasma

**Serie** B · **Lección** 0.1, qué es un ordenador · **Avería** cpu

**Gancho** «Algo se está comiendo esta máquina. Se hace pasar por un proceso del sistema.»
**Otro gancho** «Este proceso tiene nombre de kernel. No lo es.»

**Pasos**
1. `ps aux --sort=-%cpu | head` y el primero se llama `kworker-u8`, al 100 %. «Parece del kernel.»
2. Se remarca otra línea con corchetes. «Los hilos del kernel salen entre corchetes. Este no.»
3. `ls -l /proc/PID/exe`. «Y vive en una carpeta donde el kernel no guarda nada.»
4. `kill` con su PID. La barra de CPU de la lección baja sola. Boss derrotado.
5. «Los procesos trabajador eran inocentes. Matar a ojo no vale.»

**Cierre** «Es el boss de la lección 0.1. relavops.org»

**Descripción** El boss de la lección 0.1. Un proceso que gasta toda la CPU con nombre de sistema. #linux #sysadmin #ciberseguridad #devops #asir

**Por comprobar** Que la barra de CPU se ve en el encuadre vertical.

### 9. La leo antes de pegarla

**Serie** IA · **Lección** 0.5, texto y tuberías

Guion abierto. La línea que se lee es la que conteste la IA.

**Gancho** «Una IA me ha dado esta línea. Antes de pegarla, la leo trozo a trozo.»

**Pasos previstos**
1. La pregunta. «Dime qué IP falla más veces al entrar en este log de nginx.»
2. Sale la respuesta, una línea larga con tuberías. «No pego nada que no sepa leer.»
3. Se ejecuta solo el primer trozo, hasta la primera barra. «Esto filtra.»
4. Se añade el segundo. «Esto se queda con una columna.»
5. Se añade el resto. «Esto cuenta y ordena.»
6. El resultado se compara con el del boss.

**Cierre** «Una tubería se lee de izquierda a derecha, trozo a trozo. relavops.org»

**Por comprobar** Todo. Si la línea de la IA no da la IP correcta, el vídeo es ese.

### 10. Linux olvida mi nombre

**Serie** R · **Lección** 0.1 y, cuando exista, la 1.1 de usuarios

**Gancho** «Borro una línea de un fichero y Linux olvida cómo me llamo.»
**Otro gancho** «Linux no te conoce por tu nombre. Te conoce por un número.»

**Pasos**
1. `whoami` contesta root.
2. `sed -i '/^root:/d' /etc/passwd`. «Una línea menos en /etc/passwd.»
3. `whoami` ya no encuentra el nombre. «Sigo siendo el usuario 0. Solo que ya no hay quien lo traduzca.»
4. `bash` y el prompt cambia a `I have no name!`. «Hasta el prompt se rinde.»
5. `id` enseña `uid=0`. «Los permisos van por número. El nombre es para las personas.»
6. Se devuelve la línea con `echo` y `whoami` vuelve a contestar.

**Cierre** «Rómpelo aquí, no en clase. relavops.org»

**Descripción** Si borras tu línea de /etc/passwd, Linux deja de saber tu nombre y sigues siendo root. #linux #terminal #sysadmin #asir #smr

**Por comprobar** Con qué usuario entra el alumno en ese lab y qué prompt usa.

---

## Semana 3, del 30 de noviembre al 4 de diciembre

### 11. Una /26

**Serie** C · **Lección** la 2.3 aún no existe · **Manda a** `/herramientas/calculadora-subredes` · **Se graba** en la calculadora, que ya es vertical

**Gancho** «¿Cuántas máquinas caben en una /26? Tienes cinco segundos.»
**Otro gancho** «Subredes sin tabla. Solo hay que restar.»

**Pasos**
1. Cuenta atrás de cinco segundos con `192.168.1.0/26` en pantalla.
2. «32 menos 26 son 6 bits para máquinas.»
3. «2 elevado a 6 son 64 direcciones.»
4. «Dos no se usan. La de red y la de difusión. Quedan 62.»
5. Se escribe en la calculadora y sale lo mismo, con el rango.

**Cierre** «La calculadora está en relavops.org/herramientas. Sin cuenta.»

**Descripción** Cuántas máquinas caben en una /26, en tres pasos. Para el examen de redes. #redes #subnetting #asir #smr #examen

**Por comprobar** Qué palabra usa la calculadora para el broadcast, para decir la misma.

### 12. Quién llena el disco

**Serie** B · **Lección** 0.3, sistema de ficheros · **Avería** oculto

**Gancho** «El disco está al 90 % y du dice que no hay nada grande.»
**Otro gancho** «50 megas escondidos en una carpeta que no ves.»

**Pasos**
1. `df -h /datos`. «Más del 90 %. Salta la alerta.»
2. `du -sh /datos/*`. «Sumo las carpetas y no llego ni a la mitad.»
3. «El asterisco no ve lo que empieza por punto.»
4. `du -ah /datos | sort -h | tail`. «Ahora sí. 50 megas dentro de cuatro carpetas ocultas.»
5. `rm` del fichero y `df -h` otra vez. Boss derrotado.

**Cierre** «Es el boss de la lección 0.3. relavops.org»

**Descripción** El boss de la lección 0.3. Un disco lleno y un fichero que du no enseña. #linux #sysadmin #terminal #devops #asir

**Por comprobar** Que la ruta larga del fichero cabe o se puede cortar sin que se pierda.

### 13. Dos enlaces

**Serie** R · **Lección** 0.3, sistema de ficheros

**Gancho** «Hago dos enlaces a un fichero y borro el original. Solo uno sobrevive.»
**Otro gancho** «Enlace duro y enlace simbólico. La diferencia en veinte segundos.»

**Pasos**
1. `echo hola > original`.
2. `ln original duro` y `ln -s original simbolico`. «Dos enlaces al mismo fichero.»
3. `rm original`. «Borro el original.»
4. `cat duro` contesta hola. «El duro era el mismo fichero con otro nombre.»
5. `cat simbolico` da error. «El simbólico solo apuntaba. Y ya no hay a dónde.»

**Cierre** «Pregunta de examen. Y aquí la ves pasar. relavops.org»

**Descripción** Enlace duro y enlace simbólico. Borras el original y solo uno sigue funcionando. #linux #asir #smr #examen #terminal

### 14. La IA contra el boss

**Serie** IA · **Lección** 0.8, Bash · **Avería** comillas

Guion abierto. Se publica lo que pase.

**Gancho** «Este script dice Backup OK cada noche. Es mentira. Se lo paso a una IA.»

**Pasos previstos**
1. `./backup.sh` contesta Backup OK. `prueba-backup` dice que no. «Lleva semanas así.»
2. Se le pasa el script a la IA con una pregunta. «Qué le pasa a este script.»
3. Se pega el script que devuelva.
4. `prueba-backup`. Sale TODO OK o no sale.
5. Si sale. «La IA lo arregla en diez segundos. El script llevaba semanas roto y nadie se lo había preguntado.»
6. Si no sale. Se enseña qué prueba falla y por qué.

**Cierre** «La IA contesta cuando le preguntas. Sospechar te toca a ti. relavops.org»

**Por comprobar** Todo. Lo más probable es que acierte, y el cierre está pensado para eso.

### 15. Ctrl+R

**Serie** C · **Lección** 0.2, la shell

**Gancho** «Deja de pulsar la flecha de arriba cuarenta veces.»
**Otro gancho** «El atajo de la terminal que más tiempo ahorra.»

**Pasos**
1. Se pulsa la flecha arriba muchas veces buscando un comando largo. «Así lo hace casi todo el mundo.»
2. `Ctrl+R`. «Ctrl+R busca en lo que ya has escrito.»
3. Se escribe `grep` y aparece el comando entero. «Tres letras y ahí está.»
4. `Ctrl+R` otra vez. «Otra vez Ctrl+R y va al anterior.»
5. Enter.

**Cierre** «Se practica contra reloj en la lección 0.2. relavops.org»

**Descripción** Ctrl+R busca en el historial de la terminal. Se acabó la flecha de arriba. #linux #terminal #programacion #productividad #asir

---

## Semana 4, del 7 al 11 de diciembre

### 16. La variable vacía

**Serie** R · **Lección** 0.8, Bash

**Gancho** «Este script limpia una carpeta. Con la variable vacía, limpia el disco entero.»
**Otro gancho** «Una línea de Bash que funciona hasta el día que no.»

**Pasos**
1. Se enseña el script, de tres líneas. `DIR=$1` y `rm -rf $DIR/*`.
2. Se cambia `rm` por `echo rm` y se lanza con una carpeta. «Le pongo echo delante para ver qué iba a hacer.»
3. Se lanza sin nada. Sale `rm -rf /bin /boot /dev` y lo demás. «Sin carpeta, la barra se queda sola. Y eso es todo el disco.»
4. Se añade `set -u` arriba y se lanza sin nada. El script se para. «Con set -u, una variable vacía lo detiene.»

**Cierre** «set -euo pipefail en la primera línea. Lección 0.8. relavops.org»

**Descripción** Por qué un script de Bash empieza con set -u. Una variable vacía y rm se lleva el disco. #bash #linux #devops #scripting #asir

**Por comprobar** El mensaje exacto de `set -u`.

### 17. Mañana hay auditoría

**Serie** B · **Lección** 0.6, expresiones regulares · **Avería** emails

**Gancho** «Mañana hay auditoría. Este log está lleno de correos de clientes.»
**Otro gancho** «Cientos de correos que no deberían estar en este log. Una línea los quita.»

**Pasos**
1. `grep -c @ soporte.log`. «Cientos de correos donde no tocan.»
2. «A mano no se acaba nunca. Con un patrón, sí.»
3. Se construye el patrón por trozos con `grep -oE`. «Letras y números, una arroba y un dominio.»
4. `sed -E -i` con ese patrón y `[email]`. «sed cambia cada uno por [email].»
5. `grep -c @ soporte.log` da 0. Boss derrotado y 70 XP.

**Cierre** «Es el boss de la lección 0.6. relavops.org»

**Descripción** El boss de la lección 0.6. Anonimizar un log entero con una expresión regular y sed. #regex #linux #protecciondedatos #devops #asir

**Por comprobar** Que el patrón del `lab.yaml` cabe en pantalla. Cuántos correos hay de verdad, para no decir «cientos» si son cuarenta.

### 18. Cuatro comandos

**Serie** C · **Lección** 0.5, texto y tuberías

**Gancho** «Cuatro comandos que resumen cualquier log.»
**Otro gancho** «sort, uniq, sort y head. En ese orden.»

**Pasos**
1. `awk '{print $1}' access.log | head`. «Saco una columna. Aquí, la IP.»
2. Se añade `| sort`. «Las junto.»
3. Se añade `| uniq -c`. «Cuento las repetidas.»
4. Se añade `| sort -rn | head`. «Ordeno por cantidad y me quedo con las primeras.»
5. Se cambia `$1` por `$7`. «Cambio la columna y son las páginas más pedidas.»

**Cierre** «Vale para cualquier log. Lección 0.5. relavops.org»

**Descripción** sort, uniq -c, sort -rn y head. La tubería que resume cualquier log. #linux #terminal #devops #sysadmin #asir

### 19. La contraseña en el repo

**Serie** IA · **Lección** 0.9, Git · **Avería** secreto

Guion abierto.

**Gancho** «Acabo de subir una contraseña al repositorio. Le pregunto a una IA cómo quitarla.»

**Pasos previstos**
1. `git show --stat` y sale `.env` en el último commit. «Iba con prisa y he hecho git add de todo.»
2. La pregunta. «He hecho commit de un .env con una contraseña, cómo lo quito.»
3. Se pegan los comandos que dé.
4. `git log --all -- .env` no devuelve nada. Boss derrotado o no.
5. «Fuera del historial. Pero esa contraseña ya ha estado ahí. Se cambia.»

**Cierre** «Borrar el fichero no borra el historial. Lección 0.9. relavops.org»

**Por comprobar** Todo. Si la IA avisa de cambiar la contraseña, se dice que lo ha avisado.

### 20. kill -9

**Serie** R · **Lección** 0.1 y, cuando exista, la 1.3 de procesos

**Gancho** «kill -9 mata cualquier proceso. Menos uno.»
**Otro gancho** «Intento matar el proceso 1. No se deja.»

**Pasos**
1. `sleep 999 &` y `kill -9` con su PID. «kill -9 no pregunta. El proceso desaparece.»
2. `ps -p 1`. «Este es el proceso 1. El primero que arranca.»
3. `kill -9 1`. No pasa nada.
4. `ps -p 1` y sigue ahí. «Ni se entera.»
5. «Si el 1 muere, cae todo lo demás. El kernel no deja que lo mates desde dentro.»

**Cierre** «Pruébalo. Aquí puedes. relavops.org»

**Descripción** kill -9 mata cualquier proceso menos el número 1. #linux #sysadmin #terminal #devops #asir

**Por comprobar** Qué proceso es el 1 dentro del lab y que de verdad ignora la señal.

---

## P1. El panel del profe (horizontal)

**Para** LinkedIn y el mensaje a profes · **Formato** 1280 por 720, un minuto · **Se puede grabar ya**

**Tarjeta inicial** «relavops para profes. Una clase en un minuto.»

**Pasos**
1. Se crea una clase. «Creas la clase y le pones nombre.»
2. Sale el código. «Repartes este código, o el enlace.»
3. Se crean cuentas en bloque. «Si tus alumnos no tienen correo, las creas tú de golpe.»
4. Se abre la tabla de progreso. «Ves por dónde va cada uno, lección a lección.»
5. Se remarca quien está en un lab. «Y quién está en una máquina ahora mismo.»
6. «Es gratis. No hay que instalar nada en el aula.»

**Tarjeta final** «relavops.org. Soy profe.»

**Por comprobar** Se graba en local con una clase de prueba y nombres inventados.

---

## Los tres de prueba

Antes del día 16 se graban el 1, el 2 y el 7. Son uno de cada serie que no depende de una IA. Con ellos se ajusta el modo de grabación vertical, el tamaño de la letra y el ritmo.
