// 0.5 · Texto y tuberías. Entrada, salida y errores; redirecciones; tuberías; grep, sort, uniq, cut y jq.
import type { Leccion } from './tipos';

const L = 'n0-5a-canales';
const PRACTICA = 'n0-5-tuberias';
const CIUDADES = ['Madrid', 'Sevilla', 'Bilbao', 'Madrid', 'Valencia', 'Sevilla', 'Madrid', 'Cádiz', 'Bilbao', 'Madrid', 'Zaragoza', 'Sevilla'];

const contar = (ls: string[]) => {
  const out: string[] = [];
  for (const l of ls) { const u = out[out.length - 1]; const m = u?.match(/^\s*(\d+) (.*)$/); if (m && m[2] === l) out[out.length - 1] = `${String(Number(m[1]) + 1).padStart(7)} ${l}`; else out.push(`${'1'.padStart(7)} ${l}`); }
  return out;
};

export const leccion: Leccion = {
  id: '0.5',
  titulo: 'Texto y tuberías',
  minutos: 35,
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
        { t: 'aviso', md: '`>` borra lo que hubiera antes en el fichero. Lo vacía la shell antes de lanzar el comando. Por eso `sort notas.txt > notas.txt` te deja el fichero vacío, porque sort ya lo encuentra en blanco.' },
      ],
    },
    {
      titulo: '>> añade al final',
      w: [
        { t: 'haz', paso: 'anadir', md: 'Escribe `echo fin >> salida.txt`. Con `>>`, dos signos de mayor, se añade al final sin borrar.' },
        { t: 'fichero', efecto: true, sonda: 'salida', titulo: '`salida.txt`, en vivo' },
      ],
    },
    {
      titulo: '2> separa los errores',
      w: [
        { t: 'texto', md: 'En esta máquina hay un programa, `copia`, que copia fotos y a veces falla. Pruébalo primero tal cual.' },
        { t: 'haz', paso: 'errores', md: 'Ahora escribe `copia 2> errores.txt`. Los avisos buenos siguen en pantalla y las quejas van al fichero.' },
        { t: 'fichero', efecto: true, sonda: 'errores', titulo: '`errores.txt`, en vivo', vacio: 'Todavía no existe.' },
      ],
    },
    {
      titulo: 'La tubería',
      w: [
        { t: 'analogia', icono: 'workflow', de: 'La tubería |', es: 'conecta la salida de un programa con la entrada del siguiente. Sin ficheros por medio.' },
        { t: 'anatomia', partes: [['cat datos/ciudades.txt', 'saca las líneas'], ['|', 'tubería', 'xp'], ['wc -l', 'cuenta líneas', 'ok']] },
        { t: 'haz', paso: 'tubo', md: 'Escribe `cat datos/ciudades.txt | wc -l`. Te dice cuántas líneas tiene.' },
      ],
    },
    {
      titulo: 'grep filtra',
      w: [
        { t: 'texto', md: '`grep` deja pasar solo las líneas que contienen lo que le digas.' },
        { t: 'haz', paso: 'grep', md: 'Escribe `grep Madrid datos/ciudades.txt`.' },
        { t: 'tabla', cab: ['Opción', 'Hace'], filas: [['`-c`', 'cuenta en vez de enseñar'], ['`-v`', 'al revés, las que NO contienen'], ['`-i`', 'sin mirar mayúsculas']] },
      ],
    },
    {
      titulo: 'Contar repetidos',
      w: [
        { t: 'texto', md: 'Toca cada etapa y mira cómo cambian los datos.' },
        { t: 'tuberia', datos: CIUDADES, etapas: [
          { cmd: 'sort', que: '`sort` ordena. Las iguales quedan juntas.', fn: (d: string[]) => [...d].sort((a, b) => a.localeCompare(b)) },
          { cmd: 'uniq -c', que: '`uniq -c` cuenta las líneas iguales que están seguidas. Por eso va después de sort.', fn: contar },
          { cmd: 'sort -rn', que: '`-n` ordena por número y `-r` al revés, de mayor a menor.', fn: (d: string[]) => [...d].sort((a, b) => parseInt(b) - parseInt(a)) },
          { cmd: 'head -1', que: '`head` se queda con las primeras líneas. `-1` es solo una.', fn: (d: string[]) => d.slice(0, 1) },
        ] },
        { t: 'haz', paso: 'cuenta', md: 'Hazlo tú. `sort datos/ciudades.txt | uniq -c | sort -rn`.' },
      ],
    },
    {
      titulo: 'Sacar una columna',
      w: [
        { t: 'texto', md: 'Muchos ficheros vienen en columnas. `ventas.csv` las separa con comas.' },
        { t: 'anatomia', partes: [['cut', 'corta'], ['-d,', 'separador, la coma'], ['-f2', 'la columna 2'], ['datos/ventas.csv', 'el fichero']] },
        { t: 'haz', paso: 'columna', md: 'Saca la columna de las ciudades de `datos/ventas.csv`.' },
        { t: 'texto', md: 'Con columnas separadas por espacios, como en los logs, se usa awk. `awk \'{print $1}\'` saca la primera, y `awk \'$9 == 404\'` deja solo las líneas cuya columna 9 vale 404, las peticiones que dieron 404.' },
      ],
    },
    {
      titulo: 'Logs viejos y JSON',
      w: [
        { t: 'texto', md: 'Los logs antiguos se guardan comprimidos, con nombres que acaban en `.gz`. `zcat` los descomprime al vuelo y saca el texto, sin dejar el fichero descomprimido en el disco. Se usa igual que cat.' },
        { t: 'haz', paso: 'zcat', md: 'Escribe `zcat datos/viejo.log.gz`.' },
        { t: 'texto', md: 'Muchos programas hablan **JSON**, texto con llaves y comillas, y `jq` lo filtra. Abajo, `.[]` recorre la lista, `select` deja pasar los que cumplen algo y `length` cuenta.' },
        { t: 'codigo', codigo: '[\n  { "nombre": "ana", "rol": "admin", "activo": true },\n  { "nombre": "luis", "rol": "dev", "activo": false }\n]', notas: { 1: 'Los corchetes son una lista.', 2: 'Cada llave es un objeto con claves y valores.' } },
        { t: 'terminal-demo', lineas: [["jq '.[] | .nombre' usuarios.json", '"ana"\n"luis"'], ["jq '[.[] | select(.activo)] | length' usuarios.json", '1']] },
        { t: 'haz', paso: 'jq', md: 'Cuenta los usuarios activos de `datos/usuarios.json` con jq.', pista: "jq '[.[] | select(.activo)] | length' datos/usuarios.json" },
      ],
    },
    {
      titulo: 'Ordena la receta',
      w: [
        { t: 'ordena', md: 'La receta para saber qué IP pide más en un log. Toca las piezas en orden.', items: ["`cut -d' ' -f1 log`", '`sort`', '`uniq -c`', '`sort -rn`', '`head`'] },
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
        { t: 'chuleta', items: [['cmd > f · cmd >> f', 'guardar, pisando o añadiendo'], ['cmd 2> f', 'guardar solo los errores'], ['a | b', 'la salida de a entra en b'], ['grep -c · -v · -i', 'filtrar'], ['sort | uniq -c | sort -rn', 'contar repetidos'], ['cut -d, -f2 · awk', 'columnas'], ['zcat f.gz', 'leer comprimidos'], ['jq', 'filtrar JSON']] },
      ],
    },
  ],
};
