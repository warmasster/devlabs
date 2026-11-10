// Correo con Cloudflare Email Service. Solo funciona con el binding EMAIL descomentado en wrangler.jsonc
// (Workers Paid y relavops.org dado de alta en Email Sending). Sin él, todo lo que manda correo sale
// apagado y la web no ofrece esas opciones.

type Emisor = { send(m: { from: string | { email: string; name?: string }; to: string; subject: string; html: string; text: string }): Promise<unknown> };

export const hayCorreo = (env: Env) => !!(env as unknown as { EMAIL?: Emisor }).EMAIL;

export async function enviar(env: Env, para: string, asunto: string, titulo: string, texto: string, boton?: { texto: string; url: string }) {
  const emisor = (env as unknown as { EMAIL?: Emisor }).EMAIL;
  if (!emisor) return false;
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#17123a;font-family:Segoe UI,system-ui,sans-serif;color:#f6f3ff">
<div style="max-width:480px;margin:0 auto;padding:32px 20px">
<div style="font:700 22px ui-monospace,Consolas,monospace;color:#5ff2a8;margin-bottom:20px">relavops</div>
<div style="background:#241d52;border:2px solid #4a3f8f;border-bottom-width:5px;border-radius:18px;padding:24px">
<h1 style="margin:0 0 10px;font-size:20px">${esc(titulo)}</h1>
<p style="margin:0 0 20px;line-height:1.5;color:#d9d3ff">${esc(texto)}</p>
${boton ? `<a href="${esc(boton.url)}" style="display:inline-block;background:#5ff2a8;color:#0a2a1a;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:12px">${esc(boton.texto)}</a>
<p style="margin:18px 0 0;font-size:13px;color:#b3abe6">Si el botón no va, copia esto en el navegador.<br>${esc(boton.url)}</p>` : ''}
</div><p style="font-size:12px;color:#8f86c9;margin-top:18px">Si no has sido tú, ignora este correo.</p></div></body></html>`;
  await emisor.send({
    from: { email: env.CORREO_DE, name: 'relavops' },
    to: para,
    subject: asunto,
    html,
    text: `${titulo}\n\n${texto}${boton ? `\n\n${boton.url}` : ''}\n\nSi no has sido tú, ignora este correo.`,
  });
  return true;
}
