---
titulo: Cómo calcular subredes IPv4 paso a paso
titulo_seo: Subnetting fácil, cómo calcular subredes IPv4 paso a paso
corto: Cómo calcular subredes
descripcion: Subnetting explicado con ejemplos. Qué es la máscara, qué significa /24, cómo sacar la red, el broadcast y el rango de IPs, y cómo partir una red en subredes.
fecha: 2026-11-07
categoria: Redes
modulo: 2.3
orden: 14
comando: ip route
relacionados: calculadora-subredes, ip-puertos-ping, comandos-basicos-linux
---

Calcular subredes parece cosa de magia, pero es una cuenta con bits. En cuanto ves la IP en binario, todo sale solo. Esta guía va paso a paso, y si quieres comprobar tus cuentas tienes la [calculadora de subredes](/herramientas/calculadora-subredes).

## La IP tiene dos partes

Una IPv4 son 32 bits. Una parte dice en qué red está la máquina y el resto dice qué máquina es dentro de esa red. La máscara marca dónde está el corte.

```text
IP        192.168.1.130    11000000.10101000.00000001.10000010
Máscara   255.255.255.0    11111111.11111111.11111111.00000000
                           └────────── red ─────────┘ └máquina┘
```

La máscara son unos seguidos y luego ceros. Donde hay un 1, es parte de la red. Donde hay un 0, es parte de la máquina.

## Qué significa /24

El `/24` es la misma máscara escrita de otra forma. Cuenta cuántos unos tiene. `255.255.255.0` son 24 unos, así que es `/24`. A esta forma de escribirla se le llama notación CIDR.

| Prefijo | Máscara | Direcciones | Para máquinas |
| --- | --- | --- | --- |
| /8 | 255.0.0.0 | 16.777.216 | 16.777.214 |
| /16 | 255.255.0.0 | 65.536 | 65.534 |
| /20 | 255.255.240.0 | 4.096 | 4.094 |
| /22 | 255.255.252.0 | 1.024 | 1.022 |
| /23 | 255.255.254.0 | 512 | 510 |
| /24 | 255.255.255.0 | 256 | 254 |
| /25 | 255.255.255.128 | 128 | 126 |
| /26 | 255.255.255.192 | 64 | 62 |
| /27 | 255.255.255.224 | 32 | 30 |
| /28 | 255.255.255.240 | 16 | 14 |
| /29 | 255.255.255.248 | 8 | 6 |
| /30 | 255.255.255.252 | 4 | 2 |
| /32 | 255.255.255.255 | 1 | 1, una sola máquina |

La cuenta es siempre la misma. Con `n` bits para máquinas hay 2 elevado a `n` direcciones. Se restan dos porque la primera y la última están reservadas.

## Las dos direcciones reservadas

- **La de red** es la primera. Tiene todos los bits de máquina a 0. Nombra a la red entera y no se le pone a ninguna máquina.
- **La de broadcast** es la última. Tiene todos los bits de máquina a 1. Lo que se manda ahí llega a todas las máquinas de la red.

En `192.168.1.0/24`, la red es `192.168.1.0`, el broadcast es `192.168.1.255` y las máquinas van de `192.168.1.1` a `192.168.1.254`.

## Calcular una subred paso a paso

Una máquina tiene `192.168.10.77/26`. Hay que sacar su red, su broadcast y su rango.

**1. Mira en qué octeto cae el corte.** `/26` son los 24 bits de los tres primeros octetos y 2 más del cuarto. Los tres primeros (`192.168.10`) son enteros de red. Todo pasa en el último.

**2. Saca el tamaño del bloque.** En el último octeto quedan 6 bits para máquinas (8 menos 2). Eso son 2 elevado a 6, 64 direcciones por subred. Las subredes van de 64 en 64 y empiezan en 0, 64, 128 y 192.

**3. Busca en qué bloque cae la IP.** El 77 está entre 64 y 127. La subred empieza en 64.

**4. Escribe el resultado.**

| Dato | Valor |
| --- | --- |
| Red | 192.168.10.64/26 |
| Primera IP para máquinas | 192.168.10.65 |
| Última IP para máquinas | 192.168.10.126 |
| Broadcast | 192.168.10.127 |
| Máscara | 255.255.255.192 |
| Máquinas | 62 |

El truco del bloque vale para cualquier prefijo. El tamaño es 256 menos el número de la máscara en ese octeto. Con 255.255.255.192, el bloque es 256 menos 192, que son 64.

## Otro ejemplo, con el corte en el tercer octeto

Ahora `172.16.45.10/20`. `/20` son los 16 bits de los dos primeros octetos y 4 del tercero, así que el corte cae en el tercero.

- La máscara es 255.255.240.0. En el tercer octeto, 240.
- El bloque en el tercer octeto es 256 menos 240, que son 16. Las subredes empiezan en 0, 16, 32, 48 y así.
- El 45 cae entre 32 y 47. La red es `172.16.32.0/20`.
- El broadcast es el final del bloque, `172.16.47.255`.
- Las máquinas van de `172.16.32.1` a `172.16.47.254`, que son 4.094.

## Partir una red en subredes

Te dan `192.168.1.0/24` y necesitas cuatro redes iguales, una por departamento.

Para cuatro redes hacen falta 2 bits más de red, porque 2 elevado a 2 son 4. El prefijo pasa de /24 a /26.

| Subred | Red | Máquinas | Broadcast |
| --- | --- | --- | --- |
| 1 | 192.168.1.0/26 | .1 a .62 | 192.168.1.63 |
| 2 | 192.168.1.64/26 | .65 a .126 | 192.168.1.127 |
| 3 | 192.168.1.128/26 | .129 a .190 | 192.168.1.191 |
| 4 | 192.168.1.192/26 | .193 a .254 | 192.168.1.255 |

Cada bit que le das a la red duplica el número de subredes y parte por la mitad las máquinas de cada una.

Si los departamentos tienen tamaños distintos, se usan máscaras de tamaño variable (VLSM). Se reparte primero la red más grande, luego la siguiente, y así hasta la más pequeña. Los enlaces entre dos routers se suelen hacer con /30 o /31.

## Verlo en Linux

```bash
$ ip -4 addr show eth0
    inet 192.168.10.77/26 brd 192.168.10.127 scope global eth0
$ ip route
default via 192.168.10.65 dev eth0
192.168.10.64/26 dev eth0 proto kernel scope link src 192.168.10.77
```

`brd` es el broadcast. La segunda ruta dice que toda la red `192.168.10.64/26` está conectada directamente. Para cualquier otra IP, el tráfico sale por la puerta de enlace, `192.168.10.65`.

Si está instalado, `ipcalc 192.168.10.77/26` te da lo mismo en la terminal.

## Preguntas frecuentes

### ¿Cuántas IP tiene una /24?

256 direcciones, de las que 254 se pueden poner a máquinas. Se restan la de red y la de broadcast.

### ¿Qué es la máscara de subred?

Un número de 32 bits que marca qué parte de la IP es la red y qué parte es la máquina. Se escribe como `255.255.255.0` o como `/24`.

### ¿Qué es una /30?

Una red de 4 direcciones con 2 para máquinas. Se usaba para unir dos routers. Hoy también se usa la /31, que según el RFC 3021 aprovecha sus dos direcciones.

### ¿Cómo sé si dos IP están en la misma red?

Aplica la máscara a las dos, con un AND bit a bit. Si sale la misma red, están en la misma. Con la [calculadora de subredes](/herramientas/calculadora-subredes) lo ves al momento.
