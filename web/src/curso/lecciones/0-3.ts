// 0.3 · La máquina por dentro. Desde cero: capas, CPU, RAM, disco y procesos.
import type { Leccion } from './tipos';

const CUERPO = 'n0-3a-cuerpo';
const PRACTICA = 'n0-3-maquina';

const mb = (v: string): [number, number, string] => {
  const [u, t] = v.trim().split(/\s+/).map(Number);
  return [u, t, `${u} MB usados de ${t} MB`];
};
const pct = (v: string): [number, number, string] => {
  const n = Math.min(100, Number(v.trim()) || 0);
  return [n, 100, `${n} % de su CPU`];
};

export const leccion: Leccion = {
  id: '0.3',
  titulo: 'La máquina por dentro',
  minutos: 35,
  resumen: 'Ya sabes qué piezas tiene una máquina, qué es un proceso, cómo ver quién gasta más y cómo pararlo. Y sabes mirar su CPU, su RAM, su disco y su kernel.',
  pasos: [
    {
      titulo: 'Qué es un servidor',
      lab: CUERPO,
      w: [
        { t: 'analogia', icono: 'server', de: 'Un servidor', es: 'es un ordenador que trabaja para otros. Casi nunca tiene pantalla ni teclado.' },
        { t: 'texto', md: 'Cuando abres una web o mandas un mensaje, al otro lado hay un servidor. El de tu terminal es uno pequeñito, para ti.' },
        { t: 'comando', cmd: 'hostname', hace: 'Dice cómo se llama la máquina.', uso: 'hostname' },
        { t: 'haz', paso: 'hostname', md: 'Pregúntale cómo se llama. Escribe `hostname`.' },
      ],
    },
    {
      titulo: 'Las capas de una máquina',
      w: [
        { t: 'capas', capas: [
          { t: 'Tú', sub: 'escribes comandos', icono: 'user', info: 'Hablas con la máquina desde la terminal.' },
          { t: 'Programas', sub: 'ls, cat, una web…', icono: 'app-window', info: 'Cada comando que escribes arranca un programa.' },
          { t: 'Kernel', sub: 'el que manda', icono: 'shield', info: 'El **kernel** es el programa jefe. Reparte las piezas de abajo entre todos los programas. Ningún programa toca el hardware sin pedírselo a él.' },
          { t: 'Hardware', sub: 'CPU · RAM · disco · red', icono: 'cpu', info: 'Las piezas físicas. Las vas a ver una a una.' },
        ] },
        { t: 'texto', md: 'Toca cada capa. De arriba abajo es el camino que hace cada orden que escribes.' },
        { t: 'comando', cmd: 'uname', hace: 'Dice qué kernel lleva la máquina.', uso: 'uname' },
        { t: 'haz', paso: 'uname0', md: 'El kernel de esta máquina se llama Linux. Compruébalo escribiendo `uname`.' },
      ],
    },
    {
      titulo: 'Un programa pide, el kernel hace',
      w: [
        { t: 'escena', escena: {
          alto: 300,
          nodos: [
            { id: 'prog', x: 160, y: 70, txt: 'cat', sub: 'un programa', color: 'acento', info: 'Quiere leer un fichero, pero no puede tocar el disco.' },
            { id: 'k', x: 450, y: 160, w: 260, txt: 'kernel', sub: 'el que manda', color: 'xp', info: 'Recibe la petición, va al disco y devuelve lo que había.' },
            { id: 'disco', x: 740, y: 70, txt: 'disco', sub: 'donde vive el fichero', color: 'suave', forma: 'cilindro', info: 'Guarda los ficheros aunque apagues.' },
            { id: 'pant', x: 160, y: 250, txt: 'tu pantalla', color: 'ok', info: 'Donde acaba saliendo el texto.' },
          ],
          flechas: [{ id: 'f1', de: 'prog', a: 'k' }, { id: 'f2', de: 'k', a: 'disco' }, { id: 'f3', de: 'prog', a: 'pant' }],
          pasos: [
            { texto: 'Escribes `cat /etc/hostname`. Arranca el programa cat.', ver: ['prog'], luz: ['prog'] },
            { texto: 'cat no puede tocar el disco. Le pide al kernel que lea el fichero.', ver: ['k', 'f1'], luz: ['k'], viaja: [{ de: 'prog', a: 'k', txt: 'léeme esto' }] },
            { texto: 'El kernel va al disco y trae lo que hay.', ver: ['disco', 'f2'], luz: ['disco'], viaja: [{ de: 'disco', a: 'k', txt: 'datos' }] },
            { texto: 'Se lo da a cat, y cat lo saca por la pantalla.', ver: ['pant', 'f3'], luz: ['pant'], viaja: [{ de: 'k', a: 'prog', txt: 'datos' }, { de: 'prog', a: 'pant', txt: 'texto' }] },
          ],
        } },
        { t: 'haz', paso: 'cathost', md: 'Haz tú lo del dibujo. Escribe `cat /etc/hostname`. cat le pide al kernel que lea ese fichero del disco.' },
      ],
    },
    {
      titulo: 'La CPU',
      w: [
        { t: 'analogia', icono: 'cpu', de: 'La CPU', es: 'es la que hace las cuentas. Cada núcleo trabaja en una cosa a la vez, muy deprisa.' },
        { t: 'comando', cmd: 'nproc', hace: 'Dice cuántos núcleos de CPU ve la máquina.', uso: 'nproc' },
        { t: 'haz', paso: 'nproc', md: 'Escribe `nproc`.' },
        { t: 'cifra', sonda: 'nproc@servidor', txt: 'núcleos que ve esta máquina', tras: 'nproc' },
        { t: 'aviso', md: 'Ve los núcleos del ordenador grande donde vive. Pero solo la dejamos usar un cuarto de uno. La barra de CPU que verás cuenta sobre ese cuarto.' },
      ],
    },
    {
      titulo: 'La CPU, trabajando',
      w: [
        { t: 'medidor', efecto: true, sonda: 'cpu@servidor', titulo: 'CPU que usa tu máquina ahora', fn: pct },
        { t: 'texto', md: 'En tu máquina hay un programa que se llama **ocupado**. Hace cuentas sin parar y no acaba nunca. Si lo lanzas tal cual, se queda con la terminal.' },
        { t: 'comando', cmd: '&', simbolo: true, hace: 'Al final de un comando, lo lanza detrás y te devuelve la terminal. Es como lanzarlo y hacer `bg` de una vez.', partes: [['ocupado', 'el programa'], ['&', 'que se quede detrás', 'xp']] },
        { t: 'texto', md: 'La shell te contesta algo como `[1] 812`. El 1 es su número de trabajo y el 812 es su PID, su número de proceso.' },
        { t: 'haz', paso: 'ocupado-dentro', md: 'Escribe `ocupado &` y mira cómo sube la barra.' },
        { t: 'aviso', md: 'Se queda gastando CPU a propósito. En los dos pasos siguientes lo encuentras y lo paras. Pulsa Seguir.' },
      ],
    },
    {
      titulo: 'Los procesos',
      w: [
        { t: 'texto', md: 'Un proceso es un programa que está funcionando. Cada uno lleva su número, el **PID**.' },
        { t: 'comando', cmd: 'ps', hace: 'Enseña los procesos de la máquina.', ops: [['aux', 'todos los procesos, de todos los usuarios, con lo que gasta cada uno. Se escribe sin guion']], uso: 'ps aux' },
        { t: 'haz', paso: 'ps', md: 'Escribe `ps aux`. Busca ocupado en la última columna y apunta su PID, que es la segunda.' },
        { t: 'texto', md: 'Ahora la lección te enseña la lista aquí, en vivo y más limpia. Verás muchos más procesos que núcleos. El kernel los va turnando, unos milisegundos cada uno, tan deprisa que parece que funcionan todos a la vez.', tras: 'ps' },
        { t: 'aviso', md: 'En tu lista sale también `sh /usr/lib/relavops/vigia`. Es el ayudante del lab que mira lo que haces para que la lección se entere.', tras: 'ps' },
        { t: 'procesos', sonda: 'procesos@servidor', resalta: ['ocupado', 'tragon'], tras: 'ps' },
        { t: 'aviso', md: 'En el paso siguiente lo paras con ese PID.' },
      ],
    },
    {
      titulo: 'Parar un proceso',
      w: [
        { t: 'texto', md: '`kill` ya lo conoces. Con el PID detrás, termina ese proceso, lo hayas lanzado tú o no.' },
        { t: 'anatomia', partes: [['kill', 'el programa'], ['1234', 'el PID del proceso que quieres parar']] },
        { t: 'medidor', efecto: true, sonda: 'cpu@servidor', titulo: 'CPU que usa tu máquina ahora', fn: pct },
        { t: 'haz', paso: 'ocupado-fuera', md: 'Escribe `kill` seguido del PID de ocupado. Mira cómo baja la barra.', pista: 'kill 123   (cambia 123 por el PID que ves en la lista)' },
        { t: 'procesos', sonda: 'procesos@servidor', resalta: ['ocupado'], tras: 'ps' },
      ],
    },
    {
      titulo: 'Quién gasta más',
      w: [
        { t: 'comando', cmd: 'top', hace: 'Enseña los procesos en vivo, con los que más gastan arriba.', uso: 'top' },
        { t: 'teclas', combos: [
          { k: ['P'], que: 'dentro de top, ordena por CPU. Es la P mayúscula' },
          { k: ['M'], que: 'dentro de top, ordena por memoria. La columna RES es la RAM que usa cada proceso' },
          { k: ['q'], que: 'dentro de top, sale' },
        ] },
        { t: 'haz', paso: 'top', md: 'Abre `top`, mira quién está arriba, pulsa `M` y luego `P`, y sal con `q`.' },
      ],
    },
    {
      titulo: 'RAM y disco',
      w: [
        { t: 'comparar', a: { titulo: 'RAM', icono: 'memory-stick', puntos: ['rapidísima', 'se borra al apagar', 'aquí están los programas que funcionan'] }, b: { titulo: 'Disco', icono: 'hard-drive', puntos: ['mucho más lento', 'guarda aunque apagues', 'aquí están los ficheros'] } },
        { t: 'escala', titulo: 'Lo que se tarda en traer un dato', items: [['RAM', 100, '100 nanosegundos'], ['Disco SSD', 100000, '0,1 milisegundos'], ['Disco duro', 10000000, '10 milisegundos'], ['Otro país, por red', 100000000, '100 milisegundos']] },
        { t: 'texto', md: 'Por eso los programas se cargan en la RAM para trabajar. Ir al disco cada vez sería como ir a la biblioteca por cada palabra.' },
        { t: 'comando', cmd: 'ls', ops: [['-h', 'junto con `-l`, pone los tamaños en K, M y G']] },
        { t: 'haz', paso: 'lsweb', md: 'En el disco de esta máquina hay un vídeo. Míralo con `ls -lh /srv/web`. Ocupa 20 MB de disco y nada de RAM hasta que alguien lo abra.' },
      ],
    },
    {
      titulo: 'Mira la RAM',
      w: [
        { t: 'comando', cmd: 'free', hace: 'Enseña cuánta memoria RAM hay y cuánta está ocupada.', ops: [['-m', 'en megas']], uso: 'free -m' },
        { t: 'haz', paso: 'free', md: 'Escribe `free -m`. *total* es toda la RAM y *usada* lo que está ocupado.' },
        { t: 'medidor', sonda: 'ram@servidor', titulo: 'RAM de tu máquina, en vivo', fn: mb, tras: 'free' },
        { t: 'texto', md: 'Ahora otro programa de esta máquina, **tragon**. Se come 300 MB de RAM y se queda esperando.' },
        { t: 'haz', paso: 'tragon-dentro', md: 'Lánzalo como antes, con `&` al final, y mira cómo sube la barra.', pista: 'tragon &' },
        { t: 'aviso', md: 'Se queda comiendo RAM a propósito. En el paso siguiente lo paras. Pulsa Seguir.' },
      ],
    },
    {
      titulo: 'Fuera el tragón',
      w: [
        { t: 'medidor', efecto: true, sonda: 'ram@servidor', titulo: 'RAM de tu máquina', fn: mb },
        { t: 'haz', paso: 'tragon-fuera', md: 'Busca el PID de `tragon` con `ps aux` o con `top` y páralo con `kill`. La RAM vuelve a quedar libre.', pista: 'Escribe `ps aux`, busca tragon en la última columna y luego `kill` y su PID.' },
      ],
    },
    {
      titulo: 'Padres e hijos',
      w: [
        { t: 'texto', md: 'Cuando una máquina arranca, el kernel lanza un primer proceso con el PID 1. Ese lanza otros, y esos otros más. Cada proceso tiene un **padre**, que es el que lo lanzó.' },
        { t: 'comando', cmd: 'ps', ops: [['-p', 'enseña solo el proceso con ese PID'], ['-ef', 'todos los procesos, con el PID de su padre en la columna PPID']] },
        { t: 'haz', paso: 'pid1', md: 'Escribe `ps -p 1` para ver el primero.' },
        { t: 'texto', md: 'En un servidor normal suele ser `systemd`. Aquí sale `maquina` porque tu máquina es un **contenedor** y usa el kernel de un ordenador más grande. Es un programa pequeñito de relavops que la mantiene viva.' },
        { t: 'haz', paso: 'psef', md: 'Escribe `ps -ef` y mira la columna PPID. Es el PID del padre de cada proceso.' },
        { t: 'aviso', md: 'Si matas un proceso y vuelve a aparecer con otro PID, es que su padre lo relanza. Hay que parar primero al padre.' },
      ],
    },
    {
      titulo: 'El disco',
      w: [
        { t: 'texto', md: '`df -h` ya lo conoces de la lección de ficheros. Dice cuánto disco queda.' },
        { t: 'haz', paso: 'df', md: 'Escribe `df -h`. Busca la línea que acaba en `/` y mira la columna Uso%.' },
        { t: 'medidor', sonda: 'disco@servidor', titulo: 'Disco de tu máquina, en vivo', fn: mb, tras: 'df' },
      ],
    },
    {
      titulo: 'El kernel y el sistema',
      w: [
        { t: 'texto', md: 'El kernel tiene versión, como cualquier programa. Y alrededor del kernel va una **distribución**, el paquete de programas con el que viene la máquina. La tuya es Debian.' },
        { t: 'comando', cmd: 'uname', ops: [['-r', 'la versión del kernel']] },
        { t: 'haz', paso: 'uname', md: 'Escribe `uname -r` para ver la versión del kernel.' },
        { t: 'texto', md: 'Ese kernel es el del ordenador grande donde vive tu contenedor, porque lo comparten. Por eso su versión no tiene por qué cuadrar con la distribución que vas a ver ahora.' },
        { t: 'haz', paso: 'osrelease', md: 'Escribe `cat /etc/os-release` para ver la distribución. Fíjate en la línea `ID=`.' },
      ],
    },
    {
      titulo: 'Repaso',
      w: [
        { t: 'verdad', items: [
          ['La RAM guarda las cosas aunque apagues la máquina.', false, 'Se borra al apagar. Lo que guarda es el disco.'],
          ['Cada proceso tiene un número que se llama PID.', true, 'Lo has visto en la lista y con ps.'],
          ['`kill` y un PID paran un proceso.', true, 'Así paraste a ocupado y a tragon.'],
          ['Un programa lee el disco sin pedir permiso a nadie.', false, 'Se lo pide al kernel. Siempre.'],
          ['Si un proceso vuelve tras matarlo, hay que mirar a su padre.', true, 'El padre lo relanza. La columna PPID de `ps -ef` dice quién es.'],
        ] },
      ],
    },
    {
      titulo: 'Práctica con la ficha de una máquina',
      lab: PRACTICA,
      w: [
        { t: 'texto', md: 'Ahora una máquina que no conoces. Rellena su ficha con lo que has aprendido. Contestas con `responde`, como en el tutorial.' },
        { t: 'mision' },
      ],
    },
    {
      titulo: 'El boss',
      w: [
        { t: 'texto', md: 'Alguien se está comiendo esta máquina y se esconde con un nombre que parece del sistema. Sin guía. Si te atascas, pide pista.' },
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
