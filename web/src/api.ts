// Cliente de la API de labd: sesiones que sobreviven a cerrar la pestaña.
import { irAEntrar, renovarPase } from './cuenta/sesion';

export interface Paso { id: string; titulo: string; texto: string; pista?: string; nodo?: string; xp: number }
export interface Iface { nombre: string; mac: string; ips: string[] | null }
export interface Info {
  sesion: string;
  instancia: string;
  asignada_ms: number;
  creada_ms: number;
  de_pool: boolean;
  lab: { id: string; titulo: string; motor: string; terminales: string[]; mision: Paso[]; boss?: { titulo: string; texto: string; xp: number } };
  interfaces: Record<string, Iface[] | null>;
  progreso: { hechos: Record<string, number>; xp: number; boss?: { activo: boolean; hecho: boolean; pistas: { texto: string; coste: number }[] | null; quedan_pistas: number; segundos: number } };
  reutilizada?: boolean;
  ms_total?: number;
}

const clave = (lab: string) => `relavops.sesion.${lab}`;

// Con cuentas, labd pide un pase que dura una hora. Si ha caducado, se renueva y se repite la petición.
// Si la sesión de la cuenta también ha caducado, se va a entrar.
async function pedir(ruta: string, init?: RequestInit): Promise<Response> {
  let r = await fetch(ruta, init);
  if (r.status !== 401) return r;
  const yo = await fetch('/api/cuenta/yo');
  if (yo.ok) r = await fetch(ruta, init);
  if (r.status === 401) {
    irAEntrar();
    throw Object.assign(new Error('Tienes que entrar con tu cuenta.'), { motivo: 'entrar' });
  }
  return r;
}

export async function abrirSesion(lab: string, nueva = false): Promise<Info> {
  const t0 = performance.now();
  const previa = localStorage.getItem(clave(lab));
  if (previa && !nueva) {
    const r = await pedir(`/api/sesion/${previa}`);
    if (r.ok) {
      const info = (await r.json()) as Info;
      return { ...info, reutilizada: true, ms_total: Math.round(performance.now() - t0) };
    }
  }
  if (previa && nueva) fetch(`/api/sesion/${previa}`, { method: 'DELETE' }).catch(() => {});
  const r = await pedir(`/api/labs/${lab}/sesion`, { method: 'POST' });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw Object.assign(new Error(j.error ?? `HTTP ${r.status}`), { motivo: j.motivo });
  }
  const info = (await r.json()) as Info;
  localStorage.setItem(clave(lab), info.sesion);
  return { ...info, reutilizada: false, ms_total: Math.round(performance.now() - t0) };
}

export async function post<T = any>(ruta: string): Promise<T> {
  const r = await pedir(ruta, { method: 'POST' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j as T;
}

export function wsURL(ruta: string) {
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${ruta}`;
}

// ¿Sigue viva esta sesión en labd? false solo si labd dice que no existe (404).
export async function sesionViva(sesion: string): Promise<boolean> {
  const r = await fetch(`/api/sesion/${sesion}`).catch(() => null);
  if (r?.status === 401) renovarPase(); // se cortó porque el pase de la cuenta había caducado
  return r?.status !== 404;
}

// Eventos del lab (pasos validados, XP, boss, paquetes). Se reconecta solo, cada vez más despacio
// (1, 2, 4… hasta 30 s) y solo con la pestaña a la vista. Si la máquina se ha cerrado, para: antes,
// una pestaña olvidada llamaba al servidor cada segundo para siempre.
export function eventos(sesion: string, alRecibir: (ev: any) => void) {
  let ws: WebSocket | undefined;
  let cerrado = false;
  let intentos = 0;
  const abrir = () => {
    if (cerrado) return;
    if (document.hidden) {
      document.addEventListener('visibilitychange', abrir, { once: true });
      return;
    }
    ws = new WebSocket(wsURL(`/ws/eventos?s=${sesion}`));
    ws.onopen = () => { intentos = 0; };
    ws.onmessage = (m) => {
      const ev = JSON.parse(m.data);
      if (ev.t === 'cerrada') cerrado = true;
      alRecibir(ev);
    };
    ws.onclose = async () => {
      if (cerrado) return;
      if (!(await sesionViva(sesion))) {
        cerrado = true;
        alRecibir({ t: 'cerrada', motivo: 'perdida' });
        return;
      }
      setTimeout(abrir, Math.min(30_000, 1000 * 2 ** intentos++));
    };
  };
  abrir();
  return () => { cerrado = true; ws?.close(); };
}
