# web/src/curso/

El curso en la web. Si tu tarea es solo de contenido, ve directo a `lecciones/`. Si es de un widget, a `widgets/`. Cada una tiene su LEEME.

| Fichero o carpeta | Qué hace |
| --- | --- |
| `leccion.ts` (página `web/leccion`) | El reproductor. Lección a la izquierda, lab a la derecha. Un paso cada vez, con su botón de seguir bloqueado mientras quede algo por hacer. Guarda por dónde vas. |
| `nucleo/conexion.ts` | La conexión con un lab. Abre o recupera la sesión y reparte eventos, sondas y pasos a quien se suscriba. |
| `nucleo/panel-lab.ts` | El panel derecho. Tarjetas de las máquinas, pestañas y terminales. Tiene varios labs abiertos y enseña uno. Su botón de pantalla completa activa Keyboard Lock para que Ctrl+W, Ctrl+T y Ctrl+N lleguen a la terminal. |
| `nucleo/tipos.ts` | El contrato de los widgets (`Ctx`, `Widget`) y utilidades (`md`, `h`, `vivo`…). |
| `widgets/` | Los 53 widgets. Catálogo en su LEEME. |
| `lecciones/` | El contenido. Reglas de contenido y de escritura en su LEEME. |
| `escena.ts` | El motor de dibujos a mano por pasos (rough.js) que usa el widget `escena`. |
| `temario.ts` | Los 9 niveles con todos sus módulos. El mapa lo pinta tal cual. |
| `mapa.ts` (página `web/curso`) | El mapa de cinturones, la racha y el botón de continuar. |
| `progreso.ts` | XP, módulos hechos, racha con comodines y récords. Vive en el localStorage del navegador. Con cuenta, al entrar se mezcla con el guardado en la cuenta y cada cambio se sube solo (`web/src/cuenta/sesion.ts`). Así el profe lo ve y se sigue en otro dispositivo, también el paso al que llegaste en cada lección (`pasos`). Al salir de la cuenta se borra del navegador. |
| `isla/` | El modo islas. `mapa.ts` pinta la primera parte como islas unidas por un cable, con el personaje en tu lección. `temas.ts` tiene los fondos, las formas de isla, los personajes y el adorno de cada lección. `arranque.ts` es la animación mientras se levanta un lab. `precarga.ts` baja la página de la lección mientras miras el mapa. |
| `arcade.ts`, `juegos-lista.ts` (página `web/arcade`) | Cuatro juegos de 60 a 90 segundos sin lab. |

## Lo que ve el alumno al usar una lección

1. Al entrar, el panel derecho pide el lab del primer paso a labd (`POST /api/labs/ID/sesion`). Sale del pool en caliente en unos milisegundos.
2. Cada widget se monta con un `ctx`. Los que escuchan el lab se suscriben a sondas o a pasos de la misión.
3. Un widget que obliga (`haz`, `quiz`…) llama a `ctx.espera()` y bloquea el botón de seguir hasta que se cumple.
4. Al cambiar de paso se ejecutan las limpiezas (`ctx.alSalir`). Si el paso nuevo usa otro lab, el panel lo abre y esconde el anterior sin cerrarlo.
5. Los pasos ya hechos se pueden repasar. Al repasar no bloquea nada ni se vuelve a sumar XP.

## Los dos modos

La interfaz tiene dos modos con la misma lógica debajo. Se cambia con el botón "Modo clásico" o "Modo islas" de los ajustes, y se guarda en `relavops.modo`. Por defecto sale el de islas.

- **Islas.** Letra redonda, bordes gordos, botones que se hunden, cosas que rebotan y nada de iconos. Todo el estilo está en `web/src/isla.css`, bajo `:root[data-modo='isla']`. Cada HTML fija el modo en una línea del `<head>` para que no parpadee.
- **Clásico.** El de siempre, con sus temas de `/disenos`.

Para añadir un fondo, una isla o un personaje, suma una entrada a `FONDOS`, `ISLAS` o `PERSONAJES` en `isla/temas.ts`. Sale sola en "Cambia el mundo", debajo del mapa. Cada pieza es una función que devuelve SVG, dibujada con formas simples y borde oscuro.

Al pulsar Entrar en una isla, el mapa pide ya el lab del primer paso. Si el alumno ya tenía uno de ese lab, se reutiliza, así que entrar y salir no crea máquinas. labd además limita las máquinas nuevas por minuto (ver labd/LEEME.md).
