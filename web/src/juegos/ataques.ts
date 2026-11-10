// Patrón común de los juegos "defiende el servicio": tráfico real medido cada tick, ataques del
// boss cada cierto tiempo y una barra de vida que baja mientras el servicio falla.
import type { Api } from './motor';

export interface Ataque { nombre: string; aviso: string; hacer: [string, string][]; pista: string }

export class Asedio {
  private siguiente = 0;
  private hechos = 0;
  private sano = 0;
  private desdeAtaque = 0;
  private pistaDada = false;
  constructor(private ataques: Ataque[], private cada: Record<string, number>, private sanoParaGanar = 20) {}

  // ok = proporción de peticiones buenas en este tick (0..1). Devuelve true si la partida acabó.
  async paso(api: Api, ok: number, etiqueta: string): Promise<boolean> {
    if (!this.siguiente) this.siguiente = api.t + 8;
    api.medidor('slo', etiqueta, ok * 100, ok >= 0.95 ? 'var(--ok)' : ok >= 0.5 ? 'var(--aviso)' : 'var(--mal)', `${Math.round(ok * 100)} %`);
    api.medidor('ataques', '«ic:ghost» Ataques', (this.hechos / this.ataques.length) * 100, 'var(--mal)', `${this.hechos}/${this.ataques.length}`);
    if (ok < 0.95) { api.danio(Math.ceil((1 - ok) * (api.dificultad === 'facil' ? 3 : 6))); this.sano = 0; }
    else { this.sano++; if (this.hechos > 0) api.puntos(5); }
    if (ok >= 0.95 && this.hechos > 0) api.quitar('ataque');
    if (!this.pistaDada && this.hechos > 0 && ok < 0.95 && api.t - this.desdeAtaque > 20) {
      this.pistaDada = true;
      api.log(`«ic:lightbulb» Pista: ${this.ataques[this.hechos - 1].pista}`);
    }
    // El siguiente ataque llega cuando toca y el servicio está sano (no se apilan).
    if (this.hechos < this.ataques.length && api.t >= this.siguiente && ok >= 0.95) {
      const a = this.ataques[this.hechos++];
      await api.exs(a.hacer);
      this.desdeAtaque = api.t;
      this.pistaDada = false;
      this.siguiente = api.t + this.cada[api.dificultad];
      api.chip('ataque', `«ic:ghost» ${a.nombre}`, 'debuff');
      api.log(`«ic:ghost» Ataque ${this.hechos}: ${a.aviso}`, 'boss');
    }
    if (this.hechos === this.ataques.length && this.sano >= this.sanoParaGanar) {
      api.puntos(api.vida * 5);
      api.fin(true, `<p>Has aguantado los ${this.ataques.length} ataques y el servicio sigue en pie.</p>`);
      return true;
    }
    return false;
  }
}
