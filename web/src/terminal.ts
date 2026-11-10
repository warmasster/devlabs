// Terminal del lab: dibuja bytes y manda bytes. Nada de imitar una shell en JavaScript.
// Funciona con xterm.js (render WebGL) o con ghostty-web (parser de Ghostty en WebAssembly).

import '@xterm/xterm/css/xterm.css';
import { sesionViva, wsURL } from './api';
import { renovarPase } from './cuenta/sesion';

export type Motor = 'xterm' | 'ghostty';
export type Estado = 'conectando' | 'conectado' | 'reconectando' | 'terminada';

const tema = {
  background: '#0b0d12', foreground: '#e7e9ee', cursor: '#7cc4ff', cursorAccent: '#0b0d12',
  selectionBackground: '#33476b',
  black: '#1b1e28', red: '#f87171', green: '#4ade80', yellow: '#fbbf24', blue: '#60a5fa', magenta: '#c084fc', cyan: '#22d3ee', white: '#e7e9ee',
  brightBlack: '#5b6478', brightRed: '#fca5a5', brightGreen: '#86efac', brightYellow: '#fde68a', brightBlue: '#93c5fd', brightMagenta: '#d8b4fe', brightCyan: '#67e8f9', brightWhite: '#ffffff',
};

const esMac = /Mac|iPhone|iPad/.test(navigator.platform);

function mediana(xs: number[]) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
function p95(xs: number[]) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
}

export class LabTerminal {
  term: any;
  private fit: any;
  private ws?: WebSocket;
  private enc = new TextEncoder();
  private teclaPendiente: number | null = null;
  private ro?: ResizeObserver;
  private cerrado = false;
  private conectadoAntes = false;
  private repintando = false;
  private intentos = 0;
  private ecoTimer?: number;
  readonly lat = { eco: [] as number[], tecla: [] as number[] };
  estado: Estado = 'conectando';
  ultimaSalida = 0; // última vez que llegó salida del PTY (p. ej. el prompt al acabar un comando)
  onEstado?: (e: Estado) => void;
  onEnter?: () => void;
  onDatos?: (texto: string) => void; // lo que teclea el alumno (la lección reacciona a atajos)
  onCtrl?: (armado: boolean) => void; // la tecla Ctrl de la barra del móvil se ha armado o gastado
  private ctrl = false;

  private constructor(readonly el: HTMLElement, readonly motor: Motor, readonly sesion: string, readonly nodo: string) {}

  static async crear(el: HTMLElement, motor: Motor, sesion: string, nodo: string) {
    const t = new LabTerminal(el, motor, sesion, nodo);
    await t.montar();
    t.conectar();
    (window as any).__terms ??= [];
    (window as any).__terms.push(t);
    return t;
  }

