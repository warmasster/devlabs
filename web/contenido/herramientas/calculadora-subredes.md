---
titulo: Calculadora de subredes IPv4
titulo_seo: Calculadora de subredes IPv4 online, máscara, broadcast y rango
corto: Calculadora de subredes
descripcion: Escribe una IP con su máscara y te da la red, el broadcast, el rango de IPs, cuántas máquinas caben y los bits. También parte la red en subredes más pequeñas.
fecha: 2026-11-07
categoria: Herramienta
modulo: 2.3
script: subredes
orden: 2
comando: ip -4 addr show eth0
relacionados: subnetting-calcular-subredes, ip-puertos-ping, comandos-basicos-linux
---

<div class="hr" id="subredes">
<div class="hr-fila">
<div class="hr-campo"><label for="sr-ip">IP y máscara</label><input type="text" id="sr-ip" value="192.168.1.10/24" autocomplete="off" spellcheck="false" /></div>
</div>
<div class="hr-aviso" id="sr-aviso" role="status"></div>
<div class="hr-salida" id="sr-salida"></div>
<div class="hr-bits" id="sr-bits"></div>
<div class="hr-fila hr-sep">
<div class="hr-campo"><label for="sr-div">Partir la red en</label><select id="sr-div"></select></div>
</div>
<div class="tabla hr-tabla" id="sr-tabla"></div>
<div class="hr-botones" role="group" aria-label="Ejemplos">
<button type="button" data-ip="192.168.1.10/24">192.168.1.10/24</button><button type="button" data-ip="10.20.30.40/8">10.20.30.40/8</button><button type="button" data-ip="172.16.45.10/20">172.16.45.10/20</button><button type="button" data-ip="192.168.10.77/26">192.168.10.77/26</button><button type="button" data-ip="10.0.0.1/30">10.0.0.1/30</button><button type="button" data-ip="100.64.3.9/10">100.64.3.9/10</button>
</div>
</div>

Vale con `192.168.1.10/24`, con `192.168.1.10 255.255.255.0` o con `192.168.1.10/255.255.255.0`. Lo que escribes queda en la dirección de la página para que puedas pasar el enlace.

## Qué te da la calculadora

- **Red.** La primera dirección de la subred. Nombra a la red entera y no se le pone a ninguna máquina.
- **Máscara.** La misma información que el `/24`, escrita como cuatro números.
- **Comodín (wildcard).** La máscara al revés. La usan las listas de acceso de Cisco y algunos cortafuegos.
- **Primera y última IP para máquinas.** El rango que puedes repartir.
- **Broadcast.** La última dirección. Lo que se manda ahí llega a todas las máquinas de la red.
- **Tipo.** Si es privada, pública, loopback o de otro rango especial.
- **Clase.** La clasificación antigua en A, B y C. Hoy no se usa para repartir redes, pero sale en exámenes.

Debajo, los bits. En verde la parte de red y en amarillo la parte de máquina. Ahí se ve de un vistazo por qué la red y el broadcast salen como salen.

## Tabla de máscaras

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
| /31 | 255.255.255.254 | 2 | 2, para unir dos routers |
| /32 | 255.255.255.255 | 1 | 1, una sola máquina |

## Cómo se calcula a mano

El tamaño de cada subred es 256 menos el número de la máscara en el octeto donde cae el corte. Con `/26` la máscara acaba en 192, y 256 menos 192 son 64. Las subredes van de 64 en 64, empiezan en 0, 64, 128 y 192.

La IP `192.168.10.77` cae en el bloque que empieza en 64. Así que la red es `192.168.10.64`, el broadcast es el último del bloque (`192.168.10.127`) y las máquinas van de la 65 a la 126.

El paso a paso con más ejemplos y cómo partir una red está en [cómo calcular subredes](/blog/subnetting-calcular-subredes).

## Las direcciones privadas

| Rango | Para qué |
| --- | --- |
| `10.0.0.0/8` | Redes internas grandes, nubes y Kubernetes |
| `172.16.0.0/12` | Redes internas y las redes de Docker |
| `192.168.0.0/16` | Casas y oficinas |
| `100.64.0.0/10` | El CGNAT de las operadoras, no es para tu red |
| `127.0.0.0/8` | La propia máquina |
| `169.254.0.0/16` | Lo que se pone una máquina cuando no le llega el DHCP |

## Preguntas frecuentes

### ¿Cuántas IP útiles tiene una /24?

254. Tiene 256 direcciones y se restan la de red y la de broadcast.

### ¿Qué diferencia hay entre /24 y 255.255.255.0?

Ninguna. Son la misma máscara escrita de dos formas. El `/24` cuenta cuántos bits a 1 tiene la máscara.

### ¿Qué es la máscara comodín o wildcard?

La máscara con los bits al revés. Para `255.255.255.0` es `0.0.0.255`. La usan las listas de acceso de Cisco y OSPF.

### ¿Por qué se restan dos direcciones?

Porque la primera es la dirección de la red y la última es la de broadcast. Ninguna de las dos se puede poner a una máquina. La excepción son las /31 y las /32.
