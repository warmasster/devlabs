// 0.0 · Tutorial de la plataforma. Antes de nada, aprender a moverse por la pantalla.
import type { Leccion } from './tipos';

const L = 'n0-0-tutorial';

export const leccion: Leccion = {
  id: '0.0',
  titulo: 'Cómo funciona esto',
  minutos: 12,
  resumen: 'Ya sabes moverte por aquí. Escribes comandos en la terminal, la lección mira lo que haces y te deja seguir cuando sale bien. Cada comando nuevo se apunta en tu chuleta. Si algo se lía, pides pista o una máquina limpia.',
  pasos: [
    {
      titulo: 'Aprendes tocando',
      lab: L,
      w: [
        { t: 'analogia', icono: 'monitor', de: 'Aquí, la lección.', es: 'Al lado, una máquina Linux de verdad que es solo para ti. En el móvil está en la pestaña Terminal.' },
        { t: 'texto', md: 'Aquí no hay vídeos largos. Lees un poco, tocas algo y lo haces en tu máquina. La lección mira lo que haces y te avisa cuando está bien.' },
        { t: 'senala', zona: 'maquinas', md: 'Esta tarjeta es tu máquina. Se llama mi-servidor.' },
        { t: 'teclas', obliga: true, combos: [{ k: ['Enter'], que: 'haz clic en la terminal y pulsa Enter. Así compruebas que es tuya', seq: '\r' }] },
      ],
    },
    {
      titulo: 'La terminal',
      w: [
        { t: 'senala', zona: 'terminal', md: 'El recuadro oscuro es la terminal.' },
        { t: 'texto', md: 'En la terminal escribes órdenes y la máquina contesta. A cada orden la llamamos **comando**. Escribes, pulsas Enter y la máquina lo hace.' },
        { t: 'comando', cmd: 'echo', hace: 'Repite en pantalla lo que le pongas detrás.', partes: [['echo', 'el programa'], ['hola', 'lo que le das']] },
        { t: 'haz', paso: 'echo', md: 'Haz clic dentro de la terminal, escribe `echo hola` y pulsa Enter.' },
        { t: 'ultimo', nodo: 'mi-servidor' },
      ],
    },
    {
      titulo: 'Las partes de un comando',
      w: [
        { t: 'texto', md: 'La primera palabra es el programa que quieres usar. Lo que va detrás es lo que le das para trabajar. Entre una cosa y otra va un espacio.' },
        { t: 'texto', md: 'Cada vez que aparece un comando nuevo, la lección te enseña su ficha, como la de `echo` del paso anterior. Dice qué hace y cómo se escribe.' },
        { t: 'quiz', q: 'En `echo buenos días`, ¿cuál es el programa?', ops: ['`echo`', '`buenos`', '`días`'], ok: 0, porque: 'La primera palabra siempre es el programa.' },
        { t: 'haz', paso: 'echo2', md: 'Ahora prueba tú con otra cosa. `echo` y tu nombre, por ejemplo.' },
      ],
    },
    {
      titulo: 'Leer un fichero',
      w: [
        { t: 'analogia', icono: 'file-text', de: 'Un fichero', es: 'es un documento guardado en el disco. Tiene un nombre y algo dentro.' },
        { t: 'texto', md: 'Tu máquina tiene un fichero que se llama `bienvenida.txt`.' },
        { t: 'comando', cmd: 'cat', hace: 'Enseña lo que hay dentro de un fichero.', partes: [['cat', 'el programa'], ['bienvenida.txt', 'qué fichero']] },
        { t: 'haz', paso: 'cat', md: 'Escribe `cat bienvenida.txt` y pulsa Enter.' },
        { t: 'fichero', sonda: 'cat@mi-servidor', titulo: 'Lo que lees con cat también sale aquí', vacio: 'Cuando hagas el cat, aparece aquí.', mantener: true },
      ],
    },
    {
      titulo: 'Ver qué hay',
      w: [
        { t: 'comando', cmd: 'ls', hace: 'Lista lo que hay en el sitio donde estás. Viene de *list*, listar.', uso: 'ls' },
        { t: 'haz', paso: 'ls', md: 'Escribe `ls`.' },
        { t: 'texto', md: 'Verás dos ficheros, `bienvenida.txt` y `notas.txt`, y también `cosas`, que es una carpeta. A la carpeta vas dentro de dos pasos.' },
      ],
    },
    {
      titulo: 'Las opciones',
      w: [
        { t: 'texto', md: 'Muchos programas admiten **opciones**. Una opción cambia cómo trabaja el programa. Va detrás, separada por un espacio, y empieza por un guion.' },
        { t: 'comando', cmd: 'ls', ops: [['-a', 'enseña también los ficheros ocultos, que son los que empiezan por un punto']], partes: [['ls', 'el programa'], ['-a', 'la opción', 'xp']] },
        { t: 'haz', paso: 'lsa', md: 'Escribe `ls -a` y compara con lo que salió antes.' },
        { t: 'texto', md: 'Ahora salen más nombres. Los que empiezan por punto estaban ahí, pero `ls` a secas no los enseña.' },
      ],
    },
    {
      titulo: 'Las carpetas',
      w: [
        { t: 'analogia', icono: 'folder', de: 'Una carpeta', es: 'es una caja con nombre. Dentro guardas ficheros y otras carpetas.' },
        { t: 'comando', cmd: 'ls', ops: [['carpeta', 'con el nombre de una carpeta detrás, lista lo que hay dentro de ella']], partes: [['ls', 'el programa'], ['cosas', 'qué carpeta', 'ok']] },
        { t: 'haz', paso: 'lscosas', md: 'Mira qué hay dentro de la carpeta. Escribe `ls cosas`.' },
        { t: 'texto', md: 'Para leer un fichero que está dentro de una carpeta, escribes la carpeta, una barra `/` y el fichero, todo junto.' },
        { t: 'haz', paso: 'catcosas', md: 'Escribe `cat cosas/lista.txt`.' },
        { t: 'fichero', sonda: 'cat@mi-servidor', titulo: 'Último fichero leído', mantener: true },
      ],
    },
    {
      titulo: 'Equivocarse no rompe nada',
      w: [
        { t: 'texto', md: 'Cada comando termina con un número. Si es 0, fue bien. Si es otro, algo falló. Esta luz lo enseña con el último comando que escribes.' },
        { t: 'codigo-salida', nodo: 'mi-servidor' },
        { t: 'haz', paso: 'error', md: 'Escribe `adios` y pulsa Enter. Ese programa no existe.' },
        { t: 'texto', md: 'La máquina dice que no encuentra la orden y la luz se pone roja. Ya está. Si ahora escribes `ls`, vuelve a verde.' },
      ],
    },
    {
      titulo: 'Tres teclas que ahorran mucho',
      w: [
        { t: 'texto', md: 'Prueba estas teclas en la terminal. Cuando las pulses de verdad, se encienden aquí.' },
        { t: 'teclas', obliga: true, combos: [
          { k: ['↑'], que: 'trae el comando anterior para no escribirlo otra vez', seq: '\x1b[A' },
          { k: ['Tab'], que: 'completa el nombre que estás escribiendo. Prueba `cat bien` y Tab', seq: '\t' },
          { k: ['Ctrl', 'U'], que: 'borra lo que tengas escrito en la línea', seq: '\x15' },
        ] },
        { t: 'aviso', md: 'En el móvil, Tab, Ctrl y las flechas están en la barra de teclas, encima del teclado.' },
      ],
    },
    {
      titulo: 'Contestar al lab',
      w: [
        { t: 'texto', md: 'A veces el lab te pregunta algo y tú le contestas desde la terminal.' },
        { t: 'comando', cmd: 'responde', hace: 'Contesta a una pregunta del lab. Solo existe en relavops.', partes: [['responde', 'el programa'], ['nombre', 'la pregunta'], ['Lucía', 'tu respuesta']] },
        { t: 'haz', paso: 'responde', md: 'Escribe `responde nombre` y luego tu nombre.' },
      ],
    },
    {
      titulo: 'Tu chuleta, los puntos y las pistas',
      w: [
        { t: 'senala', zona: 'chuleta', md: 'Este botón abre tu **chuleta**. Cada comando que aprendes se apunta ahí solo, con lo que hace. Puedes añadirle notas tuyas.' },
        { t: 'senala', zona: 'xp', md: 'Estos son tus puntos de experiencia, la XP. Cada cosa que haces suma.' },
        { t: 'aviso', md: 'Si te atascas, busca el botón **Pista**. En la lección son gratis. En los bosses cuestan un poco de XP.' },
        { t: 'texto', md: 'El botón **Foco** esconde todo lo que no sea la tarea de ahora. Úsalo cuando cueste concentrarse.' },
      ],
    },
    {
      titulo: 'Si algo se lía',
      w: [
        { t: 'senala', zona: 'nuevo', md: 'Este botón te da una máquina limpia, como recién sacada de la caja.' },
        { t: 'texto', md: 'Si cierras la pestaña, tu máquina se queda encendida unos minutos y al volver sigues donde lo dejaste. Encima de cada paso tienes los que ya hiciste. Tócalos para repasar.' },
        { t: 'comando', cmd: 'clear', hace: 'Limpia la pantalla de la terminal. No borra nada de la máquina.', uso: 'clear' },
        { t: 'haz', paso: 'clear', md: 'Escribe `clear`.' },
      ],
    },
    {
      titulo: 'Juego rápido',
      w: [
        { t: 'empareja', md: 'Une cada comando con lo que hace.', pares: [
          ['`echo`', 'repite lo que le pongas'], ['`cat`', 'enseña lo que hay en un fichero'], ['`ls`', 'lista lo que hay'], ['`ls -a`', 'lista también lo oculto'], ['`responde`', 'contesta al lab'],
        ] },
      ],
    },
    {
      titulo: 'El boss',
      w: [
        { t: 'texto', md: 'Cada lección acaba con un **boss**. Es un problema sin guía. El lab cambia a propósito y tú lo resuelves con lo que has aprendido.' },
        { t: 'texto', md: 'Este es facilito y sus pistas son gratis.' },
        { t: 'boss' },
      ],
    },
    {
      titulo: 'Ya estás dentro',
      w: [
        { t: 'chuleta' },
        { t: 'texto', md: 'Lo siguiente es la shell, el programa que entiende lo que escribes en la terminal.' },
      ],
    },
  ],
};
