// 0.4 · Permisos. Usuarios y grupos, rwx, chmod, chown, carpetas, octal y bits especiales.
import type { Leccion } from './tipos';

const L = 'n0-4a-rwx';
const PRACTICA = 'n0-4-permisos';
const siNo = { si: ['sí', 'ok'], no: ['no', 'mal'] };

export const leccion: Leccion = {
  id: '0.4',
  titulo: 'Permisos',
  minutos: 35,
  resumen: 'Sabes leer y cambiar permisos con letras y con números, cambiar de dueño y de grupo, y que para llegar a un fichero hace falta poder entrar en cada carpeta del camino.',
  pasos: [
    {
      titulo: 'Una máquina, muchos usuarios',
      lab: L,
      w: [
        { t: 'analogia', icono: 'users', de: 'Linux', es: 'es como un edificio con vecinos. Cada usuario tiene su casa y no entra en la de otro sin permiso.' },
        { t: 'texto', md: 'En esta máquina viven **ana** y **luis**. Tú eres **root**, el administrador, que puede con todo.' },
        { t: 'texto', md: 'Por eso a ti los permisos no te frenan. Las luces de esta lección miran lo que pueden hacer ana y luis. Para eso el lab lanza comandos como ellos, con `su ana -c "comando"`.' },
        { t: 'haz', paso: 'whoami', md: 'Escribe `whoami`. Te dice quién eres.' },
      ],
    },
    {
      titulo: 'Grupos',
      w: [
        { t: 'analogia', icono: 'users', de: 'Un grupo', es: 'es una lista de usuarios que comparten cosas, como los socios de un club.' },
        { t: 'texto', md: 'En esta máquina hay un grupo **club**. luis es socio y ana no.' },
        { t: 'haz', paso: 'id', md: 'Escribe `id luis` y luego `id ana`. Compara sus grupos.' },
      ],
    },
    {
      titulo: 'Leer los permisos',
      w: [
        { t: 'anatomia', partes: [['-', 'tipo'], ['rw-', 'el dueño', 'ok'], ['r--', 'el grupo', 'aviso'], ['r--', 'el resto', 'mal'], ['root', 'dueño', 'ok'], ['root', 'grupo', 'aviso'], ['socios.txt', 'nombre', 'suave']] },
        { t: 'texto', md: 'Es lo que ves con `ls -l`. El primer carácter dice qué es. Un guion es un fichero y una d es una carpeta. Luego van tres bloques de tres letras.' },
        { t: 'haz', paso: 'lsl', md: 'Escribe `ls -l /srv/club`.' },
      ],
    },
    {
      titulo: 'r, w y x',
      w: [
        { t: 'tabla', cab: ['Letra', 'En un fichero', 'En una carpeta'], filas: [['**r**', 'leerlo', 'ver qué hay dentro'], ['**w**', 'cambiarlo', 'crear o borrar cosas dentro'], ['**x**', 'ejecutarlo como programa', 'entrar y pasar por ella']] },
        { t: 'texto', md: 'Fíjate en la w de las carpetas. Borrar un fichero es quitar su nombre de la carpeta. Por eso poder borrarlo depende de la w de la carpeta, no de la del fichero.' },
        { t: 'texto', md: 'Tócalos. Debajo ves cómo quedaría en `ls -l` y su número, que verás enseguida.' },
        { t: 'rwx', inicial: '640' },
        { t: 'haz', paso: 'lsd', md: 'Tu casa también tiene permisos. Míralos con `ls -ld /root`. Con `-d` ls enseña la carpeta en sí y no lo que hay dentro.' },
      ],
    },
    {
      titulo: 'ana quiere leer el diario',
      w: [
        { t: 'estado', efecto: true, sonda: 'ana-lee', titulo: '¿ana puede leer diario.txt?', mapa: siNo },
        { t: 'rwx', tras: 'lsl', sonda: 'perm-diario', fichero: 'diario.txt', inicial: '600' },
        { t: 'anatomia', partes: [['chmod', 'cambia permisos'], ['o', 'a quién'], ['+r', 'qué'], ['/srv/club/diario.txt', 'qué fichero']] },
        { t: 'texto', md: '**u** es el dueño, **g** el grupo y **o** el resto. Con `+` das y con `-` quitas. ana no es la dueña ni del club, así que para ella cuenta el resto.' },
        { t: 'haz', paso: 'leer', md: 'Haz que el resto pueda leer el diario. Mira la luz.' },
      ],
    },
    {
      titulo: 'El diario, para ana',
      w: [
        { t: 'estado', efecto: true, sonda: 'ana-escribe', titulo: '¿ana puede escribir en diario.txt?', mapa: siNo },
        { t: 'anatomia', partes: [['chown', 'cambia el dueño'], ['ana', 'nueva dueña'], ['/srv/club/diario.txt', 'qué fichero']] },
        { t: 'haz', paso: 'duena', md: 'Haz a ana dueña del diario. Como el dueño tiene rw, ahora puede escribir.' },
        { t: 'rwx', tras: 'lsl', sonda: 'perm-diario', fichero: 'diario.txt', inicial: '644' },
      ],
    },
    {
      titulo: 'Ejecutar',
      w: [
        { t: 'estado', efecto: true, sonda: 'ana-ejecuta', titulo: '¿ana puede ejecutar saluda.sh?', mapa: siNo },
        { t: 'rwx', tras: 'lsl', sonda: 'perm-saluda', fichero: 'saluda.sh', inicial: '644' },
        { t: 'texto', md: 'Un **script** es un fichero con comandos dentro. Para lanzarlo como programa necesita la x.' },
        { t: 'haz', paso: 'ejecutar', md: 'Escribe `chmod +x /srv/club/saluda.sh`. Sin letra delante, se da a todos.' },
      ],
    },
    {
      titulo: 'Las carpetas también',
      w: [
        { t: 'texto', md: 'Para llegar a un fichero hay que poder **entrar** en cada carpeta del camino. Eso es la x de las carpetas.' },
        { t: 'estado', efecto: true, sonda: 'ana-secreto', titulo: '¿ana puede leer /srv/secreto/clave.txt?', mapa: siNo },
        { t: 'rwx', tras: 'lsl', sonda: 'perm-secreto', fichero: 'la carpeta /srv/secreto', inicial: '700' },
        { t: 'texto', md: 'clave.txt deja leer a todos, pero la carpeta solo deja pasar a root.' },
        { t: 'haz', paso: 'carpeta', md: 'Abre la carpeta con `chmod 755 /srv/secreto`. Ese número lo vas a entender en el paso siguiente.' },
      ],
    },
    {
      titulo: 'Los números',
      w: [
        { t: 'texto', md: 'Cada letra vale un número. **r vale 4, w vale 2 y x vale 1**. Se suman por bloques y salen tres cifras.' },
        { t: 'anatomia', partes: [['7', 'rwx = 4+2+1', 'ok'], ['5', 'r-x = 4+1', 'aviso'], ['5', 'r-x = 4+1', 'mal']], nota: 'Por eso 755 es todo para el dueño y leer y entrar para los demás.' },
        { t: 'tabla', cab: ['Número', 'Letras', 'Para qué'], filas: [['644', 'rw-r--r--', 'un fichero normal'], ['600', 'rw-------', 'algo privado'], ['755', 'rwxr-xr-x', 'un programa o una carpeta'], ['700', 'rwx------', 'una carpeta privada']] },
        { t: 'texto', md: '`stat -c %a fichero` te da el número directamente.' },
        { t: 'huecos', md: '¿Qué número es `rw-r-----`?', plantilla: 'chmod ___ fichero', respuestas: ['640'], pista: 'rw- es 4+2, r-- es 4 y --- es 0.' },
        { t: 'haz', paso: 'stat', md: 'Comprueba el número de diario.txt con `stat -c %a /srv/club/diario.txt`.' },
      ],
    },
    {
      titulo: 'La lista de socios',
      w: [
        { t: 'estado', efecto: true, sonda: 'luis-socios', titulo: '¿luis, del club, puede escribir en socios.txt?', mapa: siNo },
        { t: 'estado', efecto: true, sonda: 'ana-socios', titulo: '¿ana puede leerla?', mapa: siNo },
        { t: 'rwx', tras: 'lsl', sonda: 'perm-socios', fichero: 'socios.txt', inicial: '644' },
        { t: 'texto', md: '`chgrp` cambia el grupo. También vale `chown root:club`, dueño y grupo a la vez.' },
        { t: 'haz', paso: 'octal', md: 'Pon `socios.txt` en el grupo club y en 664. Así los del club escriben y el resto solo lee.', pista: 'chgrp club /srv/club/socios.txt && chmod 664 /srv/club/socios.txt' },
      ],
    },
    {
      titulo: 'Tres bits especiales',
      w: [
        { t: 'tabla', cab: ['Bit', 'Número', 'En la práctica'], filas: [['setgid en una carpeta', '2000', 'lo que se crea dentro hereda el grupo de la carpeta. Ideal para carpetas de equipo'], ['sticky', '1000', 'en una carpeta de todos, cada uno solo borra lo suyo. Así es /tmp'], ['setuid', '4000', 'el programa se ejecuta como su dueño. Así cambias tu contraseña con passwd']] },
        { t: 'texto', md: 'Van delante de las otras tres cifras. `chmod 2770 carpeta` es setgid más rwx para dueño y grupo.' },
        { t: 'haz', paso: 'lstmp', md: 'Mira /tmp con `ls -ld /tmp`. La t del final es el sticky.' },
      ],
    },
    {
      titulo: 'Contrarreloj',
      w: [
        { t: 'rapido', md: 'Escribe el número. Necesitas 3 aciertos.', segundos: 40, preguntas: [['rw-r--r--', ['644']], ['rwxr-xr-x', ['755']], ['rw-------', ['600']], ['rwx------', ['700']], ['rw-rw-r--', ['664']], ['rwxrwx---', ['770']], ['r--r--r--', ['444']]] },
      ],
    },
    {
      titulo: 'Práctica',
      lab: PRACTICA,
      w: [
        { t: 'texto', md: 'Un equipo de trabajo con sus carpetas. Pon orden.' },
        { t: 'mision' },
      ],
    },
    {
      titulo: 'El boss',
      w: [
        { t: 'texto', md: 'Un backup que se ejecuta cada noche ha dejado de funcionar. Arréglalo sin abrir permisos de escritura a todo el mundo.' },
        { t: 'boss' },
      ],
    },
    {
      titulo: 'Lo que te llevas',
      w: [
        { t: 'chuleta', items: [['whoami · id usuario', 'quién soy y sus grupos'], ['ls -l', 'ver permisos'], ['chmod o+r · u+x · g-w', 'cambiar con letras'], ['chmod 640', 'cambiar con números'], ['chown ana · chgrp club', 'dueño y grupo'], ['stat -c %a f', 'el número de un fichero'], ['chmod 2770 · 1777', 'setgid y sticky'], ['su ana -c "cmd"', 'probar como otra persona']] },
        { t: 'aviso', md: 'Nunca arregles un problema de permisos con `chmod 777`. Funciona porque se lo abre a todo el mundo.' },
      ],
    },
  ],
};
