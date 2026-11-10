package main

// Disco de los labs. Docker no pone tope al disco de un contenedor (overlay2 sobre ext4 no sabe), así
// que sin esto un `fallocate -l 50G x` dentro de un lab llenaría el disco del servidor y se caería todo.
//
//   - Cada 2 s se mira el espacio libre del disco de Docker, que cuesta microsegundos. Si baja de
//     -disco-libre, se mide lo que ocupa cada lab abierto y se cierra el que más.
//   - Cada 30 s se mide cada lab abierto y se cierra el que pase de -disco-lab.
//
// Además, ningún fichero de un lab puede pasar de -tope-fichero (ulimit -f, en pool.go), así que un
// fichero enorme falla en el acto con "File size limit exceeded".

import (
	"context"
	"fmt"
	"log"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type usoDisco struct {
	s     *Session
	bytes int64
}

// vigilarDisco corre mientras corre labd. porLab y minLibre en bytes. Un cero es sin ese tope.
func (a *App) vigilarDisco(dir string, porLab, minLibre int64) {
	if porLab <= 0 && minLibre <= 0 {
		return
	}
	var ultima time.Time
	for range time.Tick(2 * time.Second) {
		libre := libreEn(dir)
		urgente := minLibre > 0 && libre >= 0 && libre < minLibre
		if !urgente && time.Since(ultima) < 30*time.Second {
			continue
		}
		ultima = time.Now()
		usos := a.medirDisco()
		cerradas := map[string]bool{}
		for _, u := range usos {
			if porLab > 0 && u.bytes > porLab {
				log.Printf("sesión %s cerrada: su lab ocupa %s de disco (tope %s)", u.s.ID, enMB(u.bytes), enMB(porLab))
				cerradas[u.s.ID] = true
				go a.sessions.cerrarCon(u.s.ID, "disco")
			}
		}
		// Con el disco casi lleno se cierra el lab que más ocupa, si ocupa algo de verdad (más de 50 MB).
		if urgente && len(usos) > 0 && !cerradas[usos[0].s.ID] && usos[0].bytes > 50<<20 {
			log.Printf("disco casi lleno (%s libres): cierro la sesión %s, que ocupa %s", enMB(libre), usos[0].s.ID, enMB(usos[0].bytes))
			go a.sessions.cerrarCon(usos[0].s.ID, "disco")
		}
	}
}

// medirDisco da lo que ha escrito cada sesión abierta en sus nodos, de más a menos.
func (a *App) medirDisco() []usoDisco {
	a.sessions.mu.Lock()
	ss := make([]*Session, 0, len(a.sessions.m))
	for _, s := range a.sessions.m {
		ss = append(ss, s)
	}
	a.sessions.mu.Unlock()
	var usos []usoDisco
	for _, s := range ss {
		var total int64
		for _, ctr := range s.Inst.Nodos {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			n, err := a.dk.TamEscrito(ctx, ctr)
			cancel()
			if err == nil {
				total += n
			}
		}
		usos = append(usos, usoDisco{s, total})
	}
	sort.Slice(usos, func(i, j int) bool { return usos[i].bytes > usos[j].bytes })
	return usos
}

// libreEn da los bytes libres del disco de una carpeta, o -1 si no se puede saber.
func libreEn(dir string) int64 {
	var st syscall.Statfs_t
	if syscall.Statfs(dir, &st) != nil {
		return -1
	}
	return int64(st.Bavail) * int64(st.Bsize)
}

func enMB(b int64) string { return fmt.Sprintf("%d MB", b>>20) }

// tamano lee tamaños como 512M, 2G o 1500000 (bytes).
func tamano(v string) (int64, error) {
	v = strings.TrimSpace(strings.ToUpper(v))
	mult := int64(1)
	switch {
	case strings.HasSuffix(v, "K"):
		mult, v = 1<<10, strings.TrimSuffix(v, "K")
	case strings.HasSuffix(v, "M"):
		mult, v = 1<<20, strings.TrimSuffix(v, "M")
	case strings.HasSuffix(v, "G"):
		mult, v = 1<<30, strings.TrimSuffix(v, "G")
	}
	n, err := strconv.ParseFloat(v, 64)
	if err != nil || n < 0 {
		return 0, fmt.Errorf("tamaño %q no válido (p. ej. 2G o 512M)", v)
	}
	return int64(n * float64(mult)), nil
}
