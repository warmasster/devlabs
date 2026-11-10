// 0.3 · Sistema de ficheros. Carpetas, rutas, crear, copiar, mover, borrar, buscar, inodos y enlaces.
import type { Leccion } from './tipos';

const L = 'n0-3a-arbol';
const PRACTICA = 'n0-3-ficheros';
const arbolVivo = { t: 'arbol', sonda: 'arbol@lab', aqui: 'aqui@lab', raiz: '/root/casa', tras: 'pwd' };

export const leccion: Leccion = {
  id: '0.3',
  titulo: 'Sistema de ficheros',
  minutos: 40,
  resumen: 'Te mueves por carpetas con rutas absolutas y relativas, creas, copias, mueves, borras y buscas ficheros. Y sabes que un nombre apunta a un inodo, que es el fichero de verdad.',
  pasos: [
    {
      titulo: 'Ficheros y carpetas',
      lab: L,
      w: [
        { t: 'analogia', icono: 'folder', de: 'Una carpeta', es: 'es una caja con nombre. Dentro guardas ficheros y otras carpetas.' },
        { t: 'texto', md: 'Las carpetas también se llaman **directorios**. Es lo mismo.' },
        { t: 'texto', md: '`ls -F` pone una barra detrás de cada carpeta. Así se distinguen de los ficheros.' },
        { t: 'haz', paso: 'lsF', md: 'Escribe `ls -F`.' },
      ],
    },
    {
      titulo: 'Todo cuelga de /',
      w: [
        { t: 'texto', md: 'En Linux no hay `C:` ni `D:`. Hay una sola raíz, que se escribe `/`, y todo cuelga de ella.' },
        { t: 'haz', paso: 'lsraiz', md: 'Escribe `ls /` para ver lo que cuelga de la raíz.' },
        { t: 'arbol', tras: 'lsraiz', items: ['d /etc', 'f /etc/hosts', 'd /home', 'd /home/ana', 'd /root', 'd /tmp', 'd /usr', 'd /usr/bin', 'd /var', 'd /var/log'] },
        { t: 'tabla', cab: ['Carpeta', 'Qué hay'], filas: [['`/etc`', 'la configuración'], ['`/home`', 'una carpeta por usuario'], ['`/root`', 'la casa de root, el administrador'], ['`/tmp`', 'cosas temporales'], ['`/usr/bin`', 'los programas'], ['`/var/log`', 'los diarios de lo que pasa, los logs']] },
      ],
    },
    {
      titulo: 'Dónde estás',
      w: [
        { t: 'texto', md: 'Tu shell siempre está dentro de alguna carpeta. `pwd` te dice cuál.' },
        { t: 'haz', paso: 'pwd', md: 'Escribe `pwd`.' },
        { t: 'texto', md: 'Estás en `/root`, tu casa. Dentro hay una carpeta `casa` con cosas. Aquí la ves en vivo.' },
        { ...arbolVivo, tras: 'pwd' },
      ],
    },
    {
      titulo: 'Entrar en una carpeta',
      w: [
        { t: 'anatomia', partes: [['cd', 'cambia de carpeta'], ['casa', 'a cuál']] },
        { t: 'haz', paso: 'cdcasa', md: 'Escribe `cd casa`. Mira cómo cambia tu prompt.' },
        { t: 'haz', paso: 'ls', md: 'Escribe `ls` para ver qué hay dentro.' },
        { ...arbolVivo, tras: 'ls' },
      ],
    },
    {
      titulo: 'Leer lo que hay',
      w: [
        { t: 'haz', paso: 'cddoc', md: 'Entra en `documentos`.' },
        { t: 'haz', paso: 'cat', md: 'Lee `nota.txt` con `cat`.' },
        { t: 'fichero', sonda: 'cat@lab', titulo: 'Lo que lees', mantener: true },
        arbolVivo,
      ],
    },
    {
      titulo: 'Rutas absolutas y relativas',
      w: [
        { t: 'comparar', a: { titulo: 'Absoluta', icono: 'map-pin', puntos: ['empieza por `/`', 'sirve desde cualquier sitio', '`/root/casa/fotos`'] }, b: { titulo: 'Relativa', icono: 'footprints', puntos: ['empieza desde donde estás', 'más corta', '`fotos` si ya estás en casa'] } },
        { t: 'tabla', cab: ['Atajo', 'Quiere decir'], filas: [['`..`', 'la carpeta de arriba'], ['`.`', 'esta carpeta'], ['`~`', 'tu casa, /root']] },
        { t: 'haz', paso: 'subir', md: 'Escribe `cd ..` y mira dónde quedas.' },
        arbolVivo,
      ],
    },
    {
      titulo: 'Juego de rutas',
      w: [
        { t: 'ruta', md: 'Busca el fichero `hosts` tocando carpetas y luego escribe su ruta absoluta.', objetivo: '/etc/hosts', arbol: ['/etc/hosts', '/etc/passwd', '/etc/nginx/nginx.conf', '/home/ana/notas.txt', '/var/log/syslog', '/root/casa/documentos/nota.txt'] },
        { t: 'clasifica', cubos: ['Absoluta', 'Relativa'], items: [['`/var/log`', 0], ['`fotos/playa.jpg`', 1], ['`../musica`', 1], ['`/root/casa`', 0], ['`./nota.txt`', 1], ['`/etc/hosts`', 0]] },
      ],
    },
    {
      titulo: 'Crear',
      w: [
        { t: 'tabla', cab: ['Comando', 'Hace'], filas: [['`mkdir carpeta`', 'crea una carpeta'], ['`mkdir -p a/b/c`', 'crea también las de arriba si faltan'], ['`touch fichero`', 'crea un fichero vacío']] },
        { t: 'haz', paso: 'mkdir', md: 'Crea la carpeta `/root/casa/proyectos`.' },
        { t: 'haz', paso: 'touch', md: 'Crea dentro un fichero vacío llamado `idea.txt`.', pista: 'touch /root/casa/proyectos/idea.txt' },
        arbolVivo,
      ],
    },
    {
      titulo: 'Copiar, mover y borrar',
      w: [
        { t: 'anatomia', partes: [['cp', 'copia'], ['origen', 'qué'], ['destino', 'adónde']] },
        { t: 'haz', paso: 'cp', md: 'Copia `nota.txt` de documentos a proyectos.', pista: 'cp /root/casa/documentos/nota.txt /root/casa/proyectos/' },
        { t: 'texto', md: '`mv` funciona igual pero no deja copia. Sirve para mover un fichero o para cambiarle el nombre.' },
        { t: 'haz', paso: 'mv', md: 'Renombra `musica/cancion.mp3` a `musica/favorita.mp3`.', pista: 'mv /root/casa/musica/cancion.mp3 /root/casa/musica/favorita.mp3' },
        { t: 'aviso', tipo: 'mal', md: '`rm` borra sin papelera. No hay deshacer. Para carpetas con cosas dentro se usa `rm -r`.' },
        { t: 'haz', paso: 'rm', md: 'Borra `/root/casa/basura.tmp`.' },
        arbolVivo,
      ],
    },
    {
      titulo: 'Comodines',
      w: [
        { t: 'texto', md: 'El asterisco quiere decir cualquier cosa. `*.log` son todos los nombres que acaban en .log.' },
        { t: 'haz', paso: 'comodin', md: 'Pruébalo. Escribe `ls /root/casa/documentos/*.log`.' },
        { t: 'texto', md: 'El asterisco no lo entiende `ls`, lo entiende la shell. Antes de lanzar el programa, bash cambia `*.log` por todos los nombres que encajan. A `ls` ya le llega la lista hecha.' },
        { t: 'quiz', q: '¿Qué nombres encajan con `foto*.jpg`?', ops: ['Solo `foto.jpg`', '`foto1.jpg` y `foto-playa.jpg`', 'Todos los ficheros'], ok: 1, porque: 'Empieza por foto, luego cualquier cosa y acaba en .jpg.' },
      ],
    },
    {
      titulo: 'Buscar',
      w: [
        { t: 'anatomia', partes: [['find', 'busca'], ['/root/casa', 'desde dónde'], ['-name', 'por nombre'], ["'*.log'", 'el patrón']] },
        { t: 'texto', md: "Las comillas de `'*.log'` hacen falta. Sin ellas, la shell cambiaría el asterisco por los nombres de la carpeta donde estás antes de que find lo vea. Con comillas le llega tal cual, y find lo busca en todas las carpetas." },
        { t: 'haz', paso: 'find', md: 'Busca todos los `.log` de `/root/casa`.' },
        { t: 'texto', md: 'find también busca por tamaño. `find / -size +100M` encuentra lo que pesa más de 100 MB.' },
      ],
    },
    {
      titulo: 'Qué ocupa',
      w: [
        { t: 'texto', md: '`df -h` ya lo conoces, dice cuánto queda en el disco. `du -sh` dice cuánto pesa cada carpeta o fichero.' },
        { t: 'haz', paso: 'du', md: 'Escribe `du -sh /root/casa/*`.' },
        { t: 'aviso', md: '`du` con `*` no enseña lo que empieza por punto, que son ficheros ocultos. Para verlos todos, `du -ah`.' },
      ],
    },
    {
      titulo: 'Un nombre no es el fichero',
      w: [
        { t: 'escena', escena: {
          alto: 260,
          nodos: [
            { id: 'n1', x: 140, y: 80, w: 170, txt: 'original.txt', sub: 'un nombre', color: 'acento', forma: 'doc', info: 'Un nombre dentro de una carpeta. Apunta a un número.' },
            { id: 'ino', x: 450, y: 130, w: 180, txt: 'inodo 812', sub: 'el fichero de verdad', color: 'xp', info: 'Guarda el dueño, los permisos, el tamaño y dónde están los datos. Todo menos el nombre.' },
            { id: 'datos', x: 760, y: 130, w: 150, txt: 'datos', sub: 'en el disco', color: 'suave', forma: 'cilindro', info: 'Lo que hay escrito dentro.' },
            { id: 'n2', x: 140, y: 190, w: 170, txt: 'duro.txt', sub: 'otro nombre', color: 'ok', forma: 'doc', info: 'Un enlace duro. Otro nombre para el mismo inodo.' },
          ],
          flechas: [{ id: 'a', de: 'n1', a: 'ino' }, { id: 'b', de: 'ino', a: 'datos' }, { id: 'c', de: 'n2', a: 'ino', color: 'ok' }],
          pasos: [
            { texto: 'Un nombre como original.txt no es el fichero. Es una etiqueta que apunta a un número, el **inodo**.', ver: ['n1', 'ino', 'a'], luz: ['ino'] },
            { texto: 'El inodo sabe dónde están los datos en el disco.', ver: ['datos', 'b'], luz: ['datos'] },
            { texto: 'Puedes poner un segundo nombre al mismo inodo. Es un **enlace duro**. Ninguno de los dos es más original que el otro.', ver: ['n2', 'c'], luz: ['n2', 'ino'] },
          ],
        } },
        { t: 'texto', md: '`ls -i` enseña el número de inodo delante de cada nombre.' },
        { t: 'haz', paso: 'lsi', md: 'Mira los números de inodo de la carpeta enlaces con `ls -i /root/enlaces`.' },
      ],
    },
    {
      titulo: 'Enlace duro, en tu máquina',
      w: [
        { t: 'inodos', sonda: 'inodos@lab', tras: 'lsi' },
        { t: 'haz', paso: 'duro', md: 'Entra en `/root/enlaces` y escribe `ln original.txt duro.txt`. Mira cómo los dos nombres van al mismo inodo.' },
      ],
    },
    {
      titulo: 'Enlace simbólico',
      w: [
        { t: 'texto', md: 'Un **enlace simbólico** es otra cosa. Es un fichero pequeñito que guarda una ruta, como un acceso directo.' },
        { t: 'haz', paso: 'simbolico', md: 'Escribe `ln -s original.txt atajo.txt`.' },
        { t: 'inodos', sonda: 'inodos@lab', tras: 'lsi' },
      ],
    },
    {
      titulo: 'Borra el original',
      w: [
        { t: 'quiz', q: 'Si borras `original.txt`, ¿qué crees que pasa?', ops: ['Los dos enlaces dejan de funcionar', '`duro.txt` sigue bien y `atajo.txt` se rompe', '`atajo.txt` sigue bien y `duro.txt` se rompe'], ok: 1, porque: 'duro.txt apunta al inodo, que sigue vivo. atajo.txt guardaba la ruta original.txt, que ya no existe.' },
        { t: 'haz', paso: 'borraorig', md: 'Compruébalo. Escribe `rm original.txt` y luego `cat duro.txt` y `cat atajo.txt`.' },
        { t: 'inodos', sonda: 'inodos@lab', tras: 'lsi' },
      ],
    },
    {
      titulo: 'Borrado pero ocupando',
      w: [
        { t: 'texto', md: 'Los datos de un fichero se liberan cuando ningún nombre apunta a su inodo **y** ningún programa lo tiene abierto.' },
        { t: 'texto', md: 'Si un programa tiene abierto un fichero que ya borraste, sigue ocupando el disco. Linux enseña los ficheros abiertos de cada proceso en `/proc/PID/fd`, y los borrados salen marcados con *(deleted)*.' },
        { t: 'aviso', md: 'Esto te va a hacer falta en el boss.' },
        { t: 'haz', paso: 'procfd', md: 'Mira los ficheros que tiene abiertos el proceso 1 con `ls -l /proc/1/fd`. Cada número de la izquierda es un fichero abierto.' },
      ],
    },
    {
      titulo: 'Práctica',
      lab: PRACTICA,
      w: [
        { t: 'texto', md: 'Un servidor desordenado. Ordénalo.' },
        { t: 'mision' },
      ],
    },
    {
      titulo: 'El boss',
      w: [
        { t: 'texto', md: 'Un disco se está llenando y hay que saber por qué sin tocar los datos buenos.' },
        { t: 'boss' },
      ],
    },
    {
      titulo: 'Lo que te llevas',
      w: [
        { t: 'chuleta', items: [['pwd · cd · ls', 'dónde estoy, moverme, mirar'], ['mkdir -p · touch', 'crear'], ['cp · mv · rm -r', 'copiar, mover, borrar'], ['find ruta -name', 'buscar por nombre'], ['find ruta -size +5M', 'buscar por tamaño'], ['du -sh · df -h', 'qué ocupa y qué queda'], ['ln · ln -s', 'enlace duro y simbólico'], ['ls -i', 'ver inodos']] },
      ],
    },
  ],
};
