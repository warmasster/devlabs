package main

// Vigía: una shell pequeña que vive dentro de cada nodo mientras dura la sesión.
// labd le pasa una vez el texto de cada sonda y comprobación y, en cada ronda, le dice cuáles
// ejecutar. Así cada comprobación cuesta un fork dentro del lab y no un docker exec entero,
// que son unos 30 ms de CPU del servidor cada uno. El protocolo está en vigia.sh.
// Si el vigía muere o no contesta a tiempo, esa ronda se hace con docker exec y se abre otro.

import (
	"bufio"
	"bytes"
	"context"
	_ "embed"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed vigia.sh
var vigiaScript string

const (
	limiteRonda    = 4 * time.Second // lo que puede tardar una ronda entera en un nodo
	maxSalida      = 64 * 1024       // lo que se guarda de la salida de cada script
	maxRonda       = 4 << 20         // si una ronda escupe más que esto, el vigía se cierra
	pausaTrasFallo = 30 * time.Second
	// Si el vigía muere muchas veces seguidas (el alumno lo mata en bucle), se deja de abrir un rato y
	// las rondas con docker exec van como mucho cada 2 s. Cada docker exec gasta CPU del servidor.
	muertesMax     = 3
	pausaMuertes   = time.Minute
	esperaSinVigia = 2 * time.Second
)

type resultado struct {
	out  string
	code int
}

type vigia struct {
	conn   net.Conn
	r      *bufio.Reader // salida del vigía, ya sin las cabeceras de docker
	ids    map[string]int
	rondas int
}

// nodoVigia es el estado del vigía de un nodo dentro de una sesión.
// Solo lo toca la goroutine de las rondas de ese nodo.
type nodoVigia struct {
	v       *vigia
	pausa   time.Time   // tras fallar un vigía recién abierto, hasta cuándo se usa docker exec
	muertes []time.Time // cuándo murieron los últimos vigías de este nodo
	ultimo  time.Time   // última ronda con docker exec
}

// abrirVigia copia vigia.sh al nodo y lo arranca con la entrada abierta.
func (s *Session) abrirVigia(nodo string) (*vigia, error) {
	ctr := s.Inst.Nodos[nodo]
	ctx, cancel := context.WithTimeout(s.ctx, 5*time.Second)
	defer cancel()
	// Se guarda en un fichero para que en ps salga "sh /usr/lib/relavops/vigia" y no el script entero.
	instalar := `d=/usr/lib/relavops; mkdir -p $d 2>/dev/null && [ -w $d ] || d=/tmp; printf '%s' "$1" > $d/vigia && echo $d/vigia`
	out, code, err := s.eng.dk.Run(ctx, ctr, "sh", "-c", instalar, "sh", vigiaScript)
	if err != nil || code != 0 {
		return nil, fmt.Errorf("instalar: código %d, %v", code, err)
	}
	ruta := strings.TrimSpace(out)
	id, err := s.eng.dk.ExecCreate(ctx, ctr, execConfig{AttachStdin: true, AttachStdout: true, AttachStderr: true, Cmd: []string{"sh", ruta}})
	if err != nil {
		return nil, err
	}
	conn, br, err := s.eng.dk.ExecAttach(ctx, id, false, nil)
	if err != nil {
		return nil, err
	}
	pr, pw := io.Pipe()
	go func() { pw.CloseWithError(demux(br, pw)) }()
	// Al cerrar la conexión el vigía lee fin de entrada y termina solo.
	go func() { <-s.ctx.Done(); conn.Close() }()
	return &vigia{conn: conn, r: bufio.NewReaderSize(pr, 32*1024), ids: map[string]int{}}, nil
}

func (v *vigia) cerrar() { v.conn.Close() }

// ronda manda los scripts que aún no conoce, le pide que los ejecute y lee los resultados en orden.
func (v *vigia) ronda(scripts []string) ([]resultado, error) {
	var b strings.Builder
	nums := make([]int, len(scripts))
	for i, sc := range scripts {
		n, ok := v.ids[sc]
		if !ok {
			n = len(v.ids)
			v.ids[sc] = n
			if !strings.HasSuffix(sc, "\n") {
				sc += "\n"
			}
			fmt.Fprintf(&b, "D %d %d\n%s", n, strings.Count(sc, "\n"), sc)
		}
		nums[i] = n
	}
	marca := randID(6)
	b.WriteString("R " + marca)
	for _, n := range nums {
		b.WriteString(" " + strconv.Itoa(n))
	}
	b.WriteByte('\n')

	v.conn.SetDeadline(time.Now().Add(limiteRonda))
	defer v.conn.SetDeadline(time.Time{})
	if _, err := io.WriteString(v.conn, b.String()); err != nil {
		return nil, err
	}

	res := make([]resultado, 0, len(scripts))
	pre := []byte("\x1e" + marca + " ")
	var salida []byte
	total := 0
	inicioLinea := true
	for {
		trozo, err := v.r.ReadSlice('\n')
		total += len(trozo)
		if total > maxRonda {
			return nil, errors.New("demasiada salida")
		}
		if inicioLinea && bytes.HasPrefix(trozo, pre) && err == nil {
			campos := strings.Fields(string(trozo[len(pre):]))
			if len(campos) == 1 && campos[0] == "F" {
				if len(res) != len(scripts) {
					return nil, fmt.Errorf("ronda incompleta: %d de %d", len(res), len(scripts))
				}
				v.rondas++
				return res, nil
			}
			if len(campos) != 2 {
				return nil, fmt.Errorf("marca rara %q", trozo)
			}
			code, _ := strconv.Atoi(campos[1])
			// printf mete un salto antes de la marca. Se quita para que la salida sea la misma que con docker exec.
			salida = bytes.TrimSuffix(salida, []byte("\n"))
			res = append(res, resultado{out: string(salida), code: code})
			salida = salida[:0]
			continue
		}
		if len(salida) < maxSalida {
			salida = append(salida, trozo[:min(len(trozo), maxSalida-len(salida))]...)
		}
		inicioLinea = err == nil
		if err != nil && err != bufio.ErrBufferFull {
			return nil, err
		}
	}
}

// ejecutar corre los scripts en un nodo y devuelve su resultado, o nil si no se pudo.
// Va por el vigía. Si falla, cae a un docker exec por script, como antes.
func (s *Session) ejecutar(nodo string, nv *nodoVigia, scripts []string) []*resultado {
	out := make([]*resultado, len(scripts))
	if time.Now().After(nv.pausa) {
		if nv.v == nil {
			v, err := s.abrirVigia(nodo)
			if err != nil {
				log.Printf("vigía %s/%s no arranca: %v", s.Inst.ID, nodo, err)
				nv.pausa = time.Now().Add(pausaTrasFallo)
			}
			nv.v = v
		}
		if v := nv.v; v != nil {
			r, err := v.ronda(scripts)
			if err == nil {
				for i := range r {
					out[i] = &r[i]
				}
				return out
			}
			if s.ctx.Err() != nil {
				return out
			}
			log.Printf("vigía %s/%s: %v", s.Inst.ID, nodo, err)
			v.cerrar()
			nv.v = nil
			ahora := time.Now()
			nv.muertes = append(nv.muertes, ahora)
			if len(nv.muertes) > muertesMax {
				nv.muertes = nv.muertes[len(nv.muertes)-muertesMax:]
			}
			switch {
			case v.rondas == 0: // uno recién abierto que ya falla: se deja de intentar un rato
				nv.pausa = ahora.Add(pausaTrasFallo)
			case len(nv.muertes) == muertesMax && ahora.Sub(nv.muertes[0]) < pausaMuertes:
				log.Printf("vigía %s/%s: muere una y otra vez, paro %v", s.Inst.ID, nodo, pausaMuertes)
				nv.pausa = ahora.Add(pausaMuertes)
			}
		}
	}
	// Sin vigía, como mucho una ronda cada esperaSinVigia. La primera tras un fallo va siempre.
	if time.Since(nv.ultimo) < esperaSinVigia {
		return out
	}
	nv.ultimo = time.Now()
	var wg sync.WaitGroup
	for i, sc := range scripts {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ctx, cancel := context.WithTimeout(s.ctx, 3*time.Second)
			defer cancel()
			o, code, err := s.eng.dk.Run(ctx, s.Inst.Nodos[nodo], "sh", "-c", sc)
			if err == nil {
				out[i] = &resultado{out: o, code: code}
			}
		}()
	}
	wg.Wait()
	return out
}
