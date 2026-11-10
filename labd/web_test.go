package main

// Las direcciones de la web contra la web compilada (web/dist), con cuentas y sin ellas.
// Lo público se ve sin entrar, lo privado manda a entrar y lo que no existe da 404.
//   cd web && npm run build && cd ../labd && go test -run TestWeb .

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
)

type caso struct {
	ruta    string
	codigo  int
	destino string // Location esperado en las redirecciones
	trae    string // un trozo del cuerpo
}

func probar(t *testing.T, h http.Handler, casos []caso) {
	t.Helper()
	for _, c := range casos {
		r := httptest.NewRequest("GET", c.ruta, nil)
		r.RemoteAddr = "203.0.113.9:4000" // como si llegara de fuera
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != c.codigo {
			t.Errorf("%s: código %d, se esperaba %d", c.ruta, w.Code, c.codigo)
			continue
		}
		if c.destino != "" && w.Header().Get("Location") != c.destino {
			t.Errorf("%s: lleva a %q, se esperaba %q", c.ruta, w.Header().Get("Location"), c.destino)
		}
		if c.trae != "" && !strings.Contains(w.Body.String(), c.trae) {
			t.Errorf("%s: el cuerpo no trae %q", c.ruta, c.trae)
		}
	}
}

func webCompilada(t *testing.T) *App {
	t.Helper()
	if _, err := os.Stat("../web/dist/blog.html"); err != nil {
		t.Skip("falta web/dist. Compila antes con npm run build en web/")
	}
	return &App{}
}

func TestWebConCuentas(t *testing.T) {
	a := webCompilada(t)
	a.cuentas = &Cuentas{echados: map[string]time.Time{}, listo: make(chan struct{})}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/labs", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) })
	mux.Handle("/", a.web(os.DirFS("../web/dist"), "/curso"))
	h := a.cuentas.Proteger(mux)
	probar(t, h, []caso{
		{ruta: "/", codigo: 200, trae: "Aprende DevOps con máquinas de verdad"},
		{ruta: "/", codigo: 200, trae: `href="/temario#cinturon-blanco"`},
		{ruta: "/inicio.html", codigo: 301, destino: "/"},
		{ruta: "/blog", codigo: 200, trae: "Aprende Linux, redes y DevOps"},
		{ruta: "/blog/", codigo: 301, destino: "/blog"},
		{ruta: "/blog.html", codigo: 301, destino: "/blog"},
		{ruta: "/blog/permisos-linux-chmod", codigo: 200, trae: `"@type":"BlogPosting"`},
		{ruta: "/blog/permisos-linux-chmod.html", codigo: 301, destino: "/blog/permisos-linux-chmod"},
		{ruta: "/blog/no-existe", codigo: 404, trae: "Esta página no existe"},
		{ruta: "/temario", codigo: 200, trae: `id="m-0-4"`},
		{ruta: "/herramientas", codigo: 200},
		{ruta: "/sobre", codigo: 200, trae: "Fernando Hernández"},
		{ruta: "/blog/git-basico", codigo: 200, trae: `rel="author"`},
		{ruta: "/herramientas/calculadora-chmod", codigo: 200, trae: `id="chmod"`},
		{ruta: "/herramientas/calculadora-subredes", codigo: 200, trae: `id="subredes"`},
		{ruta: "/sitemap.xml", codigo: 200, trae: "<loc>https://relavops.org/blog/git-basico</loc>"},
		{ruta: "/robots.txt", codigo: 200, trae: "Sitemap: https://relavops.org/sitemap.xml"},
		{ruta: "/feed.xml", codigo: 200, trae: "<rss"},
		{ruta: "/llms.txt", codigo: 200, trae: "# relavops"},
		{ruta: "/bcfe7302b3a8cfd077efed764e77ae66.txt", codigo: 200, trae: "bcfe7302b3a8cfd077efed764e77ae66"},
		{ruta: "/favicon.ico", codigo: 200},
		{ruta: "/icono-512.png", codigo: 200},
		{ruta: "/og/relavops.png", codigo: 200},
		{ruta: "/entrar", codigo: 200},
		// Lo de dentro sigue pidiendo cuenta.
		{ruta: "/curso", codigo: 302, destino: "/entrar?vuelta=%2Fcurso"},
		{ruta: "/leccion?m=0.4", codigo: 302, destino: "/entrar?vuelta=%2Fleccion%3Fm%3D0.4"},
		{ruta: "/curso/", codigo: 301, destino: "/curso"},
		{ruta: "/api/labs", codigo: 401},
		{ruta: "/capturas/ping.json", codigo: 302},
		// Lo que no existe da 404, también sin cuenta, y no hay listados de carpetas.
		{ruta: "/no-existe", codigo: 404, trae: "Esta página no existe"},
		{ruta: "/404", codigo: 404},
		{ruta: "/assets/", codigo: 404},
		{ruta: "/blog/../curso", codigo: 307, destino: "/curso"}, // Go limpia la ruta, y /curso pide cuenta
	})
}

func TestWebSinCuentas(t *testing.T) {
	a := webCompilada(t)
	h := a.web(os.DirFS("../web/dist"), "")
	probar(t, h, []caso{
		{ruta: "/blog", codigo: 200},
		{ruta: "/curso", codigo: 200},
		{ruta: "/muestrario", codigo: 200},
		{ruta: "/no-existe", codigo: 404},
		{ruta: "/voces/", codigo: 404},
	})
}
