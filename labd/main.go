package main

// labd: un solo binario con la web, la API, el orquestador de labs y la pasarela de terminal.

import (
	"context"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

//go:embed all:webdist
var webEmbed embed.FS

//go:embed all:labsdist
var labsEmbed embed.FS

var (
	errNoBoss  = errors.New("este lab no tiene boss")
	errNoPista = errors.New("no quedan pistas")
)

type App struct {
	dk       *Docker
	eng      *Engine
	sessions *Sessions
	ritmo    *Ritmo
	labs     map[string]*LabSpec
	inicio   time.Time
	cuentas  *Cuentas // nil sin -cuentas: no se pide entrar
	host     *Host
	cerradas *Cerradas
}

func main() {
	addr := flag.String("addr", ":8080", "dirección de escucha")
	sock := flag.String("docker", "/var/run/docker.sock", "socket de Docker")
	estado := flag.String("estado", "/var/lib/relavops", "directorio de estado")
	cuentasURL := flag.String("cuentas", "", "URL del Worker de cuentas, p. ej. https://relavops-cuentas.ferndohm99emf.workers.dev (vacío: sin cuentas, no se pide entrar)")
	nodo := flag.String("nodo", "", "nombre de este servidor en el panel de admin (vacío: el nombre de la máquina)")
	webDir := flag.String("web", "", "servir la web desde este directorio (desarrollo)")
	labsDir := flag.String("labs", "", "leer los labs de este directorio (desarrollo)")
	sinPool := flag.Bool("sin-pool", false, "no precalentar labs")
	inicio := flag.String("inicio", "", "sin cuentas, página a la que lleva la raíz /, p. ej. /curso (vacío: el muestrario). Con cuentas no se usa: la raíz es la portada")
	nuevasMin := flag.Int("max-nuevas-min", 0, "sesiones nuevas por persona y minuto (0: sin límite)")
	var rec Recursos
	flag.StringVar(&rec.CgroupPadre, "cgroup-labs", "", "cgroup común de todos los labs, p. ej. relavops-labs.slice (vacío: el de Docker)")
	var discoLab, discoLibre int64
	flag.Func("tope-fichero", "tamaño máximo de un fichero dentro de un lab, p. ej. 2G (vacío: sin tope)", func(v string) (err error) { rec.TopeFichero, err = tamano(v); return })
	flag.Func("disco-lab", "disco que puede ocupar un lab abierto; al pasarse se cierra, p. ej. 2G (vacío: sin tope)", func(v string) (err error) { discoLab, err = tamano(v); return })
	flag.Func("disco-libre", "si el disco de Docker baja de esto, se cierra el lab que más ocupa, p. ej. 3G (vacío: no se mira)", func(v string) (err error) { discoLibre, err = tamano(v); return })
	var lim Limites
	flag.IntVar(&lim.Total, "max-sesiones", 0, "sesiones abiertas a la vez en todo el servidor (0: sin límite)")
	flag.IntVar(&lim.PorPersona, "max-por-persona", 0, "sesiones por persona; al pasarse se cierra la más antigua (0: sin límite)")
	flag.DurationVar(&lim.Duracion, "dura-sesion", 0, "vida máxima de una sesión, p. ej. 2h (0: sin límite)")
	flag.DurationVar(&lim.Abandono, "abandono", 20*time.Minute, "cerrar las sesiones sin nadie conectado tras este tiempo")
	flag.DurationVar(&lim.Desalojo, "desalojo", 0, "con el servidor lleno, una sesión sin nadie conectado durante esto deja su sitio, p. ej. 2m (0: no se desaloja)")
	flag.Func("ram-libre-min", "con menos RAM libre que esto no se abren sesiones nuevas, p. ej. 700M (vacío: no se mira)", func(v string) (err error) { lim.RAMLibreMin, err = tamano(v); return })
	flag.Parse()

	var labsFS fs.FS
	if *labsDir != "" {
		labsFS = os.DirFS(*labsDir)
	} else {
		labsFS, _ = fs.Sub(labsEmbed, "labsdist")
	}
	labs, err := loadLabs(labsFS)
	if err != nil {
		log.Fatal(err)
	}
	if *sinPool {
		for _, l := range labs {
			l.Pool = 0
		}
	}
	dk := NewDocker(*sock)
	cerradas := &Cerradas{}
	lim.Cgroup = rec.CgroupPadre
	a := &App{dk: dk, labs: labs, sessions: NewSessions(lim, cerradas), ritmo: NewRitmo(*nuevasMin), inicio: time.Now(), cerradas: cerradas}
	a.sessions.medir = a.medir
	a.host = NewHost(*estado)
	a.eng = NewEngine(dk, *estado, labs, 2, rec)
	go a.vigilarDisco(a.host.disco, discoLab, discoLibre)
	if *cuentasURL != "" {
		if a.cuentas, err = NewCuentas(*cuentasURL, os.Getenv("RELAVOPS_NODO_SECRETO")); err != nil {
			log.Fatal(err)
		}
		log.Printf("cuentas en %s: hay que entrar para usar la web", *cuentasURL)
		// El secreto va por variable de entorno, no por opción, para que no salga en ps.
		if secreto := os.Getenv("RELAVOPS_NODO_SECRETO"); secreto != "" {
			if *nodo == "" {
				h, _ := os.Hostname()
				*nodo = nombreNodo(h)
			}
			l := &Latidor{a: a, url: strings.TrimRight(*cuentasURL, "/"), secreto: secreto, nodo: *nodo, hc: &http.Client{Timeout: 8 * time.Second},
				limites: map[string]int{"total": lim.Total, "por_persona": lim.PorPersona, "dura_min": int(lim.Duracion.Minutes())}}
			go l.bucle()
			log.Printf("latido cada %v como nodo %q", cadaLatido, *nodo)
		} else {
			log.Printf("sin RELAVOPS_NODO_SECRETO: este servidor no sale en el panel de admin")
		}
	}
	log.Printf("labd: %d labs (%s)", len(labs), strings.Join(sortedIDs(labs), ", "))

	var webFS fs.FS
	if *webDir != "" {
		webFS = os.DirFS(*webDir)
	} else {
		webFS, _ = fs.Sub(webEmbed, "webdist")
	}
	// Ficheros generados en la propia máquina (p. ej. el resultado del instalador) por encima de la web.
	webFS = capas{os.DirFS(filepath.Join(*estado, "publico")), webFS}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/labs", a.handleLabs)
	mux.HandleFunc("POST /api/labs/{id}/sesion", a.handleNuevaSesion)
	mux.HandleFunc("GET /api/sesion/{sid}", a.handleSesion)
	mux.HandleFunc("DELETE /api/sesion/{sid}", a.handleCerrar)
	mux.HandleFunc("POST /api/sesion/{sid}/boss", a.handleBoss)
	mux.HandleFunc("POST /api/sesion/{sid}/pista", a.handlePista)
	mux.HandleFunc("POST /api/sesion/{sid}/captura", a.handleCaptura)
	mux.HandleFunc("POST /api/sesion/{sid}/accion/{nombre}", a.handleAccion)
	mux.HandleFunc("POST /api/sesion/{sid}/exec", a.handleExec)
	mux.HandleFunc("GET /api/estado", a.handleEstado)
	mux.HandleFunc("GET /api/aforo", a.handleAforo)
	mux.HandleFunc("GET /ws/term", a.handleTerm)
	mux.HandleFunc("GET /ws/eventos", a.handleEventos)
	mux.Handle("/", a.web(webFS, *inicio))
	log.Printf("escuchando en %s", *addr)
	var h http.Handler = mux
	if a.cuentas != nil {
		h = a.cuentas.Proteger(mux)
	}
	log.Fatal(http.ListenAndServe(*addr, seguridad(h)))
}

// seguridad pone las cabeceras que piden los navegadores para no dejar meter la web dentro de otra
// (para engañar con clics), no adivinar tipos de fichero y no contar a otras webs de qué página vienes.
// HSTS solo si la petición llegó por HTTPS a Caddy: en local no hay HTTPS.
func seguridad(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c := w.Header()
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "SAMEORIGIN")
		c.Set("Content-Security-Policy", "frame-ancestors 'self'; base-uri 'self'; object-src 'none'")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		if r.Header.Get("X-Forwarded-Proto") == "https" && desdeLocal(r) {
			c.Set("Strict-Transport-Security", "max-age=15552000")
		}
		h.ServeHTTP(w, r)
	})
}

