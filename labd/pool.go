package main

// Motores de laboratorio y pool en caliente: siempre hay N labs arrancados por tipo,
// así que asignar uno al alumno es instantáneo. Al devolverlo se destruye y se repone.
//
// Ningún nodo corre con --privileged ni tiene salida a Internet. Todos llevan tope de memoria, CPU,
// procesos y tamaño de fichero, y el disco que ocupan lo vigila disco.go.

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type Iface struct {
	Nombre string   `json:"nombre"`
	MAC    string   `json:"mac"`
	IPs    []string `json:"ips"`
}

type Instance struct {
	ID         string
	Spec       *LabSpec
	Nodos      map[string]string // nodo -> nombre del contenedor
	Dir        string
	CreadaEn   time.Duration
	Interfaces map[string][]Iface
	Switch     string // espacio de red con el switch propio de la instancia, si el lab pide red
}

type Engine struct {
	dk     *Docker
	estado string
	pools  map[string]*Pool
	crear  chan struct{} // limita las creaciones simultáneas
	rec    Recursos

	initMu sync.Mutex
	inits  map[string]bool // imagen -> si hay que ponerle --init (ver conInit)
}

// Recursos que se ponen a todos los contenedores de los labs, además de los de cada lab.yaml.
type Recursos struct {
	// CgroupPadre mete todos los labs en un mismo cgroup (en el VPS, relavops-labs.slice, con su tope
	// de memoria y CPU). Así, por muchos labs que haya, a labd, Caddy y Docker siempre les queda algo.
	CgroupPadre string
	// TopeFichero es el tamaño máximo de un fichero dentro de un lab (ulimit -f), en bytes. 0: sin tope.
	TopeFichero int64
}

// Lo que lleva un nodo si su lab.yaml no dice otra cosa.
const (
	memoriaPorDefecto = "256m"
	pidsPorDefecto    = 512
)

type Pool struct {
	eng    *Engine
	spec   *LabSpec
	ready  chan *Instance
	refill chan struct{}
}

