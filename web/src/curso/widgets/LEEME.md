# widgets/

Los bloques con los que se hace una lección. Hay 54. Cada uno es una función reutilizable `(el, props, ctx) => void` que pinta dentro de `el`.

- `basicos.ts`, `diagramas.ts`, `vivos.ts` y `juegos.ts` son las cuatro familias.
- `index.ts` es el registro. Una lección pide un widget por su nombre, `{ t: 'red', origen: 'tu-pc' }`.
- `widgets.css` es su estilo. Solo usa variables del tema, así que funciona en los cuatro temas.
- El contrato `Ctx` está en `../nucleo/tipos.ts`.

## Cómo se escribe uno

```ts
/** Lo que hace. { props que acepta } */
export const miWidget: Widget = (el, p, ctx) => {
  const caja = h('div', 'w-mio', md(p.md));
  el.append(caja);
  const liberar = ctx.espera();            // si obliga a hacer algo antes de seguir
  vivo(ctx, p.sonda, (v) => { … });        // si escucha una sonda del lab
  ctx.alSalir(() => clearInterval(timer)); // limpia al cambiar de paso
  // …y cuando el alumno lo consigue: liberar(); ctx.xp(5, caja);
};
```

Luego se añade a `index.ts` y a la tabla de abajo.

`ctx` da `lab()` (la conexión con el lab del paso), `espera()`, `xp(n, el)`, `alSalir(f)`, `alTeclear(f)` (lo que se teclea en la terminal), `senalar(zona, si)` y `terminal(nodo)`.

## Props que valen para todos

| Prop | Hace |
| --- | --- |
| `tras: 'paso'` | El widget sale tapado y aparece cuando labd comprueba ese paso de la misión. Sirve para no enseñar la respuesta antes de que el alumno escriba el comando. Lo gestiona el reproductor, no el widget. |
| `efecto: true` | Marca a mano un widget en vivo que se puede ver desde el principio porque solo enseña lo que el alumno provoca (la CPU que sube, la puerta que se abre, el fichero que todavía no existe). No cambia nada al pintar. Lo lee `pruebas/reglas.mjs`. |

## Catálogo

Columnas: **Lab** = escucha el lab en vivo. **Bloquea** = no deja seguir hasta completarlo.

### Básicos

| Widget | Props | Lab | Bloquea |
| --- | --- | --- | --- |
| `texto` | `md` | | |
| `analogia` | `icono, de, es, nota?` | | |
| `cifra` | `v` o `sonda, fn?`, `txt` | opcional | |
| `comparar` | `a: {titulo, icono, puntos}`, `b`, `vs?` | | |
| `capas` | `capas: [{t, sub, info, icono}]` (la primera arriba) | | |
| `anatomia` | `partes: [[texto, etiqueta, color?]], nota?` | | |
| `tabla` | `cab, filas` | | |
| `comando` | `cmd, hace, uso?, partes?: [[texto, etiqueta]], ops?: [[opción, qué hace]], nota?, simbolo?` (la ficha de un comando nuevo. Va antes de pedirlo y lo apunta en la chuleta. Ver la regla de oro en lecciones/LEEME.md) | | |
| `chuleta` | sin props sale sola de las fichas de la lección. `items?: [[comando, para qué]]` | | |
| `codigo` | `codigo, notas: {línea: texto}` | | |
| `linea` | `items: [{t, d, icono?}]` (se destapa paso a paso) | | |
| `escala` | `items: [[etiqueta, valor, texto]], titulo?` (logarítmica) | | |
| `teclas` | `combos: [{k: [], que, seq?}], obliga?` (se encienden al pulsarlas en la terminal) | teclado | si `obliga` |
| `senala` | `zona, md` (`maquinas`, `terminal`, `pestanas`, `nuevo`, `inmersivo`, `xp`, `chuleta`, `ajustes` o el nombre de un nodo. En el móvil marca además la pestaña donde está) | | |
| `aviso` | `md, tipo?: ok \| aviso \| mal` | | |

