package main

// Latido: cada 10 s labd cuenta al Worker de cuentas cómo está este servidor (CPU, RAM, disco, labs
// calientes y las sesiones abiertas con lo que gasta cada una) y las sesiones que se han cerrado.
// El Worker lo guarda para el panel de admin y responde con las órdenes que el admin haya dejado
// para este servidor: cerrar una sesión o echar a un usuario.
//
// Solo con -cuentas y el secreto del nodo en RELAVOPS_NODO_SECRETO. Con varios servidores, cada uno
// lleva su -nodo y el panel los junta.

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
)

var version = "dev" // lo pone build.ps1 con la fecha

const cadaLatido = 10 * time.Second

type Terminada struct {
	ID       string  `json:"id"`
	Usuario  string  `json:"usuario"`
	Lab      string  `json:"lab"`
	Inicio   int64   `json:"inicio"`
	Fin      int64   `json:"fin"`
	CPUSeg   float64 `json:"cpu_s"`
	RAMMaxMB float64 `json:"ram_max_mb"`
	Pasos    int     `json:"pasos"`
	Motivo   string  `json:"motivo"`
}

type SesionFoto struct {
	ID         string  `json:"id"`
	Usuario    string  `json:"usuario"`
	Nombre     string  `json:"nombre"`
	Lab        string  `json:"lab"`
	Creada     int64   `json:"creada"`
	CPUPct     float64 `json:"cpu_pct"`
	RAMMB      float64 `json:"ram_mb"`
	Pasos      int     `json:"pasos"`
	TotalPasos int     `json:"total_pasos"`
	Conectada  bool    `json:"conectada"`
}

// Cerradas guarda las sesiones cerradas hasta que salen en un latido.
type Cerradas struct {
	mu    sync.Mutex
	lista []Terminada
}

func (c *Cerradas) Apuntar(t Terminada) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.lista) >= 2000 { // si el Worker no contesta en mucho rato, se pierden las más viejas
		c.lista = c.lista[1:]
	}
	c.lista = append(c.lista, t)
}

func (c *Cerradas) Sacar() []Terminada {
	c.mu.Lock()
	defer c.mu.Unlock()
	l := c.lista
	c.lista = nil
	return l
}

func (c *Cerradas) Devolver(l []Terminada) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.lista = append(l, c.lista...)
}

type Latidor struct {
	a       *App
	url     string
	secreto string
	nodo    string
	limites map[string]int
	hc      *http.Client
	fallos  int
}

func (a *App) fotoSesiones() []SesionFoto {
	a.sessions.mu.Lock()
	lista := make([]*Session, 0, len(a.sessions.m))
	for _, s := range a.sessions.m {
		lista = append(lista, s)
	}
	a.sessions.mu.Unlock()
	fotos := make([]SesionFoto, 0, len(lista))
	for _, s := range lista {
		a.medir(s)
		s.consumo.mu.Lock()
		cpu, ram := s.consumo.CPUPct, s.consumo.RAMMB
		s.consumo.mu.Unlock()
		s.mu.Lock()
		fotos = append(fotos, SesionFoto{
			ID: s.ID, Usuario: s.Usuario, Nombre: s.Nombre, Lab: s.Spec.ID, Creada: s.Creada.UnixMilli(),
			CPUPct: cpu, RAMMB: ram, Pasos: len(s.hechos), TotalPasos: len(s.Spec.Mision), Conectada: len(s.subs) > 0 || s.terms > 0,
		})
		s.mu.Unlock()
	}
	return fotos
}

func (l *Latidor) bucle() {
	for range time.Tick(cadaLatido) {
		l.latir()
	}
}

func (l *Latidor) latir() {
	pools := map[string]int{}
	for id, p := range l.a.eng.pools {
		pools[id] = len(p.ready)
	}
	terminadas := l.a.cerradas.Sacar()
	cuerpo, _ := json.Marshal(map[string]any{
		"nodo": l.nodo, "version": version, "arranque": l.a.inicio.UnixMilli(),
		"host": l.a.host.Foto(), "pools": pools, "limites": l.limites,
		"sesiones": l.a.fotoSesiones(), "terminadas": terminadas,
	})
	req, _ := http.NewRequest("POST", l.url+"/api/nodos/latido", bytes.NewReader(cuerpo))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+l.secreto)
	req.Header.Set("X-Relavops-Proxy", "1")
	resp, err := l.hc.Do(req)
	if err != nil || resp.StatusCode != 200 {
		l.a.cerradas.Devolver(terminadas)
		l.fallos++
		if l.fallos == 1 || l.fallos%30 == 0 { // que no llene el registro si el Worker está caído un rato
			estado := ""
			if resp != nil {
				estado = resp.Status
			}
			log.Printf("latido: %v %s", err, estado)
		}
		if resp != nil {
			resp.Body.Close()
		}
		return
	}
	defer resp.Body.Close()
	if l.fallos > 0 {
		log.Printf("latido: el Worker vuelve a responder")
		l.fallos = 0
	}
	var r struct {
		Ordenes []struct {
			Tipo    string `json:"tipo"`
			Sesion  string `json:"sesion"`
			Usuario string `json:"usuario"`
			Desde   int64  `json:"desde"`
		} `json:"ordenes"`
	}
	if json.NewDecoder(resp.Body).Decode(&r) != nil {
		return
	}
	for _, o := range r.Ordenes {
		switch o.Tipo {
		case "cerrar":
			log.Printf("orden del admin: cerrar la sesión %s", o.Sesion)
			go l.a.sessions.cerrarCon(o.Sesion, "admin")
		case "expulsar":
			log.Printf("orden del admin: echar a %s", o.Usuario)
			if l.a.cuentas != nil {
				l.a.cuentas.Echar(o.Usuario)
			}
			for _, id := range l.a.sessions.DeUsuario(o.Usuario) {
				go l.a.sessions.cerrarCon(id, "expulsado")
			}
		case "renovar": // le han cambiado el rol: que pida un pase nuevo, sin cerrarle nada
			log.Printf("orden del admin: pase nuevo para %s", o.Usuario)
			if l.a.cuentas != nil {
				l.a.cuentas.Renovar(o.Usuario, o.Desde)
			}
		}
	}
}
