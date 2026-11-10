// 0.8 · Editores. nano para empezar, vim con sus modos y su gramática, y JSON e INI para el boss.
import type { Leccion } from './tipos';

const L = 'n0-8a-editor';
const PRACTICA = 'n0-8-vim';
const editor = { t: 'estado', efecto: true, sonda: 'editor', titulo: 'Editor abierto ahora', mapa: { vim: ['vim', 'aviso'], nano: ['nano', 'aviso'], ninguno: ['ninguno', 'ok'] } };

export const leccion: Leccion = {
  id: '0.8',
  titulo: 'Editores',
  minutos: 35,
  resumen: 'Sabes editar con nano y con vim, salir de los dos sin perder nada, y leer JSON e INI sin miedo a una coma de más.',
  pasos: [
    {
      titulo: 'Editar sin ratón',
      lab: L,
      w: [
        { t: 'texto', md: 'En un servidor no hay ventanas ni ratón. Para cambiar un fichero se usa un editor dentro de la terminal.' },
        { t: 'comparar', a: { titulo: 'nano', icono: 'pencil', puntos: ['fácil', 'los atajos salen escritos abajo', 'no siempre está instalado'] }, b: { titulo: 'vim', icono: 'zap', puntos: ['está en todas partes', 'rapidísimo cuando lo dominas', 'al principio desconcierta'] } },
        { t: 'comando', cmd: 'which', hace: 'Dice en qué carpeta está un programa. Si no dice nada, es que no está instalado.', uso: 'which nano vim' },
        { t: 'haz', paso: 'which', md: 'Comprueba que tienes los dos con `which nano vim`.' },
      ],
    },
    {
      titulo: 'nano',
      w: [
        { t: 'comando', cmd: 'nano', hace: 'Abre un fichero en un editor sencillo. Escribes y ya está.', partes: [['nano', 'el editor'], ['nota.txt', 'qué fichero']] },
        { t: 'teclas', combos: [
          { k: ['Ctrl', 'O'], que: 'en nano, guarda. Luego Enter para confirmar el nombre', seq: '\x0f' },
          { k: ['Ctrl', 'X'], que: 'en nano, sale', seq: '\x18' },
          { k: ['Ctrl', 'K'], que: 'en nano, corta la línea entera', seq: '\x0b' },
          { k: ['Ctrl', 'W'], que: 'en nano, busca una palabra', seq: '\x17' },
        ] },
        { t: 'aviso', md: 'Abajo nano escribe `^X` en vez de Ctrl+X. El `^` es Ctrl. Las teclas se encienden aquí cuando las pulsas dentro de nano.' },
        { t: 'senala', zona: 'inmersivo', md: 'Ctrl+W en el navegador cierra la pestaña. Para que llegue a nano, pon el lab en pantalla completa con este botón. Esc mantenido sale.' },
        { t: 'haz', paso: 'vernota', md: 'Mira primero cómo está con `cat nota.txt`.' },
        { t: 'fichero', tras: 'vernota', sonda: 'nota', titulo: '`nota.txt`, tal como está guardado' },
        editor,
        { t: 'haz', paso: 'nano', md: 'Escribe `nano nota.txt`, añade una línea, guarda con Ctrl+O y Enter, y sal con Ctrl+X.' },
      ],
    },
    {
      titulo: 'vim tiene modos',
      w: [
        { t: 'texto', md: 'En vim las teclas no siempre escriben. Depende del **modo**. Al abrirlo estás en NORMAL, donde las letras son órdenes. Mueve el estado con los botones hasta guardar y salir.' },
        { t: 'estados', inicio: 'n', objetivo: ['n', 'i', 'n', 'c'], estados: [{ id: 'n', t: 'NORMAL', sub: 'órdenes' }, { id: 'i', t: 'INSERCIÓN', sub: 'escribes texto' }, { id: 'c', t: 'COMANDO', sub: 'abajo, tras `:`' }], trans: [['n', 'i', '`i`'], ['i', 'n', 'Esc'], ['n', 'c', '`:`'], ['c', 'n', 'Enter o Esc']] },
        { t: 'teclas', combos: [
          { k: ['i'], que: 'en vim, pasa a INSERCIÓN para escribir texto' },
          { k: ['Esc'], que: 'en vim, vuelve a NORMAL' },
          { k: [':w'], que: 'en vim, guarda' },
          { k: [':q'], que: 'en vim, sale' },
          { k: [':wq'], que: 'en vim, guarda y sale' },
          { k: [':q!'], que: 'en vim, sale sin guardar' },
        ] },
      ],
    },
    {
      titulo: 'Prueba sin miedo',
      w: [
        { t: 'vim', md: 'Este vim es de prácticas. Arregla la errata y guarda con `:wq`. Con `l` te mueves a la derecha, `x` borra una letra e `i` entra a escribir.', texto: 'Hlola mundo', objetivo: 'Hola mundo' },
      ],
    },
    {
      titulo: 'Ahora el de verdad',
      w: [
        { t: 'comando', cmd: 'vim', hace: 'Abre un fichero en vim, el editor que está en todos los servidores.', partes: [['vim', 'el editor'], ['compra.txt', 'qué fichero']] },
        editor,
        { t: 'haz', paso: 'vimsal', md: 'Escribe `vim compra.txt`, mira y sal con `:q`.' },
        { t: 'aviso', md: 'Si te lías, pulsa Esc dos veces y escribe `:q!`. Sales sin guardar nada.' },
      ],
    },
    {
      titulo: 'Moverse',
      w: [
        { t: 'teclas', combos: [
          { k: ['h', 'j', 'k', 'l'], que: 'en vim, izquierda, abajo, arriba y derecha' },
          { k: ['w'], que: 'en vim, salta a la palabra siguiente. Con `b`, a la anterior' },
          { k: ['0'], que: 'en vim, va al principio de la línea. Con `$`, al final' },
          { k: ['gg'], que: 'en vim, va al principio del fichero. Con `G`, al final' },
          { k: ['/palabra'], que: 'en vim, busca. Con `n` salta a la siguiente' },
        ] },
        { t: 'haz', paso: 'vimmove', md: 'Practica en el de verdad. Abre `vim compra.txt`, muévete con `h j k l`, `w`, `0` y `$`, y sal con `:q`.' },
      ],
    },
    {
      titulo: 'Borrar, copiar y deshacer',
      w: [
        { t: 'teclas', combos: [
          { k: ['x'], que: 'en vim, borra una letra' },
          { k: ['dd'], que: 'en vim, borra la línea entera. `3dd` borra tres' },
          { k: ['yy'], que: 'en vim, copia la línea. `4yy` copia cuatro' },
          { k: ['p'], que: 'en vim, pega debajo lo copiado o lo borrado' },
          { k: ['o'], que: 'en vim, abre una línea debajo y te deja escribiendo. Con `O` mayúscula, encima' },
          { k: ['u'], que: 'en vim, deshace' },
        ] },
        { t: 'haz', paso: 'vercompra', md: 'Mira primero cómo está con `cat compra.txt`.' },
        { t: 'fichero', tras: 'vercompra', sonda: 'compra', titulo: '`compra.txt`, tal como está guardado' },
        editor,
        { t: 'haz', paso: 'dd', md: 'Abre `compra.txt` en vim, quita las dos líneas BORRAME con `dd` y guarda con `:wq`.' },
      ],
    },
    {
      titulo: 'Reemplazar en todo el fichero',
      w: [
        { t: 'anatomia', partes: [[':', 'modo comando'], ['%', 'en todas las líneas'], ['s/localhost/db/', 'sustituye'], ['g', 'todas las veces de cada línea']] },
        { t: 'teclas', combos: [{ k: [':%s/viejo/nuevo/g'], que: 'en vim, cambia un texto por otro en todo el fichero' }] },
        { t: 'texto', md: 'Es lo mismo que el `s` de sed, pero dentro de vim.' },
        { t: 'haz', paso: 'verconfig', md: 'Mira primero cómo está con `cat config.ini`.' },
        { t: 'fichero', tras: 'verconfig', sonda: 'config', titulo: '`config.ini`, tal como está guardado' },
        { t: 'haz', paso: 'sust', md: 'Abre `config.ini` en vim, cambia todos los localhost por db y guarda.', pista: 'Dentro de vim escribe `:%s/localhost/db/g` y Enter. Luego `:wq`.' },
      ],
    },
    {
      titulo: 'Ficheros de configuración',
      w: [
        { t: 'texto', md: 'Lo que más vas a editar son configuraciones. Dos formatos muy comunes.' },
        { t: 'codigo', codigo: '{\n  "nombre": "tienda",\n  "puerto": 8080,\n  "debug": false,\n  "backends": ["10.0.0.11", "10.0.0.12"]\n}', notas: { 2: 'Los textos van entre comillas dobles.', 3: 'Los números van sin comillas. "8080" sería un texto.', 4: 'true y false, sin comillas.', 5: 'Una lista va entre corchetes. Detrás del último elemento no va coma.', 6: 'JSON no admite comentarios.' } },
        { t: 'codigo', codigo: '[servidor]\nworkers = 4\n\n[log]\nnivel = info', notas: { 1: 'Un INI se parte en secciones entre corchetes.', 2: 'Dentro, clave = valor. Sin repetir claves.' } },
        { t: 'comando', cmd: 'jq', ops: [['.', 'un punto solo es el JSON entero. Si está bien, lo enseña ordenado. Si está mal, dice en qué línea']] },
        { t: 'haz', paso: 'jsonok', md: 'Hay un `app.json` en tu carpeta. Compruébalo con `jq . app.json`.' },
      ],
    },
    {
      titulo: 'Atajos de vim',
      w: [
        { t: 'empareja', pares: [['`dd`', 'borra la línea'], ['`u`', 'deshace'], ['`:wq`', 'guarda y sale'], ['`:q!`', 'sale sin guardar'], ['`i`', 'empieza a escribir'], ['Esc', 'vuelve a NORMAL']] },
      ],
    },
    {
      titulo: 'Práctica contrarreloj',
      lab: PRACTICA,
      w: [
        { t: 'aviso', md: 'vim necesita Esc y muchas teclas. En el móvil están en la barra de teclas, pero esta lección es más cómoda en un ordenador.' },
        { t: 'texto', md: 'Cinco ficheros que arreglar en vim. Ve a por ellos.' },
        { t: 'mision' },
      ],
    },
    {
      titulo: 'El boss',
      w: [
        { t: 'texto', md: 'Alguien editó la configuración a mano y la app ya no arranca. El programa `app-check` de ese lab te dice qué falla.' },
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
