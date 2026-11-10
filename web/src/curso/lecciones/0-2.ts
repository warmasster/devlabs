// 0.2 · La shell. Terminal y shell, el prompt, opciones, TAB, historial, señales y trabajos.
import type { Leccion } from './tipos';

const L = 'n0-2a-teclas';
const PRACTICA = 'n0-2-shell';

export const leccion: Leccion = {
  id: '0.2',
  titulo: 'La shell',
  minutos: 35,
  resumen: 'Sabes leer el prompt, pedir ayuda a un comando, completar con TAB, buscar en el historial y controlar programas con Ctrl+C, Ctrl+Z, bg, jobs, kill y Ctrl+D.',
  pasos: [
    {
      titulo: 'Terminal y shell no son lo mismo',
      lab: L,
      w: [
        { t: 'comparar', a: { titulo: 'Terminal', icono: 'monitor', puntos: ['la ventana', 'dibuja letras', 'recoge tus teclas'] }, b: { titulo: 'Shell', icono: 'terminal', puntos: ['un programa', 'entiende tus comandos', 'la tuya se llama bash'] }, vs: 'y' },
        { t: 'escena', escena: {
          alto: 220,
          nodos: [
            { id: 'tec', x: 110, y: 110, w: 130, txt: 'tu teclado', color: 'suave', info: 'Solo manda pulsaciones. Tu ordenador se las pasa a la ventana que tienes delante.' },
            { id: 'term', x: 330, y: 110, w: 150, txt: 'terminal', sub: 'la ventana', color: 'acento', info: 'Un programa que convierte cada tecla en bytes y dibuja las letras que le devuelven. Aquí la terminal es tu navegador.' },
            { id: 'k', x: 560, y: 110, w: 140, txt: 'kernel', sub: 'la PTY', color: 'xp', info: 'La PTY es una tubería del kernel entre la terminal y la shell. Por ella pasan los bytes en los dos sentidos. Si ve pasar Ctrl+C, no lo entrega como una letra. Lo convierte en una orden de parar para el programa que está corriendo.' },
            { id: 'bash', x: 780, y: 110, w: 130, txt: 'bash', sub: 'la shell', color: 'ok', info: 'Recibe cada tecla en cuanto la pulsas. Por eso puede completar con TAB o moverse con las flechas. Al llegar el Enter, ejecuta la línea.' },
          ],
          flechas: [{ id: 'a', de: 'tec', a: 'term' }, { id: 'b', de: 'term', a: 'k' }, { id: 'c', de: 'k', a: 'bash' }],
          pasos: [
            { texto: 'Pulsas una tecla. Le llega a la terminal.', ver: ['tec', 'term', 'a'], luz: ['term'], viaja: [{ de: 'tec', a: 'term', txt: 'l' }] },
            { texto: 'La terminal la mete en la PTY, una tubería del kernel que la une con la shell.', ver: ['k', 'b'], luz: ['k'], viaja: [{ de: 'term', a: 'k', txt: 'l' }] },
            { texto: 'Por el otro lado de la tubería está bash, que recibe la tecla. Así con cada una. Cuando llega el Enter, bash ejecuta la línea.', ver: ['bash', 'c'], luz: ['bash'], viaja: [{ de: 'k', a: 'bash', txt: 'l s ⏎' }] },
            { texto: 'La respuesta hace el camino de vuelta. bash escribe en la PTY y la terminal dibuja las letras en tu pantalla.', luz: ['term'], viaja: [{ de: 'bash', a: 'k', txt: 'salida' }, { de: 'k', a: 'term', txt: 'salida' }] },
          ],
        } },
        { t: 'texto', md: 'El kernel está en medio por algo. Así Ctrl+C para cualquier programa aunque ese programa no lea el teclado. Y bash funciona igual en cualquier terminal, la de tu ordenador, una por SSH o esta del navegador.' },
        { t: 'haz', paso: 'shell', md: 'Pregúntale a la máquina qué shell usas. Escribe `echo $SHELL`.' },
      ],
    },
    {
      titulo: 'El prompt',
      w: [
        { t: 'anatomia', partes: [['root', 'tu usuario'], ['@', ''], ['lab', 'la máquina'], [':', ''], ['~', 'dónde estás'], ['#', 'eres administrador']] },
        { t: 'texto', md: 'El **prompt** es lo que sale antes de donde escribes. Te dice quién eres, en qué máquina y en qué carpeta. `~` es tu carpeta personal.' },
        { t: 'texto', md: 'Al final sale `#` si eres **root**, el administrador, que puede con todo. Un usuario normal ve `$`.' },
        { t: 'haz', paso: 'cdtmp', md: 'Escribe `cd /tmp` y mira cómo cambia el prompt. Luego escribe `cd` solo para volver a casa.' },
      ],
    },
    {
      titulo: 'Opciones',
      w: [
        { t: 'anatomia', partes: [['ls', 'programa'], ['-l', 'opción', 'xp'], ['/etc', 'argumento', 'ok']] },
        { t: 'texto', md: 'Las **opciones** cambian cómo trabaja el programa. Empiezan por un guion. `ls -l` lista con detalles en vez de solo los nombres.' },
        { t: 'texto', md: 'Las hay cortas, con un guion y una letra, como `-a`, y largas, con dos guiones y una palabra, como `--all`. Muchas veces son la misma opción con dos nombres. Casi todos los programas te las cuentan con `--help`.' },
        { t: 'haz', paso: 'man', md: 'Escribe `ls --help` y busca qué hace la opción `-a`.' },
        { t: 'ultimo', nodo: 'lab' },
      ],
    },
    {
      titulo: 'TAB completa por ti',
      w: [
        { t: 'teclas', combos: [{ k: ['Tab'], que: 'completa el nombre de un fichero, una carpeta o un comando' }, { k: ['Tab', 'Tab'], que: 'si hay varias opciones, te las enseña todas' }] },
        { t: 'texto', md: 'Escribir rutas largas a mano es la mejor forma de equivocarse. Escribe el principio y pulsa TAB.' },
        { t: 'haz', paso: 'tab', md: 'Escribe `cat /srv/una` y pulsa TAB. Sigue pulsando TAB hasta llegar al fichero y pulsa Enter.' },
        { t: 'fichero', sonda: 'cat@lab', titulo: 'Lo que has leído', mantener: true },
      ],
    },
    {
      titulo: 'El historial',
      w: [
        { t: 'texto', md: 'La shell recuerda todo lo que escribes. Prueba estas tres teclas en la terminal. Se encienden cuando las pulsas.' },
        { t: 'teclas', obliga: true, combos: [
          { k: ['↑'], que: 'el comando anterior', seq: '\x1b[A' },
          { k: ['↓'], que: 'el siguiente', seq: '\x1b[B' },
          { k: ['Ctrl', 'R'], que: 'buscar en el historial. Escribe tesoro y verás uno antiguo', seq: '\x12' },
        ] },
        { t: 'aviso', md: 'Con Ctrl+R, cada vez que vuelves a pulsar Ctrl+R salta a una coincidencia más antigua. Enter la ejecuta.' },
      ],
    },
    {
      titulo: 'Moverse por la línea',
      w: [
        { t: 'texto', md: 'Escribe algo largo sin pulsar Enter y prueba estas tres.' },
        { t: 'teclas', obliga: true, combos: [
          { k: ['Ctrl', 'A'], que: 'salta al principio de la línea', seq: '\x01' },
          { k: ['Ctrl', 'E'], que: 'salta al final', seq: '\x05' },
          { k: ['Ctrl', 'U'], que: 'borra desde el cursor hasta el principio', seq: '\x15' },
        ] },
        { t: 'teclas', combos: [{ k: ['Ctrl', 'W'], que: 'borra la palabra de antes del cursor', seq: '\x17' }] },
        { t: 'senala', zona: 'inmersivo', md: 'Ctrl+W en el navegador cierra la pestaña. Con el lab en pantalla completa, desde este botón, llega a la terminal. Pruébalo. Para salir, mantén Esc.' },
        { t: 'aviso', md: 'Antes de seguir, deja la línea limpia con Ctrl+U.' },
      ],
    },
    {
      titulo: 'Un programa ocupa la terminal',
      w: [
        { t: 'texto', md: 'Cuando lanzas un programa, la shell espera a que acabe y no te atiende. Se dice que el programa está en **primer plano**. Lo que teclees mientras tanto espera en la PTY, y la shell lo recoge cuando el programa termina.' },
        { t: 'texto', md: '`sleep 100` es un programa que solo espera 100 segundos. Viene bien para practicar.' },
        { t: 'procesos', efecto: true, sonda: 'procesos@lab', resalta: ['sleep'] },
        { t: 'haz', paso: 'sleep5', md: 'Escribe `sleep 5`. Durante 5 segundos no sale el prompt. Luego vuelve.' },
      ],
    },
    {
      titulo: 'Ctrl+C corta',
      w: [
        { t: 'teclas', combos: [{ k: ['Ctrl', 'C'], que: 'le pide al programa de primer plano que pare', seq: '\x03' }] },
        { t: 'texto', md: 'Es lo que viste en el dibujo del principio. Ctrl+C no llega como una letra. El kernel lo ve pasar por la PTY y le manda al programa una orden de parar.' },
        { t: 'haz', paso: 'ctrlc', md: 'Escribe `sleep 100` y, mientras espera, córtalo con Ctrl+C.' },
        { t: 'procesos', efecto: true, sonda: 'procesos@lab', resalta: ['sleep'] },
        { t: 'aviso', md: 'Ojo. Aquí Ctrl+C no copia. Para copiar en la terminal usa Ctrl+Shift+C, o Cmd+C en un Mac.' },
      ],
    },
    {
      titulo: 'Parar sin matar',
      w: [
        { t: 'texto', md: 'Un programa puede estar corriendo delante, parado o corriendo detrás. Prueba a moverlo con los botones hasta que acabe.' },
        { t: 'estados', inicio: 'del', objetivo: ['del', 'par', 'det', 'fin'], estados: [
          { id: 'del', t: 'Delante', sub: 'ocupa la terminal' }, { id: 'par', t: 'Parado', sub: 'congelado' }, { id: 'det', t: 'Detrás', sub: 'sigue, y tú escribes' }, { id: 'fin', t: 'Terminado' },
        ], trans: [['del', 'par', 'Ctrl+Z'], ['del', 'fin', 'Ctrl+C'], ['par', 'del', '`fg`'], ['par', 'det', '`bg`'], ['det', 'del', '`fg`'], ['det', 'fin', '`kill %1`'], ['par', 'fin', '`kill %1`']] },
      ],
    },
    {
      titulo: 'Ctrl+Z, ahora de verdad',
      w: [
        { t: 'haz', paso: 'parado', md: 'Escribe `sleep 200` y pulsa Ctrl+Z. Mira cómo sale **parado** en la lista.' },
        { t: 'procesos', efecto: true, sonda: 'procesos@lab', resalta: ['sleep 200'] },
        { t: 'aviso', md: 'Se queda parado, sin hacer nada. En el paso siguiente lo mandas al fondo.' },
      ],
    },
    {
      titulo: 'bg y jobs',
      w: [
        { t: 'haz', paso: 'fondo', md: 'Escribe `bg`. El programa sigue funcionando, pero detrás, y tú recuperas la terminal.' },
        { t: 'procesos', efecto: true, sonda: 'procesos@lab', resalta: ['sleep 200'] },
        { t: 'texto', md: 'Escribe `jobs` para ver lo que tienes detrás. Cada trabajo lleva un número entre corchetes, como `[1]`.' },
        { t: 'aviso', md: 'Sigue funcionando detrás. En el paso siguiente lo terminas.' },
      ],
    },
    {
      titulo: 'kill %1',
      w: [
        { t: 'texto', md: '`kill` ya lo conoces con un PID. Con `%1` le dices el trabajo número 1 de los que enseña `jobs`, sin buscar su PID.' },
        { t: 'texto', md: 'Los trabajos son de cada shell. `%1` solo vale en la terminal donde lanzaste el programa. Desde otra, hace falta el PID.' },
        { t: 'haz', paso: 'matar', md: 'Escribe `kill %1`.' },
        { t: 'procesos', efecto: true, sonda: 'procesos@lab', resalta: ['sleep 200'] },
      ],
    },
    {
      titulo: 'Ctrl+D, se acabó',
      w: [
        { t: 'teclas', combos: [{ k: ['Ctrl', 'D'], que: 'le dice al programa que ya no vas a escribir más', seq: '\x04' }] },
        { t: 'texto', md: 'Ctrl+D tampoco es una letra. El kernel lo convierte en un aviso de fin, como si se acabara lo que escribes. Un programa que lee lo que tecleas, al ver que ya no llegará nada más, se cierra.' },
        { t: 'texto', md: '`python3` es uno de esos. Te deja hacer cuentas.' },
        { t: 'haz', paso: 'ctrld', md: 'Escribe `python3`, luego `2 + 2` y Enter. Después sal con Ctrl+D.' },
        { t: 'aviso', md: 'A bash le pasa lo mismo. Ctrl+D con la línea vacía cierra tu shell. Si te pasa, pulsa Enter en la terminal y se abre otra.' },
      ],
    },
    {
      titulo: 'Cómo salir de cualquier sitio',
      w: [
        { t: 'tabla', cab: ['Si estás en…', 'Sales con'], filas: [['un comando que no acaba', 'Ctrl+C'], ['`less` o `man`, que enseñan textos largos', '`q`'], ['`vim`', 'Esc, luego `:q!` y Enter'], ['`nano`', 'Ctrl+X'], ['`top`', '`q`'], ['`python3`', 'Ctrl+D']] },
        { t: 'texto', md: 'En `less` y en `vim` puedes buscar. Escribe `/`, la palabra y Enter. Con `n` vas a la siguiente.' },
        { t: 'atajo', items: [['Cortar un programa', 'Ctrl+C'], ['Buscar en el historial', 'Ctrl+R'], ['Ir al principio de la línea', 'Ctrl+A'], ['Salir de python3', 'Ctrl+D'], ['Parar un programa sin matarlo', 'Ctrl+Z'], ['Completar un nombre', 'Tab']] },
        { t: 'haz', paso: 'less', md: 'Practica con uno. Escribe `less /etc/services`, busca `/ssh`, pulsa `n` un par de veces y sal con `q`.' },
      ],
    },
    {
      titulo: 'Práctica',
      lab: PRACTICA,
      w: [
        { t: 'texto', md: 'Una máquina nueva con todo esto mezclado. Van en el orden que quieras.' },
        { t: 'mision' },
      ],
    },
    {
      titulo: 'El boss',
      w: [
        { t: 'texto', md: 'Te van a meter dentro de un programa. Tienes que encontrar una palabra y salir sin cerrar la pestaña.' },
        { t: 'boss' },
      ],
    },
    {
      titulo: 'Lo que te llevas',
      w: [
        { t: 'chuleta', items: [['cmd --help', 'las opciones de un comando'], ['Tab', 'completar'], ['↑ y Ctrl+R', 'historial'], ['Ctrl+A · Ctrl+E · Ctrl+U', 'moverse y borrar'], ['Ctrl+C', 'cortar'], ['Ctrl+Z · bg · fg · jobs', 'parar y mover trabajos'], ['kill %1', 'terminar un trabajo'], ['Ctrl+D', 'cerrar lo que espera que escribas']] },
      ],
    },
  ],
};
