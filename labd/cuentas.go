package main

// Cuentas: labd no guarda usuarios. Los lleva el Worker de Cloudflare (carpeta cuentas/), que al
// entrar deja una galleta rv_t con un pase firmado con Ed25519. labd solo comprueba esa firma con la
// clave pública, que pide al Worker al arrancar y luego cada hora. Así no hay base de datos en el VPS
// y se pueden poner más servidores de labs sin tocar las cuentas.
//
// Solo con -cuentas URL. Sin esa opción no se pide entrar (desarrollo y pruebas).
//
// Con -cuentas, además:
//   - Las páginas y la API piden un pase válido. Sin él, la API da 401 y las páginas mandan a entrar.
//     La raíz es la portada pública, con cuenta o sin ella. Las direcciones van sin .html (main.go).
//   - /admin solo para admins y /profe para profes y admins.
//   - Lo que es del Worker (/api/cuenta, /api/clases, /api/admin, /api/nodos) se le pasa tal cual a
//     -cuentas (en el VPS, su dirección workers.dev). Así el dominio puede apuntar al VPS sin más, con
//     Caddy delante como siempre. Si el dominio pasa por Cloudflare con la nube naranja, las rutas del
//     Worker cogen esas peticiones antes y esto no se usa.
//     Al Worker le llega la IP del VPS, así que labd le manda la del alumno en X-Relavops-Ip, con el
//     secreto del nodo para que se fíe.

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"path"
	"strings"
	"sync"
	"time"
)

const galletaPase = "rv_t"

type Pase struct {
	U   string `json:"u"`   // id del usuario
	N   string `json:"n"`   // nombre
	R   string `json:"r"`   // rol: alumno, profe o admin
	Iat int64  `json:"iat"` // cuándo se dio (los pases de antes no lo llevan: exp menos una hora)
	Exp int64  `json:"exp"` // segundos desde 1970
	Kid string `json:"kid"`
}

type Cuentas struct {
	base  *url.URL
	proxy *httputil.ReverseProxy
	hc    *http.Client

	mu       sync.RWMutex
	clave    ed25519.PublicKey
	kid      string
	pedida   time.Time            // última vez que se pidió la clave
	echados  map[string]time.Time // usuarios echados por el admin, hasta que caduque su pase
	desde    map[string]int64     // usuarios con otro rol: solo valen sus pases dados desde entonces
	listo    chan struct{}
	listoUna sync.Once

	existe func(p string) bool // si una dirección es una página o un fichero de la web (main.go)
}

type ctxPase struct{}

// paseDe da el pase de la petición (o nil sin cuentas o sin entrar).
func paseDe(r *http.Request) *Pase {
	p, _ := r.Context().Value(ctxPase{}).(*Pase)
	return p
}

func NewCuentas(base, secreto string) (*Cuentas, error) {
	u, err := url.Parse(strings.TrimRight(base, "/"))
	if err != nil || u.Host == "" {
		return nil, fmt.Errorf("-cuentas %q no es una URL", base)
	}
	c := &Cuentas{base: u, hc: &http.Client{Timeout: 10 * time.Second}, echados: map[string]time.Time{}, desde: map[string]int64{}, listo: make(chan struct{})}
	c.proxy = httputil.NewSingleHostReverseProxy(u)
	dirigir := c.proxy.Director
	c.proxy.Director = func(r *http.Request) {
		ip := ipDe(r)
		dirigir(r)
		r.Host = u.Host
		r.Header.Set("X-Relavops-Proxy", "1")
		r.Header.Del("X-Relavops-Ip")
		r.Header.Del("X-Relavops-Nodo")
		if secreto != "" {
			r.Header.Set("X-Relavops-Ip", ip) // para los frenos de intentos del Worker, que van por IP
			r.Header.Set("X-Relavops-Nodo", secreto)
		}
	}
	c.proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("cuentas: %s %s: %v", r.Method, r.URL.Path, err)
		writeJSON(w, 502, map[string]string{"error": "El servicio de cuentas no responde. Prueba en un momento."})
	}
	go c.bucleClave()
	return c, nil
}

