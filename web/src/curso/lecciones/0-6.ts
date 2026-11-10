// 0.6 · Texto y tuberías. Entrada, salida y errores; redirecciones; tuberías; grep, sort, uniq, cut, awk y jq.
import type { Leccion } from './tipos';

const L = 'n0-6a-canales';
const PRACTICA = 'n0-6-tuberias';
const CIUDADES = ['Madrid', 'Sevilla', 'Bilbao', 'Madrid', 'Valencia', 'Sevilla', 'Madrid', 'Cádiz', 'Bilbao', 'Madrid', 'Zaragoza', 'Sevilla'];

const contar = (ls: string[]) => {
  const out: string[] = [];
  for (const l of ls) { const u = out[out.length - 1]; const m = u?.match(/^\s*(\d+) (.*)$/); if (m && m[2] === l) out[out.length - 1] = `${String(Number(m[1]) + 1).padStart(7)} ${l}`; else out.push(`${'1'.padStart(7)} ${l}`); }
  return out;
};

export const leccion: Leccion = {
  id: '0.6',
  titulo: 'Texto y tuberías',
  minutos: 45,
  resumen: 'Sabes por dónde sale cada cosa, guardar la salida o los errores en ficheros, y encadenar programas con | para contar, filtrar, ordenar y sacar columnas.',
  pasos: [
    {
      titulo: 'Entra, sale y se queja',
      lab: L,
      w: [
        { t: 'analogia', icono: 'workflow', de: 'Un programa', es: 'es como una máquina de zumo. Por un lado entra fruta, por otro sale zumo y, si algo va mal, se enciende una luz roja.' },
        { t: 'tabla', cab: ['Número', 'Nombre', 'Qué es', 'Por defecto'], filas: [['0', 'stdin', 'lo que entra', 'tu teclado'], ['1', 'stdout', 'lo que sale', 'la pantalla'], ['2', 'stderr', 'las quejas, los errores', 'también la pantalla']] },
        { t: 'texto', md: 'La salida buena y los errores salen por sitios distintos aunque los veas juntos en la pantalla. Eso permite separarlos.' },
        { t: 'haz', paso: 'queja', md: 'Escribe `ls /noexiste`. Esa queja sale por stderr, el canal 2.' },
      ],
    },
    {
      titulo: 'Elige adónde va cada cosa',
      w: [
        { t: 'comando', cmd: '>', simbolo: true, hace: 'Manda a un fichero lo que el comando iba a sacar por pantalla. Si el fichero ya existía, lo vacía antes.', partes: [['ls /etc', 'el comando'], ['>', 'guárdalo en', 'xp'], ['lista.txt', 'este fichero', 'ok']] },
        { t: 'texto', md: 'Este comando lista dos carpetas y una no existe. Prueba cada opción y mira dónde acaba cada línea. Verde es stdout y rojo es stderr.' },
        { t: 'canales', cmd: 'ls /etc/ssl /noexiste', out: ['/etc/ssl:', 'certs', 'private'], err: ["ls: no se puede acceder a '/noexiste'"] },
        { t: 'haz', paso: 'canales', md: 'Ahora de verdad. Escribe `ls /etc/ssl /noexiste > lista.txt`. La lista va al fichero y la queja sigue saliendo en pantalla.' },
      ],
    },
    {
      titulo: '> guarda en un fichero',
      w: [
        { t: 'fichero', efecto: true, sonda: 'salida', titulo: '`salida.txt`, en vivo', vacio: 'Todavía no existe.' },
        { t: 'haz', paso: 'mayor', md: 'Escribe `ls /etc > salida.txt`. En pantalla no sale nada. Mira arriba.' },
        { t: 'aviso', md: '`>` borra lo que hubiera antes en el fichero. Lo vacía la shell antes de lanzar el comando. Por eso un comando que lee un fichero y guarda en ese mismo fichero te lo deja vacío.' },
      ],
    },
    {
      titulo: '>> añade al final',
      w: [
        { t: 'comando', cmd: '>>', simbolo: true, hace: 'Como `>`, pero añade al final del fichero sin borrar lo que había.', uso: 'echo fin >> salida.txt' },
        { t: 'haz', paso: 'anadir', md: 'Escribe `echo fin >> salida.txt`.' },
        { t: 'fichero', efecto: true, sonda: 'salida', titulo: '`salida.txt`, en vivo' },
      ],
    },
    {
      titulo: '2> separa los errores',
      w: [
        { t: 'comando', cmd: '2>', simbolo: true, hace: 'Manda a un fichero solo los errores, lo que sale por el canal 2. Lo demás sigue en pantalla.', uso: 'copia 2> errores.txt' },
        { t: 'texto', md: 'En esta máquina hay un programa, `copia`, que copia fotos y a veces falla. Si lo lanzas a secas, verás los avisos buenos y las quejas mezclados.' },
        { t: 'haz', paso: 'errores', md: 'Escribe `copia 2> errores.txt`. Los avisos buenos siguen en pantalla y las quejas van al fichero.' },
        { t: 'fichero', efecto: true, sonda: 'errores', titulo: '`errores.txt`, en vivo', vacio: 'Todavía no existe.' },
        { t: 'aviso', md: 'Si mandas los errores a `/dev/null`, se pierden. Es un fichero especial que se traga todo lo que le llega.' },
      ],
    },
    {
      titulo: 'La tubería',
      w: [
        { t: 'comando', cmd: '|', simbolo: true, hace: 'Conecta la salida de un programa con la entrada del siguiente. Sin ficheros por medio. Se llama tubería.', partes: [['cat datos/ciudades.txt', 'saca las líneas'], ['|', 'tubería', 'xp'], ['wc -l', 'cuenta líneas', 'ok']] },
        { t: 'comando', cmd: 'wc', hace: 'Cuenta lo que le llega. Líneas, palabras y letras.', ops: [['-l', 'cuenta solo las líneas']] },
        { t: 'haz', paso: 'tubo', md: 'Escribe `cat datos/ciudades.txt | wc -l`. Te dice cuántas líneas tiene.' },
      ],
    },
    {
      titulo: 'grep filtra',
      w: [
        { t: 'comando', cmd: 'grep', hace: 'Deja pasar solo las líneas que contienen el texto que le digas.', partes: [['grep', 'el programa'], ['Madrid', 'qué buscas'], ['datos/ciudades.txt', 'dónde']], ops: [['-c', 'cuenta las líneas en vez de enseñarlas'], ['-v', 'al revés, las que NO lo contienen'], ['-i', 'sin distinguir mayúsculas de minúsculas']] },
        { t: 'haz', paso: 'grep', md: 'Escribe `grep Madrid datos/ciudades.txt`.' },
        { t: 'texto', md: 'grep también lee de una tubería. Si no le dices un fichero, filtra lo que le llega del comando de antes.' },
      ],
    },
    {
      titulo: 'Contar repetidos',
      w: [
        { t: 'comando', cmd: 'sort', hace: 'Ordena las líneas. Las que son iguales quedan juntas.', ops: [['-n', 'ordena por número, no letra a letra'], ['-r', 'al revés, de mayor a menor']] },
        { t: 'comando', cmd: 'uniq', hace: 'Junta las líneas iguales que van seguidas. Por eso va después de `sort`.', ops: [['-c', 'pone delante cuántas veces salía cada una']] },
        { t: 'texto', md: 'Toca cada etapa y mira cómo cambian los datos.' },
        { t: 'tuberia', datos: CIUDADES, etapas: [
          { cmd: 'sort', que: '`sort` ordena. Las iguales quedan juntas.', fn: (d: string[]) => [...d].sort((a, b) => a.localeCompare(b)) },
          { cmd: 'uniq -c', que: '`uniq -c` cuenta las líneas iguales que están seguidas.', fn: contar },
          { cmd: 'sort -rn', que: '`-n` ordena por número y `-r` al revés, de mayor a menor.', fn: (d: string[]) => [...d].sort((a, b) => parseInt(b) - parseInt(a)) },
        ] },
        { t: 'haz', paso: 'cuenta', md: 'Hazlo tú. `sort datos/ciudades.txt | uniq -c | sort -rn`.' },
      ],
    },
    {
      titulo: 'Las primeras y las últimas',
      w: [
        { t: 'comando', cmd: 'head', hace: 'Se queda con las primeras líneas de lo que le llega.', ops: [['-N', 'un guion y un número. `-3` son las 3 primeras'], ['-n -5', 'todas menos las 5 últimas']] },
        { t: 'haz', paso: 'cabeza', md: 'Quédate solo con la ciudad más repetida. Repite lo de antes con `| head -1` al final.', pista: 'sort datos/ciudades.txt | uniq -c | sort -rn | head -1' },
        { t: 'comando', cmd: 'tail', hace: 'Se queda con las últimas líneas.', ops: [['-N', 'un guion y un número. `-2` son las 2 últimas'], ['-n +6', 'desde la línea 6 hasta el final']] },
        { t: 'haz', paso: 'cola', md: 'Mira las dos últimas líneas de un log con `tail -2 datos/accesos.log`.' },
      ],
    },
    {
      titulo: 'Sacar una columna',
      w: [
        { t: 'texto', md: 'Muchos ficheros vienen en columnas. `ventas.csv` las separa con comas.' },
        { t: 'comando', cmd: 'cut', hace: 'Corta cada línea y se queda con las columnas que le digas.', partes: [['cut', 'corta'], ['-d,', 'separador, la coma'], ['-f2', 'la columna 2'], ['datos/ventas.csv', 'el fichero']], ops: [['-d', 'qué letra separa las columnas. Va pegada, como `-d,`'], ['-f', 'qué columna quieres. Va pegada, como `-f2`']] },
        { t: 'haz', paso: 'columna', md: 'Saca la columna de las ciudades de `datos/ventas.csv`.', pista: 'cut -d, -f2 datos/ventas.csv' },
      ],
    },
    {
      titulo: 'Columnas separadas por espacios',
      w: [
        { t: 'texto', md: 'Los logs suelen separar las columnas con espacios. `datos/accesos.log` tiene cuatro. La IP, el tipo de petición, la página y el código con que contestó la web.' },
        { t: 'comando', cmd: 'awk', hace: 'Trabaja con columnas separadas por espacios. `$1` es la primera columna, `$2` la segunda, y así.', ops: [["'{print $1}'", 'saca solo la columna 1 de cada línea'], ["'$4 == 404'", 'deja pasar solo las líneas cuya columna 4 vale 404'], ["'$4 == 404 {print $1}'", 'las dos cosas. De las que cumplen, saca la columna 1']], nota: 'Lo que le pides a awk va siempre entre comillas simples.' },
        { t: 'terminal-demo', lineas: [["awk '{print $1}' datos/accesos.log", '10.0.0.5\n10.0.0.7\n10.0.0.5\n…'], ["awk '$4 == 401 {print $1}' datos/accesos.log", '10.0.0.5']] },
        { t: 'haz', paso: 'awk', md: "Saca las peticiones que dieron 404. Escribe `awk '$4 == 404' datos/accesos.log`." },
      ],
    },
    {
      titulo: 'Logs viejos',
      w: [
        { t: 'texto', md: 'Los logs antiguos se guardan comprimidos, con nombres que acaban en `.gz`.' },
        { t: 'comando', cmd: 'zcat', hace: 'Como `cat`, pero para ficheros comprimidos `.gz`. Saca el texto sin dejar nada descomprimido en el disco.', uso: 'zcat datos/viejo.log.gz' },
        { t: 'haz', paso: 'zcat', md: 'Escribe `zcat datos/viejo.log.gz`.' },
        { t: 'texto', md: 'Su salida se puede meter en una tubería, igual que la de `cat`.' },
      ],
    },
    {
      titulo: 'JSON',
      w: [
        { t: 'texto', md: 'Muchos programas hablan **JSON**, texto con llaves y comillas.' },
        { t: 'codigo', codigo: '[\n  { "nombre": "ana", "rol": "admin", "activo": true },\n  { "nombre": "luis", "rol": "dev", "activo": false }\n]', notas: { 1: 'Los corchetes son una lista.', 2: 'Cada llave es un objeto con claves y valores.' } },
        { t: 'comando', cmd: 'jq', hace: 'Filtra y recorre datos en JSON. Lo que le pides va entre comillas simples.', ops: [['.[]', 'recorre la lista, elemento a elemento'], ['.nombre', 'saca ese campo de cada elemento'], ['select( )', 'deja pasar solo los que cumplen lo de dentro. Se compara con `==` y se juntan condiciones con `and`'], ['length', 'cuenta'], ['-r', 'saca los textos sin comillas']] },
        { t: 'terminal-demo', lineas: [["jq '.[] | .nombre' usuarios.json", '"ana"\n"luis"'], ["jq '[.[] | select(.activo)] | length' usuarios.json", '1'], ["jq '[.[] | select(.rol == \"dev\" and .activo)] | length' usuarios.json", '0']] },
        { t: 'haz', paso: 'jq', md: 'Cuenta los usuarios activos de `datos/usuarios.json` con jq.', pista: "jq '[.[] | select(.activo)] | length' datos/usuarios.json" },
      ],
    },
    {
      titulo: 'Ordena la receta',
      w: [
        { t: 'ordena', md: 'La receta para saber qué IP pide más en un log. Toca las piezas en orden.', items: ["`awk '{print $1}' log`", '`sort`', '`uniq -c`', '`sort -rn`', '`head -1`'] },
      ],
    },
    {
      titulo: 'Práctica',
      lab: PRACTICA,
      w: [
        { t: 'texto', md: 'Un log de una web de verdad, con 6000 líneas. A interrogarlo.' },
        { t: 'mision' },
      ],
    },
    {
      titulo: 'El boss',
      w: [
        { t: 'texto', md: 'Alguien está probando contraseñas contra la web. Encuentra su IP.' },
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
