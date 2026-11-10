// Conexión con un lab de labd: abre (o recupera) la sesión y reparte lo que llega por eventos.
// Los widgets se suscriben a sondas ("puertos@web", "ultimo@tu-pc"…) y a pasos de la misión.
import { abrirSesion, eventos, post } from '../../api';

export interface NodoLab { nombre: string; rol?: string; ip?: string; memoria?: string }
type Cb<T> = (v: T) => void;

export class ConexionLab {
  info: any;
  readonly sondas = new Map<string, string>();
  private subSonda = new Map<string, Set<Cb<string>>>();
  private subPaso = new Map<string, Set<() => void>>();
  private subEv = new Set<Cb<any>>();
  private cerrarEventos?: () => void;

  private constructor(readonly lab: string) {}

  static async abrir(lab: string, nueva = false) {
    const c = new ConexionLab(lab);
    c.info = await abrirSesion(lab, nueva);
    for (const [k, v] of Object.entries<string>(c.info.sondas ?? {})) c.sondas.set(k, v);
    c.cerrarEventos = eventos(c.info.sesion, (ev) => c.recibir(ev));
    return c;
  }

  get sesion(): string { return this.info.sesion; }
  get titulo(): string { return this.info.lab.titulo; }
  get mision(): { id: string; titulo: string; texto: string; pista?: string; xp: number }[] { return this.info.lab.mision ?? []; }
  get terminales(): string[] { return this.info.lab.terminales ?? []; }

  nodos(): NodoLab[] {
    const spec: NodoLab[] = this.info.lab.nodos ?? this.terminales.map((n) => ({ nombre: n }));
    return spec.map((n) => ({ ...n, ip: n.ip ?? this.info.interfaces?.[n.nombre]?.[0]?.ips?.[0]?.split('/')[0] }));
  }

  hecho(paso: string) { return this.info.progreso.hechos[paso] !== undefined; }

  private recibir(ev: any) {
    if (ev.t === 'estado' && ev.info) {
      // Al reconectar llega el estado completo: se reparten las sondas y los pasos ya hechos.
      for (const [k, v] of Object.entries<string>(ev.info.sondas ?? {})) this.ponerSonda(k, v);
      for (const id of Object.keys(ev.info.progreso?.hechos ?? {})) this.marcarPaso(id, ev.info.progreso.hechos[id]);
    }
    if (ev.t === 'sonda') this.ponerSonda(ev.id, ev.v);
    if (ev.t === 'paso') { this.info.progreso.xp = ev.total; this.marcarPaso(ev.id, ev.ms); }
    for (const f of this.subEv) f(ev);
  }

  private ponerSonda(id: string, v: string) {
    if (this.sondas.get(id) === v) return;
    this.sondas.set(id, v);
    this.subSonda.get(id)?.forEach((f) => f(v));
  }

  private marcarPaso(id: string, ms: number) {
    const ya = this.hecho(id);
    this.info.progreso.hechos[id] = ms;
    if (!ya) this.subPaso.get(id)?.forEach((f) => f());
  }

  // Devuelve la función para darse de baja.
  sonda(id: string, f: Cb<string>): () => void {
    let s = this.subSonda.get(id);
    if (!s) this.subSonda.set(id, (s = new Set()));
    s.add(f);
    if (this.sondas.has(id)) f(this.sondas.get(id)!);
    return () => s!.delete(f);
  }

  paso(id: string, f: () => void): () => void {
    if (this.hecho(id)) { f(); return () => {}; }
    let s = this.subPaso.get(id);
    if (!s) this.subPaso.set(id, (s = new Set()));
    s.add(f);
    return () => s!.delete(f);
  }

  evento(f: Cb<any>): () => void {
    this.subEv.add(f);
    return () => this.subEv.delete(f);
  }

  accion(nombre: string) { return post(`/api/sesion/${this.sesion}/accion/${nombre}`); }
  async boss() { this.info = await post(`/api/sesion/${this.sesion}/boss`); return this.info; }
  pista() { return post<{ pista: { texto: string; coste: number }; xp: number }>(`/api/sesion/${this.sesion}/pista`); }

  cerrar() { this.cerrarEventos?.(); }
}