// web sirve las páginas y los ficheros de la web. inicio es la página a la que lleva la raíz sin cuentas.
func (a *App) web(webFS fs.FS, inicio string) http.Handler {
	static := conGzip(http.FileServerFS(webFS))
	etiqueta := etiquetas(webFS)
	existe := existeEn(webFS)
	if a.cuentas != nil {
		a.cuentas.existe = existe
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/assets/") || strings.HasPrefix(r.URL.Path, "/voces/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			// Las páginas se revalidan siempre (304 si no han cambiado). Sin esto, el navegador
			// se quedaba horas con una versión vieja de la lección.
			w.Header().Set("Cache-Control", "no-cache")
		}
		// Direcciones limpias: /curso sirve curso.html. Las de antes con .html redirigen a la limpia,
		// así los enlaces viejos siguen valiendo y en la barra nunca se ve el .html.
		p := r.URL.Path
		if limpia, ok := sinHTML(p); ok {
			if r.URL.RawQuery != "" {
				limpia += "?" + r.URL.RawQuery
			}
			http.Redirect(w, r, limpia, http.StatusMovedPermanently)
			return
		}
		// /blog/ es /blog. Así no sale nunca el listado de una carpeta y cada página tiene una sola dirección.
		if p != "/" && strings.HasSuffix(p, "/") {
			limpia := strings.TrimRight(p, "/")
			if limpia == "" || !existe(limpia) {
				no404(w, webFS)
				return
			}
			if r.URL.RawQuery != "" {
				limpia += "?" + r.URL.RawQuery
			}
			http.Redirect(w, r, limpia, http.StatusMovedPermanently)
			return
		}
		if !existe(p) {
			no404(w, webFS)
			return
		}
		switch {
		case p == "/muestrario": // la portada del muestrario, también cuando / lleva a otra página
			r.URL.Path = "/"
		case p == "/" && a.cuentas != nil: // con cuentas, la raíz es la portada pública de relavops
			r.URL.Path = "/inicio.html"
		case p == "/" && inicio != "":
			http.Redirect(w, r, inicio, http.StatusFound)
			return
		case p != "/" && !strings.Contains(path.Base(p), "."):
			if st, err := fs.Stat(webFS, strings.TrimPrefix(p, "/")+".html"); err == nil && !st.IsDir() {
				r.URL.Path = p + ".html"
			}
		}
		// Los ficheros metidos en el binario no tienen fecha, así que sin esto nunca había 304 y cada
		// página se bajaba entera cada vez. Con ETag, el navegador pregunta y se le dice que no ha cambiado.
		if et := etiqueta(r.URL.Path); et != "" {
			w.Header().Set("ETag", et)
		}
		static.ServeHTTP(w, r)
	})
}

