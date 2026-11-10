// 0.9 · Bash scripting. Del primer script a funciones, con variables, códigos de salida y set -euo pipefail.
import type { Leccion } from './tipos';

const L = 'n0-9a-guion';
const PRACTICA = 'n0-9-scripts';
const ejecutable = { t: 'estado', tras: 'lsl', sonda: 'ejecutable', titulo: '¿hola.sh se puede ejecutar?', mapa: { si: ['sí', 'ok'], no: ['no, le falta la x', 'mal'], falta: ['todavía no existe', 'aviso'] } };
const script = { t: 'fichero', efecto: true, sonda: 'script', titulo: '`hola.sh`, tal como está guardado', vacio: 'Todavía no existe.' };

export const leccion: Leccion = {
  id: '0.9',
  titulo: 'Bash scripting',
  minutos: 50,
  resumen: 'Sabes escribir un script, darle permiso, usar variables y argumentos, hacer cuentas, decidir con if, repetir con for, usar funciones y hacer que falle pronto y en voz alta.',
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
        { t: 'haz', paso: 'crear', md: 'Crea `hola.sh` con esas dos líneas. Ábrelo con `nano hola.sh`, escríbelas, guarda y sal.' },
      ],
    },
    {
      titulo: 'Dale permiso',
      w: [
        { t: 'haz', paso: 'lsl', md: 'Mira sus permisos con `ls -l hola.sh`. No hay ninguna x.' },
        ejecutable,
        { t: 'texto', md: 'Ya lo viste en permisos. Para lanzarlo como programa necesita la x.' },
        { t: 'haz', paso: 'permiso', md: 'Escribe `chmod +x hola.sh`.' },
      ],
    },
    {
      titulo: 'Lánzalo',
      w: [
        { t: 'comando', cmd: './', simbolo: true, hace: 'Delante de un programa, quiere decir el de esta carpeta. Sin eso, la shell solo busca en las carpetas de programas, como `/usr/bin`.', uso: './hola.sh' },
        { t: 'haz', paso: 'lanzar', md: 'Escribe `./hola.sh`.' },
        { t: 'ultimo', nodo: 'lab' },
        { t: 'texto', md: 'La lista de carpetas donde busca la shell está en la variable `PATH`. Si tienes curiosidad, mírala con `echo $PATH`.' },
      ],
    },
    {
      titulo: 'Variables',
      w: [
        { t: 'analogia', icono: 'box', de: 'Una variable', es: 'es una caja con nombre donde guardas un valor para usarlo después.' },
        { t: 'comando', cmd: 'NOMBRE=valor', simbolo: true, hace: 'Guarda un valor en una variable. Va todo pegado, sin espacios alrededor del igual.', partes: [['QUIEN', 'el nombre'], ['=', 'sin espacios', 'xp'], ['Ana', 'el valor', 'ok']] },
        { t: 'texto', md: 'Para leerla pones `$` delante, como hiciste con `$SHELL`. Dentro de comillas dobles también funciona.' },
        { t: 'haz', paso: 'variable', md: 'Escribe `QUIEN=Ana` y luego `echo "Hola, $QUIEN"`.' },
        { t: 'aviso', md: 'Pon siempre la variable entre comillas dobles, `"$QUIEN"`. Si guarda algo con espacios, sin comillas se parte en trozos.' },
      ],
    },
    {
      titulo: 'Argumentos',
      w: [
        { t: 'codigo', codigo: '#!/bin/bash\necho "Hola, $1"', notas: { 2: '`$1` es lo primero que le pasas al script. `$2` lo segundo. `$#` cuántos hay y `"$@"` todos.' } },
        { t: 'tabla', cab: ['Variable', 'Guarda'], filas: [['`$1` `$2`', 'el primer y el segundo argumento'], ['`$#`', 'cuántos argumentos hay'], ['`"$@"`', 'todos los argumentos'], ['`${1:-mundo}`', 'el primero y, si no hay, la palabra mundo']] },
        script,
        { t: 'haz', paso: 'argumento', md: 'Cambia `hola.sh` con nano para que salude a quien le pases y pruébalo con `./hola.sh Ana`.' },
      ],
    },
    {
      titulo: 'Códigos de salida',
      w: [
        { t: 'codigo-salida', nodo: 'lab' },
        { t: 'texto', md: 'Ya lo viste en el tutorial. Cada comando acaba con un número, 0 si fue bien.' },
        { t: 'comando', cmd: '$?', simbolo: true, hace: 'Guarda el código de salida del último comando.', uso: 'echo $?' },
        { t: 'haz', paso: 'falso', md: 'Escribe `ls /nada` y después `echo $?`.' },
        { t: 'comando', cmd: '&&', simbolo: true, hace: 'Entre dos comandos, lanza el segundo solo si el primero fue bien.', uso: 'cd fotos && ls' },
        { t: 'comando', cmd: '||', simbolo: true, hace: 'Entre dos comandos, lanza el segundo solo si el primero falló.', uso: 'cd fotos || echo "no hay fotos"' },
        { t: 'comando', cmd: 'exit', hace: 'Termina el script con el código que le digas.', uso: 'exit 1' },
      ],
    },
    {
      titulo: 'Cuentas',
      w: [
        { t: 'comando', cmd: '$(( ))', simbolo: true, hace: 'Hace cuentas con números enteros y deja el resultado en su sitio.', ops: [['+ - * /', 'sumar, restar, multiplicar y dividir'], ['%', 'el resto de dividir. `7 % 2` es 1, por eso sirve para saber si un número es par']], uso: 'echo $((7 % 2))' },
        { t: 'haz', paso: 'cuentas', md: 'Escribe `echo $((7 % 2))` y luego prueba con un número par.' },
      ],
    },
    {
      titulo: 'Decidir con if',
      w: [
        { t: 'comando', cmd: 'if', hace: 'Lanza unos comandos solo si se cumple una condición. Se cierra con `fi`.', ops: [['[ -f nombre ]', 'se cumple si existe y es un fichero'], ['[ -d nombre ]', 'se cumple si existe y es una carpeta'], ['[ -e nombre ]', 'se cumple si existe, sea lo que sea'], ['[ A -eq B ]', 'se cumple si los dos números son iguales']] },
        { t: 'codigo', codigo: 'if [ -f hola.sh ]; then\n  echo "existe"\nelse\n  echo "no está"\nfi', notas: { 1: 'Los espacios dentro de los corchetes son obligatorios, porque `[` es un programa más, como ls, y sus partes van separadas por espacios.', 3: 'else es lo que se hace si no se cumple. Es opcional.', 5: 'fi es if al revés. Cierra el bloque.' } },
        { t: 'comando', cmd: ';', simbolo: true, hace: 'Separa dos comandos escritos en la misma línea. Hace lo mismo que un salto de línea.', uso: 'cd /tmp; ls' },
        { t: 'haz', paso: 'si', md: 'Escribe en una línea `if [ -f hola.sh ]; then echo existe; fi`.' },
      ],
    },
    {
      titulo: 'Repetir con for',
      w: [
        { t: 'comando', cmd: 'for', hace: 'Repite unos comandos una vez por cada cosa de una lista. Va entre `do` y `done`.', uso: 'for f in fotos/*; do echo "$f"; done' },
        { t: 'codigo', codigo: 'for f in fotos/*; do\n  echo "$f"\ndone', notas: { 1: 'Para cada nombre que encaja con fotos/*, lo guarda en la variable f.', 2: 'Y hace esto con él.' } },
        { t: 'haz', paso: 'bucle', md: 'Escribe `for f in fotos/*; do echo "$f"; done`.' },
      ],
    },
    {
      titulo: 'Funciones',
      w: [
        { t: 'comando', cmd: 'nombre() { }', simbolo: true, hace: 'Pone nombre a un trozo de script para llamarlo varias veces. Se llama como un comando, y dentro `$1` y `"$@"` son lo que le pasas a la función.', uso: 'saluda() { echo "Hola, $1"; }' },
        { t: 'codigo', codigo: 'suma() {\n  local total=0\n  for n in "$@"; do\n    total=$((total + n))\n  done\n  echo "$total"\n}\nsuma 2 3 10', notas: { 1: 'Una función es un trozo con nombre que puedes llamar varias veces.', 2: '`local` hace que la variable solo exista dentro de la función.', 4: 'La cuenta se guarda otra vez en total.', 8: 'Se llama como un comando. Imprime 15.' } },
        { t: 'comando', cmd: 'local', hace: 'Dentro de una función, crea una variable que solo existe ahí dentro.', uso: 'local total=0' },
        { t: 'haz', paso: 'funcion', md: 'Las funciones también se escriben en la terminal. Escribe `saluda() { echo "Hola, $1"; }` y luego `saluda Ana`.' },
      ],
    },
    {
      titulo: 'Leer de una tubería',
      w: [
        { t: 'texto', md: 'Un script también puede recibir texto por una tubería. Si dentro llamas a un programa que lee la entrada, la recibe él.' },
        { t: 'comando', cmd: 'tr', hace: 'Cambia unas letras por otras en el texto que le llega por la tubería.', partes: [['tr', 'el programa'], ['a-z', 'estas letras'], ['A-Z', 'por estas']] },
        { t: 'haz', paso: 'tr', md: 'Escribe `echo hola | tr a-z A-Z`.' },
        { t: 'texto', md: 'Un script con esa sola línea, `tr a-z A-Z`, pasa a mayúsculas todo lo que le llegue.' },
      ],
    },
    {
      titulo: 'Que falle pronto y alto',
      w: [
        { t: 'comando', cmd: 'set', hace: 'Cambia cómo se comporta bash. En la segunda línea de un script, lo hace estricto.', ops: [['-e', 'para el script en el primer comando que falle'], ['-u', 'es un error usar una variable que no existe'], ['-o pipefail', 'una tubería falla si falla cualquiera de sus piezas']], uso: 'set -euo pipefail' },
        { t: 'comando', cmd: 'tar', hace: 'Mete una carpeta entera en un solo fichero. Es lo que hacen casi todos los backups.', ops: [['czf', 'crea (c) un fichero (f) comprimido (z). Se escribe sin guion'], ['-C carpeta', 'entra antes en esa carpeta']], uso: 'tar czf copia.tar.gz carpeta' },
        { t: 'codigo', codigo: '#!/bin/bash\nset -euo pipefail\ncd "/srv/mis datos"\ntar czf /backups/hoy.tar.gz .', notas: { 3: 'Sin `set -e`, si este cd falla el script sigue y el tar empaqueta la carpeta equivocada.', 4: 'El punto es esta carpeta.' } },
        { t: 'comparar', a: { titulo: 'Sin comillas', icono: 'triangle-alert', puntos: ['`cd $DIR`', 'con DIR="mis datos" recibe dos palabras', 'falla o hace otra cosa'] }, b: { titulo: 'Con comillas', icono: 'circle-check', puntos: ['`cd "$DIR"`', 'recibe una sola cosa', 'funciona siempre'] } },
        { t: 'comando', cmd: 'bash', hace: 'Lanza un script con bash, aunque no tenga la x.', ops: [['-x', 'enseña cada línea antes de ejecutarla, con un + delante']], uso: 'bash -x hola.sh' },
        { t: 'haz', paso: 'bashx', md: 'Mira tu script por dentro mientras funciona. Escribe `bash -x hola.sh Ana`.' },
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
        { t: 'texto', md: 'Cinco scripts que tienen que pasar unos tests. El programa `prueba` de ese lab te dice qué falla. Escríbelo en la terminal cuando quieras.' },
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
        { t: 'chuleta' },
      ],
    },
  ],
};
