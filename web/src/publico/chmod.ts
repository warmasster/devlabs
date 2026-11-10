// Calculadora de permisos (contenido/herramientas/calculadora-chmod.md). Número, letras y casillas van
// a la vez. El número queda en la dirección (#755) para poder pasar el enlace.
export {};
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const caja = $('chmod');

if (caja) {
  const oct = $<HTMLInputElement>('ch-oct');
  const sim = $<HTMLInputElement>('ch-sim');
  const dir = $<HTMLInputElement>('ch-dir');
  const casillas = [...caja.querySelectorAll<HTMLInputElement>('input[data-b]')];
  const QUIEN = [
    { k: 'u', nombre: 'El propietario', d: 6 },
    { k: 'g', nombre: 'El grupo', d: 3 },
    { k: 'o', nombre: 'Los demás', d: 0 },
  ];
  let modo = 0o755;

  const letras = (m: number) => {
    const t = (b: number) => ((m >> b) & 1 ? 1 : 0);
    let s = '';
    for (const q of QUIEN) {
      s += t(q.d + 2) ? 'r' : '-';
      s += t(q.d + 1) ? 'w' : '-';
      const x = t(q.d);
      const esp = q.k === 'u' ? m & 0o4000 : q.k === 'g' ? m & 0o2000 : m & 0o1000;
      const c = q.k === 'o' ? 't' : 's';
      s += esp ? (x ? c : c.toUpperCase()) : x ? 'x' : '-';
    }
    return s;
  };

  const deLetras = (s: string): number | null => {
    s = s.trim();
    if (s.length === 10) s = s.slice(1); // -rwxr-xr-x, como sale en ls -l
    if (!/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(s)) return null;
    let m = 0;
    QUIEN.forEach((q, i) => {
      const [r, w, x] = s.slice(i * 3, i * 3 + 3);
      if (r === 'r') m |= 4 << q.d;
      if (w === 'w') m |= 2 << q.d;
      if ('xst'.includes(x)) m |= 1 << q.d;
      if ('sStT'.includes(x)) m |= q.k === 'u' ? 0o4000 : q.k === 'g' ? 0o2000 : 0o1000;
    });
    return m;
  };

  const numero = (m: number) => (m > 0o777 ? m.toString(8).padStart(4, '0') : m.toString(8).padStart(3, '0'));

  const conLetras = (m: number) => {
    const partes = QUIEN.map((q) => {
      const v = (m >> q.d) & 7;
      return `${q.k}=${v & 4 ? 'r' : ''}${v & 2 ? 'w' : ''}${v & 1 ? 'x' : ''}`;
    });
    if (m & 0o4000) partes.push('u+s');
    if (m & 0o2000) partes.push('g+s');
    if (m & 0o1000) partes.push('+t');
    return partes.join(',');
  };

  const lista = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`);

  const explica = (m: number, carpeta: boolean) => {
    const verbos = carpeta ? ['ver lo que hay dentro', 'crear y borrar ficheros dentro', 'entrar'] : ['leerlo', 'cambiarlo', 'ejecutarlo'];
    const frases = QUIEN.map((q) => {
      const v = (m >> q.d) & 7;
      const puede = [v & 4 && verbos[0], v & 2 && verbos[1], v & 1 && verbos[2]].filter(Boolean) as string[];
      const plural = q.k === 'o';
      return puede.length ? `${q.nombre} ${plural ? 'pueden' : 'puede'} ${lista(puede)}.` : `${q.nombre} no ${plural ? 'pueden' : 'puede'} hacer nada.`;
    });
    if (carpeta && (m & 0o222) && !(m & 0o111)) frases.push('Sin la x no se puede entrar, así que escribir dentro tampoco sirve.');
    if (m & 0o4000) frases.push(carpeta ? 'El setuid no hace nada en una carpeta.' : 'Al ejecutarlo, corre con los permisos del propietario (setuid), como passwd.');
    if (m & 0o2000) frases.push(carpeta ? 'Lo que se crea dentro hereda el grupo de la carpeta (setgid).' : 'Al ejecutarlo, corre con el grupo del fichero (setgid).');
    if (m & 0o1000) frases.push(carpeta ? 'Dentro, cada uno solo puede borrar lo suyo (sticky bit), como en /tmp.' : 'El sticky bit no hace nada en un fichero en Linux.');
    return frases.join(' ');
  };

  const aviso = (m: number, carpeta: boolean) => {
    if (m & 0o002) {
      if (carpeta && m & 0o1000) return '';
      return 'Cualquier usuario de la máquina puede cambiar esto. Casi nunca es lo que quieres. Para compartir con tu equipo, usa el grupo (775 o 664).';
    }
    if (m & 0o4000 && m & 0o022) return 'Un programa con setuid que otros pueden cambiar es un agujero. Cualquiera podría meter su código y correrlo como el propietario.';
    if (!carpeta && !(m & 0o400) && m & 0o100) return 'Para ejecutar un script hace falta leerlo. Con x y sin r, un script no arranca. Un programa compilado sí.';
    return '';
  };

  const pinta = (desde?: 'oct' | 'sim') => {
    const carpeta = dir.checked;
    const n = numero(modo);
    if (desde !== 'oct') oct.value = n;
    if (desde !== 'sim') sim.value = letras(modo);
    oct.classList.remove('mal');
    sim.classList.remove('mal');
    for (const c of casillas) c.checked = (modo & Number(c.dataset.b)) !== 0;
    for (const q of QUIEN) $(`ch-${q.k}`).textContent = String((modo >> q.d) & 7);
    const objetivo = carpeta ? 'carpeta' : 'fichero';
    $('ch-cmd').textContent = `chmod ${n} ${objetivo}`;
    $('ch-cmd2').textContent = `chmod ${conLetras(modo)} ${objetivo}`;
    $('ch-ls').textContent = `${carpeta ? 'd' : '-'}${letras(modo)}`;
    $('ch-explica').textContent = explica(modo, carpeta);
    $('ch-aviso').textContent = aviso(modo, carpeta);
    history.replaceState(null, '', `#${n}`);
  };

  oct.addEventListener('input', () => {
    if (/^[0-7]{3,4}$/.test(oct.value.trim())) {
      modo = parseInt(oct.value.trim(), 8);
      pinta('oct');
    } else oct.classList.add('mal');
  });
  sim.addEventListener('input', () => {
    const m = deLetras(sim.value);
    if (m === null) sim.classList.add('mal');
    else {
      modo = m;
      pinta('sim');
    }
  });
  for (const c of casillas)
    c.addEventListener('change', () => {
      const b = Number(c.dataset.b);
      modo = c.checked ? modo | b : modo & ~b;
      pinta();
    });
  dir.addEventListener('change', () => pinta());
  for (const b of caja.querySelectorAll<HTMLButtonElement>('button[data-p]'))
    b.addEventListener('click', () => {
      modo = parseInt(b.dataset.p!, 8);
      if (b.dataset.dir) dir.checked = b.dataset.dir === 'si';
      pinta();
    });

  const desdeDireccion = () => {
    const h = location.hash.slice(1);
    if (/^[0-7]{3,4}$/.test(h)) modo = parseInt(h, 8);
  };
  addEventListener('hashchange', () => {
    desdeDireccion();
    pinta();
  });
  desdeDireccion();
  pinta();
}