// etiquetas da el ETag de cada fichero de la web que no tiene fecha (los del binario). Se calcula una
// vez por fichero. Los de disco tienen fecha y el servidor de ficheros ya contesta 304 con ella.
func etiquetas(webFS fs.FS) func(string) string {
	var mu sync.Mutex
	cache := map[string]string{}
	return func(p string) string {
		n := strings.TrimPrefix(path.Clean("/"+p), "/")
		if n == "" {
			n = "index.html"
		}
		st, err := fs.Stat(webFS, n)
		if err == nil && st.IsDir() {
			n = path.Join(n, "index.html")
			st, err = fs.Stat(webFS, n)
		}
		if err != nil || st.IsDir() || !st.ModTime().IsZero() {
			return ""
		}
		mu.Lock()
		defer mu.Unlock()
		if et, ok := cache[n]; ok {
			return et
		}
		b, err := fs.ReadFile(webFS, n)
		if err != nil {
			return ""
		}
		suma := sha256.Sum256(b)
		et := `W/"` + hex.EncodeToString(suma[:8]) + `"`
		cache[n] = et
		return et
	}
}

// sinHTML da la dirección limpia de una página con .html (/curso.html es /curso, /inicio.html es /).
// index.html no se toca: es el muestrario y el servidor de ficheros ya lo trata aparte.
func sinHTML(p string) (string, bool) {
	if !strings.HasSuffix(p, ".html") || strings.HasPrefix(p, "/assets/") || path.Base(p) == "index.html" {
		return "", false
	}
	limpia := strings.TrimSuffix(p, ".html")
	if limpia == "/inicio" {
		limpia = "/"
	}
	return limpia, true
}