// bucleClave pide la clave pública al arrancar (reintenta cada 5 s) y luego la refresca cada hora.
func (c *Cuentas) bucleClave() {
	for {
		err := c.pedirClave()
		if err != nil {
			log.Printf("cuentas: sin clave pública todavía (%v). Reintento en 5 s", err)
			time.Sleep(5 * time.Second)
			continue
		}
		c.listoUna.Do(func() { close(c.listo) })
		time.Sleep(time.Hour)
	}
}

func (c *Cuentas) pedirClave() error {
	c.mu.Lock()
	c.pedida = time.Now()
	c.mu.Unlock()
	req, _ := http.NewRequest("GET", c.base.String()+"/api/cuenta/clave-publica", nil)
	req.Header.Set("X-Relavops-Proxy", "1") // si la ruta no la coge Cloudflare, que no vuelva aquí en bucle
	resp, err := c.hc.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	var k struct{ Alg, Kid, X string }
	if err := json.NewDecoder(resp.Body).Decode(&k); err != nil {
		return err
	}
	pub, err := base64.RawURLEncoding.DecodeString(k.X)
	if err != nil || len(pub) != ed25519.PublicKeySize || k.Alg != "EdDSA" {
		return fmt.Errorf("clave pública no válida")
	}
	c.mu.Lock()
	cambio := c.kid != k.Kid
	c.clave, c.kid = pub, k.Kid
	c.mu.Unlock()
	if cambio {
		log.Printf("cuentas: clave pública %s de %s", k.Kid, c.base)
	}
	return nil
}

// Comprobar valida el pase de la galleta. nil si no hay, no es nuestro o ha caducado.
func (c *Cuentas) Comprobar(r *http.Request) *Pase {
	g, err := r.Cookie(galletaPase)
	if err != nil || len(g.Value) > 2000 {
		return nil
	}
	partes := strings.Split(g.Value, ".")
	if len(partes) != 3 || partes[0] != "v1" {
		return nil
	}
	firma, err1 := base64.RawURLEncoding.DecodeString(partes[2])
	datos, err2 := base64.RawURLEncoding.DecodeString(partes[1])
	if err1 != nil || err2 != nil {
		return nil
	}
	var p Pase
	if json.Unmarshal(datos, &p) != nil {
		return nil
	}
	c.mu.RLock()
	clave, kid, pedida := c.clave, c.kid, c.pedida
	hasta, echado := c.echados[p.U]
	desde := c.desde[p.U]
	c.mu.RUnlock()
	if clave == nil {
		return nil
	}
	if p.Kid != kid {
		// Puede que el Worker haya cambiado de clave. Se vuelve a pedir, como mucho una vez por minuto.
		if time.Since(pedida) > time.Minute {
			go c.pedirClave()
		}
		return nil
	}
	if !ed25519.Verify(clave, []byte(partes[0]+"."+partes[1]), firma) {
		return nil
	}
	if time.Now().Unix() >= p.Exp || p.U == "" {
		return nil
	}
	if echado && time.Now().Before(hasta) {
		return nil
	}
	dado := p.Iat
	if dado == 0 {
		dado = p.Exp - 3600
	}
	if desde > 0 && dado < desde {
		return nil // de antes de cambiarle el rol: la página pide otro al Worker con su sesión
	}
	return &p
}

