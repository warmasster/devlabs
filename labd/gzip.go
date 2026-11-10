package main

// Compresión gzip para los estáticos de texto (JS, CSS, HTML, JSON, SVG, Wasm).
// El audio (Opus) ya va comprimido y se sirve tal cual, con soporte de Range.

import (
	"compress/gzip"
	"io"
	"net/http"
	"path"
	"strings"
	"sync"
)

var comprimibles = map[string]bool{".js": true, ".css": true, ".html": true, ".json": true, ".svg": true, ".wasm": true, ".txt": true, "": true}

var gzPool = sync.Pool{New: func() any { w, _ := gzip.NewWriterLevel(io.Discard, 5); return w }}

type gzWriter struct {
	http.ResponseWriter
	gz             *gzip.Writer
	cabecera, comp bool
}

// Solo se comprime una respuesta 200; un 304 o un 404 salen tal cual.
func (g *gzWriter) WriteHeader(code int) {
	if g.cabecera {
		return
	}
	g.cabecera = true
	if code == http.StatusOK {
		g.comp = true
		g.Header().Del("Content-Length")
		g.Header().Set("Content-Encoding", "gzip")
		g.Header().Add("Vary", "Accept-Encoding")
	}
	g.ResponseWriter.WriteHeader(code)
}

func (g *gzWriter) Write(b []byte) (int, error) {
	if !g.cabecera {
		g.WriteHeader(http.StatusOK)
	}
	if g.comp {
		return g.gz.Write(b)
	}
	return g.ResponseWriter.Write(b)
}

func conGzip(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ext := path.Ext(r.URL.Path)
		if strings.HasSuffix(r.URL.Path, "/") {
			ext = ".html"
		}
		if !comprimibles[ext] || !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") || r.Header.Get("Range") != "" {
			h.ServeHTTP(w, r)
			return
		}
		gz := gzPool.Get().(*gzip.Writer)
		gz.Reset(w)
		gw := &gzWriter{ResponseWriter: w, gz: gz}
		defer func() {
			if gw.comp {
				gz.Close()
			}
			gzPool.Put(gz)
		}()
		h.ServeHTTP(gw, r)
	})
}
