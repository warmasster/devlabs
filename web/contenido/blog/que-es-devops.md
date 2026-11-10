---
titulo: Qué es DevOps, explicado sin humo
corto: Qué es DevOps
descripcion: Qué es DevOps de verdad, qué problema resuelve, qué hace un ingeniero DevOps en su día a día y en qué se diferencia de un sysadmin y de un SRE.
fecha: 2026-11-07
categoria: DevOps
orden: 2
comando: git push origin main
relacionados: aprender-devops-desde-cero, docker-vs-maquina-virtual, git-basico
---

DevOps es una forma de trabajar en la que el equipo que escribe el software también se ocupa de desplegarlo y de mantenerlo funcionando. El nombre junta dos palabras en inglés, desarrollo (development) y operaciones (operations).

No es un programa ni un lenguaje. Es una cultura con unas prácticas concretas, y alrededor de esas prácticas han nacido muchas herramientas.

## El problema que resuelve

Antes, en muchas empresas había dos equipos separados. Desarrollo escribía el código y se lo pasaba a Operaciones, que lo instalaba en los servidores. Cada equipo tenía objetivos opuestos.

- Desarrollo quería sacar cambios rápido.
- Operaciones quería que nada se moviera, porque cada cambio podía romper algo.

El resultado eran despliegues una vez al mes, de noche y con miedo. Si algo fallaba, cada equipo culpaba al otro. Y la frase de siempre, «en mi máquina funciona».

DevOps junta esas dos mitades. Si tú construyes algo, tú lo pones en marcha y tú te enteras cuando falla. Eso obliga a hacer cambios pequeños, automatizar todo lo repetido y medir lo que pasa en producción.

## Las prácticas de DevOps

Estas son las ideas que más se repiten en los equipos que lo hacen bien.

- **Integración continua (CI).** Cada cambio se junta con el resto varias veces al día y pasa tests automáticos.
- **Entrega y despliegue continuos (CD).** Lo que pasa los tests puede llegar a producción con un botón, o solo.
- **Infraestructura como código.** Los servidores, las redes y los permisos se describen en ficheros que viven en Git.
- **Monitorización.** Métricas, logs y alertas para saber qué pasa antes de que lo diga un cliente.
- **Cambios pequeños y frecuentes.** Un cambio pequeño se revisa fácil y se deshace fácil.
- **Postmortems sin culpables.** Cuando algo falla, se busca qué del sistema lo permitió, no a quién castigar.

## Qué hace un ingeniero DevOps

El puesto cambia mucho según la empresa, pero el día a día suele ir de esto.

- Montar y mantener los pipelines de CI/CD.
- Construir imágenes de contenedores y desplegarlas, a veces en Kubernetes.
- Escribir la infraestructura con herramientas como OpenTofu, Terraform o Ansible.
- Configurar la monitorización y las alertas, y atender incidentes.
- Ayudar a los desarrolladores a desplegar solos, sin depender de nadie.

Por debajo de todo hay Linux, redes y mucha terminal. Por eso la [ruta para aprender DevOps](/blog/aprender-devops-desde-cero) empieza por ahí.

## DevOps, sysadmin y SRE

Se parecen y se mezclan, pero no son lo mismo.

| Rol | En qué se centra |
| --- | --- |
| Sysadmin | Mantener servidores y servicios, muchas veces a mano |
| DevOps | Automatizar el camino del código a producción y quitar la barrera entre equipos |
| SRE | La fiabilidad medida con números, como los SLO, con mentalidad de ingeniería de software |
| Platform engineer | Construir una plataforma interna para que otros equipos desplieguen solos |

Un buen sysadmin que aprende Git, contenedores y CI ya está haciendo DevOps. Y un SRE, según la idea que lo creó en Google, es lo que pasa cuando le pides a un ingeniero de software que diseñe el trabajo de operaciones.

## Las herramientas más comunes

| Para qué | Herramientas |
| --- | --- |
| Código y versiones | Git, GitHub, GitLab, Forgejo |
| CI/CD | GitHub Actions, GitLab CI, Jenkins, Argo CD |
| Contenedores | Docker, Podman, containerd |
| Orquestación | Kubernetes |
| Infraestructura como código | OpenTofu, Terraform, Ansible |
| Métricas y logs | Prometheus, Grafana, Loki, OpenTelemetry |
| Nube | AWS, Azure, Google Cloud |

No hace falta saberlas todas. Si entiendes una de cada fila, aprender la de al lado lleva días, no meses. Lo que se aprende despacio es lo de debajo, Linux y redes.

## Preguntas frecuentes

### ¿DevOps es un puesto o una cultura?

Las dos cosas. Nació como cultura, pero hoy muchas empresas contratan «ingenieros DevOps» para montar y cuidar la parte de automatización e infraestructura.

### ¿Qué hay que estudiar para ser DevOps?

Linux, Bash, redes, Git, contenedores, CI/CD y una nube, en ese orden. La ruta completa está en [cómo aprender DevOps desde cero](/blog/aprender-devops-desde-cero).

### ¿DevOps es lo mismo que la nube?

No. La nube es un sitio donde alquilas máquinas y servicios. DevOps es cómo trabajas. Se puede hacer DevOps con servidores propios y se puede usar la nube sin hacer DevOps.

### ¿Cuál es la diferencia entre DevOps y SRE?

DevOps es la idea de unir desarrollo y operaciones. SRE es una forma concreta de hacerlo, nacida en Google, que mide la fiabilidad con objetivos numéricos y reparte el tiempo entre operar y automatizar.
