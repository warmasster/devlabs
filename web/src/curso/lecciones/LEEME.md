# lecciones/

Una lección por fichero (`0-1.ts`), registrada en `index.ts` en orden. El tipo está en `tipos.ts`.

El orden del cinturón blanco es tutorial, shell, ficheros, máquina, red, permisos, tuberías, regex, editores, scripts y git. La shell y los ficheros van delante porque todo lo demás usa opciones y rutas.

## Forma de una lección

```ts
export const leccion: Leccion = {
  id: '0.1',                          // el número del temario (temario.ts)
  titulo: 'Qué es un ordenador para un sysadmin',
  minutos: 45,
  resumen: 'Lo que se lleva el alumno, en dos frases. Sale al terminar.',
  pasos: [
    {
      titulo: 'Qué es una IP',
      lab: 'n0-4a-red',               // el lab de la derecha. Si no se pone, sigue el del paso anterior
      w: [                            // los widgets, de arriba abajo
        { t: 'analogia', icono: 'house', de: 'Una IP', es: 'es la dirección de una máquina…' },
        { t: 'ip', ip: '10.0.0.20' },
        { t: 'haz', paso: 'ipaddr', nodo: 'tu-pc', md: 'Escribe `ip addr`…' },
      ],
    },
  ],
};
```

El catálogo de widgets y sus props está en [../widgets/LEEME.md](../widgets/LEEME.md).

## Cómo se arma una lección

1. **Uno o varios labs de lección** (`n0-Xa-…`, `n0-Xb-…`) con las sondas que necesiten los widgets. No te cortes. Si hace falta un lab con tres máquinas para enseñar ping, se hace.
2. **El lab de práctica** (`n0-X-…`) al final, con un widget `mision` y luego un `boss`.
3. Cada lección obliga a usar el lab **al menos una vez**, con un widget `haz` que no deja seguir hasta que labd lo comprueba. Lo normal son muchos.
4. Siempre que se pueda, la lección **enseña lo que pasa en el lab**. Un `cat` que sale en el panel, un ping que viaja hacia su máquina, un puerto que se enciende en la tarjeta, un fichero que cambia al guardar en vim.

## La regla de oro

**No se pide nada que no se haya enseñado antes.** Ni un comando, ni una opción, ni un símbolo de la shell. Tampoco de forma implícita, en una pista o en la solución de un boss.

Cada cosa nueva se presenta con su **ficha**, el widget `comando`, y siempre igual.

1. **La ficha.** Qué hace, en una frase (`hace`). Sus piezas (`partes`) o un ejemplo (`uso`). Sus opciones, cada una con lo que hace (`ops`).
2. **Tu turno.** Un `haz` que lo usa.
3. **Lo que pasa.** Un widget en vivo que enseña el resultado, si lo hay.

```ts
{ t: 'comando', cmd: 'mkdir', hace: 'Crea una carpeta.', partes: [['mkdir', 'el programa'], ['proyectos', 'la carpeta nueva']], ops: [['-p', 'crea también las de en medio si faltan']] },
{ t: 'haz', paso: 'mkdir', md: 'Crea la carpeta `/root/casa/proyectos`.', pista: 'mkdir /root/casa/proyectos' },
```

- Un comando ya enseñado que gana una opción lleva otra ficha con el mismo `cmd` y solo `ops`. Sale como «Ya lo conoces. Esto es nuevo».
- Los símbolos (`|`, `>`, `&`, `*`, `&&`…) llevan ficha con `simbolo: true`.
- Las órdenes con dos palabras (`git commit`, `ip addr`) son un `cmd` cada una.
- Las teclas van en un widget `teclas`. No son comandos, pero también van a la chuleta.
- La ficha explica con todo detalle, pero sin pasarse. Una frase para lo que hace y otra por opción.

La **chuleta** del alumno sale sola de las fichas y de las teclas (`../chuleta.ts`). El paso final de cada lección lleva `{ t: 'chuleta' }`, sin lista.

