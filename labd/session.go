package main

// Sesión de un alumno: su lab, su progreso, sus comprobaciones y el boss.

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"math/rand/v2"
	"sync"
	"time"
)

type Session struct {
	ID       string
	Inst     *Instance
	Spec     *LabSpec
	pool     *Pool
	eng      *Engine
	Asignada time.Duration // lo que tardó en dársele un lab
	DePool   bool
	Dueno    string // quién la abrió (su usuario, o su IP sin cuentas), para el límite por persona
	Usuario  string // id de la cuenta (vacío sin cuentas)
	Nombre   string // nombre de la cuenta, para el panel de admin
	Creada   time.Time
	consumo  Consumo // CPU y RAM de sus nodos (metricas.go)

	mu       sync.Mutex
	hechos   map[string]int64 // paso -> ms que tardó la comprobación
	xp       int
	boss     *bossState
	subs     map[chan []byte]struct{}
	terms    int
	lastSeen time.Time
	trigger  chan struct{} // ronda dentro de 150 ms (tras un Enter)
	ahora    chan struct{} // ronda ya (ha vuelto el prompt)
	vigias   map[string]*nodoVigia
	ctx      context.Context
	cancel   context.CancelFunc
	captura  bool
	ptys     map[string]*Pty   // shell viva de cada nodo (sobrevive a cerrar la pestaña)
	sondas   map[string]string // último valor de cada sonda
	avisada  bool              // ya se le dijo que se acaba
	bossXP   bool              // ya cobró el XP del boss (repetirlo no suma más)
}

type bossState struct {
	fallo  *Fallo
	inicio time.Time
	pistas int
	hecho  bool
	dur    time.Duration
}

// Limites de las sesiones. Un cero es sin límite. En local no hay ninguno, en el VPS sí (ver vps.sh).
type Limites struct {
	Total      int           // sesiones abiertas a la vez en todo el servidor
	PorPersona int           // por dueño. Al pasarse se cierra su sesión más antigua
	Duracion   time.Duration // vida máxima de una sesión. Se avisa 5 minutos antes
	Abandono   time.Duration // sin pestañas ni terminales conectadas durante esto, se cierra
}

var errLleno = errors.New("lleno")

// Ritmo limita cuántas sesiones nuevas abre cada persona por minuto. Reutilizar la suya no cuenta.
// Frena a quien entra y sale sin parar para que el servidor cree y destruya labs en bucle.
type Ritmo struct {
	mu  sync.Mutex
	max int
	m   map[string][]time.Time
}

func NewRitmo(max int) *Ritmo { return &Ritmo{max: max, m: map[string][]time.Time{}} }

