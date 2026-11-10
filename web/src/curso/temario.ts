// El temario completo: 9 niveles (cinturones). Cada módulo = teoría + práctica + boss.
// "jugable" = tiene lección, lab y boss construidos. El resto se ve en el mapa como "en la forja".

export type Motor = 'contenedor' | 'sistema' | 'topologia' | 'microvm';
export interface Modulo {
  id: string;
  titulo: string;
  teoria: string;
  practica: string;
  lab?: string; // id del lab en labs/
  juego?: string; // id del minijuego del arcade
  side?: boolean;
}
export interface Nivel {
  n: number;
  cinturon: string;
  color: string;
  titulo: string;
  objetivo: string;
  motor: Motor[];
  fase: 'Base' | 'Construir' | 'Operar';
  modulos: Modulo[];
}

export const MOTORES: Record<Motor, string> = {
  contenedor: 'contenedor simple',
  sistema: 'contenedor de sistema',
  topologia: 'topología de red',
  microvm: 'microVM',
};

const m = (id: string, titulo: string, teoria: string, practica: string, extra: Partial<Modulo> = {}): Modulo => ({ id, titulo, teoria, practica, ...extra });

export const NIVELES: Nivel[] = [
  {
    n: 0, cinturon: 'Blanco', color: '#e7e9ee', titulo: 'La terminal deja de dar miedo', fase: 'Base', motor: ['contenedor'],
    objetivo: 'Moverse por un Linux con soltura y automatizar tareas pequeñas con Bash.',
    modulos: [
      m('0.0', 'Cómo funciona esto', 'La pantalla, la terminal, las opciones, las pistas y el boss', 'Tutorial con tu primera máquina · B: la búsqueda del tesoro'),
      m('0.1', 'La shell', 'Terminal y shell; prompt; TAB, Ctrl+C, Ctrl+D, Ctrl+R; trabajos', 'Atajos de la shell contra reloj · B: atrapado en el visor', { lab: 'n0-1-shell' }),
      m('0.2', 'Sistema de ficheros', 'Árbol de carpetas, rutas, inodos, enlaces duros y simbólicos', 'Ordenar un servidor caótico · B: ¿quién llena el disco?', { lab: 'n0-2-ficheros' }),
      m('0.3', 'La máquina por dentro', 'Kernel, CPU, RAM, disco y procesos', 'La ficha de una máquina · B: el proceso fantasma', { lab: 'n0-3-maquina' }),
      m('0.4', 'La red', 'IP, ping y puertos, con tres máquinas', 'La red de la tienda · B: la tienda no carga', { lab: 'n0-4-red' }),
      m('0.5', 'Permisos', 'rwx, octal, dueño y grupo, setgid, sticky bit', 'Carpetas de equipo con setgid y sticky · B: el backup que no arranca', { lab: 'n0-5-permisos', juego: 'octal' }),
      m('0.6', 'Texto y tuberías', 'stdin, stdout y stderr, tuberías, redirecciones', 'Interrogar un access.log de 6000 líneas · B: ataque en curso', { lab: 'n0-6-tuberias' }),
      m('0.7', 'Expresiones regulares', 'Clases, cuantificadores, anclas, grupos', 'Regex Rush (arcade) · B: extraer lo que importa de logs reales', { lab: 'n0-7-regex', juego: 'regex' }),
      m('0.8', 'Editores', 'Modos de vim, movimientos, órdenes, nano', 'Speedrun de vim cronometrado · B: la config que no carga', { lab: 'n0-8-vim' }),
      m('0.9', 'Bash scripting', 'Variables, condicionales, bucles, funciones, set -euo pipefail, códigos de salida', 'Scripts con tests automáticos · B: backup rotativo con 3 bugs', { lab: 'n0-9-scripts' }),
      m('0.10', 'Git básico', 'Commits, ramas, merge, conflictos, remotos', 'Tu primer flujo con remoto · B: el desastre del viernes', { lab: 'n0-10-git' }),
    ],
  },
  {
    n: 1, cinturon: 'Amarillo', color: '#fde047', titulo: 'Administrar Linux de verdad', fase: 'Base', motor: ['sistema'],
    objetivo: 'Dejar un servidor configurado, seguro y con backups.',
    modulos: [
      m('1.1', 'Usuarios y grupos', '/etc/passwd, shadow, sudoers, PAM', 'Alta de equipo con sudo mínimo'),
      m('1.2', 'Paquetes', 'apt, dnf, apk; repos, firmas, pinning', 'B: dependencia rota tras un upgrade'),
      m('1.3', 'Procesos y señales', 'Ciclo de vida, señales, nice, zombies, /proc/<pid>', 'ps, top, htop, kill, strace básico'),
      m('1.4', 'systemd', 'Units, targets, dependencias, timers, journald', 'Tu servicio con restart y timer · B: bucle de reinicio'),
      m('1.5', 'Logs', 'journald, rsyslog, logrotate', 'B: disco lleno por logs'),
      m('1.6', 'Discos y almacenamiento', 'Particiones, ext4/xfs/btrfs, LVM, RAID con mdadm', 'LVM y RAID 1 sobre loop · B: reconstruir el RAID'),
      m('1.7', 'SSH a fondo', 'Claves, ssh_config, agent, túneles -L/-R/-D, ProxyJump', 'Bastion con 3 saltos · B: acceso perdido por permisos'),
      m('1.8', 'Rendimiento básico', 'Load average, CPU, memoria, I/O, swap', 'vmstat, iostat, sar · B: ¿quién se come la RAM?'),
      m('1.9', 'Backups', 'Regla 3-2-1, rsync, restic, restauración probada', 'B: restaurar tras un rm -rf'),
      m('1.10', 'Hardening inicial', 'Firewall básico, fail2ban, actualizaciones, auditd', 'B: servidor expuesto con 5 fallos ocultos'),
      m('1.S1', 'Arranque de Linux', 'BIOS/UEFI, GRUB, initramfs, PID 1', 'Side-quest', { side: true }),
      m('1.S2', 'Ansible', 'Inventario, playbooks, idempotencia', 'Repetir el nivel en 3 máquinas', { side: true }),
    ],
  },
  {
    n: 2, cinturon: 'Naranja', color: '#fb923c', titulo: 'Redes desde el cable hasta el DNS', fase: 'Base', motor: ['topologia'],
    objetivo: 'Depurar cualquier problema de conectividad con ip, ss, tcpdump y dig.',
    modulos: [
      m('2.1', 'Modelos OSI y TCP/IP', 'Capas, encapsulado, trama, paquete, segmento', 'Encapsula (arcade): cada cosa en su capa', { juego: 'capas' }),
      m('2.2', 'Ethernet y ARP', 'MAC, switches, broadcast, tabla ARP', 'ARP en directo con tcpdump · B: IP duplicada'),
      m('2.3', 'IPv4 y subnetting', 'CIDR, máscaras, gateway, rangos privados', 'Subnet Sprint (arcade) cronometrado', { juego: 'subred' }),
      m('2.4', 'Routing estático', 'Tabla de rutas, longest prefix match, ICMP, TTL', '3 subredes y 2 routers · B: ruta asimétrica'),
      m('2.5', 'TCP y UDP', 'Handshake, estados, ventanas, retransmisiones', 'ss -tanp, nc, handshake en tshark'),
      m('2.6', 'NAT', 'SNAT, DNAT, masquerade, conntrack', 'B: servicio interno inaccesible'),
      m('2.7', 'DNS', 'Jerarquía, recursivo vs autoritativo, registros, TTL', 'Tu zona en CoreDNS + Unbound · B: siempre es DNS'),
      m('2.8', 'DHCP', 'DORA, reservas, opciones', 'dnsmasq sirviendo a 3 hosts'),
      m('2.9', 'VLANs', '802.1Q, trunk vs access, bridges con VLAN filtering', 'Separar 3 departamentos'),
      m('2.10', 'IPv6', 'Direcciones, SLAAC, NDP, dual stack', 'B: servicio que solo falla por IPv6'),
      m('2.11', 'Caja de herramientas', 'ip, ss, tcpdump, tshark, mtr, dig, curl -v, nmap', 'B: incidente con 3 causas encadenadas'),
    ],
  },
  {
    n: 3, cinturon: 'Verde', color: '#4ade80', titulo: 'Redes avanzadas, cifrado y perímetro', fase: 'Base', motor: ['topologia', 'sistema'],
    objetivo: 'Diseñar y asegurar la red de una empresa pequeña, con VPN, balanceo y PKI propia.',
    modulos: [
      m('3.1', 'Namespaces de red desde cero', 'netns, veth, bridges', 'Replicar la red de Docker con ip netns'),
      m('3.2', 'Firewalls', 'Netfilter, nftables, cadenas, estado', 'Firewall de 3 zonas · B: la regla que bloquea medio mundo'),
      m('3.3', 'OSPF', 'Áreas, LSA, convergencia', '5 routers FRR · B: adyacencia por MTU'),
      m('3.4', 'BGP', 'AS, eBGP/iBGP, atributos, políticas', 'Multihoming con dos ISPs · B: fuga de rutas'),
      m('3.5', 'VPN', 'WireGuard, IPsec, OpenVPN', 'Dos sedes con WireGuard · B: conecta pero no pasa tráfico'),
      m('3.6', 'TLS y PKI', 'Asimétrica, certificados, cadenas, CA propia, mTLS, ACME', 'step-ca y Pebble · B: cadena incompleta'),
      m('3.7', 'HTTP a fondo', 'HTTP/1.1, 2, 3 y QUIC, cabeceras, caché', 'curl --http3 y tshark'),
      m('3.8', 'Proxies y balanceo', 'L4 vs L7, Nginx, HAProxy, Envoy, Caddy', 'Balancear 3 backends · B: un backend lento tumba todo'),
      m('3.9', 'Overlays', 'VXLAN, GRE, EVPN', 'Una LAN entre dos datacenters'),
      m('3.10', 'Seguridad de red', 'Segmentación, Suricata, escaneo responsable', 'B: cortar un escaneo en tu red'),
    ],
  },
  {
    n: 4, cinturon: 'Azul', color: '#60a5fa', titulo: 'Contenedores por dentro y por fuera', fase: 'Construir', motor: ['sistema'],
    objetivo: 'Saber qué es un contenedor a nivel kernel y construir imágenes pequeñas, seguras y reproducibles.',
    modulos: [
      m('4.1', 'Un contenedor no existe', 'Namespaces, cgroups v2, capabilities, seccomp', 'Contenedor a mano con unshare y cgroups'),
      m('4.2', 'Sistemas de ficheros por capas', 'OverlayFS, copy-on-write', 'Overlay a mano'),
      m('4.3', 'Docker esencial', 'Imágenes vs contenedores, ciclo de vida, exec, logs', 'Misiones rápidas de CLI'),
      m('4.4', 'Dockerfile bien hecho', 'Capas, caché, BuildKit, multi-stage, no root', 'B: de 1,2 GB a menos de 50 MB'),
      m('4.5', 'Redes en Docker', 'bridge, host, none, macvlan, DNS interno', 'Ver con ip netns lo que creó Docker'),
      m('4.6', 'Datos', 'Volumes, bind mounts, tmpfs, UID/GID', 'B: Postgres que pierde datos'),
      m('4.7', 'Docker Compose', 'Servicios, redes, healthchecks, profiles', 'Web + API + DB + caché'),
      m('4.8', 'OCI y runtimes', 'OCI, containerd, runc, crun, Podman rootless', 'Lanzar un bundle con runc'),
      m('4.9', 'Registries', 'Registry propio, tags vs digests, multi-arch', 'Registry con TLS de tu CA'),
      m('4.10', 'Seguridad de la cadena', 'Trivy, Syft, Cosign, distroless', 'B: CVE crítica escondida en una capa'),
      m('4.11', 'Límites y aislamiento', 'Memoria, CPU, PIDs, OOM, rootless', 'B: fork bomb que tumba el host'),
    ],
  },
  {
    n: 5, cinturon: 'Morado', color: '#c084fc', titulo: 'Llevar a producción', fase: 'Construir', motor: ['sistema'],
    objetivo: 'Que un git push acabe en producción con TLS, monitorización, alertas y vuelta atrás.',
    modulos: [
      m('5.1', 'Qué es "producción"', '12-factor, entornos, config, secretos', 'Refactorizar config "a fuego"'),
      m('5.2', 'Reverse proxy y TLS automático', 'Traefik o Caddy, ACME, HSTS', 'HTTPS en 3 servicios'),
      m('5.3', 'CI', 'Pipelines, cachés, artefactos, matrices', 'Forgejo Actions construyendo y escaneando'),
      m('5.4', 'CD y despliegues', 'Rolling, blue/green, canary, rollback', 'B: revertir en menos de 5 min'),
      m('5.5', 'Bases de datos en producción', 'Backups, PITR, réplicas, migraciones', 'B: migración que bloquea en hora punta'),
      m('5.6', 'Infraestructura como código', 'OpenTofu, Ansible, idempotencia, estado', 'Recrear la empresa con un comando'),
      m('5.7', 'Métricas', 'Prometheus, PromQL, Grafana', 'Las 4 señales doradas'),
      m('5.8', 'Logs y trazas', 'Loki, OpenTelemetry, Tempo', 'B: la petición lenta entre 10.000'),
      m('5.9', 'Alertas y SLOs', 'SLI, SLO, error budget, burn rate', 'SLOs y alertas que no despiertan en vano'),
      m('5.10', 'Secretos', 'OpenBao, SOPS, rotación', 'B: secreto filtrado en un commit antiguo'),
      m('5.11', 'GitOps', 'Repositorio como fuente de verdad', 'Puente hacia ArgoCD/Flux'),
    ],
  },
  {
    n: 6, cinturon: 'Marrón', color: '#b45309', titulo: 'Microservicios y Kubernetes', fase: 'Construir', motor: ['sistema'],
    objetivo: 'Partir un monolito con criterio y operar servicios en Kubernetes con GitOps.',
    modulos: [
      m('6.1', '¿Microservicios o no?', 'Monolito modular, bounded contexts', 'Partir un monolito en 3'),
      m('6.2', 'Comunicación síncrona', 'REST, gRPC, timeouts, backoff', 'B: cascada de reintentos'),
      m('6.3', 'Comunicación asíncrona', 'NATS, RabbitMQ, Redpanda; at-least-once', 'Pedidos por eventos'),
      m('6.4', 'Patrones de resiliencia', 'Circuit breaker, outbox, saga, DLQ', 'B: pedido cobrado dos veces'),
      m('6.5', 'API gateway y discovery', 'Rate limiting, Consul, DNS de servicio', 'Gateway con auth y límites'),
      m('6.6', 'Kubernetes: arquitectura', 'Control plane, etcd, scheduler, kubelet', 'Qué pasa con kubectl apply'),
      m('6.7', 'Kubernetes: objetos', 'Pods, Deployments, Services, Gateway API', 'Desplegar la app del nivel 5'),
      m('6.8', 'Salud y escalado', 'Probes, requests/limits, HPA, PDB', 'B: CrashLoopBackOff y OOMKilled'),
      m('6.9', 'Seguridad en K8s', 'RBAC, NetworkPolicies, Pod Security', 'B: pod comprometido'),
      m('6.10', 'Empaquetado', 'Helm, Kustomize', 'Chart propio por entornos'),
      m('6.11', 'GitOps', 'ArgoCD o Flux, drift', 'El clúster se arregla solo'),
      m('6.12', 'Service mesh', 'Cilium, Linkerd, mTLS automático', 'mTLS sin tocar código'),
      m('6.13', 'Operadores', 'CRDs, reconciliación', 'Operador mínimo', { side: true }),
    ],
  },
  {
    n: 7, cinturon: 'Negro', color: '#52525b', titulo: 'SRE y operación a escala', fase: 'Operar', motor: ['sistema', 'microvm'],
    objetivo: 'Mantener sistemas distribuidos vivos cuando todo falla a la vez.',
    modulos: [
      m('7.1', 'Respuesta a incidentes', 'Roles, severidades, runbooks, postmortem', 'B: incidente con presión de tiempo'),
      m('7.2', 'Chaos engineering', 'Hipótesis, blast radius, netem, Toxiproxy', 'Inyectar latencia y particiones'),
      m('7.3', 'Alta disponibilidad', 'VRRP, IPs flotantes, quorum, split-brain', 'B: dos líderes a la vez'),
      m('7.4', 'Consenso', 'Raft animado, etcd', 'Partir un etcd y ver qué sobrevive'),
      m('7.5', 'Almacenamiento distribuido', 'Replicación, erasure coding, MinIO', 'B: perder un nodo'),
      m('7.6', 'Rendimiento a fondo', 'USE, flame graphs, perf', 'El cuello de botella de una API'),
      m('7.7', 'eBPF para operadores', 'bpftrace, BCC, execsnoop', 'Syscalls lentas sin reiniciar'),
      m('7.8', 'Tuning de kernel y red', 'sysctl, buffers TCP, conntrack', 'B: no acepta conexiones a 10k'),
      m('7.9', 'Capacidad y costes', 'k6, modelos de capacidad, FinOps', 'Nodos para el doble de tráfico'),
      m('7.10', 'Multi-región simulada', 'Latencia, replicación, failover DNS', 'B: cae una región entera'),
    ],
  },
  {
    n: 8, cinturon: 'Dan rojo', color: '#ef4444', titulo: 'Lo más loco', fase: 'Operar', motor: ['microvm', 'topologia'],
    objetivo: 'Construir desde cero lo que el resto del mundo usa como caja negra. Raids de varias sesiones.',
    modulos: [
      m('8.1', 'Tu propio runtime', 'Mini-Docker en Go', 'Raid'),
      m('8.2', 'Kubernetes the hard way', 'PKI, etcd, API server, kubelets, CNI', 'Raid'),
      m('8.3', 'Mini-Internet', 'Varios AS, IXP con route servers', 'Raid'),
      m('8.4', 'Seguridad del routing global', 'RPKI, ROAs, secuestro BGP', 'Raid'),
      m('8.5', 'DNS como un operador raíz', 'Raíz propia, DNSSEC, anycast', 'Raid'),
      m('8.6', 'Tu propio CDN', 'Varnish, GeoDNS, anycast', 'Raid'),
      m('8.7', 'eBPF y XDP', 'Balanceador L4 o anti-DDoS en XDP', 'Raid'),
      m('8.8', 'Zero trust de verdad', 'SPIFFE/SPIRE, mTLS en todo', 'Raid'),
      m('8.9', 'Cadena de suministro blindada', 'SLSA, Sigstore, admisión firmada', 'Raid'),
      m('8.10', 'Sistemas que se rompen', 'Raft de juguete estilo Jepsen', 'Raid'),
      m('8.11', 'Arranque y microVMs', 'Kernel mínimo, initramfs, orquestador Firecracker', 'Raid'),
      m('8.12', 'Blue team de contenedores', '--privileged, Falco, CIS', 'Raid'),
      m('8.13', 'Plataforma interna', 'Un "Heroku" propio', 'Raid'),
    ],
  },
];

export const modulo = (id: string) => {
  for (const n of NIVELES) for (const mo of n.modulos) if (mo.id === id) return { nivel: n, mod: mo };
  return null;
};
