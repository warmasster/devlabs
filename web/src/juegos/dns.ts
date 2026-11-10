// Nivel 2 · DNS envenenado: que los clientes sigan llegando a tienda.lab.
import type { Juego } from './motor';
import { Asedio } from './ataques';

const C = 'cliente', D = 'dns', T = 'tienda';
const IP_DNS = '10.6.1.2', IP_TIENDA = '10.6.2.2';
let asedio: Asedio;

const juego: Juego = {
  id: 'dns',
  lab: 'j-dns',
  titulo: 'DNS envenenado',
  nivel: 'Examen final · Nivel 2 · DNS',
  resumen: 'Alguien envenena la resolución de nombres. Que la tienda siga vendiendo.',
  reglas: `<p>Los clientes compran en <code>http://tienda.lab</code>. El nombre lo resuelve <b>dns</b> (dnsmasq, ${IP_DNS}) y la tienda está en ${IP_TIENDA}.</p>
    <ul><li>«ic:ghost» Un boss irá envenenando la resolución: <code>/etc/hosts</code>, <code>/etc/resolv.conf</code>, el registro en dnsmasq…</li>
    <li>«ic:trending-down» Mientras <code>curl http://tienda.lab</code> falle desde <b>cliente</b>, pierdes ventas (vida).</li>
    <li>«ic:trophy» Aguanta 4 ataques. Desde cliente puedes saltar a dns con <code>ssh dns</code>.</li></ul>
    <p>Herramientas: <code>dig tienda.lab</code>, <code>getent hosts tienda.lab</code>, <code>cat /etc/resolv.conf</code>.</p>`,
  mapa: { nodos: { cliente: { x: 160, y: 170, sub: 'tú' }, dns: { x: 600, y: 80, sub: IP_DNS }, tienda: { x: 600, y: 260, sub: IP_TIENDA } },
    enlaces: [['cliente', 'dns'], ['cliente', 'tienda']], alto: 340 },
  terminales: [C],

  async iniciar(api) {
    await api.exs([
      [D, `printf 'no-resolv\\nlisten-address=${IP_DNS}\\nbind-interfaces\\naddress=/tienda.lab/${IP_TIENDA}\\n' > /etc/dnsmasq.d/tienda.conf; pkill dnsmasq; dnsmasq --conf-dir=/etc/dnsmasq.d; true`],
      [T, `mkdir -p /srv/www && echo 'Tienda OK' > /srv/www/index.html; nohup python3 -m http.server 80 --directory /srv/www >/dev/null 2>&1 &`],
      [C, `echo 'nameserver ${IP_DNS}' > /etc/resolv.conf; printf 'cliente · que tienda.lab siga funcionando\\n' > /etc/motd; true`],
    ]);
    api.icono('yo', '«ic:user-round»', C);
    asedio = new Asedio([
      { nombre: 'hosts envenenado', aviso: 'alguien ha metido una línea falsa en <code>/etc/hosts</code> del cliente.', hacer: [[C, "echo '6.6.6.6 tienda.lab' >> /etc/hosts"]], pista: '<code>getent hosts tienda.lab</code> mira primero /etc/hosts.' },
      { nombre: 'resolver cambiado', aviso: 'el cliente ahora pregunta a otro servidor DNS.', hacer: [[C, "echo 'nameserver 9.9.9.9' > /etc/resolv.conf"]], pista: '<code>cat /etc/resolv.conf</code>: ¿a quién le preguntas?' },
      { nombre: 'registro falso', aviso: 'el registro de tienda.lab en dnsmasq apunta a otra IP.', hacer: [[D, "sed -i 's#/tienda.lab/.*#/tienda.lab/10.6.2.66#' /etc/dnsmasq.d/tienda.conf; pkill dnsmasq; dnsmasq --conf-dir=/etc/dnsmasq.d"]], pista: '<code>dig @10.6.1.2 tienda.lab</code> y luego <code>ssh dns</code> → <code>/etc/dnsmasq.d/</code>.' },
      { nombre: 'dns caído', aviso: 'el servidor DNS ha dejado de responder.', hacer: [[D, 'pkill dnsmasq']], pista: 'En dns: <code>dnsmasq --conf-dir=/etc/dnsmasq.d</code>.' },
    ], { facil: 40, normal: 25, pesadilla: 15 });
  },

  async tick(api) {
    const r = await api.ex(C, "for i in 1 2 3 4; do curl -s -m 0.8 http://tienda.lab/ & done 2>/dev/null; wait");
    const ok = (r.out.match(/Tienda OK/g) ?? []).length / 4;
    api.claseNodo(T, 'ok', ok >= 0.95);
    api.claseNodo(C, 'mal', ok < 0.95);
    api.etiquetaNodo(C, ok >= 0.95 ? '«ic:shopping-cart»«ic:circle-check»' : '«ic:shopping-cart»«ic:circle-x»');
    await asedio.paso(api, ok, '«ic:shopping-cart» Ventas OK');
  },
};
export default juego;