func randID(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func NewEngine(dk *Docker, estado string, labs map[string]*LabSpec, paralelo int, rec Recursos) *Engine {
	e := &Engine{dk: dk, estado: estado, pools: map[string]*Pool{}, crear: make(chan struct{}, paralelo), rec: rec, inits: map[string]bool{}}
	e.limpiarRestos()
	for _, id := range sortedIDs(labs) {
		s := labs[id]
		p := &Pool{eng: e, spec: s, ready: make(chan *Instance, 64), refill: make(chan struct{}, 1)}
		e.pools[id] = p
		go p.loop()
		p.refill <- struct{}{}
	}
	return e
}

// limpiarRestos borra labs de una ejecución anterior (si labd se cerró de golpe).
func (e *Engine) limpiarRestos() {
	// devlabs.inst es la etiqueta de antes del cambio de nombre. Así no quedan labs huérfanos al actualizar.
	for _, etiqueta := range []string{"relavops.inst", "devlabs.inst"} {
		out, _ := exec.Command("docker", "ps", "-aq", "--filter", "label="+etiqueta).Output()
		if ids := strings.Fields(string(out)); len(ids) > 0 {
			exec.Command("docker", append([]string{"rm", "-f"}, ids...)...).Run()
		}
		exec.Command("docker", "network", "prune", "-f", "--filter", "label="+etiqueta).Run()
	}
	// Las topologías de antes las montaba containerlab, con nombres clab-dlXXXXXXXX-nodo y
	// "restart: always", así que volvían solas al arrancar Docker. Solo se tocan las de labd (clab-dl).
	out, _ := exec.Command("docker", "ps", "-a", "--filter", "label=containerlab", "--format", "{{.ID}} {{.Names}}").Output()
	var viejos []string
	for _, l := range strings.Split(string(out), "\n") {
		if id, nombre, ok := strings.Cut(strings.TrimSpace(l), " "); ok && strings.HasPrefix(nombre, "clab-dl") {
			viejos = append(viejos, id)
		}
	}
	if len(viejos) > 0 {
		log.Printf("borro %d nodos de topologías viejas (containerlab)", len(viejos))
		exec.Command("docker", append([]string{"rm", "-f"}, viejos...)...).Run()
	}
	// Los switches de las redes propias (createContenedores).
	if out, err := exec.Command("ip", "netns", "list").Output(); err == nil {
		for _, l := range strings.Split(string(out), "\n") {
			if n, _, _ := strings.Cut(strings.TrimSpace(l), " "); strings.HasPrefix(n, "dlsw") {
				exec.Command("ip", "netns", "del", n).Run()
			}
		}
	}
	os.RemoveAll(filepath.Join(e.estado, "inst"))
}

func (p *Pool) loop() {
	for range p.refill {
		for len(p.ready) < p.spec.Pool {
			inst, err := p.eng.create(p.spec)
			if err != nil {
				log.Printf("pool %s: %v", p.spec.ID, err)
				time.Sleep(5 * time.Second)
				continue
			}
			log.Printf("pool %s: instancia %s lista en %v", p.spec.ID, inst.ID, inst.CreadaEn.Round(time.Millisecond))
			p.ready <- inst
		}
	}
}

func (p *Pool) kick() {
	select {
	case p.refill <- struct{}{}:
	default:
	}
}

// Acquire devuelve un lab: del pool si hay uno caliente, si no lo crea en el momento.
func (p *Pool) Acquire() (*Instance, bool, error) {
	select {
	case inst := <-p.ready:
		p.kick()
		return inst, true, nil
	default:
	}
	inst, err := p.eng.create(p.spec)
	p.kick()
	return inst, false, err
}

func (p *Pool) Release(inst *Instance) {
	go func() {
		p.eng.destroy(inst)
		p.kick()
	}()
}

func run(name string, args ...string) (string, error) {
	out, err := exec.Command(name, args...).CombinedOutput()
	if err != nil {
		return string(out), fmt.Errorf("%s %s: %v: %s", name, strings.Join(args, " "), err, strings.TrimSpace(string(out)))
	}
	return string(out), nil
}

func (e *Engine) create(s *LabSpec) (*Instance, error) {
	e.crear <- struct{}{}
	defer func() { <-e.crear }()
	t0 := time.Now()
	inst := &Instance{ID: randID(4), Spec: s, Nodos: map[string]string{}}
	var err error
	switch s.Motor {
	case "contenedor", "sistema":
		err = e.createContenedores(inst)
	case "topologia":
		err = e.createTopologia(inst)
	default:
		err = fmt.Errorf("motor %q no soportado todavía", s.Motor)
	}
	if err != nil {
		e.destroy(inst)
		return nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	inst.Interfaces = map[string][]Iface{}
	for nodo, ctr := range inst.Nodos {
		inst.Interfaces[nodo] = e.interfaces(ctx, ctr)
	}
	for _, a := range s.Preparar {
		if out, code, err := e.dk.Run(ctx, inst.Nodos[a.Nodo], "sh", "-c", a.Script); err != nil || code != 0 {
			e.destroy(inst)
			return nil, fmt.Errorf("preparar en %s: código %d %v %s", a.Nodo, code, err, out)
		}
	}
	inst.CreadaEn = time.Since(t0)
	return inst, nil
}

func (e *Engine) createContenedores(inst *Instance) error {
	var sub *net.IPNet
	if r := inst.Spec.Red; r != nil {
		subred := r.Subred
		if subred == "" {
			subred = "10.0.0.0/24"
		}
		var err error
		if _, sub, err = net.ParseCIDR(subred); err != nil {
			return fmt.Errorf("subred %q: %v", subred, err)
		}
	}
	for _, n := range inst.Spec.Nodos {
		name := fmt.Sprintf("dl-%s-%s", inst.ID, n.Nombre)
		red := n.Red
		if red == "" {
			red = "none" // salida a Internet cerrada por defecto
		}
		if red != "none" && red != "lab" {
			// Ni bridge ni host: un lab con salida a Internet serviría para atacar a otros desde el servidor.
			return fmt.Errorf("nodo %s: red %q no permitida (none o lab)", n.Nombre, red)
		}
		// Todos van sin red de Docker. Los de la red propia se enchufan luego a su switch.
		args := []string{"run", "-d", "--name", name, "--hostname", n.Nombre, "--network", "none",
			"--label", "relavops.inst=" + inst.ID, "--label", "relavops.lab=" + inst.Spec.ID}
		for _, c := range n.Caps {
			args = append(args, "--cap-add", c)
		}
		args = append(args, e.limites(n.Memoria, n.CPUs, n.PIDs)...)
		for ruta, tam := range n.Tmpfs {
			args = append(args, "--tmpfs", fmt.Sprintf("%s:rw,size=%s", ruta, tam))
		}
		if inst.Spec.Motor == "sistema" {
			args = append(args, "--runtime", "sysbox-runc")
		} else if e.conInit(n.Imagen) {
			args = append(args, "--init")
		}
		args = append(args, n.Imagen)
		if _, err := run("docker", args...); err != nil {
			return err
		}
		inst.Nodos[n.Nombre] = name
	}
	if sub != nil {
		return e.redPropia(inst, sub)
	}
	return nil
}

// redPropia monta la red de un lab con red: un switch (un bridge) en un espacio de red solo para esta
// instancia, y un cable veth de cada máquina a él, con la IP del lab.yaml en su eth0.
// Antes era una red de Docker --internal, con dos pegas. Docker no deja dos redes con la misma subred,
// así que solo cabía un alumno a la vez en cada lab con red. Y el bridge tenía una IP del servidor, así
// que desde el lab se llegaba al servidor (al SSH, por ejemplo). Este switch no tiene IP ni salida a
// ningún sitio, y cada instancia tiene el suyo, aunque todas usen la misma subred.
func (e *Engine) redPropia(inst *Instance, sub *net.IPNet) error {
	inst.Switch = "dlsw" + inst.ID
	if _, err := run("ip", "netns", "add", inst.Switch); err != nil {
		return err
	}
	sw := []string{"-n", inst.Switch}
	if _, err := run("ip", append(sw, "link", "add", "sw", "type", "bridge")...); err != nil {
		return err
	}
	run("ip", append(sw, "link", "set", "sw", "up")...)
	prefijo, _ := sub.Mask.Size()
	siguiente := 10 // a los nodos sin ip se les da .10, .11…
	hosts := ""
	ips := map[string]string{}
	for _, n := range inst.Spec.Nodos {
		if n.Red != "" && n.Red != "lab" {
			continue
		}
		ip := n.IP
		if ip == "" {
			b := sub.IP.To4()
			ip = fmt.Sprintf("%d.%d.%d.%d", b[0], b[1], b[2], int(b[3])+siguiente)
			siguiente++
		}
		ips[n.Nombre] = ip
		hosts += ip + " " + n.Nombre + "\n"
	}
	i := 0
	for _, n := range inst.Spec.Nodos {
		ip, ok := ips[n.Nombre]
		if !ok {
			continue
		}
		out, err := run("docker", "inspect", "-f", "{{.State.Pid}}", inst.Nodos[n.Nombre])
		pid := strings.TrimSpace(out)
		if err != nil || pid == "" || pid == "0" {
			return fmt.Errorf("nodo %s no arranca: %v", n.Nombre, err)
		}
		dentro, fuera := fmt.Sprintf("v%s%dn", inst.ID, i), fmt.Sprintf("v%s%ds", inst.ID, i)
		i++
		if _, err := run("ip", "link", "add", dentro, "type", "veth", "peer", "name", fuera); err != nil {
			return err
		}
		pasos := [][]string{
			{"ip", "link", "set", fuera, "netns", inst.Switch},
			{"ip", "-n", inst.Switch, "link", "set", fuera, "master", "sw", "up"},
			{"ip", "link", "set", dentro, "netns", pid},
			{"nsenter", "-t", pid, "-n", "ip", "link", "set", dentro, "name", "eth0", "up"},
			{"nsenter", "-t", pid, "-n", "ip", "addr", "add", fmt.Sprintf("%s/%d", ip, prefijo), "brd", "+", "dev", "eth0"},
		}
		for _, p := range pasos {
			if _, err := run(p[0], p[1:]...); err != nil {
				run("ip", "link", "del", dentro)
				run("ip", "link", "del", fuera)
				return err
			}
		}
	}
	// Sin el DNS de Docker, cada máquina conoce a las demás por /etc/hosts.
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	for nombre := range ips {
		if out, code, err := e.dk.Run(ctx, inst.Nodos[nombre], "sh", "-c", `printf '%s' "$1" >> /etc/hosts`, "sh", hosts); err != nil || code != 0 {
			return fmt.Errorf("hosts en %s: %v %s", nombre, err, out)
		}
	}
	return nil
}

// conInit dice si un nodo de esta imagen necesita --init. El PID 1 tiene que recoger a los procesos
// que mueren, o cada proceso matado se queda como zombi y acaba gastando el límite de procesos del lab.
// docker-init lo hace, pero termina en cuanto termina su hijo, y con él se apagaba la máquina: el hijo
// era un sleep infinity y bastaba un pkill sleep. Las imágenes de relavops traen su propio PID 1 que
// no muere (imagenes/base/maquina) y lo dicen con la etiqueta relavops.init=maquina. A esas no se
// les pone --init. Las demás, o una imagen vieja sin la etiqueta, siguen con docker-init.
func (e *Engine) conInit(imagen string) bool {
	e.initMu.Lock()
	defer e.initMu.Unlock()
	if v, ok := e.inits[imagen]; ok {
		return v
	}
	out, err := run("docker", "image", "inspect", "-f", `{{index .Config.Labels "relavops.init"}}`, imagen)
	if err != nil {
		return true // sin la imagen todavía: no se apunta, se mira otra vez la próxima
	}
	v := strings.TrimSpace(out) != "maquina"
	e.inits[imagen] = v
	return v
}

// limites son las opciones de docker run que lleva todo nodo: memoria (sin swap), CPU, procesos, sin
// logs en el disco del servidor, el cgroup común de los labs y el tamaño máximo de un fichero.
func (e *Engine) limites(memoria string, cpus float64, pids int) []string {
	if memoria == "" {
		memoria = memoriaPorDefecto
	}
	if cpus <= 0 {
		cpus = 1
	}
	if pids <= 0 {
		pids = pidsPorDefecto
	}
	args := []string{"--memory", memoria, "--memory-swap", memoria, "--cpus", fmt.Sprint(cpus),
		"--pids-limit", fmt.Sprint(pids), "--log-driver", "none"}
	if e.rec.CgroupPadre != "" {
		args = append(args, "--cgroup-parent", e.rec.CgroupPadre)
	}
	if e.rec.TopeFichero > 0 {
		args = append(args, "--ulimit", fmt.Sprintf("fsize=%d:%d", e.rec.TopeFichero, e.rec.TopeFichero))
	}
	return args
}

// createTopologia monta un lab de red sin containerlab. Cada nodo es un contenedor sin red
// (--network none) que solo puede tocar la suya (NET_ADMIN), y cada enlace es un par veth que labd
// crea desde fuera y mete en los dos espacios de red. containerlab hacía lo mismo, pero arrancaba
// los nodos con --privileged, y root en un nodo era root en el servidor.
func (e *Engine) createTopologia(inst *Instance) error {
	t := inst.Spec.topo
	if t == nil {
		return fmt.Errorf("lab %s sin topología", inst.Spec.ID)
	}
	inst.Dir = filepath.Join(e.estado, "inst", inst.ID)
	if err := os.MkdirAll(inst.Dir, 0o755); err != nil {
		return err
	}
	for rel, c := range inst.Spec.Ficheros {
		p := filepath.Join(inst.Dir, rel)
		os.MkdirAll(filepath.Dir(p), 0o755)
		if err := os.WriteFile(p, []byte(c), 0o644); err != nil {
			return err
		}
	}
	nombres := make([]string, 0, len(t.Nodes))
	for n := range t.Nodes {
		nombres = append(nombres, n)
	}
	sort.Strings(nombres)
	for _, n := range nombres {
		nodo := t.Nodes[n]
		ctr := fmt.Sprintf("dl-%s-%s", inst.ID, n)
		args := []string{"run", "-d", "--name", ctr, "--hostname", n, "--network", "none",
			"--label", "relavops.inst=" + inst.ID, "--label", "relavops.lab=" + inst.Spec.ID,
			"--cap-add", "NET_ADMIN"}
		if e.conInit(nodo.Image) {
			args = append(args, "--init")
		}
		for _, c := range nodo.Caps {
			args = append(args, "--cap-add", c)
		}
		args = append(args, e.limites(nodo.Memoria, 1, 0)...)
		claves := make([]string, 0, len(nodo.Sysctls))
		for k := range nodo.Sysctls {
			claves = append(claves, k)
		}
		sort.Strings(claves)
		for _, k := range claves {
			args = append(args, "--sysctl", fmt.Sprintf("%s=%v", k, nodo.Sysctls[k]))
		}
		for _, bd := range nodo.Binds {
			de, a, _ := strings.Cut(bd, ":")
			args = append(args, "-v", filepath.Join(inst.Dir, de)+":"+a)
		}
		for k, v := range nodo.Env {
			args = append(args, "-e", k+"="+v)
		}
		args = append(args, nodo.Image)
		if _, err := run("docker", args...); err != nil {
			return err
		}
		inst.Nodos[n] = ctr
	}
	pids := map[string]string{}
	for n, ctr := range inst.Nodos {
		out, err := run("docker", "inspect", "-f", "{{.State.Pid}}", ctr)
		pid := strings.TrimSpace(out)
		if err != nil || pid == "" || pid == "0" {
			return fmt.Errorf("nodo %s no arranca: %v", n, err)
		}
		pids[n] = pid
	}
	for i, l := range t.Links {
		na, ia, _ := strings.Cut(l.Endpoints[0], ":")
		nb, ib, _ := strings.Cut(l.Endpoints[1], ":")
		mtu := l.MTU
		if mtu == 0 {
			mtu = 1500
		}
		// Se crea con nombres temporales en el espacio del servidor y luego cada punta pasa a su nodo
		// con su nombre de verdad. Los nombres de interfaz tienen 15 letras como mucho.
		ta, tb := fmt.Sprintf("v%s%da", inst.ID, i), fmt.Sprintf("v%s%db", inst.ID, i)
		if _, err := run("ip", "link", "add", ta, "mtu", fmt.Sprint(mtu), "type", "veth", "peer", "name", tb, "mtu", fmt.Sprint(mtu)); err != nil {
			return err
		}
		for _, p := range [][3]string{{ta, pids[na], ia}, {tb, pids[nb], ib}} {
			if _, err := run("ip", "link", "set", p[0], "netns", p[1]); err != nil {
				run("ip", "link", "del", ta)
				return err
			}
			if _, err := run("nsenter", "-t", p[1], "-n", "ip", "link", "set", p[0], "name", p[2], "up"); err != nil {
				return err
			}
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	for _, n := range nombres {
		for _, c := range t.Nodes[n].Exec {
			if out, code, err := e.dk.Run(ctx, inst.Nodos[n], "sh", "-c", c); err != nil || code != 0 {
				return fmt.Errorf("exec en %s (%s): código %d %v %s", n, c, code, err, out)
			}
		}
	}
	return nil
}

func (e *Engine) interfaces(ctx context.Context, ctr string) []Iface {
	out, code, err := e.dk.Run(ctx, ctr, "ip", "-j", "addr")
	if err != nil || code != 0 {
		return nil
	}
	var raw []struct {
		Ifname   string `json:"ifname"`
		Address  string `json:"address"`
		AddrInfo []struct {
			Family    string `json:"family"`
			Local     string `json:"local"`
			Prefixlen int    `json:"prefixlen"`
		} `json:"addr_info"`
	}
	if json.Unmarshal([]byte(out), &raw) != nil {
		return nil
	}
	var res []Iface
	for _, r := range raw {
		if r.Ifname == "lo" {
			continue
		}
		i := Iface{Nombre: r.Ifname, MAC: r.Address}
		for _, a := range r.AddrInfo {
			if a.Family == "inet" {
				i.IPs = append(i.IPs, fmt.Sprintf("%s/%d", a.Local, a.Prefixlen))
			}
		}
		res = append(res, i)
	}
	return res
}

func (e *Engine) destroy(inst *Instance) {
	// Las veth de las topologías se van solas: al borrar el contenedor desaparece su espacio de red.
	if inst.Dir != "" {
		defer os.RemoveAll(inst.Dir)
	}
	var names []string
	for _, c := range inst.Nodos {
		names = append(names, c)
	}
	if len(names) > 0 {
		run("docker", append([]string{"rm", "-f"}, names...)...)
	}
	if inst.Switch != "" {
		run("ip", "netns", "del", inst.Switch) // con él se va el switch. Los cables, con cada nodo
	}
}
