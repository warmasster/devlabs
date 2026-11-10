// Panel derecho de la lección: tarjetas de las máquinas, pestañas y terminales del lab del paso actual.
// Puede tener varios labs abiertos a la vez; solo se ve uno. Cambiar de paso puede cambiar de lab.
import { ic } from '../../iconos';
import { LabTerminal, modoInmersivo } from '../../terminal';
import { tarjetaMaquina } from '../widgets/vivos';
import { ConexionLab } from './conexion';
import { modo } from '../../recompensa';
import { arranque } from '../isla/arranque';
import { dialogo } from './salir';
import { h } from './tipos';

interface Abierto {
  con: ConexionLab;
  raiz: HTMLElement;
  terms: Map<string, { caja: HTMLElement; term?: LabTerminal }>;
  activo: string;
  bajas: (() => void)[];
}

export class PanelLab {
  private abiertos = new Map<string, Abierto>();
  private actual?: string;
  private teclear = new Set<(t: string) => void>();

  constructor(private raiz: HTMLElement) {}

  con(): ConexionLab | undefined { return this.actual ? this.abiertos.get(this.actual)?.con : undefined; }

  async mostrar(lab: string, nuevo = false): Promise<ConexionLab | undefined> {
    if (this.actual === lab && !nuevo) return this.con();
    for (const a of this.abiertos.values()) a.raiz.hidden = true;
    this.actual = lab;
    let a = this.abiertos.get(lab);
    if (a && nuevo) { a.bajas.forEach((f) => f()); a.con.cerrar(); a.raiz.remove(); this.abiertos.delete(lab); a = undefined; }
    if (a) { a.raiz.hidden = false; this.terminal(a.activo); return a.con; }
    const raiz = h('div', 'pl-lab', `<div class="pl-cab"><span class="pl-tit">${ic('server')} <b>Levantando tu lab…</b></span><span class="pildora pl-ms"></span><button class="btn pl-inmersivo" title="Pantalla completa. Así Ctrl+W, Ctrl+T y Ctrl+N van a la terminal">${ic('maximize')}</button><button class="btn pl-nuevo" title="Empezar con un lab limpio">${ic('rotate-ccw')}</button></div>
      <div class="pl-maquinas"></div><div class="pl-pestanas"></div><div class="pl-terms"></div>`);
    this.raiz.append(raiz);
    const anim = modo() === 'isla' ? arranque(raiz) : undefined;
    let con: ConexionLab;
    try {
      con = await ConexionLab.abrir(lab, nuevo);
    } catch (e: any) {
      anim?.fin(true);
      const terms = raiz.querySelector('.pl-terms')!;
      if (e.motivo === 'entrar') {
        this.actual = undefined;
        return undefined; // api.ts ya está llevando a la página de entrar
      }
      if (e.motivo === 'lleno' || e.motivo === 'deprisa') {
        // Sala de espera. No hay que hacer nada: se vuelve a pedir sola cada pocos segundos,
        // con un poco de azar para que no llamen todos a la vez. Mientras, la lección se puede leer.
        const lleno = e.motivo === 'lleno';
        const [t, p] = lleno
          ? ['Ahora mismo no queda ninguna máquina libre', 'Hay mucha gente aprendiendo a la vez. Te guardamos el sitio y te damos la primera que se libere. No hace falta que hagas nada.']
          : ['Vas muy deprisa', 'Has abierto muchas máquinas en poco rato. En un minuto te damos otra.'];
        raiz.querySelector('.pl-tit')!.innerHTML = `${ic('timer')} <b>Esperando una máquina</b>`;
        terms.innerHTML = `<div class="pl-sin pl-espera"><h3>${ic('timer')} ${t}</h3><p>${p}</p><div class="barra"><div style="width:0%"></div></div><p class="w-suave pl-espera-txt"></p>
          <p class="w-suave">Mientras, puedes leer la lección, repasar tu chuleta o echar una partida en el <a href="/arcade" data-libre>arcade</a>.</p><button class="btn">${ic('rotate-ccw')} Probar ya</button></div>`;
        const total = (e.espera ?? (lleno ? 15 : 60)) + Math.floor(Math.random() * 8);
        let queda = total;
        const pinta = () => {
          (terms.querySelector('.barra > div') as HTMLElement).style.width = `${(100 * (total - queda)) / total}%`;
          terms.querySelector('.pl-espera-txt')!.textContent = `Volvemos a mirar en ${queda} s.`;
        };
        const otra = () => { clearInterval(reloj); raiz.remove(); this.actual = undefined; this.mostrar(lab).then((c) => { if (c) this.onNuevo?.(); }); };
        const reloj = window.setInterval(() => { if (document.hidden) return; if (--queda <= 0) otra(); else pinta(); }, 1000);
        pinta();
        (terms.querySelector('button') as HTMLElement).onclick = otra;
      } else {
        terms.innerHTML = `<div class="pl-sin"><h3>${ic('triangle-alert')} No hay servidor de labs</h3><p>La lección necesita <b>labd</b> en marcha para darte una máquina.</p><code>bash dev.sh</code><p class="w-suave">${e.message}</p></div>`;
      }
      this.actual = undefined;
      return undefined;
    }
    a = { con, raiz, terms: new Map(), activo: '', bajas: [] };
    this.abiertos.set(lab, a);
    raiz.querySelector('.pl-tit')!.innerHTML = `${ic('server')} <b>${con.titulo}</b>`;
    raiz.querySelector('.pl-ms')!.textContent = con.info.reutilizada ? 'recuperado' : `listo en ${con.info.ms_total} ms`;
    (raiz.querySelector('.pl-nuevo') as HTMLElement).onclick = () => { dialogo({ titulo: '¿Empezar con un lab limpio?', texto: 'Te damos una máquina nueva. Lo que hayas hecho en esta se pierde.', si: 'Sí, una nueva', no: 'No' }).then((si) => { if (si) this.mostrar(lab, true).then(() => this.onNuevo?.()); }); };
    (raiz.querySelector('.pl-inmersivo') as HTMLElement).onclick = async () => {
      const r = await modoInmersivo(this.raiz);
      raiz.querySelector('.pl-ms')!.textContent = r === 'bloqueado' ? 'todas las teclas van a la terminal' : r === 'solo-pantalla' ? 'pantalla completa sin bloqueo de teclado' : 'el navegador no deja';
      this.terminal();
    };
    this.avisos(a, lab);
    const maqs = raiz.querySelector('.pl-maquinas') as HTMLElement;
    for (const n of con.nodos()) maqs.append(tarjetaMaquina(con, n, (f) => a!.bajas.push(f), () => this.terminal(n.nombre)));
    const pest = raiz.querySelector('.pl-pestanas') as HTMLElement;
    const terms = raiz.querySelector('.pl-terms') as HTMLElement;
    for (const n of con.terminales) {
      if (con.terminales.length > 1) {
        const b = h('button', 'btn', `${ic('terminal')} ${n}`);
        b.dataset.n = n;
        b.onclick = () => this.terminal(n);
        pest.append(b);
      }
      const caja = h('div', 'terminal-caja', '<div class="term"></div>');
      terms.append(caja);
      a.terms.set(n, { caja });
    }
    await this.terminal(con.terminales[0]);
    anim?.fin(con.info.reutilizada);
    return con;
  }

