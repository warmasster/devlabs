"""Genera los labs de los 7 juegos (labs/j-*/lab.yaml) y el mapa de red de la persecución.

Uso:  python juegos/generar.py
Los enlaces son punto a punto (/30); cada nodo solo conoce a sus vecinos, así que para avanzar
hay que saltar de máquina en máquina con ssh, como en la vida real.
"""
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
IMG = "relavops/juego:1"


def topologia(nodos, enlaces, red, extra_exec=None, hosts_extra=None):
    """nodos: lista de nombres. enlaces: lista de (a, b). red: prefijo '10.9'.
    Devuelve (topology, mapa) con IPs por interfaz y /etc/hosts con los vecinos."""
    ifs = {n: 0 for n in nodos}
    ips = {n: [] for n in nodos}       # [(ifname, ip, vecino, ip_vecino)]
    links = []
    for k, (a, b) in enumerate(enlaces, start=1):
        ifs[a] += 1
        ifs[b] += 1
        ia, ib = f"eth{ifs[a]}", f"eth{ifs[b]}"
        pa, pb = f"{red}.{k}.1", f"{red}.{k}.2"
        ips[a].append((ia, pa, b, pb))
        ips[b].append((ib, pb, a, pa))
        links.append({"endpoints": [f"{a}:{ia}", f"{b}:{ib}"], "mtu": 1500})
    nodes = {}
    for n in nodos:
        ex = [f"ip addr add {ip}/30 dev {i}" for i, ip, _, _ in ips[n]]
        hosts = [f"{pv} {v}" for _, _, v, pv in ips[n]] + (hosts_extra or {}).get(n, [])
        if hosts:
            ex.append("sh -c 'printf \"%s\\n\" " + " ".join(f'\"{h}\"' for h in hosts) + " >> /etc/hosts'")
        ex += (extra_exec or {}).get(n, [])
        nodes[n] = {"kind": "linux", "image": IMG, "exec": ex}
    return {"nodes": nodes, "links": links}, ips


def escribir(id_, spec):
    import yaml  # pyyaml
    d = RAIZ / "labs" / id_
    d.mkdir(parents=True, exist_ok=True)
    cabecera = f"# Generado por juegos/generar.py · no editar a mano\n"
    (d / "lab.yaml").write_text(cabecera + yaml.safe_dump(spec, allow_unicode=True, sort_keys=False, width=200), encoding="utf-8")
    print("escrito", d / "lab.yaml")


# 1 · La persecución (nivel 2, redes): huye del boss saltando con ssh.
nodos = ["base", "alfa", "bravo", "charlie", "delta", "eco", "salida"]
enlaces = [("base", "alfa"), ("base", "delta"), ("alfa", "bravo"), ("alfa", "delta"), ("bravo", "charlie"),
           ("delta", "eco"), ("eco", "charlie"), ("charlie", "salida"), ("eco", "bravo")]
topo, ips = topologia(nodos, enlaces, "10.9")
escribir("j-persecucion", {"id": "j-persecucion", "titulo": "La persecución", "motor": "topologia", "pool": 1, "juego": True,
                           "terminales": ["base"], "topologia": topo, "mision": []})
(RAIZ / "web" / "src" / "juegos").mkdir(parents=True, exist_ok=True)
(RAIZ / "web" / "src" / "juegos" / "persecucion-red.json").write_text(json.dumps(
    {"enlaces": enlaces, "ips": {n: [{"if": i, "ip": ip, "vecino": v, "ip_vecino": pv} for i, ip, v, pv in l] for n, l in ips.items()}},
    indent=1), encoding="utf-8")

# 2 · Disco en llamas (nivel 0, Linux): un disco de 256 MB que se llena de verdad.
escribir("j-disco", {"id": "j-disco", "titulo": "Disco en llamas", "motor": "contenedor", "pool": 0, "juego": True,
                     "nodos": [{"nombre": "servidor", "imagen": IMG, "memoria": "512m", "pids": 512, "tmpfs": {"/var/log": "256m"}}],
                     "mision": []})

# 3 · Asedio (nivel 1, administración y seguridad): un atacante real contra tu sshd.
topo, _ = topologia(["servidor", "atacante"], [("servidor", "atacante")], "10.8", extra_exec={
    "servidor": ["sh -c 'useradd -m -s /bin/bash becario && echo becario:becario123 | chpasswd'",
                 "sh -c 'mkdir -p /srv/datos && seq -f \"cliente-%04g,tarjeta-****\" 1 500 > /srv/datos/clientes.csv'"],
})
escribir("j-asedio", {"id": "j-asedio", "titulo": "Asedio", "motor": "topologia", "pool": 0, "juego": True,
                      "terminales": ["servidor"], "topologia": topo, "mision": []})

# 4 · Balanceador bajo fuego (nivel 3, proxies y balanceo): mantén el SLO mientras te rompen backends.
topo, _ = topologia(["lb", "web1", "web2", "web3", "cliente"],
                    [("lb", "web1"), ("lb", "web2"), ("lb", "web3"), ("lb", "cliente")], "10.7")
escribir("j-balanceador", {"id": "j-balanceador", "titulo": "Balanceador bajo fuego", "motor": "topologia", "pool": 0, "juego": True,
                           "terminales": ["lb"], "topologia": topo, "mision": []})

# 5 · DNS envenenado (nivel 2, DNS): que la tienda siga resolviendo bien.
topo, _ = topologia(["cliente", "dns", "tienda"], [("cliente", "dns"), ("cliente", "tienda")], "10.6")
escribir("j-dns", {"id": "j-dns", "titulo": "DNS envenenado", "motor": "topologia", "pool": 0, "juego": True,
                   "terminales": ["cliente"], "topologia": topo, "mision": []})

# 6 · Contenedores rebeldes (nivel 4, contenedores): Docker dentro de Sysbox.
# Sin red: la imagen de alpine ya va dentro de relavops/dind (imagenes/dind) y el juego la carga.
escribir("j-contenedores", {"id": "j-contenedores", "titulo": "Contenedores rebeldes", "motor": "sistema", "pool": 0, "juego": True,
                            "nodos": [{"nombre": "host", "imagen": "relavops/dind:1", "memoria": "1g", "pids": 2048}],
                            "mision": []})

# 7 · Quórum (nivel 7, sistemas distribuidos): 3 etcd y un boss que parte la red.
lo = {"etcd1": "10.5.0.1", "etcd2": "10.5.0.2", "etcd3": "10.5.0.3"}
enl = [("etcd1", "etcd2"), ("etcd1", "etcd3"), ("etcd2", "etcd3")]
_, ips7 = topologia(list(lo), enl, "10.5")
rutas = {n: [f"ip route add {lo[v]}/32 via {pv}" for _, _, v, pv in ips7[n]] for n in lo}
topo, _ = topologia(list(lo), enl, "10.5",
                    extra_exec={n: [f"ip addr add {lo[n]}/32 dev lo"] + rutas[n] for n in lo},
                    hosts_extra={n: [f"{ip} {m}" for m, ip in lo.items() if m != n] for n in lo})
escribir("j-quorum", {"id": "j-quorum", "titulo": "Quórum", "motor": "topologia", "pool": 0, "juego": True,
                      "terminales": ["etcd1"], "topologia": topo, "mision": []})