func (r *Ritmo) Permite(quien string) bool {
	if r.max <= 0 {
		return true
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	ahora := time.Now()
	limpia := func(ts []time.Time) []time.Time {
		n := 0
		for _, t := range ts {
			if ahora.Sub(t) < time.Minute {
				ts[n] = t
				n++
			}
		}
		return ts[:n]
	}
	if len(r.m) > 5000 { // que no crezca sin fin con muchas IPs distintas
		for k, ts := range r.m {
			if ts = limpia(ts); len(ts) == 0 {
				delete(r.m, k)
			} else {
				r.m[k] = ts
			}
		}
	}
	ts := limpia(r.m[quien])
	if len(ts) >= r.max {
		r.m[quien] = ts
		return false
	}
	r.m[quien] = append(ts, ahora)
	return true
}

type Sessions struct {
	mu       sync.Mutex
	m        map[string]*Session
	lim      Limites
	reservas int // sesiones que se están creando ahora mismo, para no pasarse del total
	cerradas *Cerradas
	medir    func(*Session) // lee lo que ha gastado (lo pone main con App.medir)
}

func NewSessions(lim Limites, cerradas *Cerradas) *Sessions {
	if lim.Abandono == 0 {
		lim.Abandono = 20 * time.Minute
	}
	s := &Sessions{m: map[string]*Session{}, lim: lim, cerradas: cerradas}
	go s.reaper()
	return s
}

// DeUsuario da las sesiones abiertas de una cuenta.
func (ss *Sessions) DeUsuario(usuario string) []string {
	ss.mu.Lock()
	defer ss.mu.Unlock()
	var ids []string
	for id, s := range ss.m {
		if usuario != "" && s.Usuario == usuario {
			ids = append(ids, id)
		}
	}
	return ids
}

func (ss *Sessions) Get(id string) *Session {
	ss.mu.Lock()
	defer ss.mu.Unlock()
	return ss.m[id]
}

// New da una sesión de lab. dueno es a quién cuenta el límite por persona: la cuenta si la hay, o la IP.
func (ss *Sessions) New(eng *Engine, p *Pool, dueno, usuario, nombre string) (*Session, error) {
	t0 := time.Now()
	ss.mu.Lock()
	if ss.lim.Total > 0 && len(ss.m)+ss.reservas >= ss.lim.Total {
		ss.mu.Unlock()
		return nil, errLleno
	}
	var vieja *Session
	if ss.lim.PorPersona > 0 {
		n := 0
		for _, o := range ss.m {
			if o.Dueno == dueno {
				n++
				if vieja == nil || o.Creada.Before(vieja.Creada) {
					vieja = o
				}
			}
		}
		if n < ss.lim.PorPersona {
			vieja = nil
		}
	}
	ss.reservas++
	ss.mu.Unlock()
	defer func() {
		ss.mu.Lock()
		ss.reservas--
		ss.mu.Unlock()
	}()
	if vieja != nil {
		log.Printf("sesión %s de %s cerrada: ha abierto una más de %d", vieja.ID, dueno, ss.lim.PorPersona)
		ss.cerrarCon(vieja.ID, "otra")
	}

	inst, dePool, err := p.Acquire()
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithCancel(context.Background())
	s := &Session{
		ID: randID(12), Inst: inst, Spec: p.spec, pool: p, eng: eng,
		Asignada: time.Since(t0), DePool: dePool, Dueno: dueno, Usuario: usuario, Nombre: nombre, Creada: time.Now(),
		hechos: map[string]int64{}, subs: map[chan []byte]struct{}{}, sondas: map[string]string{},
		lastSeen: time.Now(), trigger: make(chan struct{}, 1), ahora: make(chan struct{}, 1), vigias: map[string]*nodoVigia{}, ctx: ctx, cancel: cancel,
	}
	go s.checker()
	if ss.medir != nil {
		go ss.medir(s) // la primera lectura marca desde dónde se cuenta lo que gasta
	}
	ss.mu.Lock()
	ss.m[s.ID] = s
	ss.mu.Unlock()
	return s, nil
}

// Close la cierra porque el alumno lo ha pedido.
func (ss *Sessions) Close(id string) { ss.cerrar(id, "cerrada") }

func (ss *Sessions) cerrar(id, motivo string) {
	ss.mu.Lock()
	s := ss.m[id]
	delete(ss.m, id)
	ss.mu.Unlock()
	if s == nil {
		return
	}
	if ss.medir != nil {
		ss.medir(s) // la última lectura, antes de borrar los contenedores
	}
	s.cancel()
	s.pool.Release(s.Inst)
	if ss.cerradas != nil {
		s.consumo.mu.Lock()
		cpu, ram := s.consumo.CPUSeg, s.consumo.RAMMaxMB
		s.consumo.mu.Unlock()
		s.mu.Lock()
		pasos := len(s.hechos)
		s.mu.Unlock()
		ss.cerradas.Apuntar(Terminada{ID: s.ID, Usuario: s.Usuario, Lab: s.Spec.ID, Inicio: s.Creada.UnixMilli(), Fin: time.Now().UnixMilli(),
			CPUSeg: cpu, RAMMaxMB: ram, Pasos: pasos, Motivo: motivo})
	}
}

// cerrarCon avisa a la lección de por qué se cierra (otra, tiempo, abandono, admin o expulsado) y luego la cierra.
func (ss *Sessions) cerrarCon(id, motivo string) {
	if s := ss.Get(id); s != nil {
		s.Broadcast(map[string]any{"t": "cerrada", "motivo": motivo})
		time.Sleep(100 * time.Millisecond) // que el evento salga antes de cortar
	}
	ss.cerrar(id, motivo)
}

// reaper cierra las sesiones abandonadas y las que pasan de su duración máxima.
func (ss *Sessions) reaper() {
	for range time.Tick(15 * time.Second) {
		type cierre struct{ id, motivo string }
		var cierres []cierre
		var avisar []*Session
		ss.mu.Lock()
		for id, s := range ss.m {
			s.mu.Lock()
			vida := time.Since(s.Creada)
			switch {
			case len(s.subs) == 0 && s.terms == 0 && time.Since(s.lastSeen) > ss.lim.Abandono:
				cierres = append(cierres, cierre{id, "abandono"})
			case ss.lim.Duracion > 0 && vida >= ss.lim.Duracion:
				cierres = append(cierres, cierre{id, "tiempo"})
			case ss.lim.Duracion > 0 && vida >= ss.lim.Duracion-5*time.Minute && !s.avisada:
				s.avisada = true
				avisar = append(avisar, s)
			}
			s.mu.Unlock()
		}
		ss.mu.Unlock()
		for _, s := range avisar {
			s.Broadcast(map[string]any{"t": "aviso", "fin": s.Creada.Add(ss.lim.Duracion).UnixMilli()})
		}
		for _, c := range cierres {
			log.Printf("sesión %s cerrada por %s", c.id, c.motivo)
			ss.cerrarCon(c.id, c.motivo)
		}
	}
}

func (s *Session) touch() {
	s.mu.Lock()
	s.lastSeen = time.Now()
	s.mu.Unlock()
}

// Trigger pide una ronda de comprobaciones (se llama al pulsar Enter en una terminal).
func (s *Session) Trigger() {
	select {
	case s.trigger <- struct{}{}:
	default:
	}
}

// Ahora pide una ronda sin esperar. La pide la shell al volver al prompt (ver pty.go).
func (s *Session) Ahora() {
	select {
	case s.ahora <- struct{}{}:
	default:
	}
}

func (s *Session) Subscribe() chan []byte {
	ch := make(chan []byte, 256)
	s.mu.Lock()
	s.subs[ch] = struct{}{}
	s.mu.Unlock()
	return ch
}

func (s *Session) Unsubscribe(ch chan []byte) {
	s.mu.Lock()
	delete(s.subs, ch)
	s.lastSeen = time.Now()
	s.mu.Unlock()
}

func (s *Session) Broadcast(ev map[string]any) {
	b, _ := json.Marshal(ev)
	s.mu.Lock()
	defer s.mu.Unlock()
	for ch := range s.subs {
		select {
		case ch <- b:
		default: // cliente lento: se pierde el evento, no bloquea a nadie
		}
	}
}

func (s *Session) Info() map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()
	return map[string]any{
		"sesion":      s.ID,
		"lab":         s.Spec,
		"instancia":   s.Inst.ID,
		"asignada_ms": s.Asignada.Milliseconds(),
		"creada_ms":   s.Inst.CreadaEn.Milliseconds(),
		"de_pool":     s.DePool,
		"interfaces":  s.Inst.Interfaces,
		"progreso":    s.progresoLocked(),
		"sondas":      copia(s.sondas),
		"creada_unix": s.Creada.UnixMilli(),
	}
}

