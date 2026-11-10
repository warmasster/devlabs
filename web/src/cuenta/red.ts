// Red de máquinas animada: servidores y routers unidos por cables, con paquetes que viajan.
// La usan la página de entrar y la portada. Se para sola con la pestaña escondida y respeta
// la preferencia de menos movimiento.
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

export type EstadoRed = 'calma' | 'tecleo' | 'bien' | 'mal';
export const COLORES = { menta: '#5ff2a8', lila: '#c29bff', rosa: '#ff6f91', sol: '#ffd166' };

export class Red {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private nodos: { x: number; y: number; tipo: number; prof: number; luz: number; fase: number }[] = [];
  private aristas: [number, number][] = [];
  private paquetes: { a: number; b: number; t: number; v: number; color: string }[] = [];
  private estado: EstadoRed = 'calma';
  private hasta = 0;
  private ultimo = 0;
  private raton = { x: 0, y: 0, tx: 0, ty: 0 };

  constructor(private lienzo: HTMLCanvasElement) {
    this.ctx = lienzo.getContext('2d')!;
    new ResizeObserver(() => this.medir()).observe(lienzo);
    addEventListener('pointermove', (e) => {
      const r = lienzo.getBoundingClientRect();
      this.raton.tx = (e.clientX - r.left) / Math.max(1, r.width) - 0.5;
      this.raton.ty = (e.clientY - r.top) / Math.max(1, r.height) - 0.5;
    });
    this.medir();
    requestAnimationFrame((t) => this.bucle(t));
  }

  poner(e: EstadoRed, ms = 0) {
    this.estado = e;
    this.hasta = ms ? performance.now() + ms : 0;
    if (e === 'mal') for (let i = 0; i < 14; i++) this.lanzar(COLORES.rosa, 1.8);
  }