// existeEn dice si una dirección es una página o un fichero de la web. La API y las terminales cuentan
// siempre como que existen, para que pasen por la comprobación de la cuenta.
func existeEn(webFS fs.FS) func(string) bool {
	return func(p string) bool {
		if p == "/" || p == "/muestrario" || strings.HasPrefix(p, "/api/") || strings.HasPrefix(p, "/ws/") {
			return true
		}
		n := strings.TrimPrefix(p, "/")
		if n == "404" || n == "404.html" {
			return false
		}
		if st, err := fs.Stat(webFS, n); err == nil && !st.IsDir() {
			return true
		}
		st, err := fs.Stat(webFS, n+".html")
		return err == nil && !st.IsDir()
	}
}

// no404 contesta 404 con la página de la web (404.html), que lleva al blog y al temario.
func no404(w http.ResponseWriter, webFS fs.FS) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.WriteHeader(http.StatusNotFound)
	if b, err := fs.ReadFile(webFS, "404.html"); err == nil {
		w.Write(b)
		return
	}
	io.WriteString(w, "<!doctype html><meta charset=utf-8><title>No existe</title><p>Esta página no existe. <a href=\"/\">Ir a relavops</a>")
}

// capas busca cada fichero primero en la capa de arriba y, si no está, en la de abajo.
type capas [2]fs.FS

