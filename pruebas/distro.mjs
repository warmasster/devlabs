// La distro de WSL donde corre labd. Se llamaba devlabs-m6 antes del cambio de nombre.
// Si la nueva no existe, se usa la vieja. DISTRO=otra la cambia.
import { spawnSync } from 'node:child_process';

const lista = spawnSync('wsl.exe', ['-l', '-q'], { encoding: 'utf16le' }).stdout ?? '';
const hay = (n) => lista.split(/\r?\n/).map((s) => s.trim()).includes(n);
export const distro = (nueva = 'relavops-m6', vieja = 'devlabs-m6') => process.env.DISTRO ?? (hay(nueva) || !hay(vieja) ? nueva : vieja);
