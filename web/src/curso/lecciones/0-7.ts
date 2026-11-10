// 0.7 · Editores. nano para empezar, vim con sus modos y su gramática, y JSON e INI para el boss.
import type { Leccion } from './tipos';

const L = 'n0-7a-editor';
const PRACTICA = 'n0-7-vim';
const editor = { t: 'estado', efecto: true, sonda: 'editor', titulo: 'Editor abierto ahora', mapa: { vim: ['vim', 'aviso'], nano: ['nano', 'aviso'], ninguno: ['ninguno', 'ok'] } };

export const leccion: Leccion = {
  id: '0.7',
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
        { t: 'haz', paso: 'which', md: 'Comprueba que tienes los dos con `which nano vim`. Te dice dónde está cada programa.' },
      ],
    },
    {
      titulo: 'nano',
      w: [
        { t: 'teclas', combos: [
          { k: ['Ctrl', 'O'], que: 'guarda. Luego Enter para confirmar el nombre', seq: '\x0f' },
          { k: ['Ctrl', 'X'], que: 'sale', seq: '\x18' },
          { k: ['Ctrl', 'K'], que: 'corta la línea entera', seq: '\x0b' },
          { k: ['Ctrl', 'W'], que: 'busca una palabra', seq: '\x17' },
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
        { t: 'tabla', cab: ['En COMANDO', 'Hace'], filas: [['`:w`', 'guarda'], ['`:q`', 'sale'], ['`:wq`', 'guarda y sale'], ['`:q!`', 'sale sin guardar']] },
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
        editor,
        { t: 'haz', paso: 'vimsal', md: 'Escribe `vim compra.txt`, mira y sal con `:q`.' },
        { t: 'aviso', md: 'Si te lías, pulsa Esc dos veces y escribe `:q!`. Sales sin guardar nada.' },
      ],
    },
    {
      titulo: 'Moverse y borrar',
      w: [
        { t: 'tabla', cab: ['Tecla', 'Hace'], filas: [['`h j k l`', 'izquierda, abajo, arriba, derecha'], ['`w` · `b`', 'palabra siguiente y anterior'], ['`0` · `$`', 'principio y final de la línea'], ['`gg` · `G`', 'principio y final del fichero'], ['`x`', 'borra una letra'], ['`o`', 'abre una línea debajo y te deja escribiendo'], ['`dd`', 'borra la línea'], ['`yy` · `p`', 'copia la línea y pega debajo'], ['`u`', 'deshace'], ['`/palabra`', 'busca']] },
        { t: 'texto', md: 'Muchas órdenes llevan un número delante. `3dd` borra tres líneas.' },
        { t: 'haz', paso: 'vimmove', md: 'Practica en el de verdad. Abre `vim compra.txt`, muévete con `h j k l`, `w`, `0` y `$`, y sal con `:q`.' },
      ],
    },
    {
      titulo: 'Borra con dd',
      w: [
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
        { t: 'texto', md: 'Es lo mismo que el `s` de sed, pero dentro de vim.' },
        { t: 'haz', paso: 'verconfig', md: 'Mira primero cómo está con `cat config.ini`.' },
        { t: 'fichero', tras: 'verconfig', sonda: 'config', titulo: '`config.ini`, tal como está guardado' },
        { t: 'haz', paso: 'sust', md: 'Abre `config.ini` en vim, cambia todos los localhost por db y guarda.' },
      ],
    },
    {
      titulo: 'Ficheros de configuración',
      w: [
        { t: 'texto', md: 'Lo que más vas a editar son configuraciones. Dos formatos muy comunes.' },
        { t: 'codigo', codigo: '{\n  "nombre": "tienda",\n  "puerto": 8080,\n  "debug": false,\n  "backends": ["10.0.0.11", "10.0.0.12"]\n}', notas: { 2: 'Los textos van entre comillas dobles.', 3: 'Los números van sin comillas. "8080" sería un texto.', 4: 'true y false, sin comillas.', 5: 'Una lista va entre corchetes. Detrás del último elemento no va coma.', 6: 'JSON no admite comentarios.' } },
        { t: 'codigo', codigo: '[servidor]\nworkers = 4\n\n[log]\nnivel = info', notas: { 1: 'Un INI se parte en secciones entre corchetes.', 2: 'Dentro, clave = valor. Sin repetir claves.' } },
        { t: 'haz', paso: 'jsonok', md: 'Hay un `app.json` en tu carpeta. Escribe `jq . app.json`. Si el JSON está bien, lo enseña ordenado y con colores. Si está mal, dice en qué línea.' },
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
        { t: 'texto', md: 'Cinco ficheros que arreglar en vim. Ve a por ellos.' },
        { t: 'mision' },
      ],
    },
    {
      titulo: 'El boss',
      w: [
        { t: 'texto', md: 'Alguien editó la configuración a mano y la app ya no arranca. `app-check` te dice qué falla.' },
        { t: 'boss' },
      ],
    },
    {
      titulo: 'Lo que te llevas',
      w: [
        { t: 'chuleta', items: [['nano f · Ctrl+O · Ctrl+X', 'editar, guardar, salir'], ['vim f · i · Esc', 'abrir, escribir, volver'], [':wq · :q!', 'guardar y salir, salir sin guardar'], ['dd · yy · p · u', 'borrar, copiar, pegar, deshacer'], ['/palabra', 'buscar'], [':%s/a/b/g', 'reemplazar en todo']] },
      ],
    },
  ],
};
