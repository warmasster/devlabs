# pruebas/

Necesitan `labd` en marcha en la distro de WSL `relavops-m6`, en el puerto 8080 (o en otro con `LABD=http://localhost:8090`). Los dos primeros entran en los contenedores con `docker exec`. El de lección abre además una terminal de verdad y pulsa Enter tras cada etapa, como el alumno, para que labd compruebe en el acto.

| Script | Qué comprueba |
| --- | --- |
| `node pruebas/labs-leccion.mjs [lab]` | Cada lab de lección. Resuelve la misión dentro del lab, espera a que labd valide cada paso y mira que las sondas llegan con datos. También los bosses del tutorial. |
| `node pruebas/labs-practica.mjs [lab]` | Cada lab de práctica. Resuelve la misión y luego, uno a uno, cada fallo del boss. Avisa si un boss se da por vencido antes de arreglarlo. |
| `node pruebas/aislamiento.mjs [lab]` | Que los labs están aislados. Abre uno de cada tipo (contenedor, red propia, topologías, juego y Sysbox) e intenta escaparse desde dentro: montar, leer discos, llegar a Docker, a Internet, al servidor o al lab de otro, y pasar de los topes de procesos, RAM, fichero y disco. Para las dos últimas, labd con `-tope-fichero 200M -disco-lab 400M`. |
| `node pruebas/comandos.mjs [--todo]` | **La regla de oro.** Recorre las lecciones en orden y falla si una tarea, una misión de práctica o un boss (con sus pistas y su solución) usa un comando, una opción o un símbolo de la shell que no se ha enseñado antes con su ficha. Con `--todo` enseña el catálogo entero y dónde se enseña cada cosa. No necesita labd. |
| `node pruebas/reglas.mjs [--todo]` | Las reglas de las lecciones. Datos en vivo sin `tras` ni `efecto`, botones que hacen el trabajo del alumno, `haz` o `tras` que no existen en la misión, y pasos sin nada en la terminal. Con `--todo` lista todos los pasos. No necesita labd. |
| `node pruebas/progreso.mjs` | Que el progreso guardado con la numeración de antes pasa bien a la nueva, una sola vez, y que las notas de la chuleta se guardan y se borran. No necesita labd. |
| `node pruebas/estilo.mjs` | Dos puntos y rayas largas en la prosa de lecciones, labs y artículos del blog. Ignora lo que va entre comillas invertidas. |
| `node pruebas/seo.mjs` | Las páginas públicas de `web/dist` (portada, blog, temario y herramientas). Enlaces rotos, títulos repetidos, datos para Google y sitemap. Compila antes la web. No necesita labd. |

La batería de la terminal (M1) sigue en `web/tests/` con Playwright.

Las soluciones de cada lab están dentro de los scripts. Si añades un lab, añade también su solución, o la prueba no lo cubrirá.
