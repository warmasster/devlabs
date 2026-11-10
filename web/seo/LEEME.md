# seo/ y contenido/

Las páginas públicas de relavops, las que se ven sin cuenta y lee Google. La portada (`inicio.html`), el blog, el temario, las herramientas y el 404. Todo sale ya escrito en el HTML al compilar, sin depender de JavaScript.

## Qué hay en cada sitio

| Dónde | Qué es |
| --- | --- |
| `contenido/blog/*.md` | Un artículo por fichero. El nombre del fichero es su dirección (`git-basico.md` es `/blog/git-basico`) |
| `contenido/herramientas/*.md` | Una herramienta por fichero, con su HTML arriba y su explicación debajo |
| `seo/sitio.ts` | Dominio, nombre, quién firma, clave de IndexNow y códigos de verificación |
| `seo/markdown.ts` | El Markdown mínimo que entienden los artículos |
| `seo/contenido.ts` | Lee los artículos y las lecciones que ya se pueden jugar |
| `seo/paginas.ts` | Las plantillas, los datos para Google, el sitemap, el RSS, robots.txt y llms.txt |
| `seo/plugin.ts` | El plugin de Vite que lo junta todo al compilar |
| `src/publico/` | El CSS y el poco JS de estas páginas (copiar código, las calculadoras) |
| `generado/` | Lo escribe el plugin en cada compilación. **No se edita a mano** |
| `public/og/` | Las imágenes para redes, una por página. Las hace `scripts/og.mjs` |

Al compilar salen en `dist/` `blog.html`, `blog/*.html`, `temario.html`, `herramientas.html`, `herramientas/*.html`, `404.html`, `sitemap.xml`, `feed.xml`, `robots.txt`, `llms.txt` y la clave de IndexNow. labd los sirve sin cuenta (`publica()` en `labd/cuentas.go`) y da 404 a lo que no existe (`existeEn()` en `labd/main.go`).

## Añadir un artículo

1. Crea `contenido/blog/nombre-con-guiones.md`. El nombre lleva las palabras que la gente busca, sin tildes.
2. Arriba, la cabecera.

```
---
titulo: Lo que sale en grande, el h1
titulo_seo: Opcional, el título para Google si el h1 es largo (60 caracteres como mucho)
corto: Opcional, el nombre corto para las migas y el pie
descripcion: Lo que sale debajo del título en Google. Entre 120 y 160 caracteres
fecha: 2026-11-07
actualizado: Opcional, la fecha del último cambio de verdad
categoria: Linux
modulo: 0.4
orden: 15
comando: chmod 755 script.sh
relacionados: permisos-linux-chmod, calculadora-chmod
---
```

`modulo` es el número del temario que enseña lo mismo. Si su lección ya existe, el artículo acaba con un botón que la abre. `comando` es lo que sale en la imagen para redes. `relacionados` son los tres artículos de «Sigue aprendiendo». Si falta, salen los de la misma categoría.

3. Escribe el texto. Funciona `##` y `###` (los `##` forman el índice), párrafos, listas, tablas, bloques de código con ```` ```bash ````, notas con `>` y enlaces `[texto](/blog/otro)`. Una sección `## Preguntas frecuentes` con cada pregunta en un `###` pasa también a los datos para Google.
4. Sigue las reglas de escritura de [../src/curso/lecciones/LEEME.md](../src/curso/lecciones/LEEME.md). Sin dos puntos ni rayas largas en la prosa, frases cortas y nada de marketing.
5. Lanza, desde `web/`:

```
node scripts/og.mjs        # la imagen para redes del artículo nuevo
npm run build
node ../pruebas/estilo.mjs # dos puntos y rayas
node ../pruebas/seo.mjs    # enlaces, títulos y datos para Google
```

6. Publica como siempre (`powershell -File build.ps1` y `instalador/actualizar.sh` en el VPS) y luego avisa a Bing con `node scripts/indexnow.mjs`. A Google le basta el sitemap, pero puedes pedir que lo mire antes en Search Console, en «Inspección de URLs».

## Qué hace que estas páginas posicionen

- **El texto está en el HTML.** Google no tiene que ejecutar nada para leerlo, y la portada ya no carga las lecciones para contarlas.
- **Una dirección por página.** Sin `.html`, sin barra final (labd redirige con 301) y con `<link rel="canonical">`.
- **404 de verdad.** Lo que no existe da 404 con cuenta o sin ella, en vez de mandar a entrar.
- **Datos para Google (schema.org).** Organization y WebSite en la portada, BlogPosting y BreadcrumbList en cada artículo, Course en el temario y WebApplication en las herramientas. Google ya no enseña las preguntas frecuentes ni los cursos como resultados enriquecidos, pero los datos ayudan a entender la página y los usan otros buscadores y asistentes.
- **Enlaces entre páginas.** Cada artículo enlaza a otros, a su lección y al temario. El pie lleva a todo.
- **Imágenes para redes.** Cada página tiene la suya, de 1200x630.
- **sitemap.xml, feed.xml, robots.txt y llms.txt** se generan solos con las fechas de cada artículo.
- **IndexNow** para Bing, Yandex, Seznam y Naver.
