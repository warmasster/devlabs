// Batería de M1: se teclea de verdad en el navegador y se lee lo que dibuja la terminal.
import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

type R = { ok: boolean; nota?: string; ms?: number };

for (const motor of ['xterm'] as const) {
  test(`batería M1 · ${motor}`, async ({ page }) => {
    const res: Record<string, R> = {};
    const txt = () => page.evaluate(() => (window as any).__terms[0].texto() as string);
    const esperar = async (re: RegExp, ms = 8000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        if (re.test(await txt())) return Date.now() - t0;
        await page.waitForTimeout(40);
      }
      throw new Error(`no apareció ${re} en la terminal:\n${(await txt()).slice(-600)}`);
    };
    const enPantalla = async (re: RegExp, ms = 8000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        const p = await page.evaluate(() => (window as any).__terms[0].pantalla());
        if (re.test(p.filas.join('\n'))) return p;
        await page.waitForTimeout(40);
      }
      throw new Error(`no se ve ${re} en pantalla`);
    };
    const cmd = async (c: string) => { await page.keyboard.type(c, { delay: 5 }); await page.keyboard.press('Enter'); };
    const prueba = async (id: string, fn: () => Promise<string | void>) => {
      try {
        const t0 = Date.now();
        const nota = await fn();
        res[id] = { ok: true, ms: Date.now() - t0, ...(nota ? { nota } : {}) };
      } catch (e: any) {
        res[id] = { ok: false, nota: String(e.message).split('\n')[0].slice(0, 140) };
        (res[id] as any).pantalla = (await txt()).trim().split('\n').slice(-8);
        await page.keyboard.press('Control+C');
        await page.keyboard.press('Escape');
      }
      await page.keyboard.press('Control+C');
      await cmd('clear');
      await page.waitForTimeout(150);
    };
    const abrir = async (p: Page) => {
      await p.goto(`/m1?motor=${motor}&sin-aviso`);
      await p.waitForFunction(() => (window as any).__terms?.[0]?.estado === 'conectado', null, { timeout: 30_000 });
      await p.click('#term');
      await p.waitForTimeout(300);
    };

    await page.goto('/m1?sin-aviso');
    await page.evaluate(() => localStorage.clear());
    await abrir(page);
    await esperar(/root@lab/);

    await prueba('tab', async () => {
      await page.keyboard.type('cat /etc/os-r');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await esperar(/PRETTY_NAME/);
      await page.keyboard.type('ls /etc/pa');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await esperar(/passwd-/);
    });

    await prueba('ctrlc', async () => {
      await cmd('sleep 100');
      await page.waitForTimeout(400);
      const t0 = Date.now();
      await page.keyboard.press('Control+C');
      await cmd('echo FIN_$((40+2))');
      await esperar(/FIN_42/);
      const ms = Date.now() - t0;
      await cmd('ping 127.0.0.1');
      await esperar(/bytes from 127\.0\.0\.1/);
      await page.keyboard.press('Control+C');
      await esperar(/packets transmitted|paquetes transmitidos/);
      return `sleep cortado y prompt de vuelta en ${ms} ms`;
    });

    await prueba('ctrld', async () => {
      await cmd('python3');
      await esperar(/^>>>\s*$/m);
      await page.keyboard.press('Control+D');
      await cmd('echo PY_$((1+1))');
      await esperar(/PY_2/);
      await cmd('bash');
      await cmd('export ANIDADA=si');
      await page.keyboard.press('Control+D');
      await cmd('echo "anidada=${ANIDADA:-no}"');
      await esperar(/^anidada=no$/m);
    });

    await prueba('ctrlz', async () => {
      await cmd('sleep 200');
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+Z');
      await esperar(/Stopped|Detenido/);
      await cmd('fg');
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+C');
      await cmd('echo Z_$((3*3))');
      await esperar(/Z_9/);
    });

    await prueba('readline', async () => {
      await page.keyboard.press('Control+R');
      await page.keyboard.type('hola desde');
      await page.keyboard.press('Enter');
      await esperar(/^hola desde el historial$/m);
      await page.keyboard.type('cho uno');
      await page.keyboard.press('Control+A');
      await page.keyboard.type('e');
      await page.keyboard.press('Control+E');
      await page.keyboard.type(' dos');
      await page.keyboard.press('Enter');
      await esperar(/^uno dos$/m);
      await page.keyboard.type('basura');
      await page.keyboard.press('Control+U');
      await cmd('echo U_OK');
      await esperar(/^U_OK$/m);
      await page.keyboard.type('echo K_OK resto');
      await page.keyboard.press('Alt+b');
      await page.keyboard.press('Control+K');
      await page.keyboard.press('Enter');
      await esperar(/^K_OK $|^K_OK$/m);
      await page.keyboard.type('echo F_OK');
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Alt+f');
      await page.keyboard.type(' ALT');
      await page.keyboard.press('Enter');
      await esperar(/^ALT F_OK$/m);
    });

    await prueba('ctrlw', async () => {
      await page.keyboard.type('echo W_OK palabra');
      await page.keyboard.press('Control+W');
      await page.keyboard.press('Enter');
      await esperar(/^W_OK$/m);
      return 'bash recibe Ctrl+W; en Chrome/Edge real requiere modo inmersivo (comprobar a mano)';
    });

    await prueba('tui', async () => {
      await cmd('vim /tmp/v.txt');
      await enPantalla(/^~/m);
      await page.keyboard.press('i');
      await page.keyboard.type('hola vim');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200); // vim espera ~100 ms para distinguir Esc de Alt+tecla
      await cmd(':wq');
      await cmd('nano /tmp/n.txt');
      await enPantalla(/GNU nano/);
      await page.keyboard.type('hola nano');
      await page.keyboard.press('Control+S');
      await page.keyboard.press('Control+X');
      await cmd('cat /tmp/v.txt /tmp/n.txt');
      await esperar(/hola vim\s*\nhola nano/);
      await cmd('less /etc/services');
      await enPantalla(/tcpmux|echo/);
      await page.keyboard.press('q');
      await cmd('man ls');
      await enPantalla(/NAME|NOMBRE/);
      await page.keyboard.press('q');
      // htop con ratón: clic en "Quit" de la barra inferior
      await cmd('htop');
      const p = await enPantalla(/Quit/);
      const fila = p.filas.findIndex((f: string) => f.includes('Quit'));
      const col = p.filas[fila].indexOf('Quit');
      await page.mouse.click(p.x + (col + 1.5) * p.cw, p.y + (fila + 0.5) * p.ch);
      await esperar(/root@lab:~#\s*$/m, 4000);
      // tmux propio del alumno, dentro del nuestro
      await cmd('tmux new -s dentro');
      await enPantalla(/\[dentro\]/);
      await cmd('echo TMUX_$((5+5))');
      await enPantalla(/TMUX_10/);
      await page.keyboard.press('Control+B');
      await page.keyboard.press('d');
      await esperar(/detached/);
      await cmd('tmux kill-server');
      return 'vim, nano, less, man, htop (clic de ratón) y tmux anidado';
    });

    await prueba('resize', async () => {
      const antes = await page.evaluate(() => (window as any).__terms[0].term.cols);
      await page.setViewportSize({ width: 1000, height: 800 });
      await page.waitForTimeout(500);
      const despues = await page.evaluate(() => (window as any).__terms[0].term.cols);
      await cmd('echo COLS=$(tput cols)');
      await esperar(new RegExp(`COLS=${despues}`));
      await page.setViewportSize({ width: 1400, height: 900 });
      await page.waitForTimeout(400);
      if (antes === despues) throw new Error('las columnas no cambiaron');
      return `${antes} → ${despues} columnas, el PTY lo ve igual`;
    });

    await prueba('pegar', async () => {
      const lineas = Array.from({ length: 3000 }, (_, i) => `línea ${i} ñ ${'x'.repeat(40)}`);
      const texto = lineas.join('\n') + '\n';
      const md5 = createHash('md5').update(texto).digest('hex');
      await cmd('cat > /tmp/pegado.txt');
      await page.waitForTimeout(300); // que bash desactive el "bracketed paste" antes de pegar
      await page.evaluate((t) => {
        const ta = document.querySelector('#term textarea') as HTMLTextAreaElement;
        const dt = new DataTransfer();
        dt.setData('text/plain', t);
        ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      }, texto);
      await page.waitForTimeout(1500);
      await page.keyboard.press('Control+D');
      await cmd('md5sum < /tmp/pegado.txt; wc -l < /tmp/pegado.txt');
      await esperar(new RegExp(md5), 10_000);
      // copiar: seleccionar con el ratón y Ctrl+Shift+C
      await cmd('clear; echo COPIAME_123');
      const p = await enPantalla(/^COPIAME_123/m);
      const fila = p.filas.findIndex((f: string) => f.startsWith('COPIAME_123'));
      await page.mouse.move(p.x + 0.3 * p.cw, p.y + (fila + 0.5) * p.ch);
      await page.mouse.down();
      await page.mouse.move(p.x + 11.7 * p.cw, p.y + (fila + 0.5) * p.ch, { steps: 8 });
      await page.mouse.up();
      await page.keyboard.press('Control+Shift+C');
      const portapapeles = await page.evaluate(() => navigator.clipboard.readText());
      if (!portapapeles.includes('COPIAME_123')) throw new Error(`portapapeles: "${portapapeles}"`);
      return '3000 líneas (≈170 KB) pegadas con md5 idéntico; copia por selección OK';
    });

    await prueba('clicderecho', async () => {
      // Pegar: sin selección, el clic derecho pega lo que haya en el portapapeles.
      await cmd('clear');
      await page.evaluate(() => navigator.clipboard.writeText('echo DERECHO_$((6*7))'));
      const caja = (await page.locator('#term').boundingBox())!;
      await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2, { button: 'right' });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      await esperar(/^DERECHO_42$/m);
      // Copiar: con selección, el clic derecho la copia.
      await cmd('clear; echo COPIA_DERECHA');
      const p = await enPantalla(/^COPIA_DERECHA/m);
      const fila = p.filas.findIndex((f: string) => f.startsWith('COPIA_DERECHA'));
      await page.evaluate(() => navigator.clipboard.writeText(''));
      await page.mouse.move(p.x + 0.3 * p.cw, p.y + (fila + 0.5) * p.ch);
      await page.mouse.down();
      await page.mouse.move(p.x + 13.7 * p.cw, p.y + (fila + 0.5) * p.ch, { steps: 8 });
      await page.mouse.up();
      await page.mouse.click(p.x + 5 * p.cw, p.y + (fila + 0.5) * p.ch, { button: 'right' });
      await page.waitForTimeout(300);
      const copiado = await page.evaluate(() => navigator.clipboard.readText());
      if (!copiado.includes('COPIA_DERECHA')) throw new Error(`el clic derecho no copió la selección: "${copiado}"`);
      return 'pega sin selección y copia con selección';
    });

    await prueba('utf8', async () => {
      await cmd('cat prueba-utf8.txt');
      await esperar(/áéíóú ñ Ñ ü/);
      await esperar(/🚀/);
      await esperar(/┌─┬─┐/);
      // Playwright mete los caracteres sin tecla física como "insertText", igual que el
      // panel de emojis, el dictado o un teclado en pantalla.
      await cmd('echo mañana ñandú camión 🚀');
      try {
        await esperar(/^mañana ñandú camión 🚀$/m, 3000);
      } catch {
        throw new Error('se dibuja bien, pero el texto que entra sin tecla física (IME, emojis, dictado, teclado en pantalla) no llega');
      }
    });

    await prueba('scroll', async () => {
      await cmd('clear; seq 1 2000');
      await esperar(/^2000$/m);
      const lineas = await page.evaluate(() => {
        const b = (window as any).__terms[0].term.buffer.active;
        let n = 0;
        for (let i = 0; i < b.length; i++) if (/^\d+$/.test(b.getLine(i)?.translateToString(true) ?? '')) n++;
        return n;
      });
      if (lineas < 2000) throw new Error(`el historial solo guarda ${lineas} de 2000 líneas`);
      // Rueda como un ratón real: muescas de 100 px.
      const arriba = async () => Number((await page.evaluate(() => (window as any).__terms[0].pantalla())).filas.find((f: string) => /^\d+$/.test(f)) ?? -1);
      const caja = (await page.locator('#term').boundingBox())!;
      await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
      const antes = await arriba();
      for (let i = 0; i < 20; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(20); }
      await page.waitForTimeout(400);
      const subidas = antes - (await arriba());
      if (subidas < 40) throw new Error(`20 muescas de rueda solo suben ${subidas} líneas`);
      for (let i = 0; i < 40; i++) await page.mouse.wheel(0, 100);
      return `${lineas} líneas en el historial; ${(subidas / 20).toFixed(1)} líneas por muesca de rueda`;
    });

    await prueba('persist', async () => {
      await cmd('export MARCA=persistente; echo antes-de-recargar');
      await esperar(/^antes-de-recargar$/m);
      await page.reload();
      await page.waitForFunction(() => (window as any).__terms?.[0]?.estado === 'conectado', null, { timeout: 15_000 });
      await page.click('#term');
      await enPantalla(/antes-de-recargar/);
      await cmd('echo "marca=$MARCA"');
      await esperar(/^marca=persistente$/m);
    });

    const lat = await page.evaluate(async () => {
      const t = (window as any).__terms[0];
      t.lat.tecla.length = 0;
      return t.stats();
    });
    // Latencia tecla->eco con pulsaciones de una en una
    for (const ch of 'latencia de prueba') await page.keyboard.type(ch, { delay: 60 });
    await page.keyboard.press('Control+U');
    const stats = await page.evaluate(() => (window as any).__terms[0].stats());

    const salida = { motor, fecha: new Date().toISOString(), latencia: stats, items: res, _antes: lat };
    for (const d of ['dist/resultados', 'public/resultados']) {
      mkdirSync(d, { recursive: true });
      writeFileSync(`${d}/m1-${motor}.json`, JSON.stringify(salida, null, 2));
    }
    console.log(motor, JSON.stringify({ latencia: stats, fallos: Object.entries(res).filter(([, r]) => !r.ok) }));
    expect(Object.values(res).every((r) => r.ok), JSON.stringify(res, null, 1)).toBe(true);
  });
}