func (c capas) Open(name string) (fs.File, error) {
	if f, err := c[0].Open(name); err == nil {
		if st, err := f.Stat(); err == nil && !st.IsDir() {
			return f, nil // los directorios (y su index.html) son siempre los de la web
		}
		f.Close()
	}
	return c[1].Open(name)
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func (a *App) handleLabs(w http.ResponseWriter, r *http.Request) {
	var out []any
	for _, id := range sortedIDs(a.labs) {
		p := a.eng.pools[id]
		out = append(out, map[string]any{"lab": a.labs[id], "calientes": len(p.ready)})
	}
	writeJSON(w, 200, out)
}

func (a *App) handleNuevaSesion(w http.ResponseWriter, r *http.Request) {
	p := a.eng.pools[r.PathValue("id")]
	if p == nil {
		writeJSON(w, 404, map[string]string{"error": "lab desconocido"})
		return
	}
	dueno, usuario, nombre := ipDe(r), "", ""
	if pase := paseDe(r); pase != nil {
		dueno, usuario, nombre = "u:"+pase.U, pase.U, pase.N
	}
	if !a.ritmo.Permite(dueno) {
		writeJSON(w, 429, map[string]string{"error": "Has abierto muchas máquinas en poco rato. Espera un minuto.", "motivo": "deprisa"})
		return
	}
	s, err := a.sessions.New(a.eng, p, dueno, usuario, nombre)
	if errors.Is(err, errLleno) {
		// La lección no enseña un error. Enseña una sala de espera y vuelve a pedir sola (panel-lab.ts).
		log.Printf("lleno: %s se queda esperando el lab %s", dueno, p.spec.ID)
		w.Header().Set("Retry-After", "15")
		writeJSON(w, 503, map[string]any{"error": "Ahora mismo no queda ninguna máquina libre. En cuanto se libere una, es tuya.", "motivo": "lleno", "espera": 15})
		return
	}
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	log.Printf("sesión %s en %s para %s: lab %s asignado en %v (pool=%v)", s.ID, p.spec.ID, quien(nombre, dueno), s.Inst.ID, s.Asignada.Round(time.Millisecond), s.DePool)
	writeJSON(w, 200, s.Info())
}

// ipDe da la IP de quien hace la petición. Detrás de Caddy viene en X-Forwarded-For, y solo se cree
// si la conexión llega desde la propia máquina. Se coge la última IP de la lista, que es la que pone
// Caddy. Las de antes, y Cf-Connecting-Ip, las puede escribir cualquiera: con ellas se saltaban los
// frenos de intentos del Worker, que van por IP.
func ipDe(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	if desdeLocal(r) {
		if v := r.Header.Values("X-Forwarded-For"); len(v) > 0 {
			lista := strings.Split(v[len(v)-1], ",")
			if ip := strings.TrimSpace(lista[len(lista)-1]); net.ParseIP(ip) != nil {
				return ip
			}
		}
	}
	return host
}

// desdeLocal dice si la conexión viene de la propia máquina (Caddy, o el instalador).
func desdeLocal(r *http.Request) bool {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func (a *App) sesion(w http.ResponseWriter, r *http.Request) *Session {
	s := a.sessions.Get(r.PathValue("sid"))
	if s == nil || !suya(s, r) {
		writeJSON(w, 404, map[string]string{"error": "sesión caducada"})
		return nil
	}
	return s
}

// suya dice si la sesión es de quien la pide. Sin cuentas, todas lo son. El admin puede entrar en cualquiera.
func suya(s *Session, r *http.Request) bool {
	p := paseDe(r)
	return p == nil || s.Usuario == "" || s.Usuario == p.U || p.R == "admin"
}

func quien(nombre, dueno string) string {
	if nombre != "" {
		return nombre
	}
	return dueno
}

// nombreNodo deja el nombre de la máquina como lo acepta el panel: minúsculas, números y guiones.
func nombreNodo(h string) string {
	var b strings.Builder
	for _, c := range strings.ToLower(h) {
		switch {
		case c >= 'a' && c <= 'z', c >= '0' && c <= '9':
			b.WriteRune(c)
		case b.Len() > 0 && b.Len() < 39:
			b.WriteByte('-')
		}
		if b.Len() >= 40 {
			break
		}
	}
	n := strings.Trim(b.String(), "-")
	if n == "" {
		n = "labd"
	}
	return n
}

func (a *App) handleSesion(w http.ResponseWriter, r *http.Request) {
	if s := a.sesion(w, r); s != nil {
		s.touch()
		writeJSON(w, 200, s.Info())
	}
}

func (a *App) handleCerrar(w http.ResponseWriter, r *http.Request) {
	if s := a.sessions.Get(r.PathValue("sid")); s != nil && suya(s, r) {
		a.sessions.Close(s.ID)
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (a *App) handleBoss(w http.ResponseWriter, r *http.Request) {
	s := a.sesion(w, r)
	if s == nil {
		return
	}
	if err := s.StartBoss(r.URL.Query().Get("fallo")); err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, s.Info())
}

func (a *App) handlePista(w http.ResponseWriter, r *http.Request) {
	s := a.sesion(w, r)
	if s == nil {
		return
	}
	p, xp, err := s.Pista()
	if err != nil {
		writeJSON(w, 400, map[string]any{"error": err.Error(), "xp": xp})
		return
	}
	writeJSON(w, 200, map[string]any{"pista": p, "xp": xp})
}

func (a *App) handleCaptura(w http.ResponseWriter, r *http.Request) {
	if s := a.sesion(w, r); s != nil {
		s.StartCaptura()
		writeJSON(w, 200, map[string]bool{"ok": true})
	}
}

func (a *App) handleAccion(w http.ResponseWriter, r *http.Request) {
	s := a.sesion(w, r)
	if s == nil {
		return
	}
	acc, ok := s.Spec.Acciones[r.PathValue("nombre")]
	if !ok {
		writeJSON(w, 404, map[string]string{"error": "acción desconocida"})
		return
	}
	ctx, cancel := context.WithTimeout(s.ctx, 15*time.Second)
	defer cancel()
	for _, ac := range acc {
		if out, code, err := a.dk.Run(ctx, s.Inst.Nodos[ac.Nodo], "sh", "-c", ac.Script); err != nil || code != 0 {
			writeJSON(w, 500, map[string]any{"error": "falló la acción", "nodo": ac.Nodo, "salida": out})
			return
		}
	}
	s.Trigger() // que las sondas enseñen el efecto enseguida
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// handleExec: el director de juego lanza órdenes en paralelo en los nodos de SU sesión.
// Solo para labs marcados como juego. (Prueba de concepto: en producción el director vive en
// labd y el navegador solo recibe eventos, para que no se pueda hacer trampa.)
func (a *App) handleExec(w http.ResponseWriter, r *http.Request) {
	s := a.sesion(w, r)
	if s == nil {
		return
	}
	if !s.Spec.Juego {
		writeJSON(w, 403, map[string]string{"error": "este lab no es un juego"})
		return
	}
	var pet struct {
		Ordenes []struct {
			Nodo string `json:"nodo"`
			Sh   string `json:"sh"`
		} `json:"ordenes"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&pet); err != nil || len(pet.Ordenes) > 64 {
		writeJSON(w, 400, map[string]string{"error": "petición no válida"})
		return
	}
	s.touch()
	res := make([]map[string]any, len(pet.Ordenes))
	var wg sync.WaitGroup
	for i, o := range pet.Ordenes {
		ctr, ok := s.Inst.Nodos[o.Nodo]
		if !ok {
			res[i] = map[string]any{"out": "nodo desconocido", "code": -1}
			continue
		}
		wg.Add(1)
		go func(i int, ctr, sh string) {
			defer wg.Done()
			ctx, cancel := context.WithTimeout(s.ctx, 10*time.Second)
			defer cancel()
			t0 := time.Now()
			out, code, err := a.dk.Run(ctx, ctr, "sh", "-c", sh)
			if err != nil && code == 0 {
				code = -1
			}
			res[i] = map[string]any{"out": out, "code": code, "ms": time.Since(t0).Milliseconds()}
		}(i, ctr, o.Sh)
	}
	wg.Wait()
	writeJSON(w, 200, res)
}

// handleAforo dice cómo de lleno está el servidor. El mapa lo usa para avisar con tiempo, antes de
// que el alumno entre en una lección y se encuentre esperando.
func (a *App) handleAforo(w http.ResponseWriter, r *http.Request) {
	abiertas, tope, llenos, lleno := a.sessions.Aforo()
	writeJSON(w, 200, map[string]any{"abiertas": abiertas, "tope": tope, "lleno": lleno, "llenos": llenos})
}

func (a *App) handleEstado(w http.ResponseWriter, r *http.Request) {
	pools := map[string]int{}
	for id, p := range a.eng.pools {
		pools[id] = len(p.ready)
	}
	a.sessions.mu.Lock()
	n := len(a.sessions.m)
	a.sessions.mu.Unlock()
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)
	writeJSON(w, 200, map[string]any{
		"calientes": pools, "sesiones": n, "labd_mb": ms.Sys >> 20,
		"activo_s": int(time.Since(a.inicio).Seconds()),
	})
}