  onNuevo?: () => void;

  // labd avisa cuando a la máquina le quedan 5 minutos y cuando la cierra (tiempo, abandono u otra abierta).
  private avisos(a: Abierto, lab: string) {
    const aviso = h('div', 'pl-aviso', '');
    aviso.hidden = true;
    a.raiz.querySelector('.pl-cab')!.after(aviso);
    let reloj = 0;
    const nueva = () => { clearInterval(reloj); this.mostrar(lab, true).then(() => this.onNuevo?.()); };
    a.bajas.push(() => clearInterval(reloj));
    a.bajas.push(a.con.evento((ev) => {
      if (ev.t === 'aviso') {
        const pintar = () => {
          const min = Math.max(0, Math.ceil((ev.fin - Date.now()) / 60000));
          aviso.innerHTML = `${ic('timer')}<span>Esta máquina se cierra en ${min} min. Lo que hagas en ella se pierde al cerrarse.</span>`;
        };
        pintar();
        aviso.hidden = false;
        reloj = window.setInterval(pintar, 15000);
      }
      if (ev.t === 'cerrada') {
        clearInterval(reloj);
        aviso.hidden = true;
        const por: Record<string, string> = {
          tiempo: 'Cada máquina dura como mucho un rato, para que haya para todos.',
          abandono: 'Llevaba un rato sin nadie conectado.',
          otra: 'Has abierto otra máquina y solo puedes tener unas pocas a la vez. Esta era la más antigua.',
          admin: 'La ha cerrado quien lleva relavops.',
          expulsado: 'Tu cuenta ya no tiene acceso. Habla con quien lleva relavops.',
          disco: 'Ocupaba demasiado disco. Cada máquina tiene un tope para que el servidor no se llene.',
          perdida: 'El servidor se ha reiniciado o la máquina ya no existe.',
        };
        const capa = h('div', 'pl-cerrada', `<h3>${ic('circle-x')} Esta máquina se ha cerrado</h3><p>${por[ev.motivo] ?? ''}</p><div><button class="btn primario">${ic('rotate-ccw')} Abrir una nueva</button></div>`);
        (capa.querySelector('button') as HTMLElement).onclick = nueva;
        a.raiz.querySelector('.pl-terms')!.append(capa);
      }
    }));
  }