`node pruebas/comandos.mjs` recorre las lecciones en orden y falla si algo se pide antes de su ficha. Mira las tareas, sus pistas, y el texto, las pistas y la solución de cada misión de práctica y de cada boss. Pásalo siempre antes de dar una lección por buena.

## Reglas de contenido

- **Desde cero.** Nada se da por sabido. Antes de usar una palabra (IP, proceso, inodo…), se explica con una analogía o un widget.
- **No preguntes lo que no se ha dicho o enseñado.** Un quiz o un juego solo pregunta lo que ya salió en la lección. Una predicción solo vale si se puede razonar con lo que ya se ha visto.
- Lo que pida el lab de práctica y su boss tiene que estar enseñado en la lección, o en una pista.
- **El alumno teclea.** Todo lo que se pueda hacer con un comando lo escribe el alumno en la terminal, aunque sea fácil. Nada de botones que lo hagan por él. El widget `boton-lab` queda solo para cosas que todavía no sabría hacer.
- **Nunca lo dejes a medias sin decirlo.** Si un paso deja algo roto o funcionando a propósito (un programa que gasta CPU, una puerta abierta…), el paso dice qué va a pasar después, por ejemplo «en el paso siguiente lo paras. Pulsa Seguir».
- **Que valga en el móvil.** No digas «a la derecha» ni «arriba». En el móvil la terminal está en otra pestaña. Di «la terminal», «la tarjeta de la máquina» o usa un `senala`, que marca la pestaña que toca.
- **Terminal en cada paso.** Cada paso tiene algo que hacer en la terminal, salvo los juegos y repasos, la chuleta final y los pasos sobre la propia pantalla.
- **Primero el comando, luego la respuesta.** Lo que el alumno tiene que descubrir con un comando (sus procesos, su RAM, su IP, sus carpetas…) no se enseña en la lección hasta que lo ha escrito. Ese widget lleva `tras: 'paso'` y se queda tapado hasta que labd comprueba ese paso. Si solo enseña lo que el alumno provoca (la barra de CPU que sube al lanzar un programa), lleva `efecto: true`.
- **Los atajos de siempre.** Se enseñan los atajos originales de cada programa (Ctrl+O, Ctrl+W, F6…), no otros inventados. Para los que el navegador se reserva (Ctrl+W, Ctrl+T, Ctrl+N), la lección señala el botón de pantalla completa del lab.
- **Que no baile.** Lo que llega en vivo no puede parpadear ni mover la página. Ver la regla de procesos en labs/LEEME.md.
- **Poco texto y muy visual.** Un paso tiene uno o dos textos cortos y el resto son widgets. Si un texto pasa de tres líneas, sobra algo.

## Reglas de escritura

Se escribe como habla la gente, para alguien listo que se aburre rápido.

- Frases cortas y sencillas. Lenguaje llano.
- Directo y conciso. Corta palabras de relleno y adjetivos que no aportan.
- Tono natural. Se puede empezar por "y" o por "pero".
- Nada de marketing ni de exagerar. Nada de prometer de más ni de amabilidad fingida.
- Nada de frases típicas de IA como "sumérgete", "desata", "revolucionario", "echemos un vistazo" o "abróchate el cinturón".
- **Sin rayas largas.**
- **Sin dos puntos** en la prosa. Los que forman parte de un comando o de un formato, como `:wq`, sí.
- Sin preguntas retóricas. Las preguntas de los quiz sí, porque son preguntas de verdad.
- Sin frases del tipo "X y también Y".

`node pruebas/comandos.mjs` vigila la regla de oro. `node pruebas/estilo.mjs` avisa de los dos puntos y las rayas que se cuelen. `node pruebas/reglas.mjs` revisa las reglas de contenido que se pueden revisar solas (tras, efecto, pasos sin terminal, botones, pasos que no existen en la misión).
