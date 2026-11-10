package main

// Un lab es un fichero YAML: nodos o topología, misión con comprobaciones y fallos del boss.

import (
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strings"

	"gopkg.in/yaml.v3"
)

type LabSpec struct {
	ID         string              `yaml:"id" json:"id"`
	Titulo     string              `yaml:"titulo" json:"titulo"`
	Motor      string              `yaml:"motor" json:"motor"` // contenedor | sistema | topologia | microvm
	Pool       int                 `yaml:"pool" json:"pool"`
	Nodos      []NodoSpec          `yaml:"nodos" json:"nodos"`
	Topologia  map[string]any      `yaml:"topologia" json:"-"`
	Ficheros   map[string]string   `yaml:"ficheros" json:"-"`
	Terminales []string            `yaml:"terminales" json:"terminales"`
	Preparar   []Accion            `yaml:"preparar" json:"-"`
	Mision     []Paso              `yaml:"mision" json:"mision"`
	Boss       *Boss               `yaml:"boss" json:"boss,omitempty"`
	Captura    []CapturaSpec       `yaml:"captura" json:"-"`
	Acciones   map[string][]Accion `yaml:"acciones" json:"-"` // acciones con nombre que puede lanzar la interfaz
	// Juego: el director de juego (de momento en el navegador) puede ejecutar órdenes en los nodos.
	Juego bool `yaml:"juego" json:"juego"`
	// Red: si se define, todos los nodos sin "red: none" comparten una red aislada solo para esta
	// instancia (un switch propio, ver redPropia en pool.go), con la IP que diga cada nodo.
	Red *RedSpec `yaml:"red" json:"red,omitempty"`
	// Sondas: scripts cortos que labd ejecuta en cada ronda. Si su salida cambia, la manda a la
	// interfaz como evento "sonda". Así la lección ve lo que pasa en el lab (puertos, ficheros…).
	Sondas []Sonda `yaml:"sondas" json:"sondas"`

	topo *Topo // la topología ya leída (motor topologia)
}

// Topo es la topología de un lab de red, con la misma forma que la de containerlab: nodos y enlaces.
// labd la monta solo (pool.go), sin containerlab, para que ningún nodo corra con --privileged.
type Topo struct {
	Nodes map[string]TopoNodo `yaml:"nodes"`
	Links []TopoEnlace        `yaml:"links"`
}

type TopoNodo struct {
	Kind    string            `yaml:"kind"` // solo linux
	Image   string            `yaml:"image"`
	Exec    []string          `yaml:"exec"`    // órdenes tras unir los enlaces
	Sysctls map[string]any    `yaml:"sysctls"` // solo net.*, que son de su espacio de red
	Binds   []string          `yaml:"binds"`   // fichero-del-lab:ruta-en-el-nodo
	Memoria string            `yaml:"memoria"` // por defecto 256m
	Caps    []string          `yaml:"caps"`    // además de NET_ADMIN
	Env     map[string]string `yaml:"env"`
}

type TopoEnlace struct {
	Endpoints []string `yaml:"endpoints"` // "nodo:interfaz"
	MTU       int      `yaml:"mtu"`
}

// leerTopo comprueba la topología al cargar el lab, para que un error salga al arrancar y no al abrirlo.
func leerTopo(s *LabSpec) error {
	b, err := yaml.Marshal(s.Topologia)
	if err != nil {
		return err
	}
	var t Topo
	if err := yaml.Unmarshal(b, &t); err != nil {
		return err
	}
	if len(t.Nodes) == 0 {
		return fmt.Errorf("topología sin nodos")
	}
	for n, nodo := range t.Nodes {
		if !nombreValido(n) {
			return fmt.Errorf("nodo %q: nombre no válido", n)
		}
		if nodo.Kind != "" && nodo.Kind != "linux" {
			return fmt.Errorf("nodo %s: kind %q no soportado (solo linux)", n, nodo.Kind)
		}
		if nodo.Image == "" {
			return fmt.Errorf("nodo %s: sin imagen", n)
		}
		for k := range nodo.Sysctls {
			if !strings.HasPrefix(k, "net.") {
				return fmt.Errorf("nodo %s: sysctl %s no es de red", n, k)
			}
		}
		for _, bd := range nodo.Binds {
			de, _, ok := strings.Cut(bd, ":")
			if !ok || de == "" || strings.HasPrefix(de, "/") || strings.Contains(de, "..") {
				return fmt.Errorf("nodo %s: bind %q debe ser fichero-del-lab:ruta", n, bd)
			}
		}
	}
	for _, l := range t.Links {
		if len(l.Endpoints) != 2 {
			return fmt.Errorf("enlace %v: hacen falta dos extremos", l.Endpoints)
		}
		for _, e := range l.Endpoints {
			n, ifz, ok := strings.Cut(e, ":")
			if _, existe := t.Nodes[n]; !ok || !existe || !nombreValido(ifz) || len(ifz) > 15 {
				return fmt.Errorf("enlace %v: extremo %q no válido", l.Endpoints, e)
			}
		}
	}
	s.topo = &t
	return nil
}

