# Índice de relavops

Un curso de DevOps que se aprende tocando. Cada lección corre al lado de una o varias máquinas Linux de verdad, y la lección ve lo que pasa en ellas mientras escribes.

Este fichero es la puerta de entrada. Cada carpeta tiene su propio LEEME con el detalle.

> **Para agentes y asistentes de código.** Empieza siempre por aquí. Ve solo a la carpeta que tu tarea necesita y lee su LEEME antes de abrir nada más. No recorras el resto del proyecto si no hace falta. Si la tabla de abajo no te dice dónde está algo, pregunta antes de buscar por todo el árbol.

## Qué hay en cada carpeta

| Carpeta | Qué es | Entra si vas a… | LEEME |
| --- | --- | --- | --- |
| `labs/` | Un lab por carpeta, definido en un `lab.yaml`. Máquinas, sondas, misión y boss. | crear o arreglar un lab, una comprobación o un boss | [labs/LEEME.md](labs/LEEME.md) |
| `web/src/curso/lecciones/` | Las lecciones. Un fichero por lección con sus pasos y widgets. | escribir o cambiar el contenido de una lección | [lecciones/LEEME.md](web/src/curso/lecciones/LEEME.md) |
| `web/src/curso/widgets/` | Los 54 widgets de las lecciones. Funciones reutilizables. | crear un widget o cambiar cómo se ve uno | [widgets/LEEME.md](web/src/curso/widgets/LEEME.md) |
| `web/src/curso/` | El resto del curso en la web. Reproductor de lección, mapa, chuleta, arcade, progreso y temario. | tocar la página de lección, el mapa, la chuleta o el progreso | [curso/LEEME.md](web/src/curso/LEEME.md) |
| `web/` | La web entera (Vite y TypeScript). Páginas HTML, estilo común, terminal, muestrario M1 a M6 y juegos. | cosas de la web que no son el curso | [README.md](README.md) |
| `labd/` | El servidor en Go. Sirve la web, arranca los labs, abre las terminales y ejecuta comprobaciones y sondas. | cambiar cómo se arrancan los labs o la API | [labd/LEEME.md](labd/LEEME.md) |
| `cuentas/` | Las cuentas, en un Worker de Cloudflare con D1. Alta, entrada, clases de los profes, progreso, latidos de los servidores y el panel de admin. | tocar usuarios, roles, clases, métricas o el correo | [cuentas/LEEME.md](cuentas/LEEME.md) |
| `web/contenido/`, `web/seo/`, `web/src/publico/` | Las páginas públicas que lee Google. Artículos del blog y herramientas en Markdown, el generador de páginas, el sitemap y los datos para buscadores. | escribir un artículo, una herramienta o tocar el SEO | [web/seo/LEEME.md](web/seo/LEEME.md) |
| `web/src/cuenta/`, `web/src/admin/` | Las páginas de entrar, Mi cuenta, el panel del profe y el panel de admin. | cambiar cómo se ven esas páginas | este índice y [cuentas/LEEME.md](cuentas/LEEME.md) |
| `pruebas/` | Pruebas de punta a punta de los labs y del estilo de los textos. | comprobar que nada se ha roto | [pruebas/LEEME.md](pruebas/LEEME.md) |
| `imagenes/` | Las imágenes Docker de los labs (`relavops/base`, `frr`, `juego`). | instalar un programa nuevo en las máquinas | Dockerfiles comentados |
| `instalador/` | El instalador de un comando para Windows, Linux y Mac, y el del VPS. | cambiar la instalación o publicar en el VPS | [README.md](README.md), [instalador/LEEME-vps.md](instalador/LEEME-vps.md) |
| `juegos/`, `voces/`, `densidad/` | Restos del muestrario. Generador de juegos, pruebas de voz y medición de densidad. | solo si la tarea es de eso | [docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md) |
| `docs/` | Decisiones técnicas con números medidos. | entender por qué algo es como es | [docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md) |
| `redes-sociales/` | La estrategia de redes sociales y el guion de cada vídeo. | planear o grabar un vídeo para TikTok, Reels, Shorts o LinkedIn | [redes-sociales/LEEME.md](redes-sociales/LEEME.md) |
| `dist/`, `labd/webdist/`, `labd/labsdist/`, `web/dist/`, `web/generado/`, `web/node_modules/` | Generado al compilar. | nunca. No se edita a mano | |

