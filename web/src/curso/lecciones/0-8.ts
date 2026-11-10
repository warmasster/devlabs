// 0.8 · Bash scripting. Del primer script a funciones, con códigos de salida y set -euo pipefail.
import type { Leccion } from './tipos';

const L = 'n0-8a-guion';
const PRACTICA = 'n0-8-scripts';
const ejecutable = { t: 'estado', tras: 'lsl', sonda: 'ejecutable', titulo: '¿hola.sh se puede ejecutar?', mapa: { si: ['sí', 'ok'], no: ['no, le falta la x', 'mal'], falta: ['todavía no existe', 'aviso'] } };
const script = { t: 'fichero', efecto: true, sonda: 'script', titulo: '`hola.sh`, tal como está guardado', vacio: 'Todavía no existe.' };

export const leccion: Leccion = {
  id: '0.8',
  titulo: 'Bash scripting',
  minutos: 40,
  resumen: 'Sabes escribir un script, darle permiso, pasarle argumentos, decidir con if, repetir con for, usar funciones y hacer que falle pronto y en voz alta.',
  pasos: [
    {
      titulo: 'Un script es una receta',
      lab: L,
      w: [
        { t: 'analogia', icono: 'book', de: 'Un script', es: 'es un fichero con comandos, uno detrás de otro. Lo lanzas y los hace todos por ti.' },
        { t: 'codigo', codigo: '#!/bin/bash\necho "Hola desde mi script"', notas: { 1: 'La primera línea dice qué programa lee el resto. Se llama **shebang**.', 2: 'Lo demás son comandos normales.' } },
        { t: 'haz', paso: 'shebang', md: 'Muchos programas del sistema son scripts. Mira la primera línea de zcat con `head -1 /usr/bin/zcat`.' },
      ],
    },
    {
      titulo: 'Escríbelo',
      w: [
        script,
        { t: 'haz', paso: 'crear', md: 'Crea `hola.sh` con esas dos líneas. Con `nano hola.sh` vale.' },
      ],
    },
    {
      titulo: 'Dale permiso',
      w: [
        { t: 'haz', paso: 'lsl', md: 'Mira sus permisos con `ls -l hola.sh`. No hay ninguna x.' },
        ejecutable,
        { t: 'texto', md: 'Ya lo viste en permisos. Para lanzarlo como programa necesita la x.' },
        { t: 'texto', md: 'Sin la x también puedes lanzarlo con `bash hola.sh`. Ahí el programa que corre es bash, y a bash le basta con poder leer el fichero.' },
        { t: 'haz', paso: 'permiso', md: 'Escribe `chmod +x hola.sh`.' },
      ],
    },
    {
      titulo: 'Lánzalo',
      w: [
        { t: 'texto', md: '`./` quiere decir el de esta carpeta. Sin eso, la shell solo busca programas en las carpetas de siempre, como `/usr/bin`.' },
        { t: 'texto', md: 'Esa lista de carpetas está en la variable `PATH`. Si tienes curiosidad, mírala con `echo $PATH`.' },
        { t: 'haz', paso: 'lanzar', md: 'Escribe `./hola.sh`.' },
        { t: 'ultimo', nodo: 'lab' },
      ],
    },
    {
      titulo: 'Argumentos',
      w: [
        { t: 'codigo', codigo: '#!/bin/bash\necho "Hola, $1"', notas: { 2: '`$1` es lo primero que le pasas al script. `$2` lo segundo. `$#` cuántos hay y `"$@"` todos.' } },
        script,
        { t: 'haz', paso: 'argumento', md: 'Cambia `hola.sh` para que salude a quien le pases y pruébalo con `./hola.sh Ana`.' },
        { t: 'texto', md: 'Un valor por defecto se escribe `${1:-mundo}`. Si no le pasas nada, usa mundo.' },
      ],
    },
    {
      titulo: 'Códigos de salida',
      w: [
        { t: 'codigo-salida', nodo: 'lab' },
        { t: 'texto', md: 'Ya lo viste en el tutorial. Cada comando acaba con un número, 0 si fue bien. `$?` guarda el del último.' },
        { t: 'haz', paso: 'falso', md: 'Escribe `ls /nada` y después `echo $?`.' },
        { t: 'tabla', cab: ['Escribes', 'Pasa'], filas: [['`a && b`', 'b solo si a fue bien'], ['`a || b`', 'b solo si a falló'], ['`exit 3`', 'el script acaba con el código 3']] },
      ],
    },
    {
      titulo: 'Decidir con if',
      w: [
        { t: 'codigo', codigo: 'if [ -f hola.sh ]; then\n  echo "existe"\nelse\n  echo "no está"\nfi', notas: { 1: '`[ -f x ]` comprueba que x es un fichero. `-d` sería una carpeta. Los espacios dentro de los corchetes son obligatorios, porque `[` es un programa más, como ls, y sus partes van separadas por espacios.', 5: 'fi es if al revés. Cierra el bloque.' } },
        { t: 'haz', paso: 'si', md: 'Escribe en una línea `if [ -f hola.sh ]; then echo existe; fi`.' },
      ],
    },
    {
      titulo: 'Repetir con for',
      w: [
        { t: 'codigo', codigo: 'for f in fotos/*; do\n  echo "$f"\ndone', notas: { 1: 'Para cada nombre que encaja con fotos/*, lo guarda en f.', 2: 'Y hace esto con él.' } },
        { t: 'haz', paso: 'bucle', md: 'Escribe `for f in fotos/*; do echo $f; done`.' },
      ],
    },
    {
      titulo: 'Funciones',
      w: [
        { t: 'codigo', codigo: 'suma() {\n  local total=0\n  for n in "$@"; do\n    total=$((total + n))\n  done\n  echo "$total"\n}\nsuma 2 3 10', notas: { 1: 'Una función es un trozo con nombre que puedes llamar varias veces.', 2: '`local` hace que la variable solo exista dentro.', 4: '`$(( ))` hace cuentas.', 8: 'Se llama como un comando. Imprime 15.' } },
        { t: 'texto', md: 'Un script también puede leer lo que le llega por una tubería. Si dentro llamas a un programa que lee la entrada, como `tr a-z A-Z`, la recibe él.' },
        { t: 'haz', paso: 'funcion', md: 'Las funciones también se escriben en la terminal. Escribe `saluda() { echo "Hola, $1"; }` y luego `saluda Ana`.' },
      ],
    },
    {
      titulo: 'Que falle pronto y alto',
      w: [
        { t: 'codigo', codigo: '#!/bin/bash\nset -euo pipefail\ncd "/srv/mis datos"\ntar czf /backups/hoy.tar.gz .', notas: { 2: '**-e** para en el primer error. **-u** es un error usar una variable que no existe. **pipefail** hace que una tubería falle si falla cualquiera de sus piezas.', 3: 'Sin `set -e`, si este cd falla el script sigue y el tar empaqueta la carpeta equivocada.' } },
        { t: 'comparar', a: { titulo: 'Sin comillas', icono: 'triangle-alert', puntos: ['`cd $DIR`', 'con DIR="mis datos" recibe dos palabras', 'falla o hace otra cosa'] }, b: { titulo: 'Con comillas', icono: 'circle-check', puntos: ['`cd "$DIR"`', 'recibe una sola cosa', 'funciona siempre'] } },
        { t: 'texto', md: 'Para ver qué hace un script línea a línea, lánzalo con `bash -x script.sh`.' },
        { t: 'texto', md: '`tar czf copia.tar.gz carpeta` mete una carpeta entera en un solo fichero comprimido. Es lo que hacen casi todos los backups.' },
        { t: 'haz', paso: 'bashx', md: 'Mira tu script por dentro mientras corre. Escribe `bash -x hola.sh Ana`. Cada línea que ejecuta sale con un + delante.' },
      ],
    },
    {
      titulo: 'Ordena el script',
      w: [
        { t: 'ordena', md: 'Pon en orden las líneas de un script que hace copia de una carpeta.', items: ['`#!/bin/bash`', '`set -euo pipefail`', '`ORIGEN="/srv/datos"`', '`tar czf copia.tar.gz -C "$ORIGEN" .`', '`echo "copia hecha"`'] },
      ],
    },
    {
      titulo: 'Práctica con tests',
      lab: PRACTICA,
      w: [
        { t: 'texto', md: 'Cinco scripts que tienen que pasar unos tests. Escribe `prueba` en la terminal cuando quieras y te dice qué falla.' },
        { t: 'mision' },
      ],
    },
    {
      titulo: 'El boss',
      w: [
        { t: 'texto', md: 'Heredas un script de backup que dice que todo va bien. No es verdad.' },
        { t: 'boss' },
      ],
    },
    {
      titulo: 'Lo que te llevas',
      w: [
        { t: 'chuleta', items: [['#!/bin/bash', 'shebang'], ['chmod +x · ./script', 'permiso y lanzar'], ['$1 · "$@" · ${1:-x}', 'argumentos'], ['$? · && · ||', 'códigos de salida'], ['if [ -f x ]; then … fi', 'decidir'], ['for f in *; do … done', 'repetir'], ['f() { local x; }', 'funciones'], ['set -euo pipefail', 'fallar pronto'], ['bash -x', 'ver qué hace']] },
      ],
    },
  ],
};