func (s *Session) progresoLocked() map[string]any {
	// Una copia: el mapa se pasa a JSON fuera del candado, y si a la vez una ronda apunta un paso,
	// Go para el proceso entero ("concurrent map iteration and map write") y se caen todos los labs.
	hechos := make(map[string]int64, len(s.hechos))
	for k, v := range s.hechos {
		hechos[k] = v
	}
	p := map[string]any{"hechos": hechos, "xp": s.xp}
	if b := s.boss; b != nil {
		var pistas []Pista
		for i := 0; i < b.pistas && i < len(b.fallo.Pistas); i++ {
			pistas = append(pistas, b.fallo.Pistas[i])
		}
		p["boss"] = map[string]any{
			"activo": !b.hecho, "hecho": b.hecho, "pistas": pistas,
			"quedan_pistas": len(b.fallo.Pistas) - b.pistas,
			"segundos":      b.dur.Seconds(),
		}
	}
	return p
}

// checker: cuando vuelve el prompt, tras cada Enter (con un pequeño margen) y cada 1 o 2 s,
// comprueba el estado real del lab. Las sondas van en cada ronda. Los pasos solo cambian cuando el
// alumno hace algo, y eso ya dispara una ronda, así que en las rondas del reloj van cada 3 s.
func (s *Session) checker() {
	cada := 2 * time.Second
	if len(s.Spec.Sondas) > 0 {
		cada = time.Second // con sondas, la lección se siente en vivo
	}
	tick := time.NewTicker(cada)
	defer tick.Stop()
	var diferida <-chan time.Time
	var ultimaCompleta time.Time
	completa := func() {
		ultimaCompleta = time.Now()
		s.ronda(true)
	}
	for {
		select {
		case <-s.ctx.Done():
			return
		case <-s.trigger:
			if diferida == nil {
				diferida = time.After(150 * time.Millisecond) // deja que el comando termine
			}
		case <-diferida:
			diferida = nil
			completa()
		case <-s.ahora:
			diferida = nil // el comando ya terminó: esta ronda vale por la del Enter
			completa()
		case <-tick.C:
			s.mu.Lock()
			activo := len(s.subs) > 0
			s.mu.Unlock()
			if !activo {
				continue
			}
			if time.Since(ultimaCompleta) >= 3*time.Second {
				completa()
			} else if len(s.Spec.Sondas) > 0 {
				s.ronda(false)
			}
		}
	}
}

