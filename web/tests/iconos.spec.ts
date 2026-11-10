// Ni un emoji en la interfaz: todas las páginas se pintan con iconos Lucide y no queda ningún «ic:…».
import { test, expect } from '@playwright/test';

const PAGINAS = ['/', '/m1', '/m2', '/m3', '/m4', '/m5', '/m6', '/disenos', '/juegos', '/juego?id=persecucion'];
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}]/u;

for (const p of PAGINAS) {
  test(`iconos ${p}`, async ({ page }) => {
    await page.goto(p + (p.includes('?') ? '&' : '?') + 'sin-aviso');
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => {
      // Solo la interfaz: la terminal muestra lo que haya en el Linux del lab.
      const clon = document.body.cloneNode(true) as HTMLElement;
      clon.querySelectorAll('.xterm, .terminal-caja, script').forEach((e) => e.remove());
      return { texto: clon.innerText, iconos: document.querySelectorAll('svg.ic, #mapa svg svg, #iconos svg').length };
    });
    const emojis = [...r.texto].filter((c) => EMOJI.test(c));
    console.log(`${p}: ${r.iconos} iconos Lucide, ${emojis.length} emojis ${emojis.join('')}`);
    expect(r.texto).not.toContain('«ic:');
    expect(emojis).toEqual([]);
  });
}
