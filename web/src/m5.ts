import './estilo.css';
import './recompensa';
import './iconos';

const $ = (id: string) => document.getElementById(id)!;
const NOMBRE: Record<string, string> = {
  contenedor: 'Contenedor simple (crun)', sistema: 'Contenedor de sistema (Sysbox, systemd + Docker)',
  topologia: 'Topología M3 (Containerlab, 4 nodos)', microvm: 'MicroVM (Firecracker, 256 MiB)',
};
const NIVELES: Record<string, string> = { contenedor: '0, hosts de 2–3', sistema: '1, 4, 5, 6, 7', topologia: '2, 3, 8.3–8.6', microvm: '1.6, 7.6–7.8, 8.7, 8.11–8.12' };
const f = (v: number, d = 0) => v.toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d });
const util = (gb: number) => Math.max(0, (gb * 1024 - 1536) * 0.85);

fetch('/densidad/resultados.json').then((r) => r.json()).then((d) => {
  const m: Record<string, any> = Object.fromEntries(d.motores.map((x: any) => [x.motor, x]));
  $('host').innerHTML = `${d.host.cpu}, ${d.host.cpus} CPU lógicas, ${d.host.ram_gb} GB para la VM de WSL2 · kernel ${d.host.kernel} · ${d.host.entorno} · ${new Date(d.fecha).toLocaleString('es-ES')}.
    Se arrancan N labs de cada motor a la vez, se esperan 15–20 s y se mide la RAM que el host deja de tener disponible.`;
  $('tabla').innerHTML = `<tr><th>Motor</th><th>Niveles</th><th>RAM por lab</th><th>Arranque</th><th>Disco del alumno</th><th>N medidos</th></tr>` +
    d.motores.filter((x: any) => !x.error).map((x: any) => `<tr><td>${NOMBRE[x.motor]}</td><td>${NIVELES[x.motor]}</td>
      <td class="n">${f(x.ram_por_lab_mb, 1)} MB</td><td class="n">${f(x.arranque_ms)} ms</td>
      <td>${x.motor === 'microvm' ? `${f(x.disco_cow_mb, 1)} MB de capa CoW` : x.disco_escrito}</td><td class="n">${x.n}</td></tr>`).join('') +
    (m.microvm && !m.microvm.error ? `<tr><td colspan="6" class="nota">Hibernación de microVM: snapshot en ${f(m.microvm.snapshot_ms)} ms, memoria ${m.microvm.snapshot_mem_mb} MB (${m.microvm.snapshot_mem_zstd_mb} MB con zstd), restaurada en <b>${f(m.microvm.restaurar_ms)} ms</b> y ocupando ${f(m.microvm.rss_tras_restaurar_mb, 0)} MB al volver (Firecracker carga la memoria según la usa).</td></tr>` : '');
  $('capacidad').innerHTML = [8, 16].map((gb) => `<h3>Equipo con ${gb} GB</h3>` + d.motores.filter((x: any) => !x.error).map((x: any) => {
    const n = Math.floor(util(gb) / x.ram_por_lab_mb);
    return `<div class="cap"><span>${NOMBRE[x.motor].split(' (')[0]}</span><div class="b"><div style="width:${Math.min(100, n)}%"></div></div><b>${n}</b></div>`;
  }).join('')).join('');

  const mezcla: Record<string, Record<string, number>> = {
    basico: { contenedor: 0.6, topologia: 0.4 },
    medio: { contenedor: 0.4, topologia: 0.2, sistema: 0.3, microvm: 0.1 },
    pesado: { sistema: 0.7, microvm: 0.3 },
  };
  const calc = () => {
    const ram = Number(($('c-ram') as HTMLInputElement).value), precio = Number(($('c-precio') as HTMLInputElement).value);
    const conc = Number(($('c-conc') as HTMLInputElement).value) / 100;
    const mx = mezcla[($('c-mezcla') as HTMLSelectElement).value];
    const mb = Object.entries(mx).reduce((s, [k, p]) => s + p * (m[k]?.ram_por_lab_mb ?? 0), 0);
    const factor = Number(($('c-factor') as HTMLInputElement).value);
    const porRam = Math.floor(util(ram) / (mb * factor));
    const porCpu = Number(($('c-nucleos') as HTMLInputElement).value) * Number(($('c-pornucleo') as HTMLInputElement).value);
    const labs = Math.min(porRam, porCpu);
    const alumnos = Math.floor(labs / conc);
    $('r-limite').textContent = porCpu < porRam ? `limita la CPU; por RAM cabrían ${f(porRam)}` : `limita la RAM; por CPU cabrían ${f(porCpu)}`;
    $('r-labs').textContent = f(labs);
    $('r-alumnos').textContent = f(alumnos);
    $('r-coste').textContent = `${f(precio / Math.max(1, alumnos), 2)} €`;
  };
  document.querySelectorAll('.calc input, .calc select').forEach((e) => e.addEventListener('input', calc));
  calc();
}).catch(() => { $('host').textContent = 'Aún no hay medición: ejecuta densidad/medir.sh.'; });
