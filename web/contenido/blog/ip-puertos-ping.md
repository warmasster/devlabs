---
titulo: Qué es una IP, un puerto y ping, con ejemplos en Linux
corto: IP, puertos y ping
descripcion: Qué es una dirección IP y por qué llega hasta 255, IP pública y privada, qué es un puerto y cómo usar ping, ip addr y ss para verlo en tu propia máquina.
fecha: 2026-11-07
categoria: Redes
modulo: 0.1
orden: 11
comando: ping -c 3 10.0.0.20
relacionados: subnetting-calcular-subredes, calculadora-subredes, comandos-basicos-linux
---

Una dirección IP es la dirección de una máquina en una red. Un puerto es la puerta concreta de esa máquina por la que se llega a un programa. Con esas dos cosas, un mensaje sabe a qué máquina ir y a qué programa dentro de ella.

Es como una carta. La IP es la dirección del edificio y el puerto es el número del piso.

## Qué es una IP

Una IPv4 son cuatro números separados por puntos, como `192.168.1.20`. Cada número va de 0 a 255.

Llega hasta 255 porque cada número es un byte, ocho bits. Con ocho bits hay 256 combinaciones, del 0 al 255. Cuatro bytes son 32 bits, y eso da unos 4.300 millones de direcciones. Parecen muchas, pero se acabaron hace años. Por eso existe IPv6, con direcciones como `2001:db8::1`, que tiene de sobra.

En Linux, tus IP las enseña `ip addr`.

```bash
$ ip addr
1: lo: <LOOPBACK,UP> mtu 65536
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500
    inet 10.0.0.10/24 brd 10.0.0.255 scope global eth0
```

Cada bloque es una tarjeta de red. `lo` es una tarjeta de mentira que tiene toda máquina para hablar consigo misma, con la IP `127.0.0.1`. `eth0` es la de verdad, aquí con la IP `10.0.0.10`. El `/24` es la máscara, que dice qué parte de la IP es la red. Lo cuenta [cómo calcular subredes](/blog/subnetting-calcular-subredes).

## IP pública y privada

Hay rangos reservados para redes internas. No salen a internet y se pueden repetir en cada casa y en cada empresa.

| Rango | Se usa en |
| --- | --- |
| `10.0.0.0/8` | Empresas, nubes y Kubernetes |
| `172.16.0.0/12` | Empresas y las redes de Docker |
| `192.168.0.0/16` | Casas y oficinas pequeñas |

Tu ordenador en casa tiene una IP privada, como `192.168.1.20`. El router tiene una pública y hace de intermediario con internet. Eso se llama NAT.

## ping, comprobar si otra máquina contesta

`ping` manda un mensaje pequeño (un ICMP echo) a otra máquina y espera la respuesta.

```bash
$ ping -c 3 10.0.0.20
64 bytes from 10.0.0.20: icmp_seq=1 ttl=64 time=0.071 ms
64 bytes from 10.0.0.20: icmp_seq=2 ttl=64 time=0.058 ms
64 bytes from 10.0.0.20: icmp_seq=3 ttl=64 time=0.062 ms

--- 10.0.0.20 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss
```

- `-c 3` manda tres y para. Sin él, ping sigue hasta que pulsas Ctrl+C.
- `time` es lo que tarda en ir y volver. En la misma red, menos de un milisegundo. Al otro lado del mundo, más de cien.
- `0% packet loss` quiere decir que han vuelto todos.

Que una máquina no conteste al ping no significa que esté apagada. Muchos cortafuegos bloquean el ping a propósito. Para saber si un servicio funciona, hay que probar su puerto.

## Qué es un puerto

Una máquina puede tener muchos programas escuchando a la vez. Una web, una base de datos, SSH. El puerto es el número que dice a cuál va cada mensaje. Va del 1 al 65535.

| Puerto | Servicio |
| --- | --- |
| 22 | SSH |
| 53 | DNS |
| 80 | HTTP |
| 443 | HTTPS |
| 3306 | MySQL y MariaDB |
| 5432 | PostgreSQL |
| 6379 | Redis |

Los puertos por debajo del 1024 solo los puede abrir root. Por eso una web en pruebas suele ir en el 8080 o en el 3000.

## Ver qué puertos escucha tu máquina

```bash
$ sudo ss -tlnp
State   Local Address:Port   Process
LISTEN  0.0.0.0:22           users:(("sshd",pid=612))
LISTEN  127.0.0.1:5432       users:(("postgres",pid=801))
LISTEN  0.0.0.0:80           users:(("nginx",pid=930))
```

Las opciones son `t` (TCP), `l` (los que escuchan), `n` (números en vez de nombres) y `p` (qué programa).

Fíjate en la dirección. `0.0.0.0:80` escucha en todas las tarjetas, así que llega desde fuera. `127.0.0.1:5432` solo escucha en la propia máquina. Es un fallo muy común. Un servicio «no funciona» desde fuera porque solo escucha en 127.0.0.1.

Para probar un puerto de otra máquina, usa `nc -zv 10.0.0.20 80` o `curl -v http://10.0.0.20`.

## Preguntas frecuentes

### ¿Cómo sé mi IP en Linux?

Con `ip addr` (o `ip a`) ves las IP de cada tarjeta de red. Para saber tu IP pública, `curl ifconfig.me`.

### ¿Qué es 127.0.0.1?

La IP de la propia máquina, también llamada localhost. Lo que mandas ahí no sale nunca de la máquina.

### ¿Por qué ping funciona pero la web no carga?

Porque ping solo comprueba que la máquina contesta. La web necesita además que su programa esté escuchando en el puerto 80 o 443 y que ningún cortafuegos lo bloquee.

### ¿Qué diferencia hay entre TCP y UDP?

TCP abre una conexión y comprueba que todo llega, y en orden. UDP manda sin esperar respuesta, así que es más rápido pero puede perder mensajes. La web y SSH van por TCP. El DNS y muchos juegos van por UDP.
