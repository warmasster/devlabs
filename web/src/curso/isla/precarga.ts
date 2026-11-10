// Precarga de la página de una lección mientras el alumno mira el mapa: su JS, su CSS y los
// trozos que importa. Son ficheros con hash que el servidor marca como inmutables, así que al
// entrar ya están en la caché. No toca labd: los labs solo se piden al pulsar Entrar.
const hechas = new Set<string>();

export function precargarPagina(url: string) {
  if (hechas.has(url)) return;
  hechas.add(url);
  const ir = async () => {
    try {
      const r = await fetch(url, { credentials: 'same-origin' });
      if (!r.ok) return;
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      const poner = (rel: string, href: string, as?: string) => {
        if (!href.startsWith('/') || document.head.querySelector(`link[href="${CSS.escape(href)}"]`)) return;
        const l = document.createElement('link');
        l.rel = rel;
        l.href = href;
        if (as) l.as = as;
        document.head.append(l);
      };
      doc.querySelectorAll<HTMLScriptElement>('script[type="module"][src]').forEach((s) => poner('modulepreload', s.getAttribute('src')!));
      doc.querySelectorAll<HTMLLinkElement>('link[rel="modulepreload"]').forEach((l) => poner('modulepreload', l.getAttribute('href')!));
      doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => poner('preload', l.getAttribute('href')!, 'style'));
    } catch {}
  };
  if ('requestIdleCallback' in window) requestIdleCallback(() => ir(), { timeout: 2000 });
  else setTimeout(ir, 800);
}
