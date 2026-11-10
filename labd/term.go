package main

// Pasarela de terminal: WebSocket binario <-> PTY real dentro del lab.
// El navegador solo dibuja y manda bytes; TAB, Ctrl+C o Ctrl+R los gestiona el propio Linux.
// Sin tmux en medio: el scroll y la selección son los nativos de la terminal del navegador.

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/coder/websocket"
)

type ctrlMsg struct {
	T    string `json:"t"`
	Cols int    `json:"c"`
	Rows int    `json:"r"`
	K    any    `json:"k"`
}

func (a *App) handleTerm(w http.ResponseWriter, r *http.Request) {
	s := a.sessions.Get(r.URL.Query().Get("s"))
	if s == nil || !suya(s, r) {
		http.Error(w, "sesión desconocida", http.StatusNotFound)
		return
	}
	nodo := r.URL.Query().Get("n")
	if _, ok := s.Inst.Nodos[nodo]; !ok {
		http.Error(w, "nodo desconocido", http.StatusNotFound)
		return
	}
	cols, _ := strconv.Atoi(r.URL.Query().Get("c"))
	rows, _ := strconv.Atoi(r.URL.Query().Get("r"))
	if cols < 10 || cols > 1000 {
		cols = 80
	}
	if rows < 5 || rows > 500 {
		rows = 24
	}

	ws, err := websocket.Accept(w, r, &websocket.AcceptOptions{CompressionMode: websocket.CompressionDisabled})
	if err != nil {
		return
	}
	ws.SetReadLimit(8 << 20) // pegar bloques largos sin cortes
	ctx, cancel := context.WithCancel(s.ctx)
	defer cancel()

	// La shell la mantiene viva labd: cerrar la pestaña no la mata.
	pty, err := s.ptyDe(ctx, nodo, rows, cols)
	if err != nil {
		ws.Close(websocket.StatusInternalError, "exec")
		log.Printf("term %s/%s: %v", s.ID, nodo, err)
		return
	}
	previo, vista := pty.mirar()
	defer pty.dejar(vista)
	a.dk.ExecResize(ctx, pty.id, rows, cols)

	s.mu.Lock()
	s.terms++
	s.mu.Unlock()
	defer func() {
		s.mu.Lock()
		s.terms--
		s.mu.Unlock()
		s.touch()
	}()

	// Tras un Enter, cuando la salida del comando se calla 120 ms (ha vuelto el prompt),
	// se comprueba otra vez: así el ✓ llega justo al terminar comandos largos como ping.
	var enterPendiente atomic.Bool
	silencio := time.AfterFunc(time.Hour, func() {
		if enterPendiente.Swap(false) {
			s.Trigger()
		}
	})
	defer silencio.Stop()

	// PTY -> navegador: primero lo que ya había (historial), luego en directo.
	go func() {
		defer cancel()
		// El historial se marca: lleva preguntas antiguas de vim o htop al terminal ("¿qué color
		// de fondo tienes?") y el navegador no debe contestarlas, o llegarían a la shell como texto.
		ws.Write(ctx, websocket.MessageText, []byte(`{"t":"historial","inicio":true}`))
		for len(previo) > 0 {
			n := min(len(previo), 256*1024)
			if ws.Write(ctx, websocket.MessageBinary, previo[:n]) != nil {
				return
			}
			previo = previo[n:]
		}
		ws.Write(ctx, websocket.MessageText, []byte(`{"t":"historial","fin":true}`))
		for {
			select {
			case <-ctx.Done():
				return
			case <-pty.fin:
				// La shell terminó (exit o Ctrl+D): se manda lo que quede y se avisa.
			vaciar:
				for {
					select {
					case b, ok := <-vista:
						if !ok {
							break vaciar
						}
						ws.Write(ctx, websocket.MessageBinary, b)
					default:
						break vaciar
					}
				}
				ws.Close(websocket.StatusNormalClosure, "fin")
				return
			case b, ok := <-vista:
				if !ok {
					ws.Close(websocket.StatusTryAgainLater, "lenta") // el cliente reconecta y recibe el búfer
					return
				}
				if enterPendiente.Load() && !pty.avisa.Load() { // si la shell avisa sola, sobra
					silencio.Reset(120 * time.Millisecond)
				}
				if ws.Write(ctx, websocket.MessageBinary, b) != nil {
					return
				}
			}
		}
	}()

	// navegador -> PTY
	for {
		typ, data, err := ws.Read(ctx)
		if err != nil {
			return
		}
		if typ == websocket.MessageBinary {
			if _, err := pty.conn.Write(data); err != nil {
				return
			}
			if bytes.IndexByte(data, '\r') >= 0 {
				s.Trigger()
				if !pty.avisa.Load() {
					enterPendiente.Store(true)
					silencio.Reset(400 * time.Millisecond)
				}
			}
			continue
		}
		var m ctrlMsg
		if json.Unmarshal(data, &m) != nil {
			continue
		}
		switch m.T {
		case "resize":
			if m.Cols > 0 && m.Rows > 0 && m.Cols <= 1000 && m.Rows <= 500 {
				a.dk.ExecResize(ctx, pty.id, m.Rows, m.Cols)
			}
		case "eco": // mide la ida y vuelta navegador <-> pasarela
			b, _ := json.Marshal(map[string]any{"t": "eco", "k": m.K})
			ws.Write(ctx, websocket.MessageText, b)
		}
	}
}

func (a *App) handleEventos(w http.ResponseWriter, r *http.Request) {
	s := a.sessions.Get(r.URL.Query().Get("s"))
	if s == nil || !suya(s, r) {
		http.Error(w, "sesión desconocida", http.StatusNotFound)
		return
	}
	ws, err := websocket.Accept(w, r, &websocket.AcceptOptions{CompressionMode: websocket.CompressionDisabled})
	if err != nil {
		return
	}
	ctx := ws.CloseRead(s.ctx)
	ch := s.Subscribe()
	defer s.Unsubscribe(ch)
	b, _ := json.Marshal(map[string]any{"t": "estado", "info": s.Info()})
	ws.Write(ctx, websocket.MessageText, b)
	s.Trigger()
	for {
		select {
		case <-ctx.Done():
			ws.Close(websocket.StatusNormalClosure, "")
			return
		case m := <-ch:
			if ws.Write(ctx, websocket.MessageText, m) != nil {
				return
			}
		}
	}
}
