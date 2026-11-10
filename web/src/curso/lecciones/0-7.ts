// 0.7 · Expresiones regulares. Literales, anclas, clases, cuántas veces, grupos; grep -E, -o, -c y sed.
import type { Leccion } from './tipos';

const L = 'n0-7a-patrones';
const PRACTICA = 'n0-7-regex';

export const leccion: Leccion = {
  id: '0.7',
  titulo: 'Expresiones regulares',
  minutos: 35,
  resumen: 'Sabes describir la forma de un texto con anclas, clases y repeticiones, buscar con grep -E y -o, y cambiar texto en ficheros con sed, incluso reordenando trozos.',
  pasos: [
    {
      titulo: 'Buscar por la forma',
      lab: L,
      w: [
        { t: 'analogia', icono: 'search', de: 'Una expresión regular', es: 'describe la forma de un texto. Como pedir busca algo que parezca un teléfono.' },
        { t: 'texto', md: 'Se suelen llamar **regex**. Funcionan en grep, en sed, en vim y en casi todos los lenguajes. Aquí las pruebas sin miedo. Escribe en el recuadro y mira qué se marca.' },
        { t: 'regex', libre: true, inicial: 'ERROR', lineas: [['ERROR disco lleno'], ['INFO todo bien'], ['WARN último ERROR ignorado'], ['ERROR no responde']] },
        { t: 'haz', paso: 'literal', md: 'Ahora en la terminal, con `grep`, que ya conoces. Escribe `grep ERROR textos/log.txt`.' },
      ],
    },
    {
      titulo: 'Principio y final',
      w: [
        { t: 'tabla', cab: ['Símbolo', 'Quiere decir'], filas: [['`^`', 'principio de la línea'], ['`$`', 'final de la línea']] },
        { t: 'regex', md: 'Marca solo las líneas que **empiezan** por ERROR.', lineas: [['ERROR disco lleno', true], ['INFO todo bien', false], ['WARN último ERROR ignorado', false], ['ERROR no responde', true]] },
        { t: 'aviso', md: 'En la terminal, pon siempre el patrón entre comillas simples. Pasa como con el asterisco de `find`. Sin comillas, la shell cambia `*`, `$` o `|` antes de que grep los vea.' },
        { t: 'haz', paso: 'ancla', md: "Busca las líneas que **acaban** en segundos con `grep 'segundos$' textos/log.txt`." },
        { t: 'ultimo', nodo: 'lab', tras: 'ancla' },
      ],
    },
    {
      titulo: 'Guardar lo que encuentras',
      w: [
        { t: 'texto', md: 'La salida de grep se guarda en un fichero con `>`, como la de cualquier comando.' },
        { t: 'fichero', efecto: true, sonda: 'encontrado', titulo: '`encontrado.txt`, en vivo', vacio: 'Todavía no existe.' },
        { t: 'haz', paso: 'empiezan', md: "Escribe `grep '^ERROR' textos/log.txt > encontrado.txt`." },
      ],
    },
    {
      titulo: 'Clases y el punto',
      w: [
        { t: 'tabla', cab: ['Escribes', 'Encaja con'], filas: [['`[0-9]`', 'un dígito'], ['`[a-z]`', 'una letra minúscula'], ['`[aeiou]`', 'una vocal'], ['`[^ ]`', 'cualquier cosa menos un espacio'], ['`.`', 'cualquier carácter'], ['`\\.`', 'un punto de verdad. Sin la barra, el punto es cualquier cosa']] },
        { t: 'texto', md: 'Ojo con `^`. Dentro de corchetes quiere decir lo contrario, todo menos lo que va detrás. Fuera de corchetes es el principio de la línea.' },
        { t: 'regex', md: 'Marca los códigos que tienen una letra y luego un dígito, como `a7`.', lineas: [['a7', true], ['b2', true], ['77', false], ['ab', false], ['z0', true]] },
        { t: 'haz', paso: 'clase', md: "En la terminal, `grep '[0-9]' textos/log.txt` saca las líneas con algún dígito." },
      ],
    },
    {
      titulo: 'Cuántas veces',
      w: [
        { t: 'tabla', cab: ['Escribes', 'Quiere decir'], filas: [['`+`', 'una o más veces'], ['`*`', 'cero o más'], ['`?`', 'puede estar o no'], ['`{3}`', 'exactamente 3'], ['`{2,4}`', 'de 2 a 4']] },
        { t: 'texto', md: 'Se ponen detrás de lo que se repite. `[0-9]+` es uno o más dígitos seguidos.' },
        { t: 'regex', md: 'Marca solo los códigos de exactamente 3 dígitos, nada más. Para que no sobre nada delante ni detrás te hacen falta `^` y `$`.', lineas: [['404', true], ['200', true], ['40', false], ['2000', false], ['a404', false]] },
        { t: 'comando', cmd: 'grep', ops: [['-E', 'regex completas. Sin ella, grep no entiende `+ ? { } ( ) |` tal cual'], ['-o', 'saca solo el trozo que encaja, no la línea entera']] },
        { t: 'haz', paso: 'veces', md: "Saca solo los números de `textos/log.txt`. Escribe `grep -oE '[0-9]+' textos/log.txt`." },
      ],
    },
    {
      titulo: 'Grupos y o',
      w: [
        { t: 'texto', md: 'Los paréntesis agrupan y la barra `|` dentro de una regex quiere decir **o**. `(GET|POST)` encaja con cualquiera de las dos.' },
        { t: 'regex', md: 'Marca las peticiones que empiezan por GET o por POST.', lineas: [['GET /', true], ['POST /login', true], ['PUT /x', false], ['DELETE /y', false], ['XGET /', false]] },
        { t: 'haz', paso: 'grupo', md: "En la terminal, las líneas que empiezan por ERROR o por WARN. `grep -E '^(ERROR|WARN)' textos/log.txt`." },
      ],
    },
    {
      titulo: 'Sacar y contar',
      w: [
        { t: 'tabla', cab: ['Opción de grep', 'Hace'], filas: [['`-E`', 'regex completas'], ['`-o`', 'solo el trozo que encaja'], ['`-c`', 'cuenta las líneas que encajan. Ya la conoces']] },
        { t: 'fichero', efecto: true, sonda: 'correos', titulo: '`correos.txt`, en vivo', vacio: 'Todavía no existe.' },
        { t: 'haz', paso: 'correos', md: "Saca los correos de `textos/contactos.txt` a `correos.txt`. El patrón de un correo es `[a-z.]+@[a-z.]+`.", pista: "grep -oE '[a-z.]+@[a-z.]+' textos/contactos.txt > correos.txt" },
        { t: 'haz', paso: 'contar', md: 'Cuenta con `grep -c` cuántas líneas de `textos/log.txt` empiezan por ERROR.', pista: "grep -c '^ERROR' textos/log.txt" },
      ],
    },
    {
      titulo: 'Cambiar con sed',
      w: [
        { t: 'comando', cmd: 'sed', hace: 'Cambia un texto por otro en cada línea que le llega.', partes: [['sed', 'el programa'], ['-i', 'guarda el cambio en el fichero'], ["'s#viejo#nuevo#g'", 'sustituye', 'xp'], ['fichero', 'dónde']], ops: [['-i', 'guarda el cambio en el propio fichero. Sin ella, sed solo enseña el resultado'], ['-E', 'regex completas, como en grep']] },
        { t: 'texto', md: 'La `s` es sustituir. El separador suele ser `/`, pero puedes usar `#` cuando el texto lleva barras. La `g` del final cambia todas, no solo la primera de cada línea.' },
        { t: 'haz', paso: 'verweb', md: 'Mira primero cómo está con `cat textos/web.txt`.' },
        { t: 'fichero', tras: 'verweb', sonda: 'web', titulo: '`textos/web.txt`, en vivo' },
        { t: 'haz', paso: 'https', md: 'Cambia los `http://` por `https://` en `textos/web.txt` con `sed -i`.', pista: "sed -i 's#http://#https://#g' textos/web.txt" },
      ],
    },
    {
      titulo: 'Reordenar con grupos',
      w: [
        { t: 'texto', md: 'Con `sed -E`, lo que capturas entre paréntesis se puede volver a poner con `\\1`, `\\2`… en el orden que quieras.' },
        { t: 'terminal-demo', lineas: [["echo 'Ana Pérez' | sed -E 's/(.*) (.*)/\\2, \\1/'", 'Pérez, Ana'], ["echo '03/11/2026' | sed -E 's#([0-9]{2})/([0-9]{2})/([0-9]{4})#\\3-\\2-\\1#'", '2026-11-03']] },
        { t: 'haz', paso: 'gruposed', md: 'Escribe el primero en tu terminal, tal cual.', pista: "echo 'Ana Pérez' | sed -E 's/(.*) (.*)/\\2, \\1/'" },
      ],
    },
    {
      titulo: 'Memoria',
      w: [
        { t: 'memoria', pares: [['`^`', 'principio'], ['`$`', 'final'], ['`[0-9]`', 'un dígito'], ['`+`', 'una o más'], ['`?`', 'puede estar o no'], ['`grep -o`', 'solo lo que encaja']] },
      ],
    },
    {
      titulo: 'Práctica',
      lab: PRACTICA,
      w: [
        { t: 'texto', md: 'Logs y ficheros de verdad. Saca lo que importa.' },
        { t: 'mision' },
      ],
    },
    {
      titulo: 'El boss',
      w: [
        { t: 'texto', md: 'Mañana hay auditoría de protección de datos y un log está lleno de datos personales.' },
        { t: 'boss' },
      ],
    },
    {
      titulo: 'Lo que te llevas',
      w: [
        { t: 'tabla', cab: ['Regex', 'Quiere decir'], filas: [['`^` `$`', 'principio y final'], ['`[0-9]` `[a-z]` `.`', 'clases'], ['`+` `*` `?` `{n}`', 'cuántas veces'], ['`(a|b)`', 'grupo con o'], ['`\\1` `\\2`', 'reusar lo capturado en sed']] },
        { t: 'chuleta' },
      ],
    },
  ],
};