  private medir() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const r = this.lienzo.getBoundingClientRect();
    this.w = r.width;
    this.h = r.height;
    this.lienzo.width = Math.round(r.width * dpr);
    this.lienzo.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.generar();
  }

  private generar() {
    const cols = Math.max(3, Math.round(this.w / 165));
    const filas = Math.max(2, Math.round(this.h / 150));
    const azar = semilla(7);
    this.nodos = [];
    for (let f = 0; f < filas; f++) {
      for (let c = 0; c < cols; c++) {
        if (azar() < 0.22) continue;
        const x = ((c + 0.5 + (azar() - 0.5) * 0.7) / cols) * this.w;
        const y = ((f + 0.5 + (azar() - 0.5) * 0.6) / filas) * this.h;
        if (y < 120 && x < 520) continue; // deja limpio el logo
        this.nodos.push({ x, y, tipo: Math.floor(azar() * 3), prof: 0.4 + azar() * 0.9, luz: 0, fase: azar() * 6.28 });
      }
    }
    const visto = new Set<string>();
    this.aristas = [];
    this.nodos.forEach((n, i) => {
      const cerca = this.nodos.map((m, j) => ({ j, d: (m.x - n.x) ** 2 + (m.y - n.y) ** 2 })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2);
      for (const { j } of cerca) {
        const k = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!visto.has(k)) { visto.add(k); this.aristas.push([i, j]); }
      }
    });
    this.paquetes = [];
  }

  private lanzar(color: string, v = 1) {
    if (!this.aristas.length) return;
    const [a, b] = this.aristas[Math.floor(Math.random() * this.aristas.length)];
    const ida = Math.random() < 0.5;
    this.paquetes.push({ a: ida ? a : b, b: ida ? b : a, t: 0, v: (0.35 + Math.random() * 0.35) * v, color });
  }

  private pos(i: number) {
    const n = this.nodos[i];
    return { x: n.x - this.raton.x * 26 * n.prof, y: n.y - this.raton.y * 18 * n.prof };
  }

  private bucle(t: number) {
    requestAnimationFrame((x) => this.bucle(x));
    if (document.hidden) return;
    const dt = Math.min(0.05, (t - (this.ultimo || t)) / 1000);
    this.ultimo = t;
    if (this.hasta && t > this.hasta) { this.estado = 'calma'; this.hasta = 0; }
    this.raton.x += (this.raton.tx - this.raton.x) * 0.05;
    this.raton.y += (this.raton.ty - this.raton.y) * 0.05;

    const ritmo = { calma: 1.6, tecleo: 6, bien: 16, mal: 1 }[this.estado];
    if (!quieto && Math.random() < ritmo * dt) {
      const color = this.estado === 'bien' ? COLORES.menta : this.estado === 'tecleo' ? (Math.random() < 0.7 ? COLORES.lila : COLORES.menta) : this.estado === 'mal' ? COLORES.rosa : Math.random() < 0.6 ? COLORES.menta : Math.random() < 0.5 ? COLORES.lila : COLORES.sol;
      this.lanzar(color, this.estado === 'bien' ? 2.2 : this.estado === 'tecleo' ? 1.4 : 1);
    }

    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(194, 155, 255, 0.16)';
    c.beginPath();
    for (const [a, b] of this.aristas) {
      const p = this.pos(a), q = this.pos(b);
      c.moveTo(p.x, p.y);
      c.lineTo(q.x, q.y);
    }
    c.stroke();

    for (let i = this.paquetes.length - 1; i >= 0; i--) {
      const k = this.paquetes[i];
      const p = this.pos(k.a), q = this.pos(k.b);
      const largo = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      k.t += (k.v * 160 * dt) / largo;
      if (k.t >= 1) {
        this.nodos[k.b].luz = 1;
        this.paquetes.splice(i, 1);
        continue;
      }
      const x = p.x + (q.x - p.x) * k.t, y = p.y + (q.y - p.y) * k.t;
      c.save();
      c.shadowColor = k.color;
      c.shadowBlur = 14;
      c.fillStyle = k.color;
      c.beginPath();
      c.arc(x, y, 3.6, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    for (let i = 0; i < this.nodos.length; i++) {
      const n = this.nodos[i];
      const { x, y } = this.pos(i);
      n.luz = Math.max(0, n.luz - dt * 1.6);
      const s = 0.8 + n.prof * 0.35;
      c.save();
      c.translate(x, y);
      c.scale(s, s);
      c.fillStyle = '#241d52';
      c.strokeStyle = n.luz > 0.05 ? mezcla('#4a3f8f', '#5ff2a8', n.luz) : '#4a3f8f';
      c.lineWidth = 2.5;
      if (n.tipo === 1) {
        // router: un círculo con dos flechas
        c.beginPath(); c.arc(0, 0, 14, 0, Math.PI * 2); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(179, 171, 230, 0.7)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(-7, -3); c.lineTo(7, -3); c.moveTo(3, -7); c.lineTo(7, -3); c.lineTo(3, 1);
        c.moveTo(7, 4); c.lineTo(-7, 4); c.moveTo(-3, 0); c.lineTo(-7, 4); c.lineTo(-3, 8); c.stroke();
      } else {
        // servidor: una caja con dos ranuras y su luz
        const an = n.tipo === 0 ? 34 : 30, al = n.tipo === 0 ? 26 : 20;
        redondo(c, -an / 2, -al / 2, an, al, 6); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(179, 171, 230, 0.55)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(-an / 2 + 6, -3); c.lineTo(an / 2 - 12, -3); if (n.tipo === 0) { c.moveTo(-an / 2 + 6, 4); c.lineTo(an / 2 - 12, 4); } c.stroke();
        const parpadeo = 0.55 + 0.45 * Math.sin(t / 380 + n.fase);
        c.fillStyle = n.luz > 0.05 ? '#5ff2a8' : `rgba(95, 242, 168, ${0.25 + parpadeo * 0.45})`;
        c.beginPath(); c.arc(an / 2 - 6, -al / 2 + 6, 2.6, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
  }
}

function redondo(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function mezcla(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}
function semilla(s: number) {
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