  private async montar() {
    // Colores de la terminal desde el tema activo (ver estilo.css y /disenos).
    const css = getComputedStyle(document.documentElement);
    const v = (n: string, def: string) => css.getPropertyValue(n).trim() || def;
    const temaActivo = { ...tema, background: v('--term-fondo', tema.background), foreground: v('--term-texto', tema.foreground),
      cursor: v('--acento', tema.cursor), cursorAccent: v('--term-fondo', tema.cursorAccent) };
    const opciones = {
      fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--mono') || 'monospace',
      fontSize: 15, lineHeight: 1.15, cursorBlink: true, theme: temaActivo,
      // xterm.js cuenta el historial en líneas; ghostty-web se lo pasa a Ghostty, que lo cuenta
      // en bytes (con 10000 solo guardaba ~750 líneas). 10 MB dan para decenas de miles.
      scrollback: this.motor === 'ghostty' ? 10_000_000 : 20_000,
      scrollSensitivity: 1.2, // ~3 líneas por muesca de rueda, como una terminal de Windows
      macOptionIsMeta: true, macOptionClickForcesSelection: true, allowProposedApi: true,
      rightClickSelectsWord: false, // el clic derecho es para copiar/pegar (ver clicDerecho)
    };
    this.el.innerHTML = '';
    if (this.motor === 'ghostty') {
      const g = await import('ghostty-web');
      await g.init();
      this.term = new g.Terminal(opciones as any);
      this.fit = new g.FitAddon();
      this.term.loadAddon(this.fit);
      this.term.open(this.el);
    } else {
      const [{ Terminal }, { FitAddon }, { WebglAddon }, { Unicode11Addon }] = await Promise.all([
        import('@xterm/xterm'), import('@xterm/addon-fit'), import('@xterm/addon-webgl'), import('@xterm/addon-unicode11'),
      ]);
      this.term = new Terminal(opciones);
      this.fit = new FitAddon();
      this.term.loadAddon(this.fit);
      this.term.loadAddon(new Unicode11Addon());
      this.term.unicode.activeVersion = '11';
      this.term.open(this.el);
      // En el móvil se pinta con el DOM, sin WebGL. La terminal ahí es pequeña y puede nacer en una
      // pestaña que no se ve (la lección en el móvil), y con WebGL se quedaba en negro. Además los
      // móviles dan pocos contextos WebGL y una lección con tres máquinas abre tres terminales.
      const movil = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
      if (!movil) {
        try {
          const webgl = new WebglAddon();
          webgl.onContextLoss(() => webgl.dispose());
          this.term.loadAddon(webgl);
        } catch { /* sin WebGL: se queda el render DOM */ }
      }
    }

    // Copiar y pegar sin pisar Ctrl+C (que es SIGINT para la shell).
    // Devuelve true si la terminal debe procesar la tecla (semántica de xterm.js).
    const procesar = (e: KeyboardEvent) => {
      if (e.type !== 'keydown') return true;
      const mod = esMac ? e.metaKey : e.ctrlKey && e.shiftKey;
      if (mod && e.code === 'KeyC') {
        const sel = this.term.getSelection();
        if (sel) navigator.clipboard?.writeText(sel);
        this.term.clearSelection?.(); // copiada, fuera: el siguiente clic derecho pega
        return false;
      }
      if (mod && e.code === 'KeyV') return false; // deja que el navegador lance "paste"
      // Los atajos de la terminal son de la terminal: Ctrl+O (guardar en nano), Ctrl+R, Ctrl+K, F6…
      // Se cancela lo que haría el navegador. Ctrl+W, Ctrl+T, Ctrl+N y Ctrl+Tab están reservados por
      // Chrome y solo llegan en pantalla completa con Keyboard Lock (botón del panel del lab).
      if ((e.ctrlKey && !e.shiftKey && !e.metaKey) || (e.altKey && !e.ctrlKey) || /^F([1-9]|10)$/.test(e.key)) e.preventDefault();
      return true;
    };
    if (this.motor === 'ghostty') {
      // Arreglos para ghostty-web 0.4:
      // 1) Su manejador va al revés que el de xterm.js (true = "ya lo gestiono yo").
      // 2) Pierde la tecla Alt: Alt+B llega como "b". Mandamos ESC+tecla, como xterm.js.
      this.term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
        if (e.type === 'keydown' && e.altKey && !e.ctrlKey && !e.metaKey && /^Key[A-Z]$|^Digit\d$|^Period$|^Comma$|^Backspace$/.test(e.code)) {
          const k = e.code === 'Backspace' ? '\x7f' : e.code === 'Period' ? '.' : e.code === 'Comma' ? ',' : e.code.slice(-1).toLowerCase();
          this.enviar(this.enc.encode('\x1b' + (e.shiftKey ? k.toUpperCase() : k)), '\x1b' + k);
          e.preventDefault();
          return true;
        }
        return !procesar(e);
      });
      // 3) Cancela todos los "beforeinput", así que el texto que llega sin tecla física
      //    (panel de emojis, dictado, teclado en pantalla) se perdía. Lo recogemos aquí.
      this.el.addEventListener('beforeinput', (e: InputEvent) => {
        if ((e.inputType === 'insertText' || e.inputType === 'insertReplacementText') && e.data) this.enviar(this.enc.encode(e.data), e.data);
      }, { capture: true });
    } else {
      this.term.attachCustomKeyEventHandler(procesar);
    }

    this.term.onData((d: string) => {
      // Ctrl de la barra de teclas del móvil: la letra siguiente va con Ctrl (c pasa a ser Ctrl+C).
      if (this.ctrl && d.length === 1) {
        const c = d.toUpperCase().charCodeAt(0);
        if (c >= 64 && c <= 95) d = String.fromCharCode(c & 31);
        this.armarCtrl(false);
      }
      this.enviar(this.enc.encode(d), d);
    });
    this.term.onBinary?.((d: string) => this.enviar(Uint8Array.from(d, (c) => c.charCodeAt(0) & 255), d));
    this.term.onResize?.(({ cols, rows }: { cols: number; rows: number }) => this.control({ t: 'resize', c: cols, r: rows }));

    this.el.addEventListener('contextmenu', (e) => this.clicDerecho(e), { capture: true });
    this.ro = new ResizeObserver(() => this.ajustar());
    this.ro.observe(this.el);
    this.ajustar();
    this.term.focus();
  }

  private ajustar() {
    try { this.fit.fit(); } catch {}
  }

  private enviar(b: Uint8Array, texto: string) {
    // Mientras se repinta el historial se tiran las respuestas automáticas del terminal
    // (siempre empiezan por ESC: "\x1b]11;rgb:…", "\x1b[?62;c"…); lo que tecleas pasa siempre.
    if (this.repintando && texto.startsWith('\x1b')) return;
    // Al escribir, la selección se va (xterm.js ya lo hace; ghostty-web no).
    if (this.motor === 'ghostty' && this.term.hasSelection?.()) this.term.clearSelection();
    if (this.ws?.readyState !== WebSocket.OPEN) {
      if (this.estado === 'terminada' && !this.cerrado && texto.includes('\r')) this.reabrir();
      return;
    }
    // Latencia tecla -> eco: solo para pulsaciones sueltas imprimibles.
    if (texto.length === 1 && texto >= ' ' && this.teclaPendiente === null) this.teclaPendiente = performance.now();
    this.ws.send(b);
    if (texto.includes('\r')) this.onEnter?.();
    this.onDatos?.(texto);
  }

  private control(m: object) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  private setEstado(e: Estado) {
    this.estado = e;
    this.onEstado?.(e);
  }

  conectar() {
    this.setEstado(this.intentos ? 'reconectando' : 'conectando');
    const { cols, rows } = this.term;
    const ws = new WebSocket(wsURL(`/ws/term?s=${this.sesion}&n=${this.nodo}&c=${cols}&r=${rows}`));
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    ws.onopen = () => {
      // labd reenvía todo el historial de la shell al conectar: se empieza de limpio para no duplicarlo.
      if (this.conectadoAntes) this.term.reset();
      this.conectadoAntes = true;
      this.intentos = 0;
      this.setEstado('conectado');
      this.control({ t: 'resize', c: this.term.cols, r: this.term.rows });
      clearInterval(this.ecoTimer);
      this.ecoTimer = window.setInterval(() => this.control({ t: 'eco', k: performance.now() }), 2000);
    };
    ws.onmessage = (m) => {
      if (typeof m.data === 'string') {
        const c = JSON.parse(m.data);
        if (c.t === 'eco') this.apuntar(this.lat.eco, performance.now() - c.k);
        // Mientras se repinta el historial, no se responde a nada (ver labd/term.go).
        if (c.t === 'historial' && c.inicio) this.repintando = true;
        if (c.t === 'historial' && c.fin) {
          const listo = () => { this.repintando = false; };
          // xterm.js procesa las escrituras en diferido: se espera a que acabe la cola.
          // ghostty-web escribe en el acto y no llama al callback con texto vacío.
          if (this.motor === 'ghostty') setTimeout(listo, 50);
          else this.term.write('', listo);
          setTimeout(listo, 3000); // por si acaso: nunca dejar la terminal sorda
        }
        return;
      }
      this.ultimaSalida = performance.now();
      if (this.teclaPendiente !== null) {
        this.apuntar(this.lat.tecla, performance.now() - this.teclaPendiente);
        this.teclaPendiente = null;
      }
      this.term.write(new Uint8Array(m.data));
    };
    ws.onclose = (ev) => {
      clearInterval(this.ecoTimer);
      if (this.cerrado) return;
      if (ev.reason === 'fin') {
        this.setEstado('terminada');
        this.term.write('\r\n\x1b[33m[sesión terminada · pulsa Enter para abrir otra]\x1b[0m\r\n');
        return;
      }
      this.setEstado('reconectando');
      renovarPase(); // por si se cortó porque el pase de la cuenta había caducado
      const espera = Math.min(5000, 300 * 2 ** this.intentos++);
      setTimeout(async () => {
        if (this.cerrado) return;
        // Tras un par de intentos se pregunta si la máquina sigue. Si ya no existe, se deja de
        // llamar al servidor. La lección enseña su aviso de máquina cerrada.
        if (this.intentos >= 2 && !(await sesionViva(this.sesion))) {
          this.cerrado = true;
          this.setEstado('terminada');
          this.term.write('\r\n\x1b[33m[esta máquina se ha cerrado]\x1b[0m\r\n');
          return;
        }
        // Con la pestaña oculta no se reintenta. Se vuelve a probar al volver a ella.
        if (document.hidden) document.addEventListener('visibilitychange', () => this.conectar(), { once: true });
        else this.conectar();
      }, espera);
    };
  }

  private reabrir() {
    this.intentos = 0;
    this.conectar();
  }

  // Clic derecho como en Windows Terminal: con texto seleccionado lo copia; sin selección, pega.
  // Si el programa usa el ratón (htop, vim con ratón), el clic es suyo; Mayús+clic derecho pega igual.
  private async clicDerecho(e: MouseEvent) {
    const modoRaton = this.term.modes?.mouseTrackingMode;
    if (modoRaton && modoRaton !== 'none' && !e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();
    const sel: string = this.term.getSelection?.() ?? '';
    if (sel) {
      try {
        await navigator.clipboard.writeText(sel);
        this.term.clearSelection?.();
        this.aviso('Copiado');
      } catch {
        this.aviso('El navegador no deja copiar: usa Ctrl+Shift+C');
      }
      this.term.focus();
      return;
    }
    try {
      const texto = await navigator.clipboard.readText();
      // paste() respeta el "bracketed paste": la shell no ejecuta nada hasta que pulses Enter.
      if (texto) this.term.paste(texto);
    } catch {
      this.aviso('Permite el acceso al portapapeles en el navegador, o pega con Ctrl+Shift+V');
    }
    this.term.focus();
  }

  private aviso(msg: string) {
    const d = document.createElement('div');
    d.className = 'pildora terminal-aviso';
    d.textContent = msg;
    (this.el.closest('.terminal-caja') ?? this.el).append(d);
    setTimeout(() => d.remove(), 1600);
  }

  private apuntar(xs: number[], v: number) {
    xs.push(v);
    if (xs.length > 200) xs.shift();
  }

  stats() {
    return {
      eco_p50: mediana(this.lat.eco), tecla_p50: mediana(this.lat.tecla),
      tecla_p95: p95(this.lat.tecla), muestras: this.lat.tecla.length,
    };
  }

  // Texto visible (lo usan las pruebas automáticas de la batería).
  texto(): string {
    const b = this.term.buffer?.active;
    if (!b) return '';
    const out: string[] = [];
    const desde = Math.max(0, (b.length ?? 0) - this.term.rows - 200);
    for (let i = desde; i < b.length; i++) out.push(b.getLine(i)?.translateToString(true) ?? '');
    return out.join('\n');
  }

  // Filas visibles ahora mismo y geometría de celda (para clics de ratón en las pruebas).
  pantalla() {
    const b = this.term.buffer?.active;
    const rows: number = this.term.rows;
    const fondo = Math.max(0, (b?.length ?? rows) - rows);
    // xterm.js cuenta viewportY desde arriba; ghostty-web, líneas subidas desde abajo.
    const top = this.motor === 'ghostty' ? Math.max(0, fondo - Math.round(this.term.getViewportY?.() ?? 0)) : (b?.viewportY ?? fondo);
    const filas: string[] = [];
    for (let i = 0; i < rows; i++) filas.push(b?.getLine(top + i)?.translateToString(true) ?? '');
    const scr = (this.el.querySelector('.xterm-screen') ?? this.el.querySelector('canvas')) as HTMLElement;
    const r = scr.getBoundingClientRect();
    return { filas, x: r.left, y: r.top, cw: r.width / this.term.cols, ch: r.height / rows, cols: this.term.cols, rows };
  }

  focus() { this.term.focus(); }

  /** Escribe en la terminal como si se tecleara. Lo usa la barra de teclas del móvil. */
  teclear(t: string) { this.enviar(this.enc.encode(t), t); }

  /** Arma o desarma el Ctrl de la barra de teclas. Armado, la próxima letra va con Ctrl. */
  armarCtrl(si = !this.ctrl) { this.ctrl = si; this.onCtrl?.(si); }

  destruir() {
    this.cerrado = true;
    clearInterval(this.ecoTimer);
    this.ws?.close();
    this.ro?.disconnect();
    this.term.dispose();
    const ts = (window as any).__terms as LabTerminal[];
    ts.splice(ts.indexOf(this), 1);
  }
}

// Modo inmersivo: pantalla completa + Keyboard Lock, así Ctrl+W, Ctrl+T o Ctrl+N llegan a la terminal.
export async function modoInmersivo(el: HTMLElement): Promise<'bloqueado' | 'solo-pantalla' | 'error'> {
  try {
    await el.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    return 'error';
  }
  const kb = (navigator as any).keyboard;
  if (kb?.lock) {
    try {
      await kb.lock();
      return 'bloqueado';
    } catch {}
  }
  return 'solo-pantalla';
}

// Un Ctrl+W accidental no te saca del lab sin avisar.
export function avisarAntesDeCerrar(activo: () => boolean) {
  addEventListener('beforeunload', (e) => {
    if (activo()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