### Diagramas

| Widget | Props | Lab | Bloquea |
| --- | --- | --- | --- |
| `escena` | `escena` (dibujo a mano por pasos, ver `../escena.ts`) | | |
| `estados` | `estados, trans: [[de, a, etiqueta]], inicio, objetivo?` | | si `objetivo` |
| `tuberia` | `datos, etapas: [{cmd, fn, que}]` | | |
| `canales` | `cmd, out, err` (eliges redirección y ves adónde va cada línea) | | |
| `arbol` | `items` o `sonda, aqui?, raiz?, marca?` | opcional | |
| `inodos` | `sonda` (salida de `ls -li`) | sí | |
| `red` | `origen, sonda?` (pings y conexiones viajando entre máquinas) | sí, `icmp@` | |
| `ip` | `ip, prefijo?` | | |
| `binario` | `objetivo?` | | si `objetivo` |
| `rwx` | `inicial, sonda?, fichero?` (con sonda es un espejo del fichero real y no se toca) | opcional | |
| `git-zonas` | `sonda` (líneas `W f`, `S f`, `C n`) | sí | |
| `git-grafo` | `sonda` (`git log --all --format='%h\|%p\|%s\|%D'`) | sí | |
| `deslizador` | `min, max, valor, etiqueta, fn(v)` | | |

### Conectados al lab

| Widget | Props | Lab | Bloquea |
| --- | --- | --- | --- |
| `maquina` | `nodo?` (sin nodo, todas) | sí | |
| `puertos` | `nodo, puertos: [[n, nombre]]` | sí, `puertos@` | |
| `fichero` | `sonda, titulo, vacio?, mantener?` | sí | |
| `ultimo` | `nodo` (tu último comando partido en piezas) | sí, `ultimo@` | |
| `procesos` | `sonda, resalta?` | sí | |
| `medidor` | `sonda, titulo, fn(v) => [valor, máximo, texto]` | sí | |
| `contador` | `sonda, txt, fn?` | sí | |
| `estado` | `sonda, titulo, mapa: {valor: [texto, ok \| mal \| aviso]}` | sí | |
| `codigo-salida` | `nodo` | sí, `rc@` | |
| `haz` | `paso, md, pista?, nodo?, xp?` (tarea en la terminal, la comprueba labd. La pista sin comillas invertidas es un comando tal cual. Con ellas es una frase) | sí | **sí** |
| `mision` | `opcional?` (la misión del lab de práctica) | sí | sí |
| `boss` | `obliga?` | sí | si `obliga` |
| `boton-lab` | `accion, md, hecho?, icono?` (lanza una acción del lab) | sí | |
| `terminal-demo` | `lineas: [[comando, salida]]` (teclea sola, sin lab) | | |

### Juegos y comprobaciones

Todos bloquean salvo que lleven `opcional: true`. Solo preguntan lo que la lección ya enseñó.

| Widget | Props |
| --- | --- |
| `quiz` | `q, ops, ok, porque` |
| `verdad` | `items: [[frase, bool, porque]]` |
| `ordena` | `items` (en el orden bueno), `md?` |
| `empareja` | `pares: [[a, b]]`, `md?` |
| `huecos` | `plantilla` con `___`, `respuestas, pista?, md?` |
| `clasifica` | `cubos, items: [[texto, nCubo]]`, `md?` |
| `rapido` | `preguntas: [[pide, [respuestas]]], segundos` (contrarreloj, pide 3 aciertos) |
| `atajo` | `items: [[acción, combo]]` (elegir el atajo bueno) |
| `ruta` | `arbol, objetivo, md` (navegar y escribir la ruta) |
| `memoria` | `pares` (cartas boca abajo) |
| `regex` | `lineas: [[texto, debeEncajar?]], md, inicial?, libre?` (probador en vivo) |
| `vim` | `texto, objetivo, md` (un vim de práctica) |
