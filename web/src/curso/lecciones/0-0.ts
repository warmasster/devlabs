// 0.0 · Tutorial de la plataforma. Antes de nada, aprender a moverse por la pantalla.
import type { Leccion } from './tipos';

const L = 'n0-0-tutorial';

export const leccion: Leccion = {
  id: '0.0',
  titulo: 'Cómo funciona esto',
  minutos: 10,
  resumen: 'Ya sabes moverte por aquí. Escribes comandos en la terminal, la lección mira lo que haces y te deja seguir cuando sale bien. Si algo se lía, pides pista o una máquina limpia.',
  pasos: [
    {
      titulo: 'Aprendes tocando',
      lab: L,
      w: [
        { t: 'analogia', icono: 'monitor', de: 'A la izquierda, la lección.', es: 'A la derecha, una máquina Linux de verdad que es solo para ti.' },
        { t: 'texto', md: 'Aquí no hay vídeos largos. Lees un poco, tocas algo y lo haces en tu máquina. La lección mira lo que haces y te avisa cuando está bien.' },
        { t: 'senala', zona: 'maquinas', md: 'Esta tarjeta de la derecha es tu máquina. Se llama mi-servidor.' },
        { t: 'teclas', obliga: true, combos: [{ k: ['Enter'], que: 'haz clic en la terminal de la derecha y pulsa Enter. Así compruebas que es tuya', seq: '\r' }] },
      ],
    },
    {
      titulo: 'La terminal',
      w: [
        { t: 'senala', zona: 'terminal', md: 'El recuadro oscuro de la derecha es la terminal.' },
        { t: 'texto', md: 'En la terminal escribes órdenes y la máquina contesta. A cada orden la llamamos **comando**. Escribes, pulsas Enter y la máquina lo hace.' },
        { t: 'haz', paso: 'echo', md: 'Haz clic dentro de la terminal, escribe `echo hola` y pulsa Enter.' },
        { t: 'ultimo', nodo: 'mi-servidor' },
      ],
    },
    {
      titulo: 'Las partes de un comando',
      w: [
        { t: 'anatomia', partes: [['echo', 'el programa'], ['hola', 'lo que le das']] },
        { t: 'texto', md: 'La primera palabra es el programa que quieres usar. Lo que va detrás es lo que le das para trabajar. `echo` repite lo que le pongas.' },
        { t: 'texto', md: 'En el paso anterior viste tu comando partido así. La lección lo lee de tu máquina cuando pulsas Enter.' },
        { t: 'quiz', q: 'En `echo buenos días`, ¿cuál es el programa?', ops: ['`echo`', '`buenos`', '`días`'], ok: 0, porque: 'La primera palabra siempre es el programa.' },
        { t: 'haz', paso: 'echo2', md: 'Ahora prueba tú con otra cosa. `echo` y tu nombre, por ejemplo.' },
      ],
    },
    {
      titulo: 'Leer un fichero',
      w: [
        { t: 'analogia', icono: 'file-text', de: 'Un fichero', es: 'es un documento guardado en el disco. Tiene un nombre y algo dentro.' },
        { t: 'texto', md: 'Tu máquina tiene un fichero que se llama `bienvenida.txt`. El programa `cat` enseña lo que hay dentro de un fichero.' },
        { t: 'haz', paso: 'cat', md: 'Escribe `cat bienvenida.txt` y pulsa Enter.' },
        { t: 'fichero', sonda: 'cat@mi-servidor', titulo: 'Lo que lees con cat también sale aquí', vacio: 'Cuando hagas el cat, aparece aquí.', mantener: true },
      ],
    },
    {
      titulo: 'Ver qué hay',
      w: [
        { t: 'texto', md: 'Para saber qué ficheros hay donde estás, se usa `ls`. Viene de *list*, listar.' },
        { t: 'haz', paso: 'ls', md: 'Escribe `ls`.' },
        { t: 'texto', md: 'Verás `bienvenida.txt` y `notas.txt`. Si quieres, lee también el segundo con `cat notas.txt`.' },
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
      titulo: 'Dos teclas que ahorran mucho',
      w: [
        { t: 'texto', md: 'Prueba estas dos teclas en la terminal. Cuando las pulses de verdad, se encienden aquí.' },
        { t: 'teclas', obliga: true, combos: [
          { k: ['↑'], que: 'trae el comando anterior para no escribirlo otra vez', seq: '\x1b[A' },
          { k: ['Tab'], que: 'completa el nombre que estás escribiendo. Prueba `cat bien` y Tab', seq: '\t' },
        ] },
      ],
    },
    {
      titulo: 'Contestar al lab',
      w: [
        { t: 'aviso', md: 'Si te quedó algo escrito en la terminal, bórralo con Ctrl+U.' },
        { t: 'texto', md: 'A veces el lab te pregunta algo. Contestas con `responde`, el nombre de la pregunta y tu respuesta.' },
        { t: 'anatomia', partes: [['responde', 'el programa'], ['nombre', 'la pregunta'], ['Lucía', 'tu respuesta']] },
        { t: 'haz', paso: 'responde', md: 'Escribe `responde nombre` y luego tu nombre.' },
      ],
    },
    {
      titulo: 'Puntos, pistas y ajustes',
      w: [
        { t: 'senala', zona: 'xp', md: 'Arriba tienes tus puntos de experiencia, la XP. Cada cosa que haces suma.' },
        { t: 'aviso', md: 'Si te atascas, busca el botón **Pista**. En la lección son gratis. En los bosses cuestan un poco de XP.' },
        { t: 'senala', zona: 'ajustes', md: 'Arriba a la derecha puedes quitar el sonido o las animaciones, o poner una letra pensada para dislexia.' },
        { t: 'texto', md: 'El botón **Foco** esconde todo lo que no sea la tarea de ahora. Úsalo cuando cueste concentrarse.' },
      ],
    },
    {
      titulo: 'Si algo se lía',
      w: [
        { t: 'senala', zona: 'nuevo', md: 'Este botón de la derecha te da una máquina limpia, como recién sacada de la caja.' },
        { t: 'texto', md: 'Si cierras la pestaña, tu máquina se queda encendida unos minutos y al volver sigues donde lo dejaste. Encima de cada paso tienes los que ya hiciste. Tócalos para repasar.' },
        { t: 'texto', md: 'Si la terminal se llena de cosas, `clear` la deja limpia. Ctrl+L hace lo mismo.' },
        { t: 'haz', paso: 'clear', md: 'Escribe `clear`.' },
      ],
    },
    {
      titulo: 'Juego rápido',
      w: [
        { t: 'empareja', md: 'Une cada comando con lo que hace.', pares: [
          ['`echo`', 'repite lo que le pongas'], ['`cat`', 'enseña lo que hay en un fichero'], ['`ls`', 'lista los ficheros'], ['`responde`', 'contesta al lab'],
        ] },
      ],
    },
    {
      titulo: 'El boss',
      w: [
        { t: 'texto', md: 'Cada lección acaba con un **boss**. Es un problema sin guía. El lab se rompe a propósito y tú lo arreglas con lo que has aprendido.' },
        { t: 'texto', md: 'Este es facilito. Hay pistas gratis.' },
        { t: 'boss' },
      ],
    },
    {
      titulo: 'Ya estás dentro',
      w: [
        { t: 'chuleta', items: [['echo hola', 'repite lo que le pongas'], ['cat fichero', 'enseña un fichero'], ['ls', 'lista lo que hay'], ['↑ y Tab', 'repetir y completar'], ['responde clave valor', 'contestar al lab']] },
        { t: 'texto', md: 'Lo siguiente es entender qué es una máquina por dentro y cómo hablan las máquinas entre sí.' },
      ],
    },
  ],
};
