package main

// Métricas para el latido: el servidor entero (/proc) y lo que gasta cada lab (su cgroup).
// Leer ficheros de /proc y /sys/fs/cgroup cuesta microsegundos. docker stats tarda un segundo por
// contenedor, así que no se usa.

import (
	"bufio"
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

type FotoHost struct {
	CPUs       int       `json:"cpus"`
	CPUPct     float64   `json:"cpu_pct"`
	Carga      []float64 `json:"carga"`
	RAMTotalMB float64   `json:"ram_total_mb"`
	RAMUsadaMB float64   `json:"ram_usada_mb"`
	DiscoTotal float64   `json:"disco_total_gb"`
	DiscoUsado float64   `json:"disco_usado_gb"`
	LabdMB     float64   `json:"labd_mb"`
}

type Host struct {
	mu          sync.Mutex
	total, idle uint64
	disco       string
}

func NewHost(estado string) *Host {
	h := &Host{disco: "/"}
	for _, d := range []string{"/var/lib/docker", estado} {
		if st, err := os.Stat(d); err == nil && st.IsDir() {
			h.disco = d
			break
		}
	}
	h.Foto() // la primera lectura deja la base para calcular la CPU
	return h
}

func leerCPU() (total, idle uint64) {
	f, err := os.Open("/proc/stat")
	if err != nil {
		return
	}
	defer f.Close()
	s := bufio.NewScanner(f)
	if !s.Scan() {
		return
	}
	campos := strings.Fields(s.Text())
	for i, c := range campos[1:] {
		n, _ := strconv.ParseUint(c, 10, 64)
		if i == 7 { // steal sí cuenta como tiempo, guest ya va dentro de user
			total += n
			break
		}
		total += n
		if i == 3 || i == 4 { // idle e iowait
			idle += n
		}
	}
	return
}

// ramLibre da los bytes de RAM que quedan para abrir labs, o -1 si no se puede saber. Es lo que
// queda libre en el servidor o, si los labs van en un cgroup con tope, lo que le queda a ese cgroup.
// Se queda con el menor de los dos.
func ramLibre(cgroup string) int64 {
	libre := int64(-1)
	if b, err := os.ReadFile("/proc/meminfo"); err == nil {
		for _, l := range strings.Split(string(b), "\n") {
			if v, ok := strings.CutPrefix(l, "MemAvailable:"); ok {
				if kb, err := strconv.ParseInt(strings.TrimSuffix(strings.TrimSpace(v), " kB"), 10, 64); err == nil {
					libre = kb * 1024
				}
			}
		}
	}
	if cgroup != "" {
		leer := func(f string) (int64, bool) {
			b, err := os.ReadFile("/sys/fs/cgroup/" + cgroup + "/" + f)
			if err != nil {
				return 0, false
			}
			n, err := strconv.ParseInt(strings.TrimSpace(string(b)), 10, 64)
			return n, err == nil
		}
		if max, ok := leer("memory.max"); ok { // "max" (sin tope) no es un número y se salta
			if uso, ok := leer("memory.current"); ok {
				if q := max - uso; libre < 0 || q < libre {
					libre = q
				}
			}
		}
	}
	return libre
}

func (h *Host) Foto() FotoHost {
	f := FotoHost{CPUs: runtime.NumCPU()}
	t, i := leerCPU()
	h.mu.Lock()
	if dt := t - h.total; h.total > 0 && dt > 0 {
		f.CPUPct = float64(dt-(i-h.idle)) / float64(dt) * 100
	}
	h.total, h.idle = t, i
	h.mu.Unlock()
	if b, err := os.ReadFile("/proc/loadavg"); err == nil {
		for _, c := range strings.Fields(string(b))[:3] {
			v, _ := strconv.ParseFloat(c, 64)
			f.Carga = append(f.Carga, v)
		}
	}
	if b, err := os.ReadFile("/proc/meminfo"); err == nil {
		m := map[string]float64{}
		for _, l := range strings.Split(string(b), "\n") {
			k, v, ok := strings.Cut(l, ":")
			if ok {
				n, _ := strconv.ParseFloat(strings.TrimSuffix(strings.TrimSpace(v), " kB"), 64)
				m[k] = n
			}
		}
		f.RAMTotalMB = m["MemTotal"] / 1024
		f.RAMUsadaMB = (m["MemTotal"] - m["MemAvailable"]) / 1024
	}
	var st syscall.Statfs_t
	if syscall.Statfs(h.disco, &st) == nil {
		total := float64(st.Blocks) * float64(st.Bsize)
		libre := float64(st.Bavail) * float64(st.Bsize)
		f.DiscoTotal = total / (1 << 30)
		f.DiscoUsado = (total - libre) / (1 << 30)
	}
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)
	f.LabdMB = float64(ms.Sys) / (1 << 20)
	return f
}

