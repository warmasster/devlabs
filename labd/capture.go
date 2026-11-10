package main

// Captura en vivo: tcpdump dentro de los nodos del lab -> eventos "paquete" para los diagramas.
// Se captura solo el tráfico de salida de cada interfaz para ver cada salto una única vez.

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

var (
	reCab  = regexp.MustCompile(`^(\d+\.\d+) ([0-9a-f:]{17}) > ([0-9a-f:]{17}), ethertype (\w+) \(0x[0-9a-f]+\), length (\d+): (.*)$`)
	reReq  = regexp.MustCompile(`Request who-has (\S+) tell (\S+?),`)
	reRep  = regexp.MustCompile(`Reply (\S+) is-at ([0-9a-f:]{17})`)
	reTTL  = regexp.MustCompile(`ttl (\d+),`)
	reICMP = regexp.MustCompile(`^\s*(\S+) > (\S+): ICMP (.*?)(?:, id (\d+), seq (\d+))?, length \d+`)
)

func (s *Session) StartCaptura() {
	s.mu.Lock()
	if s.captura {
		s.mu.Unlock()
		return
	}
	s.captura = true
	s.mu.Unlock()
	for _, c := range s.Spec.Captura {
		go s.capturar(c)
	}
}

func (s *Session) capturar(c CapturaSpec) {
	filtro := c.Filtro
	if filtro == "" {
		filtro = "arp or icmp"
	}
	cmd := append([]string{"tcpdump", "-l", "-nn", "-e", "-v", "-tt", "-Q", "out", "-i", c.Interfaz}, strings.Fields(filtro)...)
	var pend map[string]any // paquete IPv4 esperando su segunda línea
	emit := func(p map[string]any) {
		p["t"] = "paquete"
		p["nodo"] = c.Nodo
		p["if"] = c.Interfaz
		s.Broadcast(p)
	}
	for s.ctx.Err() == nil {
		s.eng.dk.Stream(s.ctx, s.Inst.Nodos[c.Nodo], cmd, func(l string) {
			if m := reCab.FindStringSubmatch(l); m != nil {
				if pend != nil {
					emit(pend)
					pend = nil
				}
				ts, _ := strconv.ParseFloat(m[1], 64)
				p := map[string]any{"ts": ts, "mac_src": m[2], "mac_dst": m[3], "texto": l}
				rest := m[6]
				switch m[4] {
				case "ARP":
					p["tipo"] = "arp"
					if r := reReq.FindStringSubmatch(rest); r != nil {
						p["arp"] = map[string]any{"op": "request", "busca": r[1], "de": r[2]}
					} else if r := reRep.FindStringSubmatch(rest); r != nil {
						p["arp"] = map[string]any{"op": "reply", "ip": r[1], "mac": r[2]}
					}
					emit(p)
				case "IPv4":
					p["tipo"] = "ipv4"
					if r := reTTL.FindStringSubmatch(rest); r != nil {
						p["ttl"], _ = strconv.Atoi(r[1])
					}
					pend = p
				}
				return
			}
			if pend != nil {
				if r := reICMP.FindStringSubmatch(l); r != nil {
					pend["src"], pend["dst"], pend["icmp"] = r[1], r[2], r[3]
					if r[5] != "" {
						pend["seq"], _ = strconv.Atoi(r[5])
					}
				}
				pend["texto"] = pend["texto"].(string) + "\n" + l
				emit(pend)
				pend = nil
			}
		})
		time.Sleep(time.Second) // si tcpdump muere (p. ej. interfaz caída), se relanza
	}
}