  async terminal(nodo?: string, enfocar = !matchMedia('(max-width: 900px)').matches) {
    const a = this.actual ? this.abiertos.get(this.actual) : undefined;
    if (!a) return;
    const n = nodo && a.terms.has(nodo) ? nodo : a.activo || a.con.terminales[0];
    a.activo = n;
    a.raiz.querySelectorAll<HTMLElement>('.pl-pestanas .btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.n === n)));
    a.raiz.querySelectorAll<HTMLElement>('.w-maquina').forEach((c) => c.classList.toggle('activa', c.dataset.nodo === n));
    for (const [k, t] of a.terms) t.caja.classList.toggle('activa', k === n);
    const t = a.terms.get(n)!;
    if (!t.term) {
      t.term = await LabTerminal.crear(t.caja.querySelector('.term') as HTMLElement, 'xterm', a.con.sesion, n);
      t.term.onDatos = (d) => this.teclear.forEach((f) => f(d));
      t.term.onCtrl = (si) => this.onCtrl?.(si);
    }
    if (enfocar) t.term.focus();
  }

  private termActiva(): LabTerminal | undefined {
    const a = this.actual ? this.abiertos.get(this.actual) : undefined;
    return a ? a.terms.get(a.activo)?.term : undefined;
  }

  /** Escribe en la terminal que se ve, como si lo tecleara el alumno (barra de teclas del móvil). */
  escribir(texto: string) { this.termActiva()?.teclear(texto); }
  /** Arma el Ctrl de la barra de teclas: la letra siguiente va con Ctrl. */
  ctrl() { this.termActiva()?.armarCtrl(); }
  onCtrl?: (armado: boolean) => void;

  alTeclear(f: (t: string) => void): () => void {
    this.teclear.add(f);
    return () => this.teclear.delete(f);
  }

  senalar(zona: string, si: boolean) {
    const a = this.actual ? this.abiertos.get(this.actual) : undefined;
    const raiz = a?.raiz ?? this.raiz;
    const sel: Record<string, string> = { maquinas: '.pl-maquinas', terminal: '.pl-terms', pestanas: '.pl-pestanas', nuevo: '.pl-nuevo', inmersivo: '.pl-inmersivo', ajustes: '#ajustes', xp: '#xp', fases: '#progreso', chuleta: '#chuleta-btn' };
    const deFuera = sel[zona]?.startsWith('#');
    const el = deFuera ? document.querySelector(sel[zona]) : raiz.querySelector(sel[zona] ?? `.w-maquina[data-nodo="${zona}"]`);
    el?.classList.toggle('zona-senalada', si);
    // En el móvil lo señalado puede estar en otra pestaña. Se marca también su pestaña.
    const pestana = zona === 'chuleta' ? 'chuleta' : deFuera ? '' : 'terminal';
    if (pestana) document.querySelector(`.lc-tabs [data-v="${pestana}"]`)?.classList.toggle('zona-senalada', si);
  }
}
