// Humo de los juegos: arrancan, el director funciona contra contenedores reales y no hay errores.
import { test, expect } from '@playwright/test';

const JUEGOS = ['persecucion', 'disco', 'asedio', 'dns', 'balanceador', 'contenedores', 'quorum'];
test.describe.configure({ mode: 'serial' });

for (const id of JUEGOS) {
  test(`juego ${id}`, async ({ page }) => {
    test.setTimeout(120_000);
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') errores.push(m.text()); });
    await page.goto(`/juego?id=${id}`);
    await page.click('[data-dif="pesadilla"]');
    await page.click('#empezar');
    await page.waitForFunction(() => document.getElementById('cargando')!.hidden, null, { timeout: 60_000 });
    await page.waitForTimeout(32_000);
    const log = await page.locator('#log').innerText();
    const med = await page.locator('#medidores').innerText();
    const chips = await page.locator('#chips').innerText();
    console.log(`\n=== ${id}\n${med.replace(/\n+/g, ' | ')}\nchips: ${chips.replace(/\n+/g, ' ')}\n${log.split('\n').slice(0, 8).join('\n')}${errores.length ? '\nERRORES: ' + errores.slice(0, 5).join(' || ') : ''}`);
    expect(errores.filter((e) => !e.includes('favicon'))).toEqual([]);
  });
}
