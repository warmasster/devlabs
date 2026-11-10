// Calculadora de subredes IPv4 (contenido/herramientas/calculadora-subredes.md). Acepta 192.168.1.10/24,
// 192.168.1.10 255.255.255.0 o 192.168.1.10/255.255.255.0. Lo escrito queda en la dirección para pasarlo.
export {};
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const caja = $('subredes');

if (caja) {
  const entrada = $<HTMLInputElement>('sr-ip');
  const division = $<HTMLSelectElement>('sr-div');
  const MAX_FILAS = 64;

  const aNum = (s: string): number | null => {
    const p = s.trim().split('.');
    if (p.length !== 4) return null;
    let n = 0;
    for (const x of p) {
      if (!/^\d{1,3}$/.test(x) || Number(x) > 255) return null;
      n = n * 256 + Number(x);
    }
    return n;
  };
  const aIp = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  const mascara = (p: number) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);
  const prefijoDe = (m: number): number | null => {
    for (let p = 0; p <= 32; p++) if (mascara(p) === m) return p;
    return null; // una máscara con unos y ceros mezclados
  };
  const miles = (n: number) => n.toLocaleString('es-ES');

  const tipo = (ip: number): string => {
    const en = (red: string, p: number) => ((ip & mascara(p)) >>> 0) === aNum(red);
    if (en('10.0.0.0', 8) || en('172.16.0.0', 12) || en('192.168.0.0', 16)) return 'Privada (RFC 1918)';
    if (en('100.64.0.0', 10)) return 'Compartida, la del CGNAT de las operadoras (RFC 6598)';
    if (en('127.0.0.0', 8)) return 'Loopback, la propia máquina';
    if (en('169.254.0.0', 16)) return 'Enlace local. Sale cuando no llega el DHCP';
    if (en('0.0.0.0', 8)) return 'Esta red. No se usa en máquinas';
    if (en('224.0.0.0', 4)) return 'Multicast';
    if (en('240.0.0.0', 4)) return 'Reservada';
    return 'Pública';
  };
  const clase = (ip: number) => {
    const a = ip >>> 24;
    return a < 128 ? 'A' : a < 192 ? 'B' : a < 224 ? 'C' : a < 240 ? 'D (multicast)' : 'E (reservada)';
  };

  const leer = (s: string): { ip: number; p: number } | null => {
    const m = s.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\s*(?:\/\s*|\s+)(\S+)$/);
    if (!m) {
      const ip = aNum(s);
      return ip === null ? null : { ip, p: 32 };
    }
    const ip = aNum(m[1]);
    if (ip === null) return null;
    if (/^\d{1,2}$/.test(m[2]) && Number(m[2]) <= 32) return { ip, p: Number(m[2]) };
    const mk = aNum(m[2]);
    const p = mk === null ? null : prefijoDe(mk);
    return p === null ? null : { ip, p };
  };

  const fila = (k: string, v: string, menta = false) => `<div><span>${k}</span><b${menta ? ' class="menta"' : ''}>${v}</b></div>`;

  const bits = (n: number, p: number) => {
    const b = n.toString(2).padStart(32, '0');
    let s = '';
    for (let i = 0; i < 32; i++) {
      if (i && i % 8 === 0) s += '.';
      s += `<span class="${i < p ? 'r' : 'h'}">${b[i]}</span>`;
    }
    return s;
  };

  let ultimoPrefijo = -1;
  const pinta = () => {
    const v = leer(entrada.value);
    const aviso = $('sr-aviso');
    if (!v) {
      entrada.classList.add('mal');
      aviso.textContent = 'Escribe una IP con su máscara, como 192.168.1.10/24 o 192.168.1.10 255.255.255.0.';
      return;
    }
    entrada.classList.remove('mal');
    const { ip, p } = v;
    const mk = mascara(p);
    const red = (ip & mk) >>> 0;
    const difusion = (red | (~mk >>> 0)) >>> 0;
    const total = 2 ** (32 - p);
    const utiles = p === 32 ? 1 : p === 31 ? 2 : total - 2;
    const primera = p >= 31 ? red : red + 1;
    const ultima = p >= 31 ? difusion : difusion - 1;

    $('sr-salida').innerHTML = [
      fila('Red', `${aIp(red)}/${p}`, true),
      fila('Máscara', `${aIp(mk)} (/${p})`),
      fila('Comodín (wildcard)', aIp(~mk >>> 0)),
      fila('Primera IP para máquinas', aIp(primera)),
      fila('Última IP para máquinas', aIp(ultima)),
      fila('Broadcast', p >= 31 ? 'No tiene' : aIp(difusion)),
      fila('IPs para máquinas', miles(utiles)),
      fila('Direcciones en total', miles(total)),
      fila('Tipo', tipo(ip)),
      fila('Clase (la de antes del CIDR)', clase(ip)),
    ].join('');
    $('sr-bits').innerHTML = `IP       ${bits(ip, p)}\nMáscara  ${bits(mk, p)}\nRed      ${bits(red, p)}\n\n<span class="r">verde</span> la parte de red · <span class="h">amarillo</span> la parte de máquina`;

    aviso.textContent =
      p < 31 && ip === red
        ? 'Esa es la dirección de la red. No se le puede poner a una máquina.'
        : p < 31 && ip === difusion
          ? 'Esa es la de broadcast. Lo que se manda ahí llega a todas las máquinas de la red y no se le puede poner a ninguna.'
          : p === 31
            ? 'Una /31 solo tiene dos direcciones y las dos valen. Se usa para unir dos routers (RFC 3021).'
            : '';

    // Las opciones de partir solo cambian si cambia el prefijo.
    if (p !== ultimoPrefijo) {
      ultimoPrefijo = p;
      const elegido = Number(division.value) || Math.min(p + 2, 32);
      division.innerHTML = '';
      for (let q = p + 1; q <= Math.min(p + 10, 32); q++) {
        const o = new Option(`/${q}, ${miles(2 ** (q - p))} redes de ${miles(q >= 31 ? 2 ** (32 - q) : 2 ** (32 - q) - 2)} máquinas`, String(q));
        division.add(o);
      }
      division.value = String(Math.min(Math.max(elegido, p + 1), Math.min(p + 10, 32)));
      division.disabled = p >= 32;
    }
    partir(red, p);
    history.replaceState(null, '', `#${aIp(ip)}/${p}`);
  };

  const partir = (red: number, p: number) => {
    const t = $('sr-tabla');
    const q = Number(division.value);
    if (!q || q <= p) {
      t.innerHTML = '';
      return;
    }
    const n = 2 ** (q - p);
    const tam = 2 ** (32 - q);
    let filas = '';
    for (let i = 0; i < Math.min(n, MAX_FILAS); i++) {
      const r = red + i * tam;
      const b = r + tam - 1;
      filas += `<tr><td>${i + 1}</td><td>${aIp(r)}/${q}</td><td>${aIp(q >= 31 ? r : r + 1)} a ${aIp(q >= 31 ? b : b - 1)}</td><td>${q >= 31 ? '·' : aIp(b)}</td></tr>`;
    }
    if (n > MAX_FILAS) filas += `<tr><td colspan="4">y ${miles(n - MAX_FILAS)} redes más del mismo tamaño</td></tr>`;
    t.innerHTML = `<table><thead><tr><th>#</th><th>Red</th><th>IPs para máquinas</th><th>Broadcast</th></tr></thead><tbody>${filas}</tbody></table>`;
  };

  entrada.addEventListener('input', pinta);
  division.addEventListener('change', pinta);
  for (const b of caja.querySelectorAll<HTMLButtonElement>('button[data-ip]'))
    b.addEventListener('click', () => {
      entrada.value = b.dataset.ip!;
      division.value = '';
      ultimoPrefijo = -1;
      pinta();
    });

  const desdeDireccion = () => {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h && leer(h) && h !== entrada.value) {
      entrada.value = h;
      pinta();
    }
  };
  addEventListener('hashchange', desdeDireccion);
  desdeDireccion();
  pinta();
}