// ronda ejecuta las sondas y, si es completa, las comprobaciones de los pasos pendientes y las del boss.
// Todo lo de un nodo va en una sola petición a su vigía, y un script repetido corre una vez.
func (s *Session) ronda(completa bool) {
	s.mu.Lock()
	var pendientes []Paso
	for _, p := range s.Spec.Mision {
		if _, ok := s.hechos[p.ID]; !ok {
			pendientes = append(pendientes, p)
		}
	}
	boss := s.boss
	s.mu.Unlock()
	bossActivo := completa && boss != nil && !boss.hecho && s.Spec.Boss != nil
	if !completa {
		pendientes = nil
	}

	type clave struct{ nodo, script string }
	porNodo := map[string][]string{}
	visto := map[clave]bool{}
	pedir := func(nodo, script string) {
		if k := (clave{nodo, script}); !visto[k] {
			visto[k] = true
			porNodo[nodo] = append(porNodo[nodo], script)
		}
	}
	for _, so := range s.Spec.Sondas {
		pedir(so.Nodo, so.Script)
	}
	for _, p := range pendientes {
		pedir(p.Check.Nodo, p.Check.Script)
	}
	if bossActivo {
		for _, c := range s.Spec.Boss.Check {
			pedir(c.Nodo, c.Script)
		}
	}

	t0 := time.Now()
	res := map[clave]*resultado{}
	var mu sync.Mutex
	var wg sync.WaitGroup
	for nodo, scripts := range porNodo {
		nv := s.vigias[nodo]
		if nv == nil {
			nv = &nodoVigia{}
			s.vigias[nodo] = nv
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			r := s.ejecutar(nodo, nv, scripts)
			mu.Lock()
			for i, sc := range scripts {
				res[clave{nodo, sc}] = r[i]
			}
			mu.Unlock()
		}()
	}
	wg.Wait()
	ms := time.Since(t0).Milliseconds()
	if s.ctx.Err() != nil {
		return
	}

	for _, so := range s.Spec.Sondas {
		r := res[clave{so.Nodo, so.Script}]
		if r == nil {
			continue
		}
		out := r.out
		if len(out) > 8000 {
			out = out[:8000]
		}
		s.mu.Lock()
		viejo, habia := s.sondas[so.ID]
		s.sondas[so.ID] = out
		s.mu.Unlock()
		if !habia || viejo != out {
			s.Broadcast(map[string]any{"t": "sonda", "id": so.ID, "v": out})
		}
	}
	for _, p := range pendientes {
		if r := res[clave{p.Check.Nodo, p.Check.Script}]; r == nil || r.code != 0 {
			continue
		}
		s.mu.Lock()
		if _, ya := s.hechos[p.ID]; ya {
			s.mu.Unlock()
			continue
		}
		s.hechos[p.ID] = ms
		s.xp += p.XP
		total := s.xp
		s.mu.Unlock()
		s.Broadcast(map[string]any{"t": "paso", "id": p.ID, "xp": p.XP, "total": total, "ms": ms})
	}
	if bossActivo {
		for _, c := range s.Spec.Boss.Check {
			if r := res[clave{c.Nodo, c.Script}]; r == nil || r.code != 0 {
				return
			}
		}
		s.mu.Lock()
		if boss.hecho {
			s.mu.Unlock()
			return
		}
		boss.hecho = true
		boss.dur = time.Since(boss.inicio)
		xp := 0
		if !s.bossXP { // repetir el boss se puede, pero el XP solo se cobra la primera vez
			s.bossXP = true
			xp = s.Spec.Boss.XP
		}
		s.xp += xp
		total := s.xp
		s.mu.Unlock()
		s.Broadcast(map[string]any{"t": "boss", "hecho": true, "xp": xp, "total": total,
			"segundos": boss.dur.Seconds(), "ms": ms, "solucion": boss.fallo.Solucion})
	}
}

