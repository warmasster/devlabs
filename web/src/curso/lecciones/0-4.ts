// 0.4 · La red. Desde cero: qué es una red, IP, ping y puertos, con tres máquinas de verdad.
import type { Leccion } from './tipos';

const RED = 'n0-4a-red';
const PRACTICA = 'n0-4-red';
const PUERTAS = { t: 'puertos', efecto: true, nodo: 'web', puertos: [[22, 'ssh'], [80, 'web'], [443, 'web segura'], [8080, '']] };

export const leccion: Leccion = {
  id: '0.4',
  titulo: 'La red',
  minutos: 30,
  resumen: 'Sabes qué es una IP, cómo comprobar con ping que otra máquina contesta, qué es un puerto, cómo ver los que hay abiertos y cómo llamar a uno.',
  pasos: [
    {
      titulo: 'Las máquinas hablan entre ellas',
      lab: RED,
      w: [
        { t: 'texto', md: 'Un servidor casi nunca está solo. Ahora tienes **tres máquinas** en la misma red. Cada una tiene su tarjeta y su terminal.' },
        { t: 'analogia', icono: 'network', de: 'Una red', es: 'son máquinas unidas por cables o por wifi para mandarse datos.' },
        { t: 'senala', zona: 'pestanas', md: 'Con estas pestañas cambias de una terminal a otra. Ahora estás en la de tu-pc.' },
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
        { t: 'comando', cmd: 'hostname', ops: [['-I', 'las IPs de la máquina, en una sola línea. Es una i mayúscula']] },
        { t: 'haz', paso: 'hostI', nodo: 'tu-pc', md: 'Escribe `hostname -I`.' },
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
        { t: 'comando', cmd: 'ip addr', hace: 'Enseña las tarjetas de red de la máquina y la IP de cada una.', uso: 'ip addr' },
        { t: 'haz', paso: 'ipaddr', nodo: 'tu-pc', md: 'En la terminal de **tu-pc** escribe `ip addr`. Busca la línea que empieza por `inet` y no es la de 127.0.0.1.' },
        { t: 'anatomia', partes: [['inet', 'dirección IPv4'], ['10.0.0.10', 'tu IP'], ['/24', 'el tamaño de la red']], nota: 'La de 127.0.0.1 es la máquina hablando consigo misma. El /24 lo verás en el nivel de redes.' },
        { t: 'maquina', tras: 'ipaddr' },
        { t: 'aviso', md: 'Tu IP también sale en la tarjeta de la máquina. En un servidor de verdad no hay tarjeta, por eso aprendes a buscarla.' },
      ],
    },
    {
      titulo: 'ping',
      w: [
        { t: 'comando', cmd: 'ping', hace: 'Manda un mensajito a otra máquina y espera la respuesta. Si contesta, está ahí y la red funciona.', partes: [['ping', 'el programa'], ['-c 3', 'manda 3 y para'], ['10.0.0.20', 'a quién']], ops: [['-c 3', 'manda 3 mensajes y para. Sin esto no para nunca, y se corta con Ctrl+C']] },
        { t: 'red', efecto: true, origen: 'tu-pc' },
        { t: 'haz', paso: 'pingweb', nodo: 'tu-pc', md: 'Escribe `ping -c 3 10.0.0.20` y mira el mapa.' },
      ],
    },
    {
      titulo: 'Ahora a db',
      w: [
        { t: 'red', efecto: true, origen: 'tu-pc' },
        { t: 'haz', paso: 'pingdb', nodo: 'tu-pc', md: 'Haz ping a **db**. Su IP está en su tarjeta.', pista: 'ping -c 3 10.0.0.30' },
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
        { t: 'comando', cmd: 'ss', hace: 'Enseña las conexiones y las puertas abiertas de la máquina.', ops: [['-t', 'solo las de TCP, el tipo de conexión que usan las webs'], ['-l', 'solo las puertas que están escuchando'], ['-n', 'con números, sin cambiarlos por nombres']], uso: 'ss -tln' },
        { t: 'haz', paso: 'ss', nodo: 'tu-pc', md: 'Escribe `ss -tln` en tu-pc. Las tres opciones van juntas detrás de un solo guion.' },
        { t: 'texto', md: 'No sale ninguna puerta. tu-pc no tiene nada escuchando, y web tampoco. En el paso siguiente abres una.' },
      ],
    },
    {
      titulo: 'Abre una puerta',
      w: [
        { t: 'comando', cmd: 'nc', hace: 'Abre una puerta o llama a una. Sirve para probar la red a mano.', partes: [['nc', 'el programa'], ['-lk', 'escucha y no te vayas'], ['8080', 'en qué puerto']], ops: [['-l', 'escucha en un puerto, como un servidor'], ['-k', 'sigue escuchando después de cada visita']] },
        { t: 'senala', zona: 'pestanas', md: 'Cambia a la terminal de **web** con su pestaña.' },
        { t: 'haz', paso: 'puerto', nodo: 'web', md: 'En web escribe `nc -lk 8080`. Se queda esperando y no te devuelve el control. Es normal, está escuchando en esa puerta.' },
        PUERTAS,
        { t: 'senala', zona: 'web', md: 'Mira la tarjeta de web. Le ha salido un puntito verde con el 8080.' },
      ],
    },
    {
      titulo: 'Llama a esa puerta',
      w: [
        { t: 'comando', cmd: 'nc', ops: [['-z', 'solo comprueba si la puerta abre, sin mandar nada'], ['-v', 'cuenta lo que va pasando']], partes: [['nc', 'el programa'], ['-zv', 'solo comprueba y cuéntalo'], ['10.0.0.20', 'a qué máquina'], ['8080', 'a qué puerto']] },
        { t: 'red', efecto: true, origen: 'tu-pc' },
        { t: 'haz', paso: 'conectar', nodo: 'tu-pc', md: 'Vuelve a **tu-pc** y escribe `nc -zv 10.0.0.20 8080`. Mira el mapa.' },
        { t: 'texto', md: 'Ha salido una conexión hacia web y nc dice que ha funcionado. Si la puerta estuviera cerrada, te diría que la conexión fue rechazada.' },
        { t: 'aviso', md: 'El `nc` de web sigue escuchando. Si quieres cerrar la puerta, ve a su terminal y córtalo con Ctrl+C.' },
      ],
    },
    {
      titulo: 'Repaso de red',
      w: [
        { t: 'clasifica', md: '¿Cuáles pueden ser una IP de verdad?', cubos: ['Puede ser una IP', 'Imposible'], items: [['10.0.0.20', 0], ['192.168.1.1', 0], ['300.1.2.3', 1], ['10.0.0', 1], ['8.8.8.8', 0], ['10.0.0.256', 1]] },
        { t: 'empareja', pares: [['IP', 'la dirección de la máquina'], ['puerto', 'la puerta dentro de la máquina'], ['`ping`', 'pregunta si otra máquina contesta'], ['`ss -tln`', 'enseña las puertas que escuchan'], ['`nc -lk`', 'abre una puerta y espera'], ['`nc -zv`', 'llama a una puerta']] },
      ],
    },
    {
      titulo: 'Práctica',
      lab: PRACTICA,
      w: [
        { t: 'texto', md: 'Otra red, con otras direcciones. Tres máquinas que no conoces. Las IPs están en sus tarjetas, pero compruébalas tú.' },
        { t: 'mision' },
      ],
    },
    {
      titulo: 'El boss',
      w: [
        { t: 'texto', md: 'La tienda no carga y los clientes se quejan. Averigua si falla la máquina o la puerta, y arréglalo.' },
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