## Direcciones

Con `labd` en marcha, todo está en http://localhost:8080. Las direcciones van sin `.html` (las viejas con `.html` redirigen).

| Dirección | Qué es |
| --- | --- |
| `/curso` | El mapa del curso. Las islas del cinturón blanco, la ficha de la lección y lo que viene después |
| `/chuleta` | La chuleta del alumno. Los comandos que lleva aprendidos, con sus notas |
| `/leccion?m=0.0` | Una lección. `m` es el número del temario |
| `/arcade` | Juegos cortos sin lab |
| `/` | La portada pública (`inicio.html`). Sin `-cuentas`, la raíz lleva a `-inicio` o al muestrario |
| `/blog`, `/blog/…`, `/temario`, `/herramientas`, `/herramientas/…` | Las páginas públicas, sin cuenta. Salen de `web/contenido` y `web/seo` |
| `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/llms.txt` | Para los buscadores. Se generan al compilar |
| `/muestrario` | El muestrario M1 a M6, de antes del curso |
| `/entrar` | Entrar y crear cuenta. `?clase=CODIGO` abre el alta con el código de una clase |
| `/cuenta` | Mi cuenta. Clases, correo, contraseña, dispositivos y borrar la cuenta |
| `/profe` | Panel del profe. Sus clases, el progreso de cada alumno y cuentas en bloque |
| `/admin` | Panel de admin. Métricas, usuarios, clases, labs, servidores, actividad y ajustes |
| `/juegos` | Los exámenes finales en forma de juego |
| `/api/…` y `/ws/…` | La API de labd. Está en [labd/LEEME.md](labd/LEEME.md) |
| `/api/cuenta/…`, `/api/clases…`, `/api/admin/…`, `/api/nodos/…` | La API de cuentas, en el Worker. Está en [cuentas/LEEME.md](cuentas/LEEME.md) |

## Cómo arrancarlo para desarrollar

En Windows, con la distro de WSL `relavops-m6` instalada (si aún se llama `devlabs-m6`, los scripts la encuentran igual).

```
cd web && npm run build && cd ..
bash dev-m6.sh
```

`dev-m6.sh` compila `labd`, para el servicio instalado y lanza `labd` leyendo la web y los labs desde esta carpeta. Al acabar, `wsl -d relavops-m6 -u root -- systemctl start relavops` deja el servicio como estaba.

Así no pide cuenta. Para probar con cuentas, arranca el Worker en local (`cd cuentas && npm run dev`) y lanza `CUENTAS=http://IP-DE-WINDOWS:8787 bash dev-m6.sh`. Lo explica [cuentas/LEEME.md](cuentas/LEEME.md#probar-en-local).

## Antes de dar algo por bueno

```
node pruebas/comandos.mjs   # nada se pide sin haberlo enseñado antes
node pruebas/reglas.mjs     # las reglas de las lecciones
node pruebas/estilo.mjs     # dos puntos y rayas largas
```

Las tres van sin labd. Con labd en marcha, además `node pruebas/labs-leccion.mjs` y `node pruebas/labs-practica.mjs`.

## Cómo encaja todo

1. La lección (`lecciones/0-1.ts`) es una lista de pasos. Cada paso dice qué lab se ve a la derecha y qué widgets van a la izquierda.
2. El reproductor (`curso/leccion.ts`) pide ese lab a `labd`, que lo saca de un pool en caliente en milisegundos.
3. `labd` ejecuta en el lab, al volver el prompt y cada segundo, las **comprobaciones** de la misión y las **sondas** del `lab.yaml`. Lo hace un vigía que vive dentro de cada nodo (ver labd/LEEME.md).
4. Por WebSocket llegan los eventos. Un paso cumplido desbloquea un widget `haz`. Una sonda que cambia actualiza el widget que la escucha, por ejemplo un puerto que se abre o un fichero que se lee con cat.
