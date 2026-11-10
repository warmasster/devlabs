package main

// PTY reconectable: labd mantiene viva la shell de cada nodo mientras dure la sesión y guarda
// lo último que ha escrito (1 MB). Al reconectar se reenvía ese búfer: vuelves con tu historial
// y tu scroll intactos, sin un tmux en medio que redibuje la pantalla y se coma las líneas.
//
// Aviso de prompt: la shell arranca con un PROMPT_COMMAND que escribe una secuencia OSC que xterm.js
// ignora. Cuando labd la ve pasar, el comando acaba de terminar y pide una ronda en el acto.
// Los labs que ponen su propio PROMPT_COMMAND deben acabarlo con lo mismo (ver labs/LEEME.md).

import (
	"bufio"
	"bytes"
	"context"
	"net"
	"sync"
	"sync/atomic"
)

const tamBufer = 1 << 20

// Lo que escribe la shell al volver al prompt, y el PROMPT_COMMAND que lo escribe.
var (
	marcaPrompt = []byte("\x1b]6973;\x07")
	avisoPrompt = `printf '\033]6973;\007'`
)

type Pty struct {
	id     string
	conn   net.Conn
	br     *bufio.Reader
	dk     *Docker
	mu     sync.Mutex
	bufer  []byte
	vistas map[chan []byte]struct{}
	fin    chan struct{}
	avisa  atomic.Bool // esta shell avisa al volver al prompt
}

// ptyDe devuelve la shell viva del nodo o abre una nueva.
func (s *Session) ptyDe(ctx context.Context, nodo string, rows, cols int) (*Pty, error) {
	s.mu.Lock()
	if s.ptys == nil {
		s.ptys = map[string]*Pty{}
	}
	if p := s.ptys[nodo]; p != nil {
		s.mu.Unlock()
		return p, nil
	}
	s.mu.Unlock()

	size := [2]int{rows, cols}
	id, err := s.eng.dk.ExecCreate(ctx, s.Inst.Nodos[nodo], execConfig{
		AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true,
		Env: []string{"TERM=xterm-256color", "COLORTERM=truecolor", "SHELL=/bin/bash", "LANG=es_ES.UTF-8", "LC_ALL=es_ES.UTF-8", "PROMPT_COMMAND=" + avisoPrompt},
		// Ojo: nada de "2>/dev/null" sobre la shell, que bash escribe el prompt por stderr.
		Cmd: []string{"sh", "-c", "cd /root 2>/dev/null; if command -v bash >/dev/null; then exec bash -l; else exec sh -l; fi"}, ConsoleSize: &size,
	})
	if err != nil {
		return nil, err
	}
	// La shell vive lo que la sesión, no lo que la pestaña: contexto de la sesión.
	conn, br, err := s.eng.dk.ExecAttach(s.ctx, id, true, &size)
	if err != nil {
		return nil, err
	}
	p := &Pty{id: id, conn: conn, br: br, dk: s.eng.dk, vistas: map[chan []byte]struct{}{}, fin: make(chan struct{})}
	s.mu.Lock()
	if otro := s.ptys[nodo]; otro != nil { // carrera: otra pestaña la abrió a la vez
		s.mu.Unlock()
		conn.Close()
		return otro, nil
	}
	s.ptys[nodo] = p
	s.mu.Unlock()
	s.eng.dk.ExecResize(ctx, id, rows, cols)

	go func() {
		<-s.ctx.Done()
		conn.Close()
	}()
	go func() {
		defer func() {
			s.mu.Lock()
			if s.ptys[nodo] == p {
				delete(s.ptys, nodo) // la próxima conexión abre una shell nueva
			}
			s.mu.Unlock()
			close(p.fin)
		}()
		buf := make([]byte, 32*1024)
		var cola []byte // final del trozo anterior, por si la marca llega partida
		for {
			n, err := br.Read(buf)
			if n > 0 {
				trozo := append([]byte(nil), buf[:n]...)
				if bytes.Contains(append(cola, trozo...), marcaPrompt) {
					p.avisa.Store(true)
					s.Ahora()
				}
				cola = append(cola[:0], trozo[max(0, len(trozo)-len(marcaPrompt)+1):]...)
				p.emitir(trozo)
			}
			if err != nil {
				return
			}
		}
	}()
	return p, nil
}

func (p *Pty) emitir(b []byte) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.bufer = append(p.bufer, b...)
	if len(p.bufer) > tamBufer {
		// Se recorta por el principio, empezando en un salto de línea para no partir secuencias.
		corte := len(p.bufer) - tamBufer
		if i := bytes.IndexByte(p.bufer[corte:], '\n'); i >= 0 {
			corte += i + 1
		}
		p.bufer = append([]byte(nil), p.bufer[corte:]...)
	}
	for v := range p.vistas {
		select {
		case v <- b:
		default: // una pestaña que no da abasto se desconecta; al volver recibe el búfer entero
			delete(p.vistas, v)
			close(v)
		}
	}
}

// mirar registra una pestaña y le devuelve lo que la shell ha escrito hasta ahora.
func (p *Pty) mirar() ([]byte, chan []byte) {
	p.mu.Lock()
	defer p.mu.Unlock()
	v := make(chan []byte, 512)
	p.vistas[v] = struct{}{}
	return append([]byte(nil), p.bufer...), v
}

func (p *Pty) dejar(v chan []byte) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if _, ok := p.vistas[v]; ok {
		delete(p.vistas, v)
		close(v)
	}
}