// Renovar deja de aceptar los pases de un usuario dados antes de desde (segundos desde 1970). Se usa
// al cambiarle el rol: su siguiente petición pide un pase nuevo, ya con el rol de ahora.
func (c *Cuentas) Renovar(usuario string, desde int64) {
	if usuario == "" || desde <= 0 {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	limite := time.Now().Add(-2 * time.Hour).Unix() // pasada una hora ya no queda ningún pase viejo
	for u, t := range c.desde {
		if t < limite {
			delete(c.desde, u)
		}
	}
	c.desde[usuario] = desde
}

// Echar deja fuera a un usuario hasta que caduque el pase que tenga (dura una hora como mucho).
func (c *Cuentas) Echar(usuario string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	ahora := time.Now()
	for u, t := range c.echados {
		if ahora.After(t) {
			delete(c.echados, u)
		}
	}
	c.echados[usuario] = ahora.Add(time.Hour + time.Minute)
}

func delWorker(p string) bool {
	return strings.HasPrefix(p, "/api/cuenta/") || p == "/api/clases" || strings.HasPrefix(p, "/api/clases/") ||
		strings.HasPrefix(p, "/api/admin/") || strings.HasPrefix(p, "/api/nodos/")
}

// publica: lo que se ve sin entrar. La portada (la raíz), la página de entrar, el blog, el temario,
// las herramientas, sus ficheros y lo que leen los buscadores. Las formas con .html también, para que
// su redirección a la dirección limpia funcione sin cuenta.
func publica(p string) bool {
	switch p {
	case "/", "/inicio", "/inicio.html", "/entrar", "/entrar.html", "/favicon.svg", "/favicon.ico",
		"/blog", "/temario", "/herramientas", "/sobre":
		return true
	}
	// En la raíz, robots.txt, sitemap.xml, feed.xml, llms.txt, la clave de IndexNow y los iconos.
	if path.Dir(p) == "/" {
		switch path.Ext(p) {
		case ".txt", ".xml", ".png":
			return true
		}
	}
	for _, pre := range []string{"/assets/", "/fuentes/", "/blog/", "/herramientas/", "/og/"} {
		if strings.HasPrefix(p, pre) {
			return true
		}
	}
	return false
}

// soloPara dice qué rol hace falta para una página. Vacío: cualquiera con cuenta.
func soloPara(p string) string {
	switch strings.TrimSuffix(p, ".html") {
	case "/admin":
		return "admin"
	case "/profe":
		return "profe"
	}
	return ""
}

func (c *Cuentas) Proteger(sig http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := r.URL.Path
		if delWorker(p) {
			if r.Header.Get("X-Relavops-Proxy") != "" {
				// La petición ya pasó por un labd: la ruta de Cloudflare no está puesta y daría vueltas.
				writeJSON(w, 508, map[string]string{"error": "La ruta de cuentas no llega al Worker. Revisa las rutas de wrangler.jsonc."})
				return
			}
			c.proxy.ServeHTTP(w, r)
			return
		}
		// El instalador mira /api/estado desde la propia máquina. Lo que llega por Caddy trae cabeceras.
		local := strings.HasPrefix(r.RemoteAddr, "127.0.0.1:") && r.Header.Get("X-Forwarded-For") == "" && r.Header.Get("Cf-Connecting-Ip") == ""
		// Primero la dirección limpia, así la vuelta tras entrar ya va sin .html.
		if limpia, ok := sinHTML(p); ok {
			if r.URL.RawQuery != "" {
				limpia += "?" + r.URL.RawQuery
			}
			http.Redirect(w, r, limpia, http.StatusMovedPermanently)
			return
		}
		// Lo que no existe da 404 con cuenta o sin ella. Antes mandaba a entrar, y para Google cualquier
		// dirección mal escrita era la página de entrar.
		if publica(p) || (local && p == "/api/estado") || (c.existe != nil && !c.existe(p)) {
			sig.ServeHTTP(w, r)
			return
		}
		pase := c.Comprobar(r)
		if pase == nil {
			if strings.HasPrefix(p, "/api/") || strings.HasPrefix(p, "/ws/") {
				writeJSON(w, 401, map[string]string{"error": "Tienes que entrar con tu cuenta.", "motivo": "entrar"})
				return
			}
			vuelta := url.QueryEscape(r.URL.RequestURI())
			if _, err := r.Cookie("rv_s"); err == nil {
				// Hay sesión, solo ha caducado el pase. El Worker lo renueva y vuelve aquí sin que se note.
				http.Redirect(w, r, "/api/cuenta/renovar?vuelta="+vuelta, http.StatusFound)
				return
			}
			http.Redirect(w, r, "/entrar?vuelta="+vuelta, http.StatusFound)
			return
		}
		if rol := soloPara(p); rol != "" && pase.R != "admin" && pase.R != rol {
			http.Redirect(w, r, "/curso", http.StatusFound)
			return
		}
		sig.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxPase{}, pase)))
	})
}
