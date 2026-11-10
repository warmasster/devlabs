# cuentas/

Las cuentas de relavops. Un Worker de Cloudflare con su base de datos D1. Lleva el alta, la entrada, las clases de los profes, el progreso de cada alumno, los latidos de los servidores de labs y todo lo que enseña el panel de admin.

El VPS no guarda usuarios. labd solo comprueba una firma (ver [labd/LEEME.md](../labd/LEEME.md#cuentas)).

## Cómo encaja

```
navegador ──► relavops.org ──► Caddy en el VPS ──► labd
                                                      ├─ web, labs, terminales: los sirve labd
                                                      └─ /api/cuenta/*  /api/clases*  /api/admin/*  ──► este Worker (workers.dev) ──► D1
labd ──(cada 10 s, latido con CPU, RAM, disco y labs abiertos)──► /api/nodos/latido
labd ◄──(órdenes del panel: cerrar un lab, echar a alguien)── respuesta del latido
```

labd le pasa al Worker las rutas de cuentas con la IP del alumno (firmada con el secreto del nodo, para los frenos de intentos). Si algún día el DNS va con la nube naranja, las rutas del Worker en relavops.org cogen esas peticiones directamente y el VPS ni las ve.

1. Al entrar, el Worker deja dos galletas. `rv_s` es la sesión, un valor al azar cuyo sha256 está en la tabla `sesiones`. `rv_t` es un **pase** firmado con Ed25519 que dura una hora y lleva el id, el nombre y el rol.
2. labd pide la clave pública a `/api/cuenta/clave-publica` al arrancar y cada hora. Con ella comprueba `rv_t` en cada petición sin preguntar a nadie.
3. Cada página llama a `/api/cuenta/yo`, que renueva el pase. Si caduca a mitad de lección, la web lo renueva sola. Si labd ve una página sin pase pero con `rv_s`, manda a `/api/cuenta/renovar`, que vuelve a la página sin que se note.
4. Bloquear o echar a alguien desde el panel borra sus sesiones y deja una orden `expulsar` para cada servidor. En el siguiente latido labd le cierra los labs y rechaza su pase hasta que caduque.

## Ficheros

| Fichero | Qué hace |
| --- | --- |
| `src/index.ts` | Las rutas y la limpieza diaria (cron). |
| `src/sesion.ts` | Sesiones, pases, quién eres, roles, registro de actividad y ajustes. |
| `src/cripto.ts` | Contraseñas (PBKDF2-SHA256, 100 000 vueltas) y la firma Ed25519 de los pases. |
| `src/rutas/cuenta.ts` | Alta, entrada, salida, nombre y correo libres, código de clase, cambiar contraseña o correo, unirse a una clase, borrar la cuenta, progreso. El progreso lleva también las notas de la chuleta (de cada nota gana la más reciente) y la versión de la numeración de las lecciones. Lo guardado con los números de antes se pasa a los nuevos al mezclar (`migrar`, la misma tabla que `web/src/curso/progreso.ts`). |
| `src/rutas/clases.ts` | Lo del profe. Clases, códigos, alumnos con su progreso y cuentas de alumnos creadas en bloque. |
| `src/rutas/admin.ts` | Lo del admin. Resumen con métricas, usuarios, clases, labs, servidores, actividad, ajustes y exportar a CSV. |
| `src/rutas/nodos.ts` | El latido de cada labd y las órdenes del panel. |
| `src/correo.ts` | Correo con Cloudflare Email Service. Apagado hasta activarlo (abajo). |
| `migraciones/` | El esquema de D1, comentado tabla a tabla. |
| `scripts/claves.mjs` | Genera los dos secretos. |
| `scripts/prueba.mjs` | Prueba de punta a punta, en local o contra el Worker desplegado. |

## Quién es quién

| Rol | Cómo se llega | Qué puede hacer |
| --- | --- | --- |
| Alumno por libre | Se da de alta con nombre, correo y contraseña. | El curso entero. Unirse a clases con su código. |
| Alumno de clase | Se da de alta con el código de una clase (el correo es opcional), o se la crea su profe. | Lo mismo. Su profe ve su progreso. |
| Profe | Elige "Soy profe" al darse de alta. Con el ajuste de aprobación (el de por defecto), entra como alumno hasta que un admin lo acepta. | Crear clases, repartir códigos, ver el progreso de sus alumnos por lección, crear cuentas de alumnos en bloque (200 al día) y poner contraseña nueva a los alumnos sin correo que nacieron en una de sus clases. |
| Admin | Solo otro admin, o la orden de abajo para el primero. | Todo lo del panel. |

Se entra con el nombre de usuario o con el correo. El nombre es único sin mirar mayúsculas.

## Probar en local

```
cd cuentas
npm install
node scripts/claves.mjs local        # una vez: crea .dev.vars
npm run migrar:local                 # una vez, y cada vez que haya una migración nueva
npm run dev                          # http://localhost:8787
node scripts/prueba.mjs              # 37 comprobaciones contra lo de arriba
```

Para usarlo con la web, lanza labd con `-cuentas http://IP-DE-WINDOWS:8787` y `RELAVOPS_NODO_SECRETO=local`. Desde WSL, la IP de Windows es la de `ip route | awk '/default/ {print $3}'`. labd pasa al Worker las rutas de cuentas, así que todo va por http://localhost:8080.

## Desplegar

Ya está desplegado en la cuenta de Cloudflare de Fernando. La base es `relavops` (región WEUR) y el Worker `relavops-cuentas`, en https://relavops-cuentas.ferndohm99emf.workers.dev y en las rutas de relavops.org de `wrangler.jsonc`.

```
npm run migrar        # aplica las migraciones nuevas en la base de verdad
npm run desplegar     # comprueba los tipos y despliega
node scripts/prueba.mjs https://relavops-cuentas.ferndohm99emf.workers.dev    # prueba y borra lo que crea
```

`node scripts/claves.mjs remoto` cambia los dos secretos. Las sesiones siguen abiertas. El secreto nuevo del nodo queda en `instalador/secretos/nodo.env` y hay que volver a pasarlo al VPS.

## El primer admin

Date de alta en la web como siempre y luego, desde esta carpeta:

```
npx wrangler d1 execute relavops --remote --command "UPDATE usuarios SET rol = 'admin' WHERE nombre_min = 'tu-nombre-en-minusculas'"
```

Vuelve a cargar la página. En el menú de tu nombre sale "Panel de admin". Los siguientes admins se nombran desde el panel, en Usuarios.

## Encender el correo

Hace falta para confirmar correos y para "He olvidado la contraseña". Mientras esté apagado, la web no ofrece esas dos cosas y el profe o el admin ponen contraseñas nuevas a mano.

1. Pasa la cuenta de Cloudflare a **Workers Paid** (5 $ al mes). El envío a cualquier dirección solo va en ese plan.
2. En el panel de Cloudflare, Compute, Email Service, Email Sending, **Onboard Domain** y elige relavops.org. Añade solo los registros DNS que hacen falta.
3. Descomenta `"send_email": [{ "name": "EMAIL" }]` en `wrangler.jsonc` y `npm run desplegar`.
4. En el panel de admin, Ajustes, marca "Mandar el correo de confirmación".

Los correos salen de `hola@relavops.org` (`CORREO_DE` en `wrangler.jsonc`).

## Límites y escala

| Cosa | Ahora | Cuando crezca |
| --- | --- | --- |
| Peticiones | Workers Free da 100 000 al día. Un servidor con latido cada 10 s gasta 8 640. | Workers Paid quita ese techo por 5 $ al mes. |
| CPU por petición | Una entrada o un alta hace un PBKDF2 de 100 000 vueltas, que pasa del límite de 10 ms del plan gratis. Cloudflare deja pasarse de vez en cuando, y en la prueba contra el Worker desplegado no cortó ninguna. Con muchas altas seguidas podría cortar alguna. Las cuentas en bloque van de 10 en 10 y con 10 000 vueltas (su contraseña es al azar), así que cada tanda cuesta lo que un alta. Se rehacen con 100 000 al entrar. | Workers Paid (30 s de CPU), o bajar `VUELTAS`. Los hashes viejos siguen valiendo y se rehacen solos al entrar. |
| D1 | Gratis hasta 5 GB y 100 000 filas escritas al día. Cada latido escribe 2. | El progreso se guarda con 2,5 s de margen, así que no escribe en cada clic. Las métricas por minuto se borran a los 30 días. |
| Varios servidores de labs | Cada labd lleva su `-nodo` y manda su latido. El panel los suma. | El siguiente paso es que el Worker elija servidor al abrir un lab mirando los latidos (el menos cargado) y que cada servidor tenga su nombre, por ejemplo n1.relavops.org. Las cuentas no cambian. |

Las contraseñas no se pueden recuperar ni desde la base. Una copia de la base tampoco sirve para entrar, porque las sesiones se guardan como sha256.
