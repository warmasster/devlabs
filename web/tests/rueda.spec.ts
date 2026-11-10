// Mide cuántas líneas sube la terminal por cada "muesca" de rueda (100 px en Windows).
import { test } from '@playwright/test';

for (const motor of ['xterm', 'ghostty'] as const) {
  test(`rueda · ${motor}`, async ({ page }) => {
    await page.goto(`/m1?motor=${motor}&sin-aviso`);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`/m1?motor=${motor}&sin-aviso`);
    await page.waitForFunction(() => (window as any).__terms?.[0]?.estado === 'conectado');
    await page.click('#term');
    await page.keyboard.type('seq 1 3000');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => /^3000$/m.test((window as any).__terms[0].texto()));
    const top = () => page.evaluate(() => Number((window as any).__terms[0].pantalla().filas.find((f: string) => /^\d+$/.test(f)) ?? -1));
    const caja = (await page.locator('#term').boundingBox())!;
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
    const antes = await top();
    for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(30); }
    await page.waitForTimeout(500);
    const despues = await top();
    const lineas = await page.evaluate(() => (window as any).__terms[0].term.buffer.active.length);
    console.log(`${motor}: historial ${lineas} líneas; 10 muescas de rueda → ${antes - despues} líneas (${((antes - despues) / 10).toFixed(1)} por muesca)`);
  });
}