func nombreValido(n string) bool {
	if n == "" || len(n) > 40 {
		return false
	}
	for _, c := range n {
		if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '-' || c == '_' || c == '.') {
			return false
		}
	}
	return true
}

type RedSpec struct {
	Subred string `yaml:"subred" json:"subred"`
}

type Sonda struct {
	ID     string `yaml:"id" json:"id"`
	Nodo   string `yaml:"nodo" json:"nodo"`
	Script string `yaml:"script" json:"-"`
}

type NodoSpec struct {
	Nombre  string            `yaml:"nombre" json:"nombre"`
	Rol     string            `yaml:"rol" json:"rol,omitempty"` // lo que la interfaz cuenta de la máquina
	IP      string            `yaml:"ip" json:"ip,omitempty"`   // IP fija dentro de la red del lab
	Imagen  string            `yaml:"imagen" json:"-"`
	Memoria string            `yaml:"memoria" json:"memoria,omitempty"`
	CPUs    float64           `yaml:"cpus" json:"cpus,omitempty"`
	PIDs    int               `yaml:"pids" json:"-"`
	Caps    []string          `yaml:"caps" json:"-"`  // capacidades extra, p. ej. NET_ADMIN para cambiar IPs
	Red     string            `yaml:"red" json:"-"`   // none | lab. Con red propia en el lab, lab por defecto
	Tmpfs   map[string]string `yaml:"tmpfs" json:"-"` // ruta -> tamaño (un "disco" pequeño que se llena de verdad)
}

type Paso struct {
	ID     string `yaml:"id" json:"id"`
	Titulo string `yaml:"titulo" json:"titulo"`
	Texto  string `yaml:"texto" json:"texto"`
	Pista  string `yaml:"pista" json:"pista,omitempty"`
	Nodo   string `yaml:"nodo" json:"nodo,omitempty"` // terminal sugerida
	XP     int    `yaml:"xp" json:"xp"`
	Check  Check  `yaml:"check" json:"-"`
}

type Check struct {
	Nodo   string `yaml:"nodo"`
	Script string `yaml:"script"`
}

type Boss struct {
	Titulo string  `yaml:"titulo" json:"titulo"`
	Texto  string  `yaml:"texto" json:"texto"`
	XP     int     `yaml:"xp" json:"xp"`
	Check  []Check `yaml:"check" json:"-"`
	Fallos []Fallo `yaml:"fallos" json:"-"`
}

type Fallo struct {
	ID       string   `yaml:"id"`
	Romper   []Accion `yaml:"romper"`
	Pistas   []Pista  `yaml:"pistas"`
	Solucion string   `yaml:"solucion"`
}

type Accion struct {
	Nodo   string `yaml:"nodo"`
	Script string `yaml:"script"`
}

type Pista struct {
	Texto string `yaml:"texto" json:"texto"`
	Coste int    `yaml:"coste" json:"coste"`
}

type CapturaSpec struct {
	Nodo     string `yaml:"nodo" json:"nodo"`
	Interfaz string `yaml:"interfaz" json:"interfaz"`
	Filtro   string `yaml:"filtro" json:"-"`
}

func loadLabs(fsys fs.FS) (map[string]*LabSpec, error) {
	labs := map[string]*LabSpec{}
	entries, err := fs.ReadDir(fsys, ".")
	if err != nil {
		return nil, err
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		b, err := fs.ReadFile(fsys, path.Join(e.Name(), "lab.yaml"))
		if err != nil {
			continue
		}
		var s LabSpec
		if err := yaml.Unmarshal(b, &s); err != nil {
			return nil, fmt.Errorf("%s: %w", e.Name(), err)
		}
		if s.ID == "" {
			s.ID = e.Name()
		}
		// Los ficheros que referencia la topología se leen del mismo directorio.
		if s.Ficheros == nil {
			s.Ficheros = map[string]string{}
		}
		fs.WalkDir(fsys, e.Name(), func(p string, d fs.DirEntry, err error) error {
			if err != nil || d.IsDir() || strings.HasSuffix(p, "lab.yaml") {
				return nil
			}
			c, _ := fs.ReadFile(fsys, p)
			s.Ficheros[strings.TrimPrefix(p, e.Name()+"/")] = string(c)
			return nil
		})
		if s.Motor == "topologia" {
			if err := leerTopo(&s); err != nil {
				return nil, fmt.Errorf("%s: %w", e.Name(), err)
			}
		}
		if len(s.Terminales) == 0 {
			for _, n := range s.Nodos {
				s.Terminales = append(s.Terminales, n.Nombre)
			}
		}
		labs[s.ID] = &s
	}
	return labs, nil
}

func sortedIDs(m map[string]*LabSpec) []string {
	ids := make([]string, 0, len(m))
	for k := range m {
		ids = append(ids, k)
	}
	sort.Strings(ids)
	return ids
}