// StartBoss rompe el lab con uno de los fallos posibles (al azar, o el pedido).
func (s *Session) StartBoss(falloID string) error {
	b := s.Spec.Boss
	if b == nil || len(b.Fallos) == 0 {
		return errNoBoss
	}
	f := &b.Fallos[rand.IntN(len(b.Fallos))]
	for i := range b.Fallos {
		if b.Fallos[i].ID == falloID {
			f = &b.Fallos[i]
		}
	}
	ctx, cancel := context.WithTimeout(s.ctx, 20*time.Second)
	defer cancel()
	for _, a := range f.Romper {
		if _, _, err := s.eng.dk.Run(ctx, s.Inst.Nodos[a.Nodo], "sh", "-c", a.Script); err != nil {
			return err
		}
	}
	s.mu.Lock()
	s.boss = &bossState{fallo: f, inicio: time.Now()}
	s.mu.Unlock()
	s.Broadcast(map[string]any{"t": "boss", "activo": true})
	return nil
}

func (s *Session) Pista() (*Pista, int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	b := s.boss
	if b == nil || b.hecho || b.pistas >= len(b.fallo.Pistas) {
		return nil, s.xp, errNoPista // con el boss vencido ya no hay pistas que pagar
	}
	p := b.fallo.Pistas[b.pistas]
	b.pistas++
	s.xp -= p.Coste
	if s.xp < 0 {
		s.xp = 0
	}
	return &p, s.xp, nil
}

func copia(m map[string]string) map[string]string {
	c := make(map[string]string, len(m))
	for k, v := range m {
		c[k] = v
	}
	return c
}
