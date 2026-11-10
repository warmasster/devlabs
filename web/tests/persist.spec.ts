// Persistencia tras recargar con mucho historial (el búfer de 1 MB lleno).
import { test, expect } from '@playwright/test';

test('persistencia con historial lleno', async ({ page }) => {
  const txt = () => page.evaluate(() => (window as any).__terms[0].texto() as string);
  await page.goto('/m1?sin-aviso');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/m1?sin-aviso');
  await page.waitForFunction(() => (window as any).__terms?.[0]?.estado === 'conectado');
  await page.click('#term');
  await page.keyboard.type('seq 1 300000 | tail -c 1500000; export MARCA=persistente; echo antes-de-recargar');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => /^antes-de-recargar$/m.test((window as any).__terms[0].texto()), null, { timeout: 20000 });
  await page.reload();
  await page.waitForFunction(() => (window as any).__terms?.[0]?.estado === 'conectado');
  await page.waitForTimeout(1500);
  const tras = await txt();
  console.log('tras recargar, últimas líneas:', JSON.stringify(tras.trim().split('\n').slice(-3)));
  await page.click('#term');
  await page.keyboard.type('echo "marca=$MARCA"');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  const fin = (await txt()).trim().split('\n').slice(-4);
  console.log('después del echo:', JSON.stringify(fin));
  expect(fin.join('\n')).toMatch(/^marca=persistente$/m);
});
