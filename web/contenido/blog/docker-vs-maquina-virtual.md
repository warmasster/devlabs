---
titulo: Qué es un contenedor y en qué se diferencia de una máquina virtual
titulo_seo: Contenedor o máquina virtual, qué es Docker por dentro
corto: Contenedores y máquinas virtuales
descripcion: Qué es un contenedor de verdad, cómo lo construye Linux con namespaces y cgroups, en qué se diferencia de una máquina virtual y cuándo conviene cada uno.
fecha: 2026-11-07
categoria: Contenedores
modulo: 4.1
orden: 13
comando: docker run --rm -it debian bash
relacionados: que-es-devops, aprender-devops-desde-cero, sistema-ficheros-linux
---

Un contenedor es un proceso normal de Linux al que el kernel le enseña una versión recortada del sistema. Ve sus propios procesos, su propia red y sus propios ficheros, y tiene un límite de CPU y de memoria. Pero sigue siendo un proceso del mismo kernel que todo lo demás.

Una máquina virtual es otra cosa. Es un ordenador entero simulado, con su propio kernel, encima de un hipervisor.

## La diferencia en un dibujo

```text
   Máquinas virtuales               Contenedores

  ┌─────────┐ ┌─────────┐       ┌───────┐ ┌───────┐ ┌───────┐
  │  App A  │ │  App B  │       │ App A │ │ App B │ │ App C │
  │ Librer. │ │ Librer. │       │ Libr. │ │ Libr. │ │ Libr. │
  │ Kernel  │ │ Kernel  │       └───────┘ └───────┘ └───────┘
  └─────────┘ └─────────┘       ┌───────────────────────────┐
  ┌───────────────────────┐     │ Un solo kernel de Linux   │
  │ Hipervisor            │     └───────────────────────────┘
  └───────────────────────┘     ┌───────────────────────────┐
  ┌───────────────────────┐     │ Máquina                   │
  │ Máquina               │     └───────────────────────────┘
  └───────────────────────┘
```

Cada máquina virtual lleva su kernel y arranca un sistema completo. Los contenedores comparten el kernel de la máquina y solo traen sus programas y librerías.

| | Máquina virtual | Contenedor |
| --- | --- | --- |
| Qué aísla | Un ordenador entero | Un grupo de procesos |
| Kernel | El suyo propio | El de la máquina |
| Arranque | Decenas de segundos | De milisegundos a pocos segundos |
| Tamaño típico | Gigas | De pocos megas a cientos |
| Aislamiento | Muy fuerte | Bueno, pero comparten kernel |
| Otro sistema operativo | Sí, por ejemplo Windows dentro de Linux | No, un contenedor de Linux necesita un kernel Linux |

## Cómo hace Linux un contenedor

No hay ninguna pieza del kernel que se llame «contenedor». Docker junta tres cosas que Linux ya tenía.

### Namespaces, lo que el proceso puede ver

Un namespace le da al proceso su propia vista de una parte del sistema.

| Namespace | Qué aísla |
| --- | --- |
| pid | Los procesos. Dentro, el primero es el 1 |
| net | La red. Sus propias tarjetas, IP y puertos |
| mnt | Los ficheros montados. Su propio `/` |
| uts | El nombre de la máquina |
| ipc | La memoria compartida entre procesos |
| user | Los usuarios. Root dentro puede no serlo fuera |
| cgroup | Su vista de los cgroups |

Lo puedes probar sin Docker. Este comando abre una shell con sus propios procesos.

```bash
$ sudo unshare --pid --fork --mount-proc bash
# ps aux
USER   PID  COMMAND
root     1  bash
root     8  ps aux
```

Dentro, la shell cree que es el proceso 1 y no ve nada más. Desde fuera, es un proceso más.

### cgroups, lo que el proceso puede gastar

Los cgroups ponen límites de CPU, memoria, número de procesos y disco a un grupo de procesos. Cuando haces `docker run --memory 256m`, Docker escribe ese límite en un fichero del cgroup del contenedor. Si el contenedor se pasa, el kernel mata a uno de sus procesos. Es el famoso OOMKilled.

### Un sistema de ficheros por capas

La imagen de un contenedor son varias capas de ficheros, una encima de otra, que se juntan con OverlayFS. Las capas de la imagen no se tocan. Lo que el contenedor escribe va a una capa nueva encima, que se borra con el contenedor.

Por eso diez contenedores de la misma imagen no ocupan diez veces más. Comparten las capas de abajo.

## Imagen y contenedor

- Una **imagen** es la plantilla. Los ficheros y la configuración, sin nada corriendo.
- Un **contenedor** es una imagen en marcha. Un proceso con su capa de escritura.

```bash
docker pull nginx                # baja la imagen
docker run -d -p 8080:80 nginx   # arranca un contenedor
docker ps                        # los contenedores en marcha
docker exec -it ID bash          # entra en uno
docker logs ID                   # lo que ha escrito
docker rm -f ID                  # lo para y lo borra
```

## Cuándo usar cada uno

Usa contenedores para empaquetar aplicaciones y desplegarlas igual en todas partes. Es lo normal para webs, APIs, bases de datos en desarrollo y pipelines de CI.

Usa máquinas virtuales cuando necesitas otro kernel u otro sistema operativo, o cuando el aislamiento tiene que ser muy fuerte, como al ejecutar código de desconocidos. Y en la nube, tus contenedores casi siempre corren dentro de máquinas virtuales.

Hay un punto intermedio, las microVM como Firecracker. Arrancan casi tan rápido como un contenedor, pero con su propio kernel, como una máquina virtual. Las usa AWS Lambda.

## Preguntas frecuentes

### ¿Docker es una máquina virtual?

No. Docker arranca procesos aislados en el mismo kernel. En Windows y macOS sí usa una máquina virtual pequeña por debajo, porque necesita un kernel Linux.

### ¿Un contenedor es seguro?

Bastante, si se configura bien. Pero comparte el kernel con la máquina, así que un fallo del kernel o un contenedor con `--privileged` pueden afectar a todo. No ejecutes como root dentro si no hace falta.

### ¿Qué es Kubernetes respecto a Docker?

Docker arranca contenedores en una máquina. Kubernetes reparte contenedores entre muchas máquinas, los vuelve a arrancar si fallan y los conecta entre sí.

### ¿Qué diferencia hay entre Docker y Podman?

Hacen lo mismo y aceptan casi los mismos comandos. Podman no necesita un servicio corriendo de fondo y está pensado para usarse sin root.
