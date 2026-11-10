// 0.2 · Sistema de ficheros. Carpetas, rutas, crear, copiar, mover, borrar, buscar, inodos y enlaces.
import type { Leccion } from './tipos';

const L = 'n0-2a-arbol';
const PRACTICA = 'n0-2-ficheros';
const arbolVivo = { t: 'arbol', sonda: 'arbol@lab', aqui: 'aqui@lab', raiz: '/root/casa', tras: 'pwd' };

export const leccion: Leccion = {
  id: '0.2',
  titulo: 'Sistema de ficheros',
  minutos: 45,
  resumen: 'Te mueves por carpetas con rutas absolutas y relativas, creas, copias, mueves, borras y buscas ficheros. Y sabes que un nombre apunta a un inodo, que es el fichero de verdad.',
  pasos: [
    {
      titulo: 'Ficheros y carpetas',
      lab: L,
      w: [
        { t: 'texto', md: 'Las carpetas ya las conoces del tutorial. También se llaman **directorios**. Es lo mismo.' },
        { t: 'comando', cmd: 'ls', ops: [['-F', 'pone una barra detrás de cada carpeta, para distinguirlas de los ficheros']] },
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
        { t: 'comando', cmd: 'pwd', hace: 'Dice en qué carpeta estás ahora mismo.', uso: 'pwd' },
        { t: 'haz', paso: 'pwd', md: 'Escribe `pwd`.' },
        { t: 'texto', md: 'Estás en `/root`, tu casa. Dentro hay una carpeta `casa` con cosas. Aquí la ves en vivo.' },
        { ...arbolVivo, tras: 'pwd' },
      ],
    },
    {
      titulo: 'Entrar en una carpeta',
      w: [
        { t: 'texto', md: '`cd` ya lo usaste en la lección de la shell. Ahora te mueves con él de verdad.' },
        { t: 'anatomia', partes: [['cd', 'cambia de carpeta'], ['casa', 'a cuál']] },
        { t: 'haz', paso: 'cdcasa', md: 'Escribe `cd casa`. Mira cómo cambia tu prompt.' },
        { t: 'haz', paso: 'ls', md: 'Escribe `ls` para ver qué hay dentro.' },
        { ...arbolVivo, tras: 'ls' },
      ],
    },
    {
      titulo: 'Leer lo que hay',
      w: [
        { t: 'haz', paso: 'cddoc', md: 'Entra en `documentos` con `cd`.', pista: 'cd documentos' },
        { t: 'haz', paso: 'cat', md: 'Lee `nota.txt` con `cat`.', pista: 'cat nota.txt' },
        { t: 'fichero', sonda: 'cat@lab', titulo: 'Lo que lees', mantener: true },
        arbolVivo,
      ],
    },
    {
      titulo: 'Rutas absolutas y relativas',
      w: [
        { t: 'analogia', icono: 'map-pin', de: 'Una ruta', es: 'es el camino hasta un fichero o una carpeta, con una barra `/` entre cada tramo.' },
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
        { t: 'comando', cmd: 'mkdir', hace: 'Crea una carpeta.', partes: [['mkdir', 'el programa'], ['/root/casa/proyectos', 'la carpeta nueva']], ops: [['-p', 'crea también las carpetas de en medio si faltan']] },
        { t: 'haz', paso: 'mkdir', md: 'Crea la carpeta `/root/casa/proyectos`.', pista: 'mkdir /root/casa/proyectos' },
        { t: 'comando', cmd: 'touch', hace: 'Crea un fichero vacío.', partes: [['touch', 'el programa'], ['idea.txt', 'el fichero nuevo']] },
        { t: 'haz', paso: 'touch', md: 'Crea dentro de `proyectos` un fichero vacío llamado `idea.txt`.', pista: 'touch /root/casa/proyectos/idea.txt' },
        arbolVivo,
      ],
    },
    {
      titulo: 'Copiar y mover',
      w: [
        { t: 'comando', cmd: 'cp', hace: 'Copia un fichero. El original se queda donde estaba.', partes: [['cp', 'copia'], ['origen', 'qué'], ['destino', 'adónde']] },
        { t: 'haz', paso: 'cp', md: 'Copia `nota.txt` de documentos a proyectos.', pista: 'cp /root/casa/documentos/nota.txt /root/casa/proyectos/' },
        { t: 'comando', cmd: 'mv', hace: 'Mueve un fichero a otro sitio o le cambia el nombre. No deja copia.', partes: [['mv', 'mueve'], ['origen', 'qué'], ['destino', 'adónde o qué nombre nuevo']] },
        { t: 'haz', paso: 'mv', md: 'Renombra `musica/cancion.mp3` a `musica/favorita.mp3`.', pista: 'mv /root/casa/musica/cancion.mp3 /root/casa/musica/favorita.mp3' },
        arbolVivo,
      ],
    },
    {
      titulo: 'Borrar',
      w: [
        { t: 'comando', cmd: 'rm', hace: 'Borra un fichero. No hay papelera ni deshacer.', partes: [['rm', 'borra'], ['basura.tmp', 'qué fichero']], ops: [['-r', 'borra una carpeta con todo lo que tiene dentro']] },
        { t: 'aviso', tipo: 'mal', md: 'Lo que borras con `rm` no vuelve. Lee la línea dos veces antes de pulsar Enter.' },
        { t: 'haz', paso: 'rm', md: 'Borra `/root/casa/basura.tmp`.', pista: 'rm /root/casa/basura.tmp' },
        arbolVivo,
      ],
    },
    {
      titulo: 'Comodines',
      w: [
        { t: 'comando', cmd: '*', simbolo: true, hace: 'Quiere decir cualquier cosa. `*.log` son todos los nombres que acaban en .log.', uso: 'ls *.log' },
        { t: 'haz', paso: 'comodin', md: 'Pruébalo. Escribe `ls /root/casa/documentos/*.log`.' },
        { t: 'texto', md: 'El asterisco no lo entiende `ls`, lo entiende la shell. Antes de lanzar el programa, bash cambia `*.log` por todos los nombres que encajan. A `ls` ya le llega la lista hecha.' },
        { t: 'quiz', q: '¿Qué nombres encajan con `foto*.jpg`?', ops: ['Solo `foto.jpg`', '`foto1.jpg` y `foto-playa.jpg`', 'Todos los ficheros'], ok: 1, porque: 'Empieza por foto, luego cualquier cosa y acaba en .jpg.' },
      ],
    },
    {
      titulo: 'Buscar',
      w: [
        { t: 'comando', cmd: 'find', hace: 'Busca ficheros dentro de una carpeta y de todas las que cuelgan de ella.', partes: [['find', 'busca'], ['/root/casa', 'desde dónde'], ['-name', 'por nombre'], ["'*.log'", 'el patrón']], ops: [['-name', 'busca por nombre'], ['-size', 'busca por tamaño. `-size +5M` es lo que pesa más de 5 megas']] },
        { t: 'texto', md: "Las comillas de `'*.log'` hacen falta. Sin ellas, la shell cambiaría el asterisco por los nombres de la carpeta donde estás antes de que find lo vea. Con comillas le llega tal cual, y find lo busca en todas las carpetas." },
        { t: 'haz', paso: 'find', md: 'Busca todos los `.log` de `/root/casa`.', pista: "find /root/casa -name '*.log'" },
      ],
    },
    {
      titulo: 'Qué ocupa',
      w: [
        { t: 'comando', cmd: 'df', hace: 'Dice cuánto disco hay y cuánto queda libre.', ops: [['-h', 'pone los tamaños en G y M en vez de números enormes. Viene de *human*']], uso: 'df -h' },
        { t: 'haz', paso: 'df', md: 'Escribe `df -h`. Busca la línea que acaba en `/` y mira la columna Uso%.' },
        { t: 'comando', cmd: 'du', hace: 'Dice cuánto pesa una carpeta o un fichero.', ops: [['-s', 'solo el total de cada cosa, sin entrar al detalle'], ['-h', 'tamaños fáciles de leer'], ['-a', 'fichero a fichero, y también los ocultos']], uso: 'du -sh /root/casa/*' },
        { t: 'haz', paso: 'du', md: 'Escribe `du -sh /root/casa/*`.' },
        { t: 'aviso', md: '`du` con `*` no enseña lo que empieza por punto, que son ficheros ocultos. Para verlo todo, `du -ah` y la carpeta.' },
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
        { t: 'comando', cmd: 'ls', ops: [['-i', 'enseña el número de inodo delante de cada nombre']] },
        { t: 'haz', paso: 'lsi', md: 'Mira los números de inodo de la carpeta enlaces con `ls -i /root/enlaces`.' },
      ],
    },
    {
      titulo: 'Enlace duro, en tu máquina',
      w: [
        { t: 'comando', cmd: 'ln', hace: 'Pone otro nombre a un fichero que ya existe. Es un enlace duro.', partes: [['ln', 'enlaza'], ['original.txt', 'el que ya existe'], ['duro.txt', 'el nombre nuevo']] },
        { t: 'inodos', sonda: 'inodos@lab', tras: 'lsi' },
        { t: 'haz', paso: 'duro', md: 'Entra en `/root/enlaces` con `cd` y escribe `ln original.txt duro.txt`. Mira cómo los dos nombres van al mismo inodo.' },
      ],
    },
    {
      titulo: 'Enlace simbólico',
      w: [
        { t: 'texto', md: 'Un **enlace simbólico** es otra cosa. Es un fichero pequeñito que guarda una ruta, como un acceso directo.' },
        { t: 'comando', cmd: 'ln', ops: [['-s', 'crea un enlace simbólico en vez de uno duro']] },
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
        { t: 'texto', md: 'Cada proceso lleva un número, su **PID**. Linux enseña los ficheros que tiene abiertos cada proceso en la carpeta `/proc/PID/fd`. El proceso 1 es el primero que arranca en la máquina.' },
        { t: 'haz', paso: 'procfd', md: 'Mira los ficheros que tiene abiertos el proceso 1 con `ls -l /proc/1/fd`. Cada número de la izquierda es un fichero abierto.' },
        { t: 'texto', md: 'Si un programa tiene abierto un fichero que ya borraste, el fichero sigue ocupando disco. En esa lista sale marcado con *(deleted)*.' },
      ],
    },
    {
      titulo: 'Libera el espacio',
      w: [
        { t: 'texto', md: 'En tu máquina hay un programa, `acaparador`, que tiene abierto un fichero que alguien borró. Para verlo, mira los ficheros abiertos de todos los procesos a la vez con el asterisco.' },
        { t: 'comando', cmd: 'kill', ops: [['PID', 'con el número de un proceso, le pide que termine']], partes: [['kill', 'el programa'], ['1234', 'el PID del proceso']] },
        { t: 'haz', paso: 'matapid', md: 'Escribe `ls -l /proc/*/fd` y busca la línea que acaba en *(deleted)*. El número que va detrás de `/proc/` en esa parte de la lista es el PID. Termina ese proceso con `kill` y su PID.', pista: 'Las líneas salen agrupadas. Cada grupo empieza por `/proc/NÚMERO/fd`. Ese número es el PID. Luego `kill` y el número.' },
        { t: 'aviso', md: 'Esto te va a hacer falta en el boss.' },
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
        { t: 'chuleta' },
      ],
    },
  ],
};