// --- Consumo de cada sesión

// cgroupDe da la carpeta del cgroup de un contenedor, mirando el cgroup de su proceso principal.
// Vale para Docker con systemd (system.slice/docker-ID.scope), con cgroupfs (docker/ID) y para Sysbox.
func (a *App) cgroupDe(ctx context.Context, ctr string) string {
	var info struct{ State struct{ Pid int } }
	if a.dk.call(ctx, "GET", "/containers/"+ctr+"/json", nil, &info) != nil || info.State.Pid == 0 {
		return ""
	}
	b, err := os.ReadFile("/proc/" + strconv.Itoa(info.State.Pid) + "/cgroup")
	if err != nil {
		return ""
	}
	for _, l := range strings.Split(strings.TrimSpace(string(b)), "\n") {
		if ruta, ok := strings.CutPrefix(l, "0::"); ok {
			// Sysbox mete el init en un cgroup hijo (init.scope). Se sube hasta el del contenedor.
			d := filepath.Join("/sys/fs/cgroup", ruta)
			for strings.HasSuffix(d, "init.scope") || strings.HasSuffix(d, "/syscont-cgroup-root") {
				d = filepath.Dir(d)
			}
			if _, err := os.Stat(filepath.Join(d, "cpu.stat")); err == nil {
				return d
			}
		}
	}
	return ""
}

func leerUsoCgroup(dir string) (cpuUsec uint64, ramBytes uint64) {
	if b, err := os.ReadFile(filepath.Join(dir, "cpu.stat")); err == nil {
		for _, l := range strings.Split(string(b), "\n") {
			if v, ok := strings.CutPrefix(l, "usage_usec "); ok {
				cpuUsec, _ = strconv.ParseUint(strings.TrimSpace(v), 10, 64)
				break
			}
		}
	}
	if b, err := os.ReadFile(filepath.Join(dir, "memory.current")); err == nil {
		ramBytes, _ = strconv.ParseUint(strings.TrimSpace(string(b)), 10, 64)
	}
	return
}

// Consumo de una sesión. Se cuenta desde que se le dio al alumno, no lo que gastó calentándose en el pool.
type Consumo struct {
	mu       sync.Mutex
	dirs     map[string]string // contenedor -> cgroup
	base     uint64            // CPU acumulada al empezar, en µs
	previa   uint64
	tPrevia  time.Time
	CPUPct   float64 // de un núcleo, 100 es uno entero
	CPUSeg   float64 // segundos de CPU desde que es suya
	RAMMB    float64
	RAMMaxMB float64
}

// medir lee el cgroup de cada nodo de la sesión y actualiza su consumo.
func (a *App) medir(s *Session) {
	c := &s.consumo
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.dirs == nil {
		c.dirs = map[string]string{}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	var cpu, ram uint64
	for _, ctr := range s.Inst.Nodos {
		d, ok := c.dirs[ctr]
		if !ok {
			d = a.cgroupDe(ctx, ctr)
			c.dirs[ctr] = d
		}
		if d == "" {
			continue
		}
		u, m := leerUsoCgroup(d)
		cpu += u
		ram += m
	}
	ahora := time.Now()
	if c.tPrevia.IsZero() {
		c.base = cpu
	} else if dt := ahora.Sub(c.tPrevia).Seconds(); dt > 0 && cpu >= c.previa {
		c.CPUPct = float64(cpu-c.previa) / 1e6 / dt * 100
	}
	if cpu >= c.base {
		c.CPUSeg = float64(cpu-c.base) / 1e6
	}
	c.previa, c.tPrevia = cpu, ahora
	c.RAMMB = float64(ram) / (1 << 20)
	if c.RAMMB > c.RAMMaxMB {
		c.RAMMaxMB = c.RAMMB
	}
}
