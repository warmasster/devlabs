// Forma de una lección. Cada lección es un fichero de esta carpeta que exporta un objeto Leccion.
export interface W { t: string; [k: string]: any } // un widget: { t: 'nombre', ...props }

export interface PasoL {
  titulo: string;
  /** Lab que se ve a la derecha en este paso. Si no se pone, sigue el del paso anterior. */
  lab?: string;
  w: W[];
}

export interface Leccion {
  id: string; // como en el temario: '0.0', '0.1'…
  titulo: string;
  resumen: string;
  minutos: number;
  pasos: PasoL[];
}
