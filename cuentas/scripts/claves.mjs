// Genera los dos secretos de las cuentas.
//
//   node scripts/claves.mjs local     escribe .dev.vars para `npm run dev`
//   node scripts/claves.mjs remoto    los sube al Worker desplegado y deja el del nodo en
//                                     ../instalador/secretos/nodo.env para el VPS
//
// CLAVE_FIRMA es una clave Ed25519. Con ella el Worker firma el pase que lee labd. labd solo
// necesita la parte pública, que pide a /api/cuenta/clave-publica, así que nunca sale de Cloudflare.
// NODO_SECRETO es lo que manda cada labd en sus latidos para que el Worker se fíe de él.
//
// Volver a lanzarlo en remoto cambia las dos. Todas las sesiones siguen abiertas (son de la base),
// pero los pases viejos dejan de valer y se renuevan solos en la siguiente página.
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const modo = process.argv[2];
if (modo !== 'local' && modo !== 'remoto') {
  console.error('Uso: node scripts/claves.mjs local|remoto');
  process.exit(1);
}

const { privateKey } = generateKeyPairSync('ed25519');
const jwk = privateKey.export({ format: 'jwk' });
const clave = JSON.stringify({ kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x });
const nodo = randomBytes(32).toString('base64url');

if (modo === 'local') {
  writeFileSync(join(aqui, '..', '.dev.vars'), `CLAVE_FIRMA='${clave}'\nNODO_SECRETO=local\n`);
  console.log('.dev.vars listo. El secreto de nodo en local es "local".');
  process.exit(0);
}

const subir = (nombre, valor) => {
  const r = spawnSync('npx', ['wrangler', 'secret', 'put', nombre], { input: valor, encoding: 'utf8', shell: true, cwd: join(aqui, '..') });
  if (r.status !== 0) {
    console.error(r.stdout, r.stderr);
    process.exit(1);
  }
  console.log(`${nombre} subido`);
};
subir('CLAVE_FIRMA', clave);
subir('NODO_SECRETO', nodo);
const dir = join(aqui, '..', '..', 'instalador', 'secretos');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'nodo.env'), `# Lo genera cuentas/scripts/claves.mjs. No lo compartas.\nRELAVOPS_NODO_SECRETO=${nodo}\n`, { mode: 0o600 });
try { chmodSync(join(dir, 'nodo.env'), 0o600); } catch {}
console.log('Secreto del nodo en instalador/secretos/nodo.env. vps.sh lo usa solo.');
