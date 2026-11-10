// 0.1 · Qué es un ordenador para un sysadmin. Desde cero: piezas, procesos, red, IP, ping y puertos.
import type { Leccion } from './tipos';

const CUERPO = 'n0-1a-cuerpo';
const RED = 'n0-1b-red';
const PRACTICA = 'n0-1-maquina';

const mb = (v: string): [number, number, string] => {
  const [u, t] = v.trim().split(/\s+/).map(Number);
  return [u, t, `${u} MB usados de ${t} MB`];
};
const pct = (v: string): [number, number, string] => {
  const n = Math.min(100, Number(v.trim()) || 0);
  return [n, 100, `${n} % de su CPU`];
};

export const leccion: Leccion = {
  id: '0.1',
  titulo: 'Qué es un ordenador para un sysadmin',
  minutos: 45,
  resumen: 'Ya sabes qué piezas tiene una máquina, qué es un proceso y cómo pararlo. Y sabes qué es una IP, cómo comprobar con ping que otra máquina contesta y qué es un puerto.',
  pasos: [
    {
      titulo: 'Qué es un servidor',
      lab: CUERPO,
      w: [
        { t: 'analogia', icono: 'server', de: 'Un servidor', es: 'es un ordenador que trabaja para otros. Casi nunca tiene pantalla ni teclado.' },
        { t: 'texto', md: 'Cuando abres una web o mandas un mensaje, al otro lado hay un servidor. El de la derecha es uno pequeñito, para ti.' },
        { t: 'haz', paso: 'hostname', md: 'Pregúntale cómo se llama. Escribe `hostname` en la terminal.' },
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
            { texto: 'Escribes `cat bienvenida.txt`. Arranca el programa cat.', ver: ['prog'], luz: ['prog'] },
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
        { t: 'haz', paso: 'nproc', md: 'Escribe `nproc`. Te dice cuántos núcleos hay.' },
        { t: 'cifra', sonda: 'nproc@servidor', txt: 'núcleos que ve esta máquina', tras: 'nproc' },
        { t: 'aviso', md: 'Ve los núcleos del ordenador grande donde vive. Pero solo la dejamos usar un cuarto de uno. La barra de CPU que verás cuenta sobre ese cuarto.' },
      ],
    },
    {
      titulo: 'La CPU, trabajando',
      w: [
        { t: 'medidor', efecto: true, sonda: 'cpu@servidor', titulo: 'CPU que usa tu máquina ahora', fn: pct },
        { t: 'texto', md: 'En tu máquina hay un programa que se llama **ocupado**. Hace cuentas sin parar y no acaba nunca.' },
        { t: 'anatomia', partes: [['ocupado', 'el programa'], ['&', 'que se quede detrás y te devuelva la terminal', 'xp']] },
        { t: 'texto', md: 'Sin el `&`, ocuparía la terminal y no podrías escribir nada más. Con él, la shell te contesta algo como `[1] 812`. Ese 812 es su número.' },
        { t: 'haz', paso: 'ocupado-dentro', md: 'Escribe `ocupado &` y mira cómo sube la barra.' },
        { t: 'aviso', md: 'Se queda gastando CPU a propósito. En los dos pasos siguientes lo encuentras y lo paras. Pulsa Seguir.' },
      ],
    },
    {
      titulo: 'Los procesos',
      w: [
        { t: 'analogia', icono: 'activity', de: 'Un proceso', es: 'es un programa que está funcionando ahora mismo. Cada uno lleva un número que se llama **PID**.' },
        { t: 'texto', md: 'Para ver los procesos de una máquina se usa `ps`. Con `aux` enseña todos, de todos los usuarios.' },
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
        { t: 'anatomia', partes: [['kill', 'el programa'], ['1234', 'el PID del proceso que quieres parar']] },
        { t: 'medidor', efecto: true, sonda: 'cpu@servidor', titulo: 'CPU que usa tu máquina ahora', fn: pct },
        { t: 'haz', paso: 'ocupado-fuera', md: 'Escribe `kill` seguido del PID de ocupado. Mira cómo baja la barra.', pista: 'kill 123   (cambia 123 por el PID que ves en la lista)' },
        { t: 'procesos', sonda: 'procesos@servidor', resalta: ['ocupado'], tras: 'ps' },
      ],
    },
    {
      titulo: 'RAM y disco',
      w: [
        { t: 'comparar', a: { titulo: 'RAM', icono: 'memory-stick', puntos: ['rapidísima', 'se borra al apagar', 'aquí están los programas que funcionan'] }, b: { titulo: 'Disco', icono: 'hard-drive', puntos: ['mucho más lento', 'guarda aunque apagues', 'aquí están los ficheros'] } },
        { t: 'escala', titulo: 'Lo que se tarda en traer un dato', items: [['RAM', 100, '100 nanosegundos'], ['Disco SSD', 100000, '0,1 milisegundos'], ['Disco duro', 10000000, '10 milisegundos'], ['Otro país, por red', 100000000, '100 milisegundos']] },
        { t: 'texto', md: 'Por eso los programas se cargan en la RAM para trabajar. Ir al disco cada vez sería como ir a la biblioteca por cada palabra.' },
        { t: 'haz', paso: 'lsweb', md: 'En el disco de esta máquina hay un vídeo. Míralo con `ls -lh /srv/web`. Ocupa 20 MB de disco y nada de RAM hasta que alguien lo abra.' },
      ],
    },
    {
      titulo: 'Mira la RAM',
      w: [
        { t: 'haz', paso: 'free', md: 'Escribe `free -m`. *total* es toda la RAM y *usada* lo que está ocupado, en megas.' },
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
        { t: 'haz', paso: 'tragon-fuera', md: 'Busca el PID de `tragon` con `ps aux` y páralo con `kill`. La RAM vuelve a quedar libre.', pista: 'ps aux, busca tragon en la última columna, y luego kill y su PID' },
      ],
    },
    {
      titulo: 'El primer proceso',
      w: [
        { t: 'texto', md: 'Cuando una máquina arranca, el kernel lanza un primer proceso con el PID 1. Ese lanza otros, y esos otros más.' },
        { t: 'haz', paso: 'pid1', md: 'Escribe `ps -p 1`. La opción `-p` elige un PID.' },
        { t: 'texto', md: 'En un servidor normal suele ser `systemd`. Aquí sale `maquina` porque tu máquina es un **contenedor** y usa el kernel de un ordenador más grande. Es un programa pequeñito de relavops que la mantiene viva y recoge a los procesos que terminan. Tu shell no cuelga de él, la abre relavops desde fuera.' },
      ],
    },
    {
      titulo: 'El disco',
      w: [
        { t: 'haz', paso: 'df', md: 'Escribe `df -h`. Busca la línea que acaba en `/` y mira la columna Uso%.' },
        { t: 'medidor', sonda: 'disco@servidor', titulo: 'Disco de tu máquina, en vivo', fn: mb, tras: 'df' },
        { t: 'texto', md: 'La `-h` viene de *human*. Pone los tamaños en G y M en vez de números enormes.' },
      ],
    },
    {
      titulo: 'El kernel y el sistema',
      w: [
        { t: 'texto', md: 'El kernel tiene versión, como cualquier programa. Y alrededor del kernel va una **distribución**, el paquete de programas con el que viene la máquina. La tuya es Debian.' },
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
        ] },
      ],
    },
    {
      titulo: 'Las máquinas hablan entre ellas',
      lab: RED,
      w: [
        { t: 'texto', md: 'Un servidor casi nunca está solo. Ahora tienes **tres máquinas** en la misma red. Mira sus tarjetas a la derecha.' },
        { t: 'analogia', icono: 'network', de: 'Una red', es: 'son máquinas unidas por cables o por wifi para mandarse datos.' },
        { t: 'red', efecto: true, origen: 'tu-pc' },
        { t: 'haz', paso: 'hostpc', nodo: 'tu-pc', md: 'Escribe `hostname` en la terminal de tu-pc. Cada máquina tiene su nombre.' },
      ],
    },
    {
      titulo: 'Qué es una IP',
      w: [
        { t: 'analogia', icono: 'house', de: 'Una IP', es: 'es la dirección de una máquina en la red. Como la dirección de una casa para el cartero.' },
        { t: 'ip', ip: '10.0.0.20' },
        { t: 'texto', md: 'Son cuatro números separados por puntos. Cada uno va de 0 a 255. Toca uno para ver por qué.' },
        { t: 'haz', paso: 'hostI', nodo: 'tu-pc', md: 'Escribe `hostname -I`. Te dice las IPs de tu-pc en una sola línea.' },
      ],
    },
    {
      titulo: 'Por qué hasta 255',
      w: [
        { t: 'texto', md: 'Los ordenadores cuentan con **bits**, interruptores que están a 0 o a 1. Cada número de la IP son 8 bits. Cada bit vale el doble que el de su derecha. Con los 8 encendidos sale 255.' },
        { t: 'texto', md: 'Enciende los bits que sumen 20, el último número de la IP de web.' },
        { t: 'binario', objetivo: 20 },
      ],
    },
    {
      titulo: 'Tu IP',
      w: [
        { t: 'haz', paso: 'ipaddr', nodo: 'tu-pc', md: 'En la terminal de **tu-pc** escribe `ip addr`. Busca la línea que empieza por `inet` y no es la de 127.0.0.1.' },
        { t: 'anatomia', partes: [['inet', 'dirección IPv4'], ['10.0.0.10', 'tu IP'], ['/24', 'el tamaño de la red']], nota: 'La de 127.0.0.1 es la máquina hablando consigo misma. El /24 lo verás en el nivel de redes.' },
        { t: 'maquina', tras: 'ipaddr' },
        { t: 'aviso', md: 'Tu IP también sale en la tarjeta de la derecha. En un servidor de verdad no hay tarjeta, por eso aprendes a buscarla.' },
      ],
    },
    {
      titulo: 'ping',
      w: [
        { t: 'analogia', icono: 'radar', de: 'ping', es: 'manda un mensajito a otra máquina y espera la respuesta. Si contesta, está ahí y la red funciona.' },
        { t: 'anatomia', partes: [['ping', 'el programa'], ['-c 3', 'manda 3 y para'], ['10.0.0.20', 'a quién']] },
        { t: 'red', efecto: true, origen: 'tu-pc' },
        { t: 'haz', paso: 'pingweb', nodo: 'tu-pc', md: 'Escribe `ping -c 3 10.0.0.20` y mira el mapa.' },
      ],
    },
    {
      titulo: 'Ahora a db',
      w: [
        { t: 'red', efecto: true, origen: 'tu-pc' },
        { t: 'haz', paso: 'pingdb', nodo: 'tu-pc', md: 'Haz ping a **db**. Su IP está en su tarjeta, a la derecha.', pista: 'ping -c 3 10.0.0.30' },
        { t: 'texto', md: 'En la terminal, cada línea con `time=` es una respuesta. El número es lo que tardó en ir y volver, en milisegundos.' },
      ],
    },
    {
      titulo: 'Una IP que no es de nadie',
      w: [
        { t: 'red', efecto: true, origen: 'tu-pc' },
        { t: 'haz', paso: 'pingnadie', nodo: 'tu-pc', md: 'Escribe `ping -c 2 10.0.0.99`. Ninguna máquina tiene esa IP.' },
        { t: 'texto', md: 'Los mensajes salen y nadie contesta. Al final ping dice cuántos se perdieron.' },
        { t: 'texto', md: 'Cuando pasa esto, puede ser que la dirección esté mal o que la red esté rota. También puede haber un cortafuegos que no deja pasar el ping. Que una máquina no conteste no siempre quiere decir que no esté.' },
      ],
    },
    {
      titulo: 'Los puertos',
      w: [
        { t: 'analogia', icono: 'door-open', de: 'Un puerto', es: 'es una puerta con número dentro de la máquina. La IP te lleva al edificio y el puerto, a la puerta concreta.' },
        { t: 'tabla', cab: ['Puerto', 'Quién suele estar detrás'], filas: [['22', 'SSH, para entrar a la terminal de otra máquina'], ['80', 'webs sin cifrar'], ['443', 'webs con candado'], ['5432', 'la base de datos PostgreSQL']] },
        { t: 'puertos', efecto: true, nodo: 'web', puertos: [[22, 'ssh'], [80, 'web'], [443, 'web segura'], [8080, '']] },
        { t: 'texto', md: 'Ahora mismo web tiene todas sus puertas cerradas. Vas a abrir una.' },
        { t: 'haz', paso: 'ss', nodo: 'tu-pc', md: 'Las puertas abiertas se miran con `ss -tln`. Escríbelo en tu-pc.' },
      ],
    },
    {
      titulo: 'Abre una puerta',
      w: [
        { t: 'senala', zona: 'pestanas', md: 'Cambia a la terminal de **web** con su pestaña, a la derecha.' },
        { t: 'haz', paso: 'puerto', nodo: 'web', md: 'En web escribe `nc -lk 8080`. Se queda esperando y no te devuelve el control. Es normal, está escuchando en esa puerta.' },
        { t: 'puertos', efecto: true, nodo: 'web', puertos: [[22, 'ssh'], [80, 'web'], [443, 'web segura'], [8080, '']] },
        { t: 'senala', zona: 'web', md: 'Mira la tarjeta de web. Le ha salido un puntito verde con el 8080.' },
      ],
    },
    {
      titulo: 'Llama a esa puerta',
      w: [
        { t: 'red', efecto: true, origen: 'tu-pc' },
        { t: 'haz', paso: 'conectar', nodo: 'tu-pc', md: 'Vuelve a **tu-pc** y escribe `nc -zv 10.0.0.20 8080`. Mira el mapa.' },
        { t: 'texto', md: 'Ha salido una conexión hacia web y nc dice que ha funcionado. Si la puerta estuviera cerrada, te diría que la conexión fue rechazada.' },
      ],
    },
    {
      titulo: 'Repaso de red',
      w: [
        { t: 'clasifica', md: '¿Cuáles pueden ser una IP de verdad?', cubos: ['Puede ser una IP', 'Imposible'], items: [['10.0.0.20', 0], ['192.168.1.1', 0], ['300.1.2.3', 1], ['10.0.0', 1], ['8.8.8.8', 0], ['10.0.0.256', 1]] },
        { t: 'empareja', pares: [['IP', 'la dirección de la máquina'], ['puerto', 'la puerta dentro de la máquina'], ['`ping`', 'pregunta si otra máquina contesta'], ['`nc -l`', 'abre una puerta y espera']] },
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
        { t: 'chuleta', items: [['nproc', 'cuántos núcleos'], ['free -m', 'la RAM, en megas'], ['df -h', 'el disco'], ['ps aux', 'todos los procesos'], ['kill PID', 'parar un proceso'], ['uname -r', 'versión del kernel'], ['ip addr', 'tus IPs'], ['ping -c 3 IP', 'comprobar si otra máquina contesta'], ['nc -lk 8080', 'abrir una puerta y esperar'], ['nc -zv IP 8080', 'llamar a una puerta']] },
      ],
    },
  ],
};
