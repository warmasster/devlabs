package main

// Cliente mínimo de la API de Docker Engine por socket Unix.
// Solo lo que necesita labd: exec con PTY (hijack), redimensionar y exec de comprobación.

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"
)

type Docker struct {
	sock string
	hc   *http.Client
}

func NewDocker(sock string) *Docker {
	tr := &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			var d net.Dialer
			return d.DialContext(ctx, "unix", sock)
		},
		MaxIdleConns:        64,
		MaxIdleConnsPerHost: 64,
		IdleConnTimeout:     60 * time.Second,
	}
	return &Docker{sock: sock, hc: &http.Client{Transport: tr}}
}

func (d *Docker) call(ctx context.Context, method, path string, in, out any) error {
	var body io.Reader
	if in != nil {
		b, _ := json.Marshal(in)
		body = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, "http://docker"+path, body)
	if err != nil {
		return err
	}
	if in != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := d.hc.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("docker %s %s: %d %s", method, path, resp.StatusCode, strings.TrimSpace(string(b)))
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	io.Copy(io.Discard, resp.Body)
	return nil
}

type execConfig struct {
	AttachStdin  bool
	AttachStdout bool
	AttachStderr bool
	Tty          bool
	Env          []string `json:",omitempty"`
	Cmd          []string
	ConsoleSize  *[2]int `json:",omitempty"` // [alto, ancho]
	WorkingDir   string  `json:",omitempty"`
	User         string  `json:",omitempty"`
}

func (d *Docker) ExecCreate(ctx context.Context, container string, cfg execConfig) (string, error) {
	var out struct{ Id string }
	err := d.call(ctx, "POST", "/containers/"+container+"/exec", cfg, &out)
	return out.Id, err
}

// ExecAttach arranca el exec y devuelve la conexión cruda (bytes del PTY en ambos sentidos).
func (d *Docker) ExecAttach(ctx context.Context, id string, tty bool, size *[2]int) (net.Conn, *bufio.Reader, error) {
	var dl net.Dialer
	conn, err := dl.DialContext(ctx, "unix", d.sock)
	if err != nil {
		return nil, nil, err
	}
	body, _ := json.Marshal(map[string]any{"Detach": false, "Tty": tty, "ConsoleSize": size})
	fmt.Fprintf(conn, "POST /exec/%s/start HTTP/1.1\r\nHost: docker\r\nContent-Type: application/json\r\n"+
		"Connection: Upgrade\r\nUpgrade: tcp\r\nContent-Length: %d\r\n\r\n%s", id, len(body), body)
	br := bufio.NewReaderSize(conn, 32*1024)
	resp, err := http.ReadResponse(br, nil)
	if err != nil {
		conn.Close()
		return nil, nil, err
	}
	if resp.StatusCode != http.StatusSwitchingProtocols && resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		conn.Close()
		return nil, nil, fmt.Errorf("exec start: %d %s", resp.StatusCode, b)
	}
	return conn, br, nil
}

func (d *Docker) ExecResize(ctx context.Context, id string, rows, cols int) error {
	return d.call(ctx, "POST", fmt.Sprintf("/exec/%s/resize?h=%d&w=%d", id, rows, cols), nil, nil)
}

func (d *Docker) ExecExitCode(ctx context.Context, id string) (int, bool, error) {
	var out struct {
		ExitCode int
		Running  bool
	}
	err := d.call(ctx, "GET", "/exec/"+id+"/json", nil, &out)
	return out.ExitCode, out.Running, err
}

// Run ejecuta un comando sin TTY y devuelve stdout+stderr y el código de salida.
func (d *Docker) Run(ctx context.Context, container string, cmd ...string) (string, int, error) {
	id, err := d.ExecCreate(ctx, container, execConfig{AttachStdout: true, AttachStderr: true, Cmd: cmd})
	if err != nil {
		return "", -1, err
	}
	conn, br, err := d.ExecAttach(ctx, id, false, nil)
	if err != nil {
		return "", -1, err
	}
	defer conn.Close()
	if dl, ok := ctx.Deadline(); ok {
		conn.SetDeadline(dl)
	}
	var out bytes.Buffer
	if err := demux(br, &out); err != nil && err != io.EOF {
		return out.String(), -1, err
	}
	// La salida se cierra un pelo antes de que Docker apunte el código. Mientras siga "corriendo",
	// el código que da es 0, y una comprobación que falla parecería superada.
	for i := 0; ; i++ {
		code, corriendo, err := d.ExecExitCode(ctx, id)
		if err != nil || !corriendo {
			return out.String(), code, err
		}
		if i == 50 {
			return out.String(), -1, fmt.Errorf("exec %s sin código de salida", id)
		}
		time.Sleep(10 * time.Millisecond)
	}
}

// TamEscrito da lo que ha escrito un contenedor en su capa propia (su disco), en bytes.
func (d *Docker) TamEscrito(ctx context.Context, container string) (int64, error) {
	var out struct{ SizeRw int64 }
	err := d.call(ctx, "GET", "/containers/"+container+"/json?size=1", nil, &out)
	return out.SizeRw, err
}

// Stream ejecuta un comando largo (p. ej. tcpdump) y entrega su salida línea a línea.
func (d *Docker) Stream(ctx context.Context, container string, cmd []string, line func(string)) error {
	id, err := d.ExecCreate(ctx, container, execConfig{AttachStdout: true, AttachStderr: true, Cmd: cmd})
	if err != nil {
		return err
	}
	conn, br, err := d.ExecAttach(ctx, id, false, nil)
	if err != nil {
		return err
	}
	go func() { <-ctx.Done(); conn.Close() }()
	pr, pw := io.Pipe()
	go func() { pw.CloseWithError(demux(br, pw)) }()
	sc := bufio.NewScanner(pr)
	sc.Buffer(make([]byte, 64*1024), 1024*1024)
	for sc.Scan() {
		line(sc.Text())
	}
	return sc.Err()
}

// demux separa el flujo multiplexado de Docker (cabecera de 8 bytes por trozo).
func demux(r io.Reader, w io.Writer) error {
	var hdr [8]byte
	for {
		if _, err := io.ReadFull(r, hdr[:]); err != nil {
			return err
		}
		n := binary.BigEndian.Uint32(hdr[4:])
		if _, err := io.CopyN(w, r, int64(n)); err != nil {
			return err
		}
	}
}
